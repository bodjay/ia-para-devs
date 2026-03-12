import fs from "fs";
import path from "path";
import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import { extract } from "../services/extract_audio_from_video.js";
import { transcribe } from "../services/transcribe_audio_to_text.js";

/**
 * @description Agente especializado em extração de áudio de vídeos e transcrição para texto.
 *
 * Se `state.filePath` não estiver definido, passa adiante sem modificar o estado (consulta textual direta).
 * Ao processar um arquivo, atualiza `state.query` com o texto transcrito, tornando-o disponível
 * para os agentes subsequentes (summarizer, sentiment_analyzer, etc.).
 *
 * Pipeline de processamento:
 *   1. Extrai o áudio do vídeo via ffmpeg (fluent-ffmpeg)
 *   2. Transcreve o áudio para texto via Google Cloud Speech
 *   3. Retorna `{ query: transcription }` para atualizar o estado do workflow
 *
 * @param state Estado atual do workflow contendo `filePath` opcional.
 * @returns `{ query: transcription }` se houve arquivo, `{}` caso contrário.
 *
 * @example
 * ```ts
 * // Com vídeo de consulta:
 * const result = await ModalExtractorAssistant({ filePath: "uploads/consulta.mp4", query: "" });
 * // → { query: "Boa tarde, vim fazer uma consulta de pré-natal..." }
 *
 * // Sem arquivo — consulta textual direta:
 * const result = await ModalExtractorAssistant({ filePath: null, query: "Tenho medo da gravidez" });
 * // → {} (query original preservada no estado)
 * ```
 */
async function ModalExtractorAssistant(state: typeof RouterState.State) {
  logger.info('[ModalExtractorAssistant] Verificando arquivo para extração multimodal...');

  if (!state.filePath) {
    logger.info('[ModalExtractorAssistant] Nenhum arquivo fornecido — modo de consulta textual.');
    return {};
  }

  const tempDir = "./uploads/temp";

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    logger.info(`[ModalExtractorAssistant] Extraindo áudio de: ${state.filePath}`);
    const audioPath = await extract(String(state.filePath), tempDir);

    logger.info(`[ModalExtractorAssistant] Transcrevendo áudio: ${audioPath}`);
    const transcriptionOutputPath = path.join(tempDir, `transcription_${Date.now()}.txt`);
    const transcription = await transcribe(audioPath, transcriptionOutputPath);

    if (!transcription) {
      logger.warn('[ModalExtractorAssistant] Transcrição retornou vazia — mantendo query original.');
      return {};
    }

    logger.info('[ModalExtractorAssistant] Extração e transcrição concluídas com sucesso.');
    return { query: transcription };

  } catch (error) {
    logger.error('[error: ModalExtractorAssistant] Falha durante extração/transcrição:', error);
    return {};
  }
}

export default ModalExtractorAssistant;
