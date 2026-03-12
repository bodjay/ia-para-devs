import z from "zod";
import { extract } from "../services/extract_audio_from_video.js";
import { transcribe } from "../services/transcribe_audio_to_text.js";
import { tool } from "@langchain/core/tools";
import logger from "../services/logger.js";

const TranscribeAudioToTextConfig = {
  name: "TranscribeAudioToText",
  description: "Transcribe audio from a given audio file to text.",
  schema: z.object({
    audioPath: z.string().describe("The path to the audio file to be transcribed."),
  }),
}

const TranscribeAudioToText = tool(
  async (input: unknown) => {
    const { audioPath } = input as { audioPath: string };

    logger.info('[transcribeAudioToText] Iniciando processo de transcrição de áudio para texto', { audioPath });

    const transcription = await transcribe(audioPath, "transcription.txt");

    logger.info('[transcribeAudioToText] Processo de transcrição concluído');
    return transcription;
  },
  TranscribeAudioToTextConfig
);

export default TranscribeAudioToText;