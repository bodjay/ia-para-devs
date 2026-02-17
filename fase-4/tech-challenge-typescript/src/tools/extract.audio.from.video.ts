import z from "zod";
import { extract } from "../services/extract_audio_from_video.js";
import { tool } from "@langchain/core/tools";
import logger from "../services/logger.js";
import fs from "fs";

const extractAudioFromVideo = tool(
  async (input: unknown) => {
    const { videoPath, tempPath } = input as { videoPath: string, tempPath: string };

    logger.info('[extractAudioFromVideo] Iniciando processo de extração de áudio do vídeo', { videoPath, tempPath });

    const audioFilename = await extract(videoPath, tempPath);

    logger.info('[extractAudioFromVideo] Processo de extração concluído');

    return audioFilename;
  },

  {
    name: "extractAudioFromVideo",
    description: "Extract audio from a given video file and save it to a specified path.",
    schema: z.object({
      videoPath: z.string().describe("The path to the input video file."),
      tempPath: z.string().describe("The path where the extracted audio will be saved (e.g., 'temp_audio.wav')."),
    }),
  },

);

export default extractAudioFromVideo;