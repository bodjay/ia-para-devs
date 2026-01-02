/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */

import { tool, createAgent } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import { StateGraph, Annotation, START, END, Send } from "@langchain/langgraph";
import { z } from "zod";
import { randomUUID } from "crypto";

// Type definitions
interface AgentInput {
  query: string;
}

interface AgentOutput {
  source: string;
  result: string;
}

interface Classification {
  source: "question" | "appointments";
  query: string;
}

// State definition with reducer for collecting parallel results
const RouterState = Annotation.Root({
  query: Annotation<string>(),
  classification: Annotation<Classification>(),
  results: Annotation<AgentOutput[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  finalAnswer: Annotation<string>(),
});

// Structured output schema for classifier
const ClassificationResultSchema = z.object({
  classification: z.object({
    source: z.enum(["question", "appointments"]),
    query: z.string(),
  }).describe("Classification of user request"),
});


// Tools
const searchAppoinment = tool(
  async ({ name, birthday }) => {
    const fakeAppointment = {
      id: randomUUID(),
      name,
      birthday,
      date: new Date().toLocaleDateString(),
    };

    return fakeAppointment;
  },
  {
    name: "search_appointments",
    description: `
      Search appointment by name and birthday:      
      Respond in JSON format
    `,
    schema: z.object({
      name: z.string(),
      birthday: z.string(),
    }),
  }
);


const bookAppoinment = tool(
  async ({ name }) => {
    console.log('[debug: bookAppoinment] Agendando consulta...')

    return {
      name,
      date: new Date().toLocaleDateString(),
    };
  },
  {
    name: "create_appointments",
    description: "Creates appointment by name",
    schema: z.object({
      name: z.string(),
    }),
  }
);


// Models and agents
// const llm = new ChatOpenAI({ model: "gpt-4o", apiKey: process.env.OPENAI_API_KEY });
// const routerLlm = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });

const llm = new ChatOllama({ model: "llama3.2:1b" });
const routerLlm = new ChatOllama({ model: "llama3.2:1b" });

/**
 * Concise Appointment Agent Prompt
 * For models with limited context windows
 */
const appointmentAgent = createAgent({
  model: llm,
  tools: [searchAppoinment, bookAppoinment],
  systemPrompt: `
    Manage appointments only. Do not discuss medical issues.
    Use tools to achive the query and give a response using the  following:

    Available tools:
    search_appointments: Use to find appointments using parameters {name, birthday}
    book_appointments: Use to book appointments using parameter {name}

    ## RESPONSE

    ### Respond
    "📅 Appointment:
    • Patient: [Name]
    • Date/Time: [DateTime]

    ### FOR NEW APPOINTMENTS:
    "📅 Appointment:
    • For: [Name]
    • Date/Time: [DateTime]

    ### FOR MISSING INFO:
    "I need your full name and birthday to proceed."

    ## EXAMPLES:
    Query: "Check appointment for John, birthday 05/15/1980"
    Action: search_appointments(name="John", birthday="05/15/1980")

    Query: "Book appointment for tomorrow"
    Response: "I can book that. What's your full name and birthday?"
`.trim(),
});

const questionAgent = createAgent({
  model: llm,
});

// Workflow nodes
async function classifyQuery(state: typeof RouterState.State) {
  const classificationInstructions = `
    You MUST respond with ONLY valid JSON matching this schema:
    {
      "classification": {
        "source": "appointments" | "question",
        "query": string
      }
    }

    Extract the following from the original query:
    - Patient name (if mentioned)
    - Date/time references
    - Symptoms/medical concerns
    - Appointment actions (book, check, cancel, etc.)

    Choose sources:
    - Use "appointments" for: booking, checking, canceling, or modifying appointments
    - Use "question" for: symptoms, medical advice, treatment options, health information

    Generate ONE sub-query per relevant source. If the query doesn't relate to a source, omit it.

    Example responses:
    {"classification": {"source": "appointments", "query": "Search appointment for PATIENT_NAME, born PATIENT_BIRTHDAY"}}
    {"classification": {"source": "question", "query": "Headache treatment options"}}
    {"classification": null}

    Now process: "${state.query}"
  `;

  const structuredLlm = routerLlm.withStructuredOutput(ClassificationResultSchema);

  const result = await structuredLlm.invoke([
    {
      role: "system",
      content: classificationInstructions
    },
    { role: "user", content: state.query }
  ]);

  console.log('[debug:classify] Dados da classificação', result);

  return { classification: result.classification };
}

function routeToAgents(state: typeof RouterState.State): Send {
  return new Send(state.classification.source, { query: state.classification.query });
}

async function queryAppointment(state: AgentInput) {
  console.log('[debug: queryAppointment] Buscando consulta...')
  const result = await appointmentAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  console.log({result})
  return { results: [{ source: "appointments", result: result.messages.at(-1)?.content }] };
}

async function queryQuestion(state: AgentInput) {
  console.log('[debug: queryQuestion] Consultando assistente virtual de saúde...')
  const result = await questionAgent.invoke({
    messages: [
      {
        role: "system", content: `
            You're medical assistant that auxiliate general practitioner while his screening.
            Avoid duplicated explanations.
            Inserts a pharagraph indicating the needed human validation of the response.
          
            <|begin_of_question|>
              ${state.query}
            <|end_of_question|>`.trim()
      },
      { role: "user", content: state.query }
    ]
  });
  return { results: [{ source: "question", result: result.messages.at(-1)?.content }] };
}

async function synthesizeResults(state: typeof RouterState.State) {
  if (state.results.length === 0) {
    return { finalAnswer: "No results found from any knowledge source." };
  }

  const formatted = state.results.map(
    (r) => `**From ${r.source.charAt(0).toUpperCase() + r.source.slice(1)}:**\n${r.result}`
  );

  const synthesisResponse = await routerLlm.invoke([
    {
      role: "system",
      content: `Realte the results with the original query: ${state.query}"    
      `
    },
    { role: "user", content: formatted.join("\n\n") }
  ]);

  return { finalAnswer: synthesisResponse.content };
}

// Build workflow
const workflow = new StateGraph(RouterState)
  .addNode("classify", classifyQuery)
  .addNode("appointments", queryAppointment)
  .addNode("question", queryQuestion)
  .addNode("synthesize", synthesizeResults)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeToAgents, ["appointments", "question"])
  .addEdge("appointments", "synthesize")
  .addEdge("question", "synthesize")
  .addEdge("synthesize", END)
  .compile();

const result = await workflow.invoke({
  query: "``My name is Roberto, born in 04/09/1994, i want to book an appointment for tomorrow``"
});

console.log("[Assistent]", result.finalAnswer)
throw 1;
export default {
  invoke: (input: AgentInput) => workflow.invoke(input),
};