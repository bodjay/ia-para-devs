/**
 * Multi-Source Knowledge Router Example
 *
 * This example demonstrates the router pattern for multi-agent systems.
 * A router classifies queries, routes them to specialized agents in parallel,
 * and synthesizes results into a combined response.
 */
import { StateGraph, START, END, Send, } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import AppointmentAssistant from "./appointments.assistant.js";
import ClassifierAssistant from "./classifier.assistant.js";
import HealthAssistant from "./health.assistant.js";
import RouterState from "../entities/router.state.js";
import AgentInput from "../entities/agent.input.js";
import ReasoningAssistant from "./reasoning.assistant.js";
import MidiaAnalystAssistant from "./midia.analyst.assistant.js";
import logger from "../services/logger.js";

function routeToAgents(state: typeof RouterState.State): Send {
  if (!state.classification.source) {
    logger.error('[error: AtendantWorkflow] Source not defined in classification.', state.classification);

    // TODO:  Implementar retentativas de reasoning.
    // Fallback para blog se o source não estiver definido.
    return new Send("blog", { query: state.query });
  }``

  return new Send(state.classification.source, { query: state.classification.query });
}

const workflow = new StateGraph(RouterState)
  .addNode("classify", ClassifierAssistant)
  .addNode("appointments", AppointmentAssistant)
  .addNode("question", HealthAssistant)
  .addNode("blog", MidiaAnalystAssistant)
  .addNode("synthesize", ReasoningAssistant)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeToAgents, ["appointments", "question", "blog"])
  .addEdge("appointments", "synthesize")
  .addEdge("question", "synthesize")
  .addEdge("blog", "synthesize")
  .addEdge("synthesize", END)
  .compile();

export default {
  invoke: (input: AgentInput) => workflow.invoke(input),
};