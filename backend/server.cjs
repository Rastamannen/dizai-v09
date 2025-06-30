const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const exercises = require("./exercises.json");
const { analyzePronunciation } = require("./whisperUtil.cjs");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === STARTUP: OpenAI test ===
(async () => {
  try {
    const models = await openai.models.list();
    console.log("✅ OpenAI API reachable. Models:", models.data.map((m) => m.id).join(", "));
  } catch (err) {
    console.error("❌ OpenAI API UNREACHABLE:", err.message);
  }
})();

// === ROUTES ===

// /analyze
app.post("/analyze", upload.single("audio"), async (req, res) => {
  const filePath = req.file?.path;
  const profile = req.body.profile;
  const exerciseId = req.body.exerciseId;

  console.log(`Received /analyze request`);
  console.log(`Processing file: ${filePath} for profile=${profile} exerciseId=${exerciseId}`);

  if (!filePath || !profile || exerciseId === undefined) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    fs.unlink(filePath, () => {}); // Cleanup
    res.json(result);
  } catch (err) {
    console.error("❌ Error in /analyze:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// /exercises
app.get("/exercises", (req, res) => {
  res.json(exercises);
});

// /tts
const { ttsAudio } = require("./ttsUtil.cjs");

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
    console.error("❌ Error in /tts:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// /test-transcription (optional test route)
app.get("/test", async (req, res) => {
  const profile = req.query.profile || "Johan";
  const exerciseId = parseInt(req.query.exerciseId) || 0;
  const filePath = path.join(__dirname, "sample-audio.webm");

  console.log(`/test: Analyzing sample audio for ${profile}, ex ${exerciseId}`);

  try {
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    res.json(result);
  } catch (err) {
    console.error("❌ Error in /test:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// START SERVER
const port = 3001;
app.listen(port, () => {
  console.log(`✅ Backend live on http://localhost:${port}`);
});
