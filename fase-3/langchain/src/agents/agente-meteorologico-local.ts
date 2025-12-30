import { createAgent, SystemMessage } from "langchain";
import { ChatOllama } from "@langchain/ollama";

import getWeather from "../tools/get.weather.js";
import retrieve from "../tools/retrieve.docs.js";

const SYSTEM_PROMPT = new SystemMessage(
  `
  You are a helpful weather agent that informs weather temperature using the get_weather tool. Use the tool to answer weather-related questions.
  You have access to a tool that retrieves context from a blog post. Use the tool to help answer user queries.

  <output_format>
  </output_format>
`);

/**
 * @description Cria um agente meteorológico utilizando o modelo "openai:gpt-4o-mini" com suporte a uma tool de previsão do tempo.
 * 
 * @param config - Configurações do agente.
 * 
 * @returns Uma instância do agente meteorológico configurado.
 * 
 * @example
 * ```ts
 * const response = await weatherAgent.invoke({
 *   messages: [{ role: "user", content: "Qual é a previsão do tempo em São Paulo?" }],
 * })
 * console.log(response); // Output: "A previsão do tempo em São Paulo é sempre ensolarado!"
 * ```
 * 
 */
const provider = new ChatOllama({
  model: "llama3.2:1b", // llama3.2:1b, ministral-3:3b
  temperature: 0,
});

const agent = createAgent({
  model: provider,
  systemPrompt: SYSTEM_PROMPT,
  tools: [getWeather, retrieve],
});

const formatted = (question: string) => {
  return (
    question.length > 100
      ? question.slice(0, 100) + "..."
      : question)
    .toUpperCase();
}

export default {
  invoke: (question: string) => {
    const formattedQuestion = formatted(question);

    return agent.invoke({
      messages: [
        {
          role: "system", content: `
            Synthesize these search results to answer the original question: "${formattedQuestion}"

            - Combine information from multiple sources without redundancy
            - Note any discrepancies between sources
            - Keep the response concise and well-organized
          ` },
        { role: "user", content: formattedQuestion },
      ],
    });
  },
};