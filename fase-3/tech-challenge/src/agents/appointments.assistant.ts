import { createAgent, tool } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import { randomUUID } from "crypto";
import { z } from "zod";

import { AgentInput } from "../entities/index.js";

const llm = new ChatOllama({
  model: "llama3.2:1b",
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

  console.log('[debug: Consultas médicas] Identificando operação de consultas...')
  const result = await appointmentAgent.invoke({
    messages: [
      {
        role: "system", content: `
          <|start_header_id|>
            Role:
          <|end_header_id|>
            You're a an appointment manager.\n
            You MUST search, book or cancel patients appointments using available tools.\n

          <|start_header_id|>
            Task:
          <|end_header_id|>
            Analyze user's query and respond the request using the results \n
            from tools.

          <|start_header_id|>
            Constrains:
          <|end_header_id|>
            - MUST respond only appointments related content. \n
            - Case found or create an appointment, respond with its formation\n
            - If you decide to invoke any of the function(s), you MUST put it in the format of [func_name1(params_name1=params_value1, params_name2=params_value2...), func_name2(params)]\n
              You SHOULD NOT include any other text in the response.\n
            - Extract patients name from query.\n
            - If book_appointments returns an valid JSON, so the appointments is created.
              \n inform on the response.

          <|start_header_id|>
            Available tools:
          <|end_header_id|>
            Here is a list of functions in JSON format that you can invoke. \n
            ${toolsDefinitions}\n            
        `.trim()
      },
      { role: "user", content: state.query },
    ],
  });

  console.log('[debug: Consultas médicas] Resultado do agente:', result);

  return { results: [{ source: "appointments", result: result.messages.at(-1)?.content }] };
}


const toolsDefinitions = [
  {
    "name": "search_appointment",
    "description": "",
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
    "name": "book_appointments",
    "description": "Book appointment using name parameter",
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
    console.log('[debug: searchAppoinment][tool] Buscando consulta...')
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
    console.log('[debug: bookAppoinment][tool] Agendando consulta...')

    return {
      name,
      time_slot: "10 AM",
      date: new Date().toLocaleDateString(),
    };
  },
  {
    name: "book_appointments",
    description: "Book appointment using name parameter",
    schema: z.object({
      name: z.string(),
    }),
  }
);


export default AppointmentAssistant;