import healthAssistant from "./agents/health.assistant.js";
import appointmentAssistant from "./agents/appointments.assistant.js";
import reasoningAssistant from "./agents/reasoning.assistant.js";
import classifierAssistant from "./agents/classifier.assistant.js";
import atendantWorkflow from "./agents/atendant.workflow.js";
import midiaAnalystAssistant from "./agents/midia.analyst.assistant.js";

const app = function main() {
console.log("[Tech challenge - Fase 3] Assistente Virtual Médico v1.0");

  return {
    healthAssistant,
    appointmentAssistant,
    reasoningAssistant,
    classifierAssistant,
    midiaAnalystAssistant,
    atendantWorkflow,
  };
}

export default app();

