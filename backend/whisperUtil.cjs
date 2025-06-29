const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require('fs');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzePronunciation(filePath, profile, exerciseId) {
  const audio = fs.createReadStream(filePath);

  // Korrekt anrop till Whisper API i nya SDK
  const whisperResp = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    response_format: "json",
    language: "pt"
  });

  // I nya SDK är text på rot-nivå (inte data.text)
  const transcript = whisperResp.text.trim();

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

module.exports = { analyzePronunciation };
