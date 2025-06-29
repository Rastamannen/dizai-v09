const express = require('express');
const multer = require('multer');
const cors = require('cors');
const exercises = require('./exercises.json');
const { analyzePronunciation } = require('./whisperUtil.cjs');
const { ttsAudio } = require('./ttsUtil.cjs');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

async function retryAsync(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Retry ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

app.post('/analyze', upload.single('audio'), async (req, res) => {
  console.log('Received /analyze request');
  try {
    const { profile, exerciseId } = req.body;
    if (!req.file) {
      console.error('No file received in /analyze');
      return res.status(400).json({ error: 'Audio file missing' });
    }
    const filePath = req.file.path;
    console.log(`Processing file: ${filePath} for profile=${profile} exerciseId=${exerciseId}`);

    const result = await retryAsync(() => analyzePronunciation(filePath, profile, exerciseId));

    console.log('Analysis result:', result);
    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    console.error('Error in /analyze:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/exercises', (req, res) => {
  console.log('GET /exercises');
  res.json(exercises);
});

app.get('/tts', async (req, res) => {
  const { text, type } = req.query;
  console.log(`/tts request for text="${text}" type="${type}"`);
  try {
    const audioBuffer = await retryAsync(() => ttsAudio(text, type || "pt-PT"));
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Disposition': 'inline; filename="tts.mp3"'
    });
    res.send(audioBuffer);
  } catch (err) {
    console.error('Error in /tts:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Backend live on http://localhost:3001');
});
