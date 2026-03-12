import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
ffmpeg.setFfprobePath((ffprobePath as unknown as { path: string }).path);

/**
 * Extrai frames de um vídeo como imagens JPEG e retorna-os como strings base64.
 *
 * @param videoPath - Caminho para o arquivo de vídeo de entrada.
 * @param tempDir   - Diretório temporário onde os frames serão salvos.
 * @param count     - Número máximo de frames a extrair (distribuídos uniformemente).
 * @returns Array de strings base64 representando cada frame JPEG extraído.
 *
 * @example
 * const frames = await extractFrames("uploads/consulta.mp4", "./uploads/temp/frames", 8);
 * // → ["<base64>", "<base64>", ...]
 */
/**
 * Retorna a duração do vídeo em segundos via ffprobe.
 * Rejeita se não for possível obter a duração (ex.: webm sem metadados de duração).
 */
function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const raw = metadata?.format?.duration;
      const duration = Number(raw);
      if (!raw || isNaN(duration) || duration <= 0) return reject(new Error('Duração indisponível'));
      resolve(duration);
    });
  });
}

export async function extractFrames(
  videoPath: string,
  tempDir: string = './uploads/temp/frames',
  count: number = 8,
): Promise<string[]> {
  logger.info('[extractFrames] Iniciando extração de frames', { videoPath, count });

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const sessionId = Date.now().toString();
  const sessionDir = path.join(tempDir, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  // Gera timemarks fixos distribuídos pela duração do vídeo.
  // Fallback para intervalos de 1 segundo quando o container não tem metadado de duração
  // (comum em webm gravado pelo browser via MediaRecorder).
  let timemarks: string[];
  try {
    const duration = await getVideoDuration(videoPath);
    const step = duration / count;
    timemarks = Array.from({ length: count }, (_, i) =>
      (step * (i + 0.5)).toFixed(2)
    );
    logger.info('[extractFrames] Duração obtida via ffprobe', { duration, timemarks });
  } catch {
    // Container sem duração (webm, mkv live, etc.) — usa os primeiros N segundos
    timemarks = Array.from({ length: count }, (_, i) => String(i));
    logger.warn('[extractFrames] Duração indisponível — usando timemarks fixos (0..N-1s)', { timemarks });
  }

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timemarks,
        folder: sessionDir,
        filename: 'frame-%i.jpg',
        size: '640x?',
      })
      .on('end', () => {
        logger.info('[extractFrames] Extração de frames concluída', { sessionDir });
        resolve();
      })
      .on('error', (err) => {
        logger.error('[extractFrames] Erro ao extrair frames', err);
        reject(err);
      });
  });

  const frameFiles = fs
    .readdirSync(sessionDir)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .map((f) => path.join(sessionDir, f));

  const base64Frames = frameFiles.map((filePath) => {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
  });

  logger.info(`[extractFrames] ${base64Frames.length} frames extraídos e convertidos para base64`);

  return base64Frames;
}

export default { extractFrames };
