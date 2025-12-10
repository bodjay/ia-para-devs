import { Ollama } from "@langchain/ollama";

/**
 * @description Cria um agente local utilizando o modelo "smollm2:1.7b" da Ollama.
 * Com suporte a tools e capacidade de entender e responder minimamente em português brasileiro (pt-BR).
 * 
 * @returns Uma instância do agente local configurado.
 * 
 * @example
 * ```ts
 * const response = await agent.invoke("Tell me a joke.");
 * console.log(response); // Output: "Why did the scarecrow win an award? Because he was outstanding in his field!"
 * ```
 */
const agent = new Ollama({
  model: "smollm2:1.7b",
});

export default agent;   