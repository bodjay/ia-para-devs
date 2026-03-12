import { Annotation } from "@langchain/langgraph";

export type VideoClassification =
  | "surgery"
  | "consultation_video"
  | "physiotherapy"
  | "violence_screening"
  | "unknown";

/**
 * Estado do workflow de análise de vídeo clínico especializado em saúde da mulher.
 *
 * @field filePath            - Caminho para o arquivo de vídeo enviado.
 * @field videoType           - Hint opcional do usuário sobre o tipo de vídeo.
 * @field frames              - Frames extraídos do vídeo (base64 JPEG).
 * @field videoClassification - Classificação inferida pelo agente de visão.
 * @field yoloAnalysis        - Resultado da análise YOLOv8 (objetos + poses + análise clínica).
 *                              null quando a API YOLOv8 está indisponível.
 * @field results             - Resultados acumulados de cada agente especializado.
 * @field finalReport         - Relatório clínico final gerado pelo agente de síntese.
 */
export default Annotation.Root({
  filePath: Annotation<string>(),
  videoType: Annotation<string | null>(),
  frames: Annotation<string[]>({
    default: () => [],
  }),
  videoClassification: Annotation<VideoClassification>(),
  yoloAnalysis: Annotation<Record<string, any> | null>({
    default: () => null,
  }),
  results: Annotation<Array<{ source: string; result: string }>>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  finalReport: Annotation<string>(),
});
