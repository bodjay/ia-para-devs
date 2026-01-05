import healthAssistant from "./agents/health.assistant.js";
import appointmentAssistant from "./agents/appointments.assistant.js";
import reasoningAssistant from "./agents/reasoning.assistant.js";
import triageAssistant from "./agents/triage.assistant.js";
import atendantWorkflow from "./agents/atendant.workflow.js";
import metrological from "./agents/metrological.js";

export default {
  metrological,
  healthAssistant,
  appointmentAssistant,
  reasoningAssistant,
  triageAssistant,
  atendantWorkflow,
};