import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import routerState from "../entities/router.state.js";
import logger from "../services/logger.js";

const llm = new ChatOllama({ model: "llama3.1:8b", temperature: 0 });

/**
 * @description Cria um agente especializado em classificar consultas de pacientes ou médicos, determinando a fonte apropriada para responder à consulta e gerando subconsultas otimizadas.
 * @param state 
 * @returns Um objeto contendo a classificação da consulta.
 * 
 * @example
 * ```ts
 * const response = await ClassifierAssistant({
 *   query: "Book an appointment for Alice",
 * });
 * console.log(response);
 * // Output: { classification: { source: "appointments", query: "Book an appointment for Alice" } }
 * ```
 */
async function ClassifierAssistant(state: typeof routerState.State) {
  logger.info('[debug: ClassifierAssistant] Classificando a consulta...');

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
          "source": "appointments" | "question" | "blog",
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

      - Use "blog" for: any other subject related to healthcare technology, industry trends \n
      {"classification": {"source": "blog", "query": "Why AI Still Isn’t Fixing Patient Referrals—And How It Could"}} \n
      
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

  logger.info('[debug: ClassifierAssistant] Resultado:', result);

  return { classification: result.classification };
}

// Structured output schema for classifier
const ClassificationResultSchema = z.object({
  classification: z?.object({
    source: z.enum(["question", "appointments", "blog"]),
    query: z.string(),
  }).nullable()
    .describe("Classification of patient/doctor query/request"),
});


export default ClassifierAssistant;