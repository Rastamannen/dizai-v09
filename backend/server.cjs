const express = require("express");
const multer = require("multer");
const cors = require("cors");
const exercises = require("./exercises.json");
const { analyzePronunciation } = require("./whisperUtil.cjs");
const { ttsAudio } = require("./ttsUtil.cjs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

const PORT = 3001;

// 🔐 Check OpenAI API key on startup
if (process.env.OPENAI_API_KEY) {
  console.log(`✅ OPENAI_API_KEY loaded (starts with: ${process.env.OPENAI_API_KEY.slice(0, 8)}...)`);
} else {
  console.warn("⚠️  No OPENAI_API_KEY found in .env");
}

// === /analyze ===
app.post("/analyze", upload.single("audio"), async (req, res) => {
  const { profile, exerciseId } = req.body;
  const filePath = req.file?.path;

  console.log(`Received /analyze request`);
  console.log(`Processing file: ${filePath} for profile=${profile} exerciseId=${exerciseId}`);

  if (!filePath) {
    return res.status(400).json({ error: "Missing audio file." });
  }

  try {
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    console.error("Error in /analyze:", err);
    res.status(500).json({ error: err.message });
  }
});

// === /exercises ===
app.get("/exercises", (req, res) => {
  res.json(exercises);
});

// === /tts ===
app.get("/tts", async (req, res) => {
  const { text, type } = req.query;
  console.log(`/tts request for text="${text}" type="${type}"`);

  try {
    const audioBuffer = await ttsAudio(text, type || "pt-PT");
    res.set({
      "Content-Type": "audio/mp3",
      "Content-Disposition": 'inline; filename="tts.mp3"',
    });
    res.send(audioBuffer);
  } catch (err) {
    console.error("Error in /tts:", err);
    res.status(500).json({ error: err.message });
  }
});

// === /test ===
app.get("/test", async (req, res) => {
  const profile = req.query.profile || "Johan";
  const exerciseId = parseInt(req.query.exerciseId) || 0;
  const filePath = path.join(__dirname, "sample-audio.webm");

  console.log(`/test: Analyzing sample audio for ${profile}, ex ${exerciseId}`);

  try {
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    res.json(result);
  } catch (err) {
    console.error("❌ Error in /test:", err);
    res.status(500).json({ error: err.message });
  }
});

// === Start server ===
app.listen(PORT, () => {
  console.log(`✅ Backend live on http://localhost:${PORT}`);
});
