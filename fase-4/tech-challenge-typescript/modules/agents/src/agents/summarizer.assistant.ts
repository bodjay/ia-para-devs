/**
 * Summarizer Assistant
 *
 * This assistant synthesizes and condenses information from query results
 * into concise, well-structured summaries.
 */
import { ChatOllama } from "@langchain/ollama";
import RouterState from "../entities/router.state.js";
import logger from "../services/logger.js";

const llm = new ChatOllama({
  model: "qwen2.5:0.5b",
  temperature: 0.3,
  numCtx: 128000,
});

/**
 * @description Agente especializado em sintetizar e resumir informações de múltiplas fontes.
 * Este agente processa resultados obtidos de diferentes agentes e cria um resumo conciso,
 * bem-estruturado e informativo. Mantém as informações mais relevantes e elimina redundâncias,
 * preservando incertezas quando presentes.
 * 
 * @param state 
 * @returns Um objeto contendo o resumo sintetizado.
 * 
 * @example
 * ```ts
 * const response = await SummarizerAssistant({
 *   query: "What are the main concerns about pregnancy?",
 *   results: [
 *     { source: "prenatal_care", sentiment: "Anxiety about health..." },
 *     { source: "sentiment_analysis", sentiment: "Worried tone detected..." }
 *   ]
 * });
 * console.log(response);
 * // Output: { summary: "The main concerns expressed relate to pregnancy health and emotional well-being..." }
 * ```
 */
async function SummarizerAssistant(state: typeof RouterState.State) {
  logger.info('[debug: SummarizerAssistant] Iniciando síntese e resumo...');

  const summaryResponse = await llm.invoke([
    {
      role: "system",
      content: `
        <|start_header_id|>
          Role:
        <|end_header_id|>
          You are a Summarizer Assistant specialized in condensing and synthesizing information 
          from multiple sources into clear, concise, and well-structured summaries. \n

        <|start_header_id|>
          Context:
        <|end_header_id|>
        Original Query: ${state.query} \n

        <|start_header_id|>
          Task:
        <|end_header_id|>
          - Extract the most relevant information from the provided results. \n
          - Remove redundancies and consolidate similar points. \n
          - Create a concise, well-organized summary. \n
          - Maintain key details while reducing verbosity. \n
          - Preserve any mentioned uncertainties or caveats. \n

        <|start_header_id|>
          Output Format:
        <|end_header_id|>
          - Start with a brief overview (1-2 sentences). \n
          - Organize information into logical sections if applicable. \n
          - Highlight key points and findings. \n
          - End with any important limitations or uncertainties. \n

        <|start_header_id|>
          Constraints:
        <|end_header_id|>
          - Keep the summary concise and informative. \n
          - Do NOT make conclusions beyond what is presented in the results. \n
          - Do NOT introduce new information not in the provided context. \n
          - Do NOT repeat verbatim from the source results. \n
          - Preserve uncertainties and express them clearly. \n
          - Use clear, accessible language. \n
          - Focus on practical and actionable information. \n
      `
    },
    { role: "user", content: `Summarize the following information: ${state.query}` }
  ]);

  const summaryText = typeof summaryResponse.content === 'string' 
    ? summaryResponse.content 
    : JSON.stringify(summaryResponse.content);

  logger.info('[debug: SummarizerAssistant] Resumo gerado com sucesso');
  logger.info('[debug: SummarizerAssistant] Resultado:', summaryText);

  return { summary: summaryText };
}

export default SummarizerAssistant;
