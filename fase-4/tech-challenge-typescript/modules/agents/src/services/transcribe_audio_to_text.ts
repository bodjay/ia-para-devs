import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import logger from './logger.js';

ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
import { SpeechClient } from '@google-cloud/speech';

const client = new SpeechClient();

function convertToMono(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `mono_${Date.now()}.wav`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

export async function transcribe(audioPath: string, textOutputPath: string) {
  logger.info('[transcribe_audio_to_text] Iniciando transcrição', { audioPath, textOutputPath });

  const monoPath = await convertToMono(audioPath);
  const file = fs.readFileSync(monoPath);
  fs.unlinkSync(monoPath);
  const audioBytes = file.toString('base64');

  const request = {
    audio: { content: audioBytes },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'pt-BR',
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
