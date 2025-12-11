import { createAgent } from "langchain";
import getWeather from "../tools/get.weather.js";

const SYSTEM_PROMPT = `
  You are a helpful weather agent that provides weather information using the get_weather tool.
  Always use the tool to answer weather-related questions.
  Answer in Portuguese Brasil (pt-BR).
`;

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
const agent = createAgent({  
  model: "ollama:smollm2:1.7b",
  systemPrompt: SYSTEM_PROMPT,
  tools: [getWeather],
});


export default agent;