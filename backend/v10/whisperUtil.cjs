const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require("fs");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzePronunciation(filePath, profile, exerciseId) {
  console.log(`[Whisper] Transcribing for ${profile}, ex ${exerciseId} - ${filePath}`);
  const audioStream = fs.createReadStream(filePath);
  let transcript;
  try {
    const resp = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      response_format: "json",
      language: "pt"
    });
    transcript = resp.text.trim();
  } catch (err) {
    console.error("Whisper error:", err);
    throw err;
  }
  const ex = exercises[profile][exerciseId];
  const refWords = ex.text.toLowerCase().split(/\s+/);
  const spokenWords = transcript.toLowerCase().split(/\s+/);
  let score = 0, highlight = [];
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
