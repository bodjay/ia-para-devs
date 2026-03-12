import { ComprehendClient, DetectSentimentCommand, DetectSentimentCommandInput, SentimentScore } from "@aws-sdk/client-comprehend";
import logger from "./logger.js";

const CHUNK_SIZE = 4000;

const comprehendClient = new ComprehendClient({ region: "us-east-1" });

interface SentimentResult {
  transcription: string;
  sentiment: {
    Sentiment?: string;
    SentimentScore?: SentimentScore;
  };
}

/**
 * Split text into chunks of specified size
 */
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Analyze sentiment of a single chunk
 */
async function analyzeSentimentChunk(text: string): Promise<{
  Sentiment?: string;
  SentimentScore?: SentimentScore;
}> {
  const params: DetectSentimentCommandInput = {
    Text: text,
    LanguageCode: "pt",
  };

  const command = new DetectSentimentCommand(params);

  try {
    const data = await comprehendClient.send(command);
    return {
      Sentiment: data.Sentiment,
      SentimentScore: data.SentimentScore,
    };
  } catch (error) {
    logger.error("Error detecting sentiment:", error);
    throw error;
  }
}

/**
 * Analyze text from file, split into chunks, and save results as JSON
 */
async function SentimentAnalyzerService(query: string): Promise<SentimentResult[]> {
  logger.info(`[sentment.analyzer] Iniciando análise de sentimento para: ${query}`);

  try {
    const chunks = splitTextIntoChunks(query, CHUNK_SIZE);
    const results: SentimentResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      logger.info(`[sentment.analyzer] Analisando chunk ${i + 1}/${chunks.length}`);

      const sentiment = await analyzeSentimentChunk(chunks[i]);
      logger.info(`[sentment.analyzer] Resultado do chunk ${i + 1}:`, sentiment);

      results.push({
        transcription: chunks[i],
        sentiment,
      });
    }

    return results;
  } catch (error) {
    logger.error("Error in SentimentAnalyzerService:", error);
    throw error;
  }
}

export { analyzeSentimentChunk, splitTextIntoChunks };
export default SentimentAnalyzerService;


