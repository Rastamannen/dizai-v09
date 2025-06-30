const express = require('express');
const multer = require('multer');
const cors = require('cors');
const exercises = require('./exercises.json');
const { analyzePronunciation } = require('./whisperUtil.cjs');
const { ttsAudio } = require('./ttsUtil.cjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

function logError(context, err) {
  console.error(`\n=== ERROR: ${context} ===`);
  if (err instanceof Error) {
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    if (err.response) console.error('Response:', JSON.stringify(err.response, null, 2));
    if (err.cause) console.error('Cause:', err.cause);
  } else {
    console.error('Err (raw):', JSON.stringify(err, null, 2));
  }
}

app.post('/analyze', upload.single('audio'), async (req, res) => {
  console.log(`/analyze: body:`, req.body, "file:", req.file ? req.file.originalname : 'No file');
  try {
    if (!req.file) throw new Error("No file received in upload!");
    const filePath = req.file.path;
    console.log("Analyzing file:", filePath, "Profile:", req.body.profile, "ExerciseId:", req.body.exerciseId);

    // Extra: kolla filstorlek
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);

    const result = await analyzePronunciation(filePath, req.body.profile, req.body.exerciseId);
    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    logError('/analyze', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

app.get('/exercises', (req, res) => {
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
    logError('/tts', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

app.listen(3001, () => {
  console.log('✅ Backend live on http://localhost:3001');
});
