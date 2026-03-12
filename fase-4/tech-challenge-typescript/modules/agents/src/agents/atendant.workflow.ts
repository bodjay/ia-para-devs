import { StateGraph, START, END, Send } from "@langchain/langgraph";
import ClassifierAssistant from "./classifier.assistant.js";
import RouterState from "../entities/router.state.js";
import AgentInput from "../entities/agent.input.js";
import ReasoningAssistant from "./reasoning.assistant.js";

import logger from "../services/logger.js";
import PrenatalCareAssistant from "./prenatal.care.assistant.js";
import PostpartumAssistant from "./postpartum.assistant.js";
import ViolenceVictimAssistant from "./violence.victim.assistant.js";
import SentimentAssistant from "./sentiment.assistant.js";
import SummarizerAssistant from "./summarizer.assistant.js";
import ModalExtractorAssistant from "./modal.extractor.assistant.js";

/**
 * Routes to the appropriate specialized agent based on classification.
 * Passes the full accumulated state so specialized agents have access
 * to summary, sentiment, and all prior results.
 */
function routeToAgents(state: typeof RouterState.State): Send {
  logger.info(`[AtendantWorkflow] Routing to agent: ${state.classification}`);

  if (!state.classification) {
    logger.warn('[warn: AtendantWorkflow] Classification is null — falling back to not_defined.');
    return new Send("not_defined", state);
  }

  return new Send(state.classification, state);
}

/**
 * @description Workflow do agente atendente que orquestra a classificação,
 * roteamento para agentes especializados e síntese de respostas.
 *
 * Pipeline:
 *   START → modal_extraction → summarizer → sentiment_analyzer → classify
 *     → [prenatal_care | postpartum | violence_victim | not_defined]
 *       → synthesize → END
 *
 * @example
 * ```ts
 * const response = await AtendantWorkflow.invoke({
 *   query: "Estou com muito medo da minha gravidez e não consigo dormir.",
 * });
 * console.log(response.finalAnswer);
 * ```
 */
const workflow = new StateGraph(RouterState)
  .addNode("modal_extraction", ModalExtractorAssistant)
  .addNode("summarizer", SummarizerAssistant)
  .addNode("sentiment_analyzer", SentimentAssistant)
  .addNode("classify", ClassifierAssistant)
  .addNode("prenatal_care", PrenatalCareAssistant)
  .addNode("postpartum", PostpartumAssistant)
  .addNode("violence_victim", ViolenceVictimAssistant)
  .addNode("not_defined", ReasoningAssistant)
  .addNode("synthesize", ReasoningAssistant)
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
  invoke: (input: AgentInput) => workflow.invoke(input),
};
