import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import VideoRouterState, { VideoClassification } from "../../entities/video.router.state.js";
import logger from "../../services/logger.js";

const llm = new ChatOllama({ model: "llava", temperature: 0 });

const ClassificationSchema = z.object({
  videoClassification: z
    .enum(["surgery", "consultation_video", "physiotherapy", "violence_screening", "unknown"])
    .describe("Tipo clínico do vídeo identificado pela análise visual dos frames"),
});

/**
 * @description Classifica o contexto clínico do vídeo analisando os primeiros frames
 * com o modelo de visão llava.
 *
 * Tipos suportados:
 * - `surgery`              → cirurgia ginecológica (instrumentos, campo operatório)
 * - `consultation_video`   → consulta médica (paciente + profissional de saúde)
 * - `physiotherapy`        → fisioterapia / exercícios de reabilitação
 * - `violence_screening`   → triagem de violência (linguagem corporal, sinais de abuso)
 * - `unknown`              → contexto não identificado
 *
 * Se `state.videoType` estiver definido (hint do usuário), usa-o diretamente
 * sem acionar o modelo de visão, economizando processamento.
 *
 * @param state Estado com `frames` e `videoType` opcional.
 * @returns `{ videoClassification: VideoClassification }`
 */
async function VideoClassifierAssistant(state: typeof VideoRouterState.State) {
  logger.info('[VideoClassifierAssistant] Classificando tipo de vídeo clínico...');

  const hintMap: Record<string, VideoClassification> = {
    surgery: "surgery",
    cirurgia: "surgery",
    consultation: "consultation_video",
    consulta: "consultation_video",
    physiotherapy: "physiotherapy",
    fisioterapia: "physiotherapy",
    violence: "violence_screening",
    violencia: "violence_screening",
    violência: "violence_screening",
  };

  if (state.videoType) {
    const mapped = hintMap[state.videoType.toLowerCase()];
    if (mapped) {
      logger.info(`[VideoClassifierAssistant] Usando hint do usuário: ${mapped}`);
      return { videoClassification: mapped };
    }
  }

  if (!state.frames || state.frames.length === 0) {
    logger.warn('[VideoClassifierAssistant] Sem frames disponíveis — retornando unknown.');
    return { videoClassification: "unknown" as VideoClassification };
  }

  // Analisa os primeiros 3 frames para classificar o contexto
  const sampleFrames = state.frames.slice(0, 3);

  try {
    const structuredLlm = llm.withStructuredOutput(ClassificationSchema);

    const imageContent = sampleFrames.flatMap((b64) => [
      { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${b64}` } },
    ]);

    const result = await structuredLlm.invoke([
      new SystemMessage(`Você é um classificador de vídeos clínicos especializados em saúde da mulher.
Analise os frames fornecidos e classifique o tipo de vídeo em uma das categorias:
- surgery: cirurgia ginecológica (campo operatório, instrumentos cirúrgicos, procedimentos invasivos)
- consultation_video: consulta médica (paciente sentada/deitada em ambiente clínico com profissional)
- physiotherapy: fisioterapia ou exercícios de reabilitação pós-parto
- violence_screening: triagem de violência doméstica (sinais de medo, postura defensiva, marcas)
- unknown: nenhuma das categorias acima

Responda APENAS com o valor da categoria correspondente.`),
      new HumanMessage({
        content: [
          { type: "text", text: "Classifique o tipo clínico deste vídeo com base nos frames." },
          ...imageContent,
        ],
      }),
    ]);

    logger.info(`[VideoClassifierAssistant] Classificação: ${result.videoClassification}`);
    return { videoClassification: result.videoClassification as VideoClassification };
  } catch (error) {
    logger.error('[VideoClassifierAssistant] Erro na classificação visual:', error);
    return { videoClassification: "unknown" as VideoClassification };
  }
}

export default VideoClassifierAssistant;
