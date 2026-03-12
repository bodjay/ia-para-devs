import * as z from "zod";
import { tool } from "@langchain/core/tools";

import logger from "../services/logger.js";
import SentimentAnalyzerService from "../services/sentment.analyzer.js";

export const SentimentAnalyzerConfig = {
  name: "SentimentAnalyzer",
  description: "Analyze the sentiment of a query related to woman's mental health, pre-natal care, and related concerns.",
  schema: z.object({
    query: z.string().describe("The query to analyze. It should be related to woman's mental health, pre-natal care, and related concerns."),
  }),
  responseFormat: "json",
}

const SentimentAnalyzer = tool(  
  async ({ query }) => {
    logger.info(`[SentimentAnalyzer] Analyzing query: ${query}`);

    const sentimentResults = await SentimentAnalyzerService(query);
    if (!sentimentResults) {
      logger.info(`[SentimentAnalyzer] No sentiment results found for query: ${query}`);

      return '[]';
    }

    return JSON.stringify(sentimentResults);
  },
  SentimentAnalyzerConfig
);

export default SentimentAnalyzer;