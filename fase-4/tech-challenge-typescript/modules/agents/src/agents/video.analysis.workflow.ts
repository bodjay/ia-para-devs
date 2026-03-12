import { StateGraph, START, END, Send } from "@langchain/langgraph";
import VideoRouterState, { VideoClassification } from "../entities/video.router.state.js";
import FrameExtractorAssistant from "./video/frame.extractor.assistant.js";
import YoloAnalysisAssistant from "./video/yolo.analysis.assistant.js";
import VideoClassifierAssistant from "./video/video.classifier.assistant.js";
import SurgeryVideoAssistant from "./video/surgery.video.assistant.js";
import ConsultationVideoAssistant from "./video/consultation.video.assistant.js";
import PhysiotherapyVideoAssistant from "./video/physiotherapy.video.assistant.js";
import ViolenceScreeningVideoAssistant from "./video/violence.screening.video.assistant.js";
import VideoReportAssistant from "./video/video.report.assistant.js";
import logger from "../services/logger.js";

/**
 * Roteia para o agente especializado com base na classificação do vídeo.
 */
function routeToSpecialist(state: typeof VideoRouterState.State): Send {
  const classification: VideoClassification = state.videoClassification || "unknown";
  logger.info(`[VideoAnalysisWorkflow] Roteando para agente: ${classification}`);

  const routeMap: Record<VideoClassification, string> = {
    surgery: "surgery_analysis",
    consultation_video: "consultation_analysis",
    physiotherapy: "physiotherapy_analysis",
    violence_screening: "violence_screening_analysis",
    unknown: "violence_screening_analysis", // fallback conservador
  };

  return new Send(routeMap[classification] ?? "violence_screening_analysis", state);
}

/**
 * @description Workflow de análise de vídeo clínico especializado em saúde da mulher.
 *
 * Pipeline:
 *   START
 *     → extract_frames       (ffmpeg: extrai frames do vídeo como base64)
 *     → classify_video       (llava: identifica contexto clínico)
 *     → [surgery_analysis | consultation_analysis | physiotherapy_analysis | violence_screening_analysis]
 *     → generate_report      (síntese clínica estruturada)
 *   END
 *
 * Modelos utilizados:
 * - llava          → visão computacional (classificação + análise de frames)
 * - llama3.2:1b    → síntese textual do relatório final
 *
 * @example
 * ```ts
 * const report = await VideoAnalysisWorkflow.invoke({
 *   filePath: "uploads/video-1234.mp4",
 *   videoType: "surgery", // hint opcional
 * });
 * console.log(report.finalReport);
 * ```
 */
const workflow = new StateGraph(VideoRouterState)
  .addNode("extract_frames", FrameExtractorAssistant)
  .addNode("yolo_analysis", YoloAnalysisAssistant)
  .addNode("classify_video", VideoClassifierAssistant)
  .addNode("surgery_analysis", SurgeryVideoAssistant)
  .addNode("consultation_analysis", ConsultationVideoAssistant)
  .addNode("physiotherapy_analysis", PhysiotherapyVideoAssistant)
  .addNode("violence_screening_analysis", ViolenceScreeningVideoAssistant)
  .addNode("generate_report", VideoReportAssistant)
  .addEdge(START, "extract_frames")
  .addEdge("extract_frames", "yolo_analysis")
  .addEdge("yolo_analysis", "classify_video")
  .addConditionalEdges("classify_video", routeToSpecialist, [
    "surgery_analysis",
    "consultation_analysis",
    "physiotherapy_analysis",
    "violence_screening_analysis",
  ])
  .addEdge("surgery_analysis", "generate_report")
  .addEdge("consultation_analysis", "generate_report")
  .addEdge("physiotherapy_analysis", "generate_report")
  .addEdge("violence_screening_analysis", "generate_report")
  .addEdge("generate_report", END)
  .compile();

export default {
  invoke: (input: { filePath: string; videoType?: string | null }) =>
    workflow.invoke({ filePath: input.filePath, videoType: input.videoType ?? null }),
};
