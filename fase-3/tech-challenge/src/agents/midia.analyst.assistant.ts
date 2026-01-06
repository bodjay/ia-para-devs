import { createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";

import retrieve from "../tools/retrieve.docs.js";
import logger from "../services/logger.js";
import AgentInput from "../entities/agent.input.js";

/**
 * @description Cria um agente especializado em análise de mídia para responder consultas relacionadas a postagens de blog na área de saúde.
 * 
 * @returns Uma instância do agente.
 * 
 * @example
 * ```ts
 * const response = await midiaAnalystAgent.invoke({
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
            You're midia analyst assistant that summarizes. \n            

            <|start_header_id|>
              Knowledge:
            <|end_header_id|>
            - You have access to a tool that retrieves context from to blog post. 
              Use the tool to help answer user queries.
          
          <|start_header_id|>
            Task:
          <|end_header_id|>
            - Given a user question, use the tools avaiable to retrieve relevant context.
            - Summarize the context to answer the user's question concisely.

          <|start_header_id|>
            Available tools:
          <|end_header_id|>
            Here is a list of functions in JSON format that you can invoke. \n
            ${JSON.stringify(toolsDefinitions)}\n 

          <|start_header_id|>
            Constrains:
          <|end_header_id|>            
            - You MUST use the tool to retrieve context then help answer user queries.                    
            - Respond with metadata.source at the end of answer. \n
              e.g:
                References:
                  - URL: https://www.example.com/...
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