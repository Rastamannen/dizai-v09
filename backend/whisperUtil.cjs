const exercises = require("./exercises.json");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");
require("dotenv").config();

async function analyzePronunciation(filePath, profile, exerciseId) {
  console.log(`/analyze: Starting transcription for ${filePath} (exerciseId=${exerciseId}, profile=${profile})`);

  const maxRetries = 3;
  let attempt = 0;
  let transcript;

  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`→ Transcription attempt ${attempt}`);

      const form = new FormData();
      form.append("file", fs.createReadStream(filePath));
      form.append("model", "whisper-1");
      form.append("language", "pt");
      form.append("response_format", "json");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          ...form.getHeaders(),
        },
        body: form,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status} ${errText}`);
      }

      const data = await response.json();
      transcript = data.text.trim();
      break;
    } catch (err) {
      console.warn(`⚠️ Retry ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw new Error("Transcription failed after 3 retries");
    }
  }

  const ex = exercises[profile][exerciseId];
  const ref = ex.text.toLowerCase();
  const spoken = transcript.toLowerCase();

  let score = 0;
  let highlight = [];
  const refWords = ref.split(/\s+/);
  const spokenWords = spoken.split(/\s+/);
  refWords.forEach((w, i) => {
    if (spokenWords[i] && spokenWords[i] === w) score++;
    else highlight.push(i);
  });
  const percent = (score / refWords.length) * 100;

  let feedback = "";
  if (percent === 100) feedback = "Perfect!";
  else if (percent > 70) feedback = "Almost! Check highlighted words.";
  else feedback = "Try again. Pay attention to pronunciation.";

  return {
    transcript,
    reference: ex.text,
    ipa: ex.ipa,
    score: percent,
    feedback,
    highlight,
  };
}

module.exports = { analyzePronunciation };
