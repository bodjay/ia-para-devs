import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import routerState from "../entities/router.state.js";
import logger from "../services/logger.js";

const llm = new ChatOllama({
  model: "qwen2.5:0.5b",
  temperature: 0,
  numCtx: 128000,
});

/**
 * @description Agente responsável por classificar a consulta do paciente ou médico,
 * identificando o tema principal e roteando para o agente especializado correspondente.
 * Ele analisa a consulta original e gera uma classificação que inclui a fonte (prenatal_care, postpartum ou violence_victim).
 * Se a consulta não se encaixar em nenhuma categoria, ele retorna null, permitindo que o workflow trate adequadamente. 
 * 
 * @param state 
 * @returns Um objeto contendo a classificação da consulta.
 * 
 * @example
 * ```ts
 * const response = await ClassifierAssistant({
 *   query: "I'm feeling very anxious about my pregnancy and have been having trouble sleeping. What should I do?",
 * });
 * console.log(response);
 * // Output: { classification: { source: "prenatal_care" } }
 * ```
 */
async function ClassifierAssistant(state: typeof routerState.State) {
  logger.info('[debug: ClassifierAssistant] Classificando a consulta...');
  const structuredLlm = llm.withStructuredOutput(ClassificationResultSchema);

  const result = await structuredLlm.invoke([
    {
      role: "system",
      content: `
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
        -- Start: Structured output schema-- \n
          You MUST respond with ONLY valid JSON matching this schema: \n
          {
            "classification": {
              "source": "prenatal_care" | "postpartum" | "violence_victim",
            }
          }
        -- End: Structured output schema-- \n

        <|start_header_id|>
          Task:
        <|end_header_id|>    
          - Prenatal care: signs of gestational anxiety, pregnancy-related concerns, prenatal checkups.
          - Postpartum: signs of postpartum depression.
          - Victims of violence: vocal patterns indicative of trauma.
          
        <|start_header_id|>
          Sources examples
        <|end_header_id|>
          - Use "prenatal_care" for: signs of gestational anxiety, pregnancy-related concerns, prenatal checkups: \n
          ex. output: {"classification": {"source": "prenatal_care"}} \n
          
          - Use "postpartum" for: signs of postpartum depression, recovery concerns, postnatal care: \n
          ex. output:{"classification": {"source": "postpartum"}} \n

          - Use "violence_victim" for: vocal patterns indicative of trauma, emotional distress related to abuse: \n
          ex. output:{"classification": {"source": "violence_victim"}} \n

          - If the query doesn't relate to a source, omit it: \n
          ex. output:{"classification": null}
      `
    },
    { role: "user", content: state.query }
  ]);

  logger.info('[debug: ClassifierAssistant] Resultado:', result);

  return { classification: result.classification };
}

// Structured output schema for classifier
const ClassificationResultSchema = z.object({
  classification: z.enum(["prenatal_care", "postpartum", "violence_victim"]).nullable()
    .describe("Classification of patient/doctor query/request"),
});


export default ClassifierAssistant;