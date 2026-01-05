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
import TriageAssistant from "./triage.assistant.js";
import HealthAssistant from "./health.assistant.js";
import RouterState from "../entities/router.state.js";
import AgentInput from "../entities/agent.input.js";
import ReasoningAssistant from "./reasoning.assistant.js";

function routeToAgents(state: typeof RouterState.State): Send {
  return new Send(state.classification.source, { query: state.classification.query });
}

const workflow = new StateGraph(RouterState)
  .addNode("classify", TriageAssistant)
  .addNode("appointments", AppointmentAssistant)
  .addNode("question", HealthAssistant)
  .addNode("synthesize", ReasoningAssistant)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeToAgents, ["appointments", "question"])
  .addEdge("appointments", "synthesize")
  .addEdge("question", "synthesize")
  .addEdge("synthesize", END)
  .compile();

export default {
  invoke: (input: AgentInput) => workflow.invoke(input),
};