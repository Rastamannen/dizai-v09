const textToSpeech = require('@google-cloud/text-to-speech');
const client = new textToSpeech.TextToSpeechClient();

async function ttsAudio(text, type = "pt-PT", options = {}) {
  const req = {
    input: { text },
    voice: { languageCode: type, ssmlGender: "FEMALE" },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: options.rate || 0.9 // slower, clearer speech
    }
  };
  const [response] = await client.synthesizeSpeech(req);
  return response.audioContent;
}

module.exports = { ttsAudio };
