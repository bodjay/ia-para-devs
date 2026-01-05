/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */

import { ChatOllama } from "@langchain/ollama";
import RouterState from "../entities/router.state.js";


const llm = new ChatOllama({ model: "llama3.2:1b" });

async function ReasoningAssistant(state: typeof RouterState.State) {
  console.log('[debug: Sintetizador] Organizando a resposta...')

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
          You are an assistant who interprets the results and synthesizes the answer in a cohesive \n
          and direct way, without drawing conclusions.

        <|start_header_id|>
          Context:
        <|end_header_id|>
        ${JSON.stringify(state.results)} \n

        <|start_header_id|>
          Task:
        <|end_header_id|>\n 
          - Relate the context results with the original query: ${state.query} \n
          - Based on the context, respond the original query \n          

        <|start_header_id|>
          Constrains:
        <|end_header_id|>
          - You SHOULD NOT include any other text in the response.
          - You SHOULD NOT be conclusive.
      `
    },
    { role: "user", content: state.results.join("\n\n") }
  ]);

  return { finalAnswer: synthesisResponse.content };
}
export default ReasoningAssistant;