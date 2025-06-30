const express = require('express');
const multer = require('multer');
const cors = require('cors');
const exercises = require('./exercises.json');
const { analyzePronunciation } = require('./whisperUtil.cjs');
const { ttsAudio } = require('./ttsUtil.cjs');
const fs = require('fs');

require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Sanity check on env
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing in environment variables!");
} else {
  console.log("✅ OPENAI_API_KEY loaded (starts with: " + process.env.OPENAI_API_KEY.slice(0, 6) + "...)");
}

async function retryAsync(fn, retries = 3, delay = 1000) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`⚠️ Retry ${i} failed: ${err.message}`);
      if (i === retries) throw new Error(`Transcription failed after ${retries} retries`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

app.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    const { profile, exerciseId } = req.body;
    const filePath = req.file.path;

    console.log(`Received /analyze request`);
    console.log(`Processing file: ${filePath} for profile=${profile} exerciseId=${exerciseId}`);

    const result = await retryAsync(() =>
      analyzePronunciation(filePath, profile, exerciseId)
    );

    fs.unlink(filePath, err => {
      if (err) console.warn(`⚠️ Failed to delete temp file: ${filePath}`);
    });

    res.json(result);
  } catch (err) {
    console.error(`Error in /analyze:`, err);
    res.status(500).json({ error: err.message || "Unknown server error" });
  }
});

app.get('/exercises', (req, res) => {
  console.log("GET /exercises");
  res.json(exercises);
});

app.get('/tts', async (req, res) => {
  const { text, type } = req.query;
  console.log(`/tts request for text="${text}" type="${type}"`);

  try {
    const audioBuffer = await ttsAudio(text, type || "pt-PT");
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Disposition': 'inline; filename="tts.mp3"'
    });
    res.send(audioBuffer);
  } catch (err) {
    console.error("Error in /tts:", err);
    res.status(500).json({ error: err.message || "TTS error" });
  }
});

app.listen(3001, () => {
  console.log('✅ Backend live on http://localhost:3001');
});
