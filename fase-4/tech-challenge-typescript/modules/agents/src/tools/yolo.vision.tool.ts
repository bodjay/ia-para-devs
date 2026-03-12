import * as z from "zod";
import { tool } from "@langchain/core/tools";
import fs from "fs";
import logger from "../services/logger.js";

const YOLO_API_URL = process.env.YOLO_API_URL || "http://localhost:8000";

export const YoloVisionToolConfig = {
  name: "YoloVisionTool",
  description:
    "Analisa vídeo ou frames usando YOLOv8 para detecção clínica especializada em saúde da mulher. " +
    "Detecta instrumentos cirúrgicos (cirurgia), linguagem corporal defensiva (violência), " +
    "movimentos de reabilitação (fisioterapia) e contexto de consulta médica. " +
    "Aceita frames base64 ou caminho de arquivo de vídeo.",
  schema: z.object({
    frames: z
      .array(z.string())
      .optional()
      .describe("Array de frames JPEG codificados em base64"),
    filePath: z
      .string()
      .optional()
      .describe("Caminho para o arquivo de vídeo (.mp4, .webm, .avi)"),
    analysisType: z
      .string()
      .optional()
      .describe(
        "Hint de tipo de análise: surgery | physiotherapy | violence_screening | consultation"
      ),
  }),
};

/**
 * LangChain tool que consome a API YOLOv8 Clinical Vision (modules/yolo).
 *
 * Pode ser chamada com frames base64 (já extraídos) ou com caminho de vídeo.
 * Retorna análise clínica estruturada em JSON.
 *
 * @example
 * // Via frames extraídos pelo FrameExtractorAssistant:
 * await YoloVisionTool.invoke({ frames: state.frames, analysisType: "violence_screening" });
 *
 * // Via arquivo de vídeo:
 * await YoloVisionTool.invoke({ filePath: "uploads/video-123.mp4" });
 */
const YoloVisionTool = tool(
  async ({ frames, filePath, analysisType }) => {
    logger.info("[YoloVisionTool] Iniciando análise YOLOv8...", {
      hasFrames: !!frames?.length,
      hasFile: !!filePath,
      analysisType,
    });

    // ── Via arquivo de vídeo ──────────────────────────────────────────────
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        return JSON.stringify({ error: `Arquivo não encontrado: ${filePath}` });
      }

      try {
        const formData = new FormData();
        const buffer = fs.readFileSync(filePath);
        const blob = new Blob([buffer]);
        formData.append("file", blob, "video.mp4");
        if (analysisType) formData.append("analysis_type", analysisType);

        const response = await fetch(`${YOLO_API_URL}/detect`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`YOLO API retornou ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        logger.info("[YoloVisionTool] Análise por arquivo concluída", {
          type: result.clinical_analysis?.video_type,
          risk: result.clinical_analysis?.risk_level,
        });
        return JSON.stringify(result);
      } catch (err: any) {
        logger.error("[YoloVisionTool] Erro na análise por arquivo", err);
        return JSON.stringify({ error: err.message });
      }
    }

    // ── Via frames base64 ─────────────────────────────────────────────────
    if (frames && frames.length > 0) {
      try {
        const response = await fetch(`${YOLO_API_URL}/detect/frames`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frames, analysis_type: analysisType }),
        });

        if (!response.ok) {
          throw new Error(`YOLO API retornou ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        logger.info("[YoloVisionTool] Análise por frames concluída", {
          frames: result.frames_processed,
          type: result.clinical_analysis?.video_type,
          risk: result.clinical_analysis?.risk_level,
        });
        return JSON.stringify(result);
      } catch (err: any) {
        logger.error("[YoloVisionTool] Erro na análise por frames", err);
        return JSON.stringify({ error: err.message });
      }
    }

    return JSON.stringify({ error: "Forneça 'frames' (base64[]) ou 'filePath' para análise." });
  },
  YoloVisionToolConfig
);

export default YoloVisionTool;
