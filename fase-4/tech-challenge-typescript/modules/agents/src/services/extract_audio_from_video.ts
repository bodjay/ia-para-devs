import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import logger from './logger.js';

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);

export async function extract(videoPath: string, tempPath: string = './temp'): Promise<string> {
  logger.info('[extract_audio_from_video] Iniciando extração de áudio', { videoPath, tempPath });

  const hashTimeStamp = Date.now().toString();
  const tempFileName = `${tempPath}/temp_audio_${hashTimeStamp}.wav`;

  return new Promise<string>((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => {
        logger.info('[extract_audio_from_video] Extração concluída');
        resolve(tempFileName);
      })
      .on('error', (err: any) => {
        logger.error('[extract_audio_from_video] Erro ao extrair áudio', err);
        reject("");
      })
      .save(tempFileName);
  });
}

export default { extract };
