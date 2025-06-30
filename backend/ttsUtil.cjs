const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv').config();

const client = new textToSpeech.TextToSpeechClient();

async function ttsAudio(text, languageCode = "pt-PT") {
  const request = {
    input: { text },
    voice: { languageCode, ssmlGender: 'FEMALE' },
    audioConfig: { 
      audioEncoding: 'MP3',
      speakingRate: 0.85 // långsammare tal
    }
  };
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

module.exports = { ttsAudio };
