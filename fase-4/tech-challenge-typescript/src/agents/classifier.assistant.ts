import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import routerState from "../entities/router.state.js";
import logger from "../services/logger.js";

const llm = new ChatOllama({ model: "llama3.1:8b", temperature: 0 });

/**
 * @description Agente responsável por classificar a consulta do paciente ou médico,
 * identificando o tema principal e roteando para o agente especializado correspondente.
 * Ele analisa a consulta original e gera uma classificação que inclui a fonte (prenatal_care, postpartum ou violence_victim)
 * e uma sub-query otimizada para o agente especializado.
 * Se a consulta não se encaixar em nenhuma categoria, ele retorna null, permitindo que o workflow trate adequadamente. 
 * 
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
      You're a sentiment classifier that interprets a text and choose correct source. \n
      You MUST choose the most relevant source for the query among: prenatal_care, postpartum, violence_victim. \n
      If the query doesn't relate to any of these sources, you MUST return null. \n
      The query may relate to only one source. \n

    <|start_header_id|>
      Output:
    <|end_header_id|>
      You MUST respond with ONLY valid JSON matching this schema: \n
      {
        "classification": {
          "source": "prenatal_care" | "postpartum" | "violence_victim",
          "query": string
        }
      } \n
    
    <|start_header_id|>
      Task:
    <|end_header_id|>
      Identify the following from the original query: ${state.query} \n
    
      - Prenatal care: signs of gestational anxiety.
      - Postpartum: signs of postpartum depression.
      - Victims of violence: vocal patterns indicative of trauma.
      
    <|start_header_id|>
      Choose sources:
    <|end_header_id|>
      - Use "prenatal_care" for: signs of gestational anxiety, pregnancy-related concerns, prenatal checkups: \n
      {"classification": {"source": "prenatal_care", "query": "I'm feeling anxious about my pregnancy"}} \n
      
      - Use "postpartum" for: signs of postpartum depression, recovery concerns, postnatal care: \n
      {"classification": {"source": "postpartum", "query": "I'm feeling sad after giving birth"}} \n

      - Use "violence_victim" for: vocal patterns indicative of trauma, emotional distress related to abuse: \n
      {"classification": {"source": "violence_victim", "query": "I feel scared and unsafe at home"}} \n

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
    source: z.enum(["prenatal_care", "postpartum", "violence_victim"]),
    query: z.string(),
  }).nullable()
    .describe("Classification of patient/doctor query/request"),
});


export default ClassifierAssistant;