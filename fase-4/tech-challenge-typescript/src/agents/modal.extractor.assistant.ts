/**
 * Modal Extractor Assistant
 *
 * This assistant extracts audio from video files and transcribes the extracted audio to text.
 * It handles the complete pipeline of audio extraction and transcription.
 */
import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";

import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import extractAudioFromVideo from "../tools/extract.audio.from.video.js";
import TranscribeAudioToText from "../tools/transcribe.audio.js";

const llm = new ChatOllama({ model: "qwen2.5:0.5b" });

const agent = createAgent({
  model: llm,
  tools: [extractAudioFromVideo, TranscribeAudioToText],
});

/**
 * @description Agente especializado em extração de áudio de vídeos e transcrição de áudio para texto.
 * Este agente processa um arquivo de vídeo, extrai o áudio e transcreve o conteúdo de áudio
 * em texto estruturado. Ideal para processar materiais em vídeo e convertê-los em texto.
 * 
 * @param state 
 * @returns Um objeto contendo a transcrição extraída do vídeo/áudio.
 * 
 * @example
 * ```ts
 * const response = await ModalExtractorAssistant({
 *   query: "Extract and transcribe audio from video.mp4",
 * });
 * console.log(response);
 * // Output: { extraction: "The transcribed text from the video..." }
 * ```
 */
async function ModalExtractorAssistant(state: typeof RouterState.State) {
  logger.info('[debug: ModalExtractorAssistant] Iniciando extração de áudio e transcrição...');

  // Se não há arquivo para processar, retornar vazio
  if (!state.filePath) {
    logger.info('[debug: ModalExtractorAssistant] Nenhum arquivo para processar');
    return { extraction: "" };
  }

  try {
    const result = await agent.invoke(
      {
        messages: [
          {
            role: "system",
            content: `
        <|start_header_id|>
          Role:
        <|end_header_id|>
            You're a Modal Extractor Assistant that extracts audio from videos and transcribes the audio to text. \n
            You MUST use ExtractAudioFromVideo tool to extract audio from the video file. \n
            You MUST use TranscribeAudioToText tool to transcribe the extracted audio to text. \n

        <|start_header_id|>
          Task:
        <|end_header_id|>\n 
            - Extract audio from the provided video file. \n
            - Transcribe the extracted audio to text. \n
            - Return the complete transcription. \n

        <|start_header_id|>
          Output:
        <|end_header_id|>
            - Provide the complete transcribed text from the video/audio. \n
            - Include any relevant information or timestamps if available. \n

        <|start_header_id|>
          Available tools:
        <|end_header_id|>
            Here is a list of functions in JSON format that you can invoke. \n
            ${JSON.stringify(toolsDefinitions)}\n 

        <|start_header_id|>
          Constraints:
        <|end_header_id|>
          - You MUST extract audio first before transcribing. \n
          - You SHOULD provide accurate transcription of the audio content. \n
          - You SHOULD NOT make assumptions about content not in the audio. \n
          - If extraction or transcription fails, report the error clearly. \n
      `
          },
          { role: "user", content: `Extract and transcribe audio from this video/audio file: ${state.filePath}` }
        ]
      }
    );

    logger.info('[debug: ModalExtractorAssistant] Resultado:', result);

    const extractedContent = result.messages.at(-1)?.content;
    return { extraction: extractedContent };
  } catch (error) {
    logger.error('[error: ModalExtractorAssistant] Erro durante extração/transcrição', error);
    return { extraction: `Erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

const toolsDefinitions = [
  {
    name: "ExtractAudioFromVideo",
    description: "Extract audio from a given video file and save it to a specified path.",
    schema: {
      type: "object",
      properties: {
        videoPath: { type: "string", description: "The path to the input video file." },
        tempPath: { type: "string", description: "The path where the extracted audio will be saved (e.g., 'temp_audio.wav')." }
      },
      required: ["videoPath", "tempPath"]
    }
  },
  {
    name: "TranscribeAudioToText",
    description: "Transcribe audio from a given audio file to text.",
    schema: {
      type: "object",
      properties: {
        audioPath: { type: "string", description: "The path to the audio file to be transcribed." }
      },
      required: ["audioPath"]
    }
  }
];

export default ModalExtractorAssistant;
