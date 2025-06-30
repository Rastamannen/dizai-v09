import textToSpeech from '@google-cloud/text-to-speech';
import dotenv from 'dotenv';
dotenv.config();

const client = new textToSpeech.TextToSpeechClient();

export async function ttsAudio(text, languageCode = "pt-PT") {
  const request = {
    input: { text },
    voice: { languageCode, ssmlGender: 'FEMALE' },
    audioConfig: { 
      audioEncoding: 'MP3',
      speakingRate: 0.75 // Lägre = långsammare
    }
  };
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}
