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

// Enkel logger för inkommande requests (alla routes)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    console.log('/analyze: body:', req.body, 'file:', req.file ? req.file.originalname : 'NO FILE');
    const { profile, exerciseId } = req.body;
    const filePath = req.file.path;
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    console.error('FEL i /analyze:', err, err.stack);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

app.get('/exercises', (req, res) => {
  res.json(exercises);
});

app.get('/tts', async (req, res) => {
  const { text, type } = req.query;
  try {
    console.log('/tts:', text, type);
    const audioBuffer = await ttsAudio(text, type || "pt-PT");
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Disposition': 'inline; filename="tts.mp3"'
    });
    res.send(audioBuffer);
  } catch (err) {
    console.error('FEL i /tts:', err, err.stack);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

// Catch-all för oväntade routes
app.use((req, res) => {
  console.warn('404 på', req.method, req.originalUrl);
  res.status(404).json({ error: 'Not found' });
});

app.listen(3001, () => {
  console.log('Backend live on http://localhost:3001');
});
