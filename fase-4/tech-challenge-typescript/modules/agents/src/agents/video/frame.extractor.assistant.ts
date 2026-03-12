import VideoRouterState from "../../entities/video.router.state.js";
import { extractFrames } from "../../services/extract_video_frames.js";
import logger from "../../services/logger.js";

/**
 * @description Nó do workflow responsável por extrair frames do vídeo clínico
 * e populá-los no estado como strings base64.
 *
 * Extrai até 8 frames distribuídos uniformemente ao longo do vídeo,
 * redimensionados para 640px de largura para otimizar a análise pelo modelo de visão.
 *
 * @param state Estado atual contendo `filePath`.
 * @returns `{ frames: string[] }` — array de frames JPEG em base64.
 *
 * @example
 * const result = await FrameExtractorAssistant({ filePath: "uploads/cirurgia.mp4" });
 * // → { frames: ["<base64>", "<base64>", ...] }
 */
async function FrameExtractorAssistant(state: typeof VideoRouterState.State) {
  logger.info('[FrameExtractorAssistant] Iniciando extração de frames do vídeo...');

  if (!state.filePath) {
    logger.warn('[FrameExtractorAssistant] filePath não definido — sem frames para extrair.');
    return { frames: [] };
  }

  try {
    const frames = await extractFrames(state.filePath, './uploads/temp/frames', 8);
    logger.info(`[FrameExtractorAssistant] ${frames.length} frames extraídos com sucesso.`);
    return { frames };
  } catch (error) {
    logger.error('[FrameExtractorAssistant] Falha na extração de frames:', error);
    return { frames: [] };
  }
}

export default FrameExtractorAssistant;
