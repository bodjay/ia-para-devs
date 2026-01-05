/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */

import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

import routerState from "../entities/router.state.js";

const llm = new ChatOllama({ model: "llama3.1:8b" });

// Workflow nodes
async function TriageAssistant(state: typeof routerState.State) {
  const classificationInstructions = `
    <|start_header_id|>
      Role:
    <|end_header_id|>
      You're a source classifier that interprets a query/request and choose correct source, \n
      while provide a optimized sub-queries.

    <|start_header_id|>
      Output:
    <|end_header_id|>
      You MUST respond with ONLY valid JSON matching this schema: \n
      {
        "classification": {
          "source": "appointments" | "question",
          "query": string
        }
      } \n
    
    <|start_header_id|>
      Task:
    <|end_header_id|>
      Extract the following from the original query: ${state.query} \n
    
      - Patient name (if mentioned)
      - Date/time references
      - Appointment actions (book, check, cancel, search, consult etc.)

      
    <|start_header_id|>
      Choose sources:
    <|end_header_id|>
      - Use "appointments" for: booking, checking, search, canceling, or modifying appointments: \n
      {"classification": {"source": "appointments", "query": "Search appointment for Roberto"}} \n
      
      - Use "question" for: symptoms, medical advice, treatment options, health information.
      {"classification": {"source": "question", "query": "Headache treatment options"}} \n
      
      - Generate ONE sub-query. If the query doesn't relate to a source, omit it: \n
      {"classification": null}
  `;
  const structuredLlm = llm.withStructuredOutput(ClassificationResultSchema);

  const result = await structuredLlm.invoke([
    {
      role: "system",
      content: classificationInstructions
    },
    { role: "user", content: state.query }
  ]);

  // console.log('[debug:classify] Dados da classificação', result);

  return { classification: result.classification };
}

// Structured output schema for classifier
const ClassificationResultSchema = z.object({
  classification: z?.object({
    source: z.enum(["question", "appointments"]),
    query: z.string(),
  }).nullable()
    .describe("Classification of patient/doctor query/request"),
});


export default TriageAssistant;