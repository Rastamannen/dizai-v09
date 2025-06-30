const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require("fs");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePronunciation(filePath, profile, exerciseId) {
  console.log(`/analyze: Starting transcription for ${filePath} (exerciseId=${exerciseId}, profile=${profile})`);

  const transcript = await retryAsync(async () => {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "pt",
      response_format: "json"
    });

    if (!transcription || !transcription.text) {
      throw new Error("Missing 'text' in transcription response");
    }

    return transcription.text.trim();
  }, 3, "Transcription");

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
    highlight
  };
}

// Enkel retry-hanterare med tydlig loggning
async function retryAsync(fn, retries = 3, label = "Operation") {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`→ ${label} attempt ${i}`);
      return await fn();
    } catch (err) {
      console.warn(`⚠️ Retry ${i} failed: ${err.message}`);
      if (i === retries) throw new Error(`${label} failed after ${retries} retries`);
    }
  }
}

module.exports = { analyzePronunciation };
