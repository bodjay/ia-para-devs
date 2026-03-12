import fs from 'fs';
import logger from './logger.js';
import { SpeechClient } from '@google-cloud/speech';

const client = new SpeechClient();

export async function transcribe(audioPath: string, textOutputPath: string) {
  logger.info('[transcribe_audio_to_text] Iniciando transcrição', { audioPath, textOutputPath });

  const file = fs.readFileSync(audioPath);
  const audioBytes = file.toString('base64');

  const request = {
    audio: { content: audioBytes },
    config: {
      encoding: 'LINEAR16',
      languageCode: 'pt-BR',
      sampleRateHertz: 16000,
    },
  } as any;

  const [response] = await client.recognize(request);

  const transcription = response.results
    ?.map(r => r.alternatives?.[0]?.transcript || '')
    .filter(Boolean)
    .join('\n') || '';

  fs.writeFileSync(textOutputPath, transcription, { encoding: 'utf-8' });

  logger.info('[transcribe_audio_to_text] Transcrição concluída');
  return transcription;
}

// example
transcribe('/Users/henrique/Workspace/ia-4-devs/fase-4/assets/audio.wav', '/Users/henrique/Workspace/ia-4-devs/fase-4/assets/output.txt')
  .then(transcription => {
    console.log('Transcrição:', transcription);
  })
  .catch(error => {
    console.error('Erro na transcrição:', error);
  });

export default { transcribe };
