/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */
import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";

import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import SentimentAnalyzer, { SentimentAnalyzerConfig } from "../tools/sentiment.analyzer.js";

const llm = new ChatOllama({ model: "qwen2.5:0.5b" });

const agent = createAgent({
  model: llm,
  tools: [SentimentAnalyzer],  

});

/**
 * @description  Agente especializado em cuidados pré-natais que analisa consultas relacionadas a sinais de ansiedade gestacional, preocupações relacionadas à gravidez e checkups pré-natais. Ele processa os resultados dos agentes especializados, identifica informações relevantes e sintetiza uma resposta final informativa e concisa. O agente deve ser capaz de lidar com incertezas e propagar essas incertezas para a resposta final, evitando conclusões definitivas quando o contexto não for claro.
 * Ele também deve ser capaz de identificar referências no contexto e incluí-las na resposta final, se presentes. 
 * @param state 
 * @returns Um objeto contendo a resposta final sintetizada.
 * 
 * @example
 * ```ts
 * const response = await SentimentAssistant({
 *   query: "What are the signs of gestational anxiety?",
 * });
 * console.log(response);
 * // Output: { finalAnswer: "The signs of gestational anxiety include..." }
 * ```
 */
async function SentimentAssistant(state: typeof RouterState.State) {
  logger.info('[debug: SentimentAssistant] Analizando sentimento...')

  const result = await agent.invoke(
    {
      messages: [
        {
          role: "system",
          content: `
        <|start_header_id|>
          Role:
        <|end_header_id|>
            You're a Sentiment Assistant that analyze sentiment from query, \n
            You MUST use SentmentAnalyzer tool to analyze the sentiment of the query. \n
            You MUST use the provided tools to gather information and insights related to the query. \n            

        <|start_header_id|>
          Task:
        <|end_header_id|>\n 
            - Analyze the sentiment of the query. \n

        <|start_header_id|>
          Output:
        <|end_header_id|>
            - Provide a concise summary of the sentiment analysis results. \n

        <|start_header_id|>
          Available tools:
        <|end_header_id|>
            Here is a list of functions in JSON format that you can invoke. \n
            ${JSON.stringify(toolsDefinitions)}\n 

        <|start_header_id|>
          Constrains:
        <|end_header_id|>
          - You SHOULD NOT be conclusive. \n
          - You SHOULD NOT make assumptions outside the provided context. \n
          - You SHOULD propagate uncertainties from the context to the final answer. \n
          - If there are references in the context, you MUST include them in the final answer. \n
      `
        },
        { role: "user", content: `Analyze sentiment of ${state.summary}` }
      ]
    }
  );

  logger.info('[debug: SentimentAssistant] Resultado:', result);

  return { results: [{ source: "sentiment_analyzer", result: result.messages.at(-1)?.content }] };
}

const toolsDefinitions = [
  JSON.stringify(SentimentAnalyzerConfig),
];

export default SentimentAssistant;