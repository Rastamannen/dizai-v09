const OpenAI = require("openai");
const exercises = require("./exercises.json");
const fs = require("fs");
require("dotenv").config();

console.log("✅ OPENAI_API_KEY starts with:", process.env.OPENAI_API_KEY?.slice(0, 8));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePronunciation(filePath, profile, exerciseId) {
  console.log(`/analyze: Starting transcription for ${filePath} (exerciseId=${exerciseId}, profile=${profile})`);
  console.log("Analyzing file:", filePath, "Profile:", profile, "ExerciseId:", exerciseId);

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
      console.log(`✅ Transcription succeeded: "${transcript}"`);
      break;
    } catch (err) {
      console.error(`⚠️ Retry ${attempt} failed!`);
      if (err.cause) {
        console.error("TRANSCRIBE ERROR:", err.message);
        console.error("CAUSE:", err.cause);
      } else {
        console.error("TRANSCRIBE ERROR:", err);
      }
      if (attempt === maxRetries) throw new Error("Transcription failed after 3 retries");
    }
  }

  if (!transcript) {
    throw new Error("No transcript generated.");
  }

  const ex = exercises[profile][exerciseId];
  if (!ex) {
    console.error(`❌ No exercise found for profile="${profile}" and exerciseId=${exerciseId}`);
    throw new Error("Exercise not found.");
  }

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
