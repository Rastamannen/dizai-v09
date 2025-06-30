const exercises = require("./exercises.json");
const fs = require('fs');
const path = require('path');

async function analyzePronunciation(filePath, profile, exerciseId) {
  const openai = require("openai");
  const audio = fs.createReadStream(filePath);
  const ex = exercises[profile][exerciseId];
  let attempt = 0;
  let transcript = null;

  console.log(`/analyze: Starting transcription for ${filePath} (exerciseId=${exerciseId}, profile=${profile})`);

  while (attempt < 3) {
    try {
      console.log(`→ Transcription attempt ${attempt + 1}`);
      const resp = await openai.audio.transcriptions.create({
        file: audio,
        model: "whisper-1",
        language: "pt",
        response_format: "json",
      });

      transcript = resp.text.trim();
      console.log(`✔ Transcription success: "${transcript}"`);
      break;
    } catch (err) {
      console.warn(`⚠️ Retry ${attempt + 1} failed: ${err.message}`);
      attempt++;
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  if (!transcript) {
    throw new Error("Transcription failed after 3 retries");
  }

  // === Simple word match scoring ===
  const ref = ex.text.toLowerCase();
  const spoken = transcript.toLowerCase();
  const refWords = ref.split(/\s+/);
  const spokenWords = spoken.split(/\s+/);
  let score = 0;
  let highlight = [];

  refWords.forEach((w, i) => {
    if (spokenWords[i] && spokenWords[i] === w) score++;
    else highlight.push(i);
  });

  const percent = (score / refWords.length) * 100;
  let feedback = "";

  if (percent === 100) feedback = "Perfect!";
  else if (percent > 70) feedback = "Almost! Check highlighted words.";
  else feedback = "Try again. Pay attention to pronunciation.";

  console.log(`→ Score: ${percent.toFixed(1)}%. Feedback: ${feedback}`);

  return {
    transcript,
    reference: ex.text,
    ipa: ex.ipa,
    score: percent,
    feedback,
    highlight
  };
}

module.exports = { analyzePronunciation };
