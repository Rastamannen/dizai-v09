const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePronunciation(filePath, profile, exerciseId) {
  // Kontrollera extension, skapa temporär kopia med rätt extension om nödvändigt
  let tempFilePath = filePath;
  if (!filePath.endsWith(".webm")) {
    tempFilePath = `${filePath}.webm`;
    fs.copyFileSync(filePath, tempFilePath);
  }
  console.log(`/analyze: Starting transcription for ${tempFilePath} (exerciseId=${exerciseId}, profile=${profile})`);

  // Läs in övningsdata
  const ex = exercises[profile][exerciseId];
  if (!ex) {
    throw new Error(`No exercise for ${profile}[${exerciseId}]`);
  }

  let resp, transcript;
  try {
    resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: "pt",
      response_format: "json",
    });
    transcript = resp.text.trim();
  } catch (err) {
    console.error("❌ Error calling Whisper API:", err);
    throw err;
  } finally {
    // Rensa tempfil om sådan skapades
    if (tempFilePath !== filePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }

  // Grundläggande feedbacklogik
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
