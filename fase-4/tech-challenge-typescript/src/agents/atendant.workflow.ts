import { StateGraph, START, END, Send, } from "@langchain/langgraph";
import ClassifierAssistant from "./classifier.assistant.js";
import RouterState from "../entities/router.state.js";
import AgentInput from "../entities/agent.input.js";
import ReasoningAssistant from "./reasoning.assistant.js";

import logger from "../services/logger.js";
import PrenatalCareAssistant from "./prenatal.care.assistant.js";

function routeToAgents(state: typeof RouterState.State): Send {
  if (!state.classification.source) {
    logger.error('[error: AtendantWorkflow] Source not defined in classification.', state.classification);

    // TODO:  Implementar retentativas de reasoning.
    // Fallback para blog se o source não estiver definido.
    return new Send("blog", { query: state.query });
  }

  return new Send(state.classification.source, { query: state.classification.query });
}

/**
 * @description Workflow do agente atendente que orquestra a classificação, roteamento para agentes especializados e síntese de respostas.
 * @returns Um objeto contendo a resposta final sintetizada.
 * @example
 * ```ts
 * const response = await AtendantWorkflow.invoke({
 *   query: "What are the symptoms of flu?",
 * });
 * console.log(response);
 * // Output: { finalAnswer: "The symptoms of flu include..." }
 * ```
 */
const workflow = new StateGraph(RouterState)
  .addNode("classify", ClassifierAssistant)
  .addNode("prenatal_care", PrenatalCareAssistant)
  .addNode("postpartum", PrenatalCareAssistant)
  .addNode("violence_victim", PrenatalCareAssistant)
  .addNode("synthesize", ReasoningAssistant)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeToAgents, ["prenatal_care", "postpartum", "violence_victim"])
  .addEdge("prenatal_care", "synthesize")
  .addEdge("postpartum", "synthesize")
  .addEdge("violence_victim", "synthesize")
  .addEdge("synthesize", END)
  .compile();

export default {
  invoke: (input: AgentInput) => workflow.invoke(input),
};