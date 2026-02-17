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

const llm = new ChatOllama({ model: "llama3.2:1b" });

/**
 * @description Cria um agente especializado em raciocínio para sintetizar respostas finais com base nos resultados obtidos de diferentes fontes.
 * @param state 
 * @returns Um objeto contendo a resposta final sintetizada.
 * 
 * @example
 * ```ts
 * const response = await ReasoningAssistant({
 *   query: "What are the symptoms of flu?",
 *   results: [
 *     { source: "question", result: "The symptoms of flu include..." },
 *     { source: "blog", result: "According to the blog post..." }
 *   ]
 * });
 * console.log(response);
 * // Output: { finalAnswer: "The symptoms of flu include... According to the blog post..." }
 * ```
 */
async function ReasoningAssistant(state: typeof RouterState.State) {
  logger.info('[debug: ReasoningAssistant] Organizando a resposta...')

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
          You are an assistant who interprets the results writed in JSON 

        <|start_header_id|>
          Context:
        <|end_header_id|>
        ${JSON.stringify(state.results)} \n

        <|start_header_id|>
          Task:
        <|end_header_id|>\n 
          - Relate the context results with the original query: ${state.query} \n    
          - Synthesize a final answer based on the context provided. \n
          - Focus on clarity and coherence. \n

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

  logger.info('[debug: ReasoningAssistant] Resultado:', synthesisResponse)

  return { finalAnswer: synthesisResponse.content };
}
export default ReasoningAssistant;