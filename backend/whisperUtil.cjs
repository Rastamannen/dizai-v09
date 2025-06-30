const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require("fs");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzePronunciation(filePath, profile, exerciseId) {
  console.log(`/analyze: Starting transcription for ${filePath} (exerciseId=${exerciseId}, profile=${profile})`);
  const maxRetries = 3;
  let attempt = 0;
  let transcript;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`→ Transcription attempt ${attempt}`);
      const audioStream = fs.createReadStream(filePath);

      const resp = await openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        response_format: "json",
        language: "pt",
      });
      transcript = resp.text.trim();
      console.log(`Transcription success: "${transcript}"`);
      break;
    } catch (err) {
      console.warn(`⚠️ Retry ${attempt} failed!`);
      console.error("TRANSCRIBE ERROR:", err.message);
      if (err.response) console.error("RESPONSE DATA:", JSON.stringify(err.response, null, 2));
      if (err.cause) console.error("CAUSE:", err.cause);
      if (attempt === maxRetries) {
        console.error("Transcription failed after retries:", err.stack || err);
        throw new Error("Transcription failed after 3 retries: " + (err.message || err));
      }
      // Vänta 1 sekund mellan retries
      await new Promise((r) => setTimeout(r, 1000));
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
