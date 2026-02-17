/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */
import { ChatOllama } from "@langchain/ollama";
import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";
import SentimentAnalyzerService from "../services/sentment.analyzer.js";

const llm = new ChatOllama({ model: "llama3.2:1b" });

/**
 * @description  Agente especializado em cuidados pré-natais que analisa consultas relacionadas a sinais de ansiedade gestacional, preocupações relacionadas à gravidez e checkups pré-natais. Ele processa os resultados dos agentes especializados, identifica informações relevantes e sintetiza uma resposta final informativa e concisa. O agente deve ser capaz de lidar com incertezas e propagar essas incertezas para a resposta final, evitando conclusões definitivas quando o contexto não for claro.
 * Ele também deve ser capaz de identificar referências no contexto e incluí-las na resposta final, se presentes. 
 * @param state 
 * @returns Um objeto contendo a resposta final sintetizada.
 * 
 * @example
 * ```ts
 * const response = await PrenatalCareAssistant({
 *   query: "What are the signs of gestational anxiety?",
 * });
 * console.log(response);
 * // Output: { finalAnswer: "The signs of gestational anxiety include..." }
 * ```
 */
async function PrenatalCareAssistant(state: typeof RouterState.State) {
  logger.info('[debug: PrenatalCareAssistant] Organizando a resposta...')

  if (state.results.length === 0) {
    return { finalAnswer: "Não encontrei nada relacionado..." };
  }

  const synthesisResponse = await llm.invoke([
    {
      role: "system",
      content: `
        <|start_header_id|>
          Role:
        <|end_header_id|>
            You're a Prenatal Care Assistant that analyze sentment from query, 
            identify signs of gestational anxiety, pregnancy-related concerns, and prenatal checkups. \n

        <|start_header_id|>
          Context:
        <|end_header_id|>
        ${JSON.stringify(state.results)} \n

        <|start_header_id|>
          Task:
        <|end_header_id|>\n 
          - Signs of gestational anxiety and pregnancy-related concerns: \n
          - Look for mentions of anxiety, stress, mood changes, sleep disturbances, or physical symptoms related to pregnancy. \n
          - Identify concerns about prenatal checkups, fetal health, or pregnancy complications. \n

        <|start_header_id|>
          Output:
        <|end_header_id|>
          You MUST respond with ONLY the final answer as a concise and informative text. \n
          Example of final answer: 
          "The signs of gestational anxiety include excessive worry, restlessness, and sleep disturbances.
            If you have concerns about prenatal checkups or fetal health,
            it's important to consult with your healthcare provider for personalized advice." \n

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
          - If context has "References", include them in the final answer. \n
      `
    },
    { role: "user", content: state.results.join("\n\n") }
  ]);

  logger.info('[debug: PrenatalCareAssistant] Resultado:', synthesisResponse)

  return { finalAnswer: synthesisResponse.content };
}

const toolsDefinitions = [
  {
    name: "SentmentAnalyzer",
    description: "Analyze sentiment of a text file and return results as JSON.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The query to analyze sentiment for." },
      },
      required: ["query"]
    }
  }
];

export default PrenatalCareAssistant;