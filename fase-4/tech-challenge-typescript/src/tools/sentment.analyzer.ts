//  Generate sentment Analyzer tool code
import { tool } from "@langchain/core/tools";
import z from "zod";

const SentmentAnalyzer = tool(
  async (input: unknown) => {
    const { query } = input as { query: string };
    
    return `The sentiment of the query "${query}" is positive.`;
  },
  {
    name: "SentmentAnalyzer",
    description: "Analyze the sentiment of a given query and return whether it's positive, negative, or neutral.",
    schema: z.object({
      query: z.string().describe("The input query for which to analyze the sentiment."),
    }),
  }
);

export default SentmentAnalyzer;