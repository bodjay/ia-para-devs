import { createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";

import retrieve from "../tools/retrieve.docs.js";

/**
 * @description Cria um agente com suporte a uma tool de previsão do tempo.
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
const llm = new ChatOllama({
  model: "llama3.2:1b", // llama3.2:1b, ministral-3:3b
  temperature: 0,
});

const agent = createAgent({
  model: llm,
  tools: [retrieve],
});

const formatted = (question: string) => {
  return (
    question.length > 100
      ? question.slice(0, 200) + "..."
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
            # Role
            You're medical assistant that auxiliate general practitioner while his screening.

            ## Available tools
            - You have access to a tool that retrieves context from a tech blog post. 
              Use the tool to help answer user queries related to technologies.
            
            ## Task
            Try to reason about the underlying semantic intent / meaning. \n
            Here is the initial question:
            <question>
              ${formattedQuestion}
            </question>

            Respond ONLY with strict JSON in this format (no explanation, no preamble):
            Respond in JSON:
              {{
                "summary": "...",
                "score": number,
                "reasoning": "..."
              }}
          ` },
        { role: "user", content: formattedQuestion },
      ],
    });
  },
};