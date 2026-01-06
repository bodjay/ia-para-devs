import { createAgent, tool } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import { randomUUID } from "crypto";
import { z } from "zod";

import { AgentInput } from "../entities/index.js";
import logger from "../services/logger.js";

const llm = new ChatOllama({
  model: "llama3.1:8b",
  temperature: 0
});

async function AppointmentAssistant(state: AgentInput) {
  /**
   * Concise Appointment Agent Prompt
   * For models with limited context windows
   */
  const appointmentAgent = createAgent({
    model: llm,
    tools: [searchAppoinment, bookAppoinment],
  });

  logger.info('[debug: AppointmentAssistant] Identificando operação de consultas...')
  const result = await appointmentAgent.invoke({
    messages: [
      {
        role: "system", content: `
          <|start_header_id|>
            Role:
          <|end_header_id|>
            You're a an appointment manager. You receive user requests related to appointments. \n            
            You MUST use available tools for book or search appointments.\n

          <|start_header_id|>
            Available tools:
          <|end_header_id|>
            Here is a list of functions in JSON format that you can invoke. \n
            ${toolsDefinitions}\n  

          <|start_header_id|>
            Task:
          <|end_header_id|>
            - Analyze user's query and respond the request using the results \n
              from tools.
            - Extract patients name from query.\n

          <|start_header_id|>
            Constrains:
          <|end_header_id|>
            - MUST respond only appointments related content. \n
            - If you decide to invoke any of the function(s), you MUST put it in the format of [func_name1(params_name1=params_value1, params_name2=params_value2...), func_name2(params)]\n
              You SHOULD NOT include any other text in the response.\n
            - If some tool returns an valid JSON, so the appointments is created. \n
              Summarize the appointment details in the final answer.         
        `.trim()
      },
      { role: "user", content: state.query },
    ],
  });

  logger.info('[debug: AppointmentAssistant] Resultado:', result);

  return { results: [{ source: "appointments", result: result.messages.at(-1)?.content }] };
}


const toolsDefinitions = [
  {
    "name": "search_appointment",
    "description": "Search, check or consult an appointment using name parameter",
    "parameters": {
      "type": "dict",
      "required": [
        "name"
      ],
      "properties": {
        "name": {
          "type": "string",
          "description": "The name of the patient. It is used to consult fake appointment."
        }
      }
    }
  },
  {
    "name": "book_appointment",
    "description": "Book, Create or Make an appointment using name parameter",
    "parameters": {
      "type": "dict",
      "required": [
        "name"
      ],
      "properties": {
        "name": {
          "type": "string",
          "description": "The name of the patient. It is used to create fake appointment."
        }
      }
    }
  }
];

// Tools
const searchAppoinment = tool(
  async ({ name }) => {
    logger.info('[debug: searchAppoinment][tool] Buscando consulta...')
    const fakeAppointment = {
      id: randomUUID(),
      name,
      date: new Date().toLocaleDateString(),
    };


    return fakeAppointment;
  },
  {
    name: "search_appointments",
    description: `Search, check or consult an appointment using name parameter`,
    schema: z.object({
      name: z.string(),
    }),
  }
);

const bookAppoinment = tool(
  async ({ name }) => {
    logger.info('[debug: bookAppoinment][tool] Agendando consulta...')

    return {
      name,
      time_slot: "10 AM",
      date: new Date().toLocaleDateString(),
    };
  },
  {
    name: "book_appointment",
    description: "Book appointment using name parameter",
    schema: z.object({
      name: z.string(),
    }),
  }
);


export default AppointmentAssistant;