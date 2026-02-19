import { StateGraph, START, END, Send, } from "@langchain/langgraph";
import ClassifierAssistant from "./classifier.assistant.js";
import RouterState from "../entities/router.state.js";
import AgentInput from "../entities/agent.input.js";
import ReasoningAssistant from "./reasoning.assistant.js";

import logger from "../services/logger.js";
import PrenatalCareAssistant from "./prenatal.care.assistant.js";
import SentimentAssistant from "./sentiment.assistant.js";
import SummarizerAssistant from "./summarizer.assistant.js";
import ModalExtractorAssistant from "./modal.extractor.assistant.js";

function routeToAgents(state: typeof RouterState.State): Send {
  logger.info(`[AtendantWorkflow] Routing to agent: ${state.classification}, query: ${state.query}`);

  if (!state.classification) {
    logger.error('[error: AtendantWorkflow] Source not defined in classification.', state.classification);

    // TODO:  Implementar retentativas de reasoning.
    // Fallback para blog se o source não estiver definido.
    return new Send("not_defined", { query: state.query });
  }


  return new Send(state.classification, { query: state.query });
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
  .addNode('modal_extraction', ModalExtractorAssistant)
  .addNode('summarizer', SummarizerAssistant)
  .addNode("sentiment_analyzer", SentimentAssistant)
  .addNode("classify", ClassifierAssistant)
  .addNode("prenatal_care", PrenatalCareAssistant)
  .addNode("postpartum", PrenatalCareAssistant)
  .addNode("violence_victim", PrenatalCareAssistant)
  .addNode("synthesize", ReasoningAssistant)
  .addNode("not_defined", ReasoningAssistant)
  .addEdge(START, "modal_extraction")
  .addEdge("modal_extraction", "summarizer")
  .addEdge("summarizer", "sentiment_analyzer")
  .addEdge("sentiment_analyzer", "classify")
  .addConditionalEdges("classify", routeToAgents, ["prenatal_care", "postpartum", "violence_victim", "not_defined"])
  .addEdge("prenatal_care", "synthesize")
  .addEdge("postpartum", "synthesize")
  .addEdge("violence_victim", "synthesize")
  .addEdge("not_defined", "synthesize")
  .addEdge("synthesize", END)
  .compile();

export default {
  invoke: (input: AgentInput,) => workflow.invoke(input),
};