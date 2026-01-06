import { createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";

import retrieve from "../tools/retrieve.docs.js";

/**
 * @description Cria um agente de analista de mídia com suporte a uma tool de recuperação de documentos.
 * @returns Uma instância do agente de analista de mídia configurado.
 * 
 * @example
 * ```ts
 * const response = await midiaAnalyst.invoke({
 *   messages: [{ role: "user", content: "<question>" }],
 * })
 * console.log(response); // Output: "{ "summary": "...", "score": number, "reasoning": "..." }"
 * ```
 * 
 */
const llm = new ChatOllama({
  model: "smollm2:1.7b", // smollm2:1.7b, llama3.2:1b, ministral-3:3b
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
            You're midia analyst assistant that summarizes blog posts. \n
            You MUST use the tool to retrieve context from blog posts to help answer user queries.

            ## Knowledge
            - You have access to a tool that retrieves context from a healthcare blog post. 
              Use the tool to help answer user queries related to healthcare.

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