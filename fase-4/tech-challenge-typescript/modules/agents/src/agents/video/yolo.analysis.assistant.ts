import VideoRouterState from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const YOLO_API_URL = process.env.YOLO_API_URL || "http://localhost:8000";

/**
 * @description Nó do workflow de vídeo que executa análise YOLOv8 nos frames extraídos.
 *
 * Chama a API Python (modules/yolo) via POST /detect/frames com os frames base64
 * já extraídos pelo FrameExtractorAssistant.
 *
 * Resultado armazenado em `state.yoloAnalysis` e disponível para todos os
 * agentes especializados subsequentes (cirurgia, fisioterapia, triagem de violência).
 *
 * Falha silenciosa: se a API YOLO estiver indisponível, retorna null e
 * o workflow continua normalmente com análise LLaVA.
 *
 * @param state Estado com `frames` (base64[]) e `videoType` opcional.
 * @returns `{ yoloAnalysis: object | null }`
 */
async function YoloAnalysisAssistant(state: typeof VideoRouterState.State) {
  logger.info("[YoloAnalysisAssistant] Executando análise YOLOv8 nos frames...");

  if (!state.frames || state.frames.length === 0) {
    logger.warn("[YoloAnalysisAssistant] Sem frames disponíveis para análise YOLOv8.");
    return { yoloAnalysis: null };
  }

  try {
    const response = await fetch(`${YOLO_API_URL}/detect/frames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frames: state.frames,
        analysis_type: state.videoType ?? undefined,
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout
    });

    if (!response.ok) {
      logger.warn(`[YoloAnalysisAssistant] YOLO API indisponível (${response.status}). Continuando sem YOLO.`);
      return { yoloAnalysis: null };
    }

    const result = await response.json();
    logger.info("[YoloAnalysisAssistant] Análise YOLO concluída.", {
      type: result.clinical_analysis?.video_type,
      risk: result.clinical_analysis?.risk_level,
      frames: result.frames_processed,
    });

    return { yoloAnalysis: result };
  } catch (error: any) {
    if (error.name === "TimeoutError" || error.code === "ECONNREFUSED") {
      logger.warn("[YoloAnalysisAssistant] YOLO API não disponível. Continuando sem análise YOLO.");
    } else {
      logger.error("[YoloAnalysisAssistant] Erro inesperado:", error);
    }
    return { yoloAnalysis: null };
  }
}

export default YoloAnalysisAssistant;
