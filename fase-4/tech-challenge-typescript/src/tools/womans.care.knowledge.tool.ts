import * as z from "zod";
import { tool } from "@langchain/core/tools";

import vectorStore from "../services/load.documents.js";
import logger from "../services/logger.js";

export const WomansCareKnowledgeConfig = {
  name: "WomansCareKnowledgeTool",
  description: "Analyze query related to woman's mental health, pre-natal care, and related concerns.",
  schema: z.object({
    query: z.string().describe("The query to analyze. It should be related to woman's mental health, pre-natal care, and related concerns."),
  }),
  responseFormat: "content_and_artifact",
}

const WomansCareKnowledgeTool = tool(
  async ({ query }) => {
    logger.info(`[WomansCareKnowledgeTool] Analyzing query: ${query}`);

    const retrievedDocs = await vectorStore.similaritySearch(query, 2);
    const serialized = retrievedDocs
      .map(
        (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
      )
      .join("\n");

    return [serialized, retrievedDocs];
  },
  WomansCareKnowledgeConfig
);

export default WomansCareKnowledgeTool;