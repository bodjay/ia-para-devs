import { createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";

import retrieve from "../tools/retrieve.docs.js";
import logger from "../services/logger.js";
import AgentInput from "../entities/agent.input.js";

/**
 * @description Cria um agente meteorológico com suporte a uma tool de previsão do tempo.
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
  temperature: 0.1,
});

const agent = createAgent({
  model: provider,
  tools: [retrieve],
});

const formatted = (question: string) => {
  return (
    question.length > 100
      ? question.slice(0, 100) + "..."
      : question)
    .toUpperCase();
}

async function MidiaAnalystAssistant(state: AgentInput) {
  logger.info('[debug: MidiaAnalystAssistant] Analisando consulta de midia...');

  const formattedQuestion = formatted(state.query);

  const result = await agent.invoke({
    messages: [
      {
        role: "system", content: `
          <|start_header_id|>
            Role:
          <|end_header_id|>
            You're midia analyst assistant that summarizes blog posts. \n
            You MUST use the tool to retrieve context from blog posts to help answer user queries.

            <|start_header_id|>
              Knowledge:
            <|end_header_id|>
            - You have access to a tool that retrieves context from a healthcare blog post. 
              Use the tool to help answer user queries related to healthcare.
          
          <|start_header_id|>
            Task:
          <|end_header_id|>
            - Given a user question, use the tool to retrieve relevant context from the blog post. \n
            - Summarize and reason about the content to answer the user's question. \n
            - Try to reason about the underlying semantic intent / meaning. \n

          <|start_header_id|>
            Available tools:
          <|end_header_id|>
            Here is a list of functions in JSON format that you can invoke. \n
            ${JSON.stringify(toolsDefinitions)}\n 

          <|start_header_id|>
            Constrains:
          <|end_header_id|>
            - Keep the response concise and well-organized and not redundant.
            - You SHOULD NOT include any other text in the response.
            - If you decide to invoke any of the function(s), you MUST put it in the format of [func_name1(params_name1=params_value1, params_name2=params_value2...), func_name2(params)]\n
            You SHOULD NOT include any other text in the response.\n
            - Respond with metadata.source at the end of answer. \n
              e.g: "
                References:
                  - URL: https://www.example.com/...
              "
        ` },
      { role: "user", content: formattedQuestion },
    ],
  });

  logger.info('[debug: MidiaAnalystAssistant] Resultado:', result);

  return { results: [{ source: "blog", result: result.messages.at(-1)?.content }] };
}


const toolsDefinitions = [
  {
    "name": "retrieve",
    "description": "",
    "parameters": {
      "type": "dict",
      "required": [
        "query"
      ],
      "properties": {
        "query": {
          "type": "string",
          "description": "The query to search for in the blog posts."
        }
      }
    }
  }  
];


export default MidiaAnalystAssistant;