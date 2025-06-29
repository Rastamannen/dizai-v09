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

app.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    const { profile, exerciseId } = req.body;
    const filePath = req.file.path;
    const result = await analyzePronunciation(filePath, profile, exerciseId);
    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/exercises', (req, res) => {
  res.json(exercises);
});

app.get('/tts', async (req, res) => {
  const { text, type } = req.query;
  try {
    const audioBuffer = await ttsAudio(text, type || "pt-PT");
    res.set({
      'Content-Type': 'audio/mp3',
      'Content-Disposition': 'inline; filename="tts.mp3"'
    });
    res.send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Backend live on http://localhost:3001');
});
