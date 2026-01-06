import atendantWorkflow from "./agents/atendant.workflow.js";

const app = function main() {
  console.log("[Tech challenge - Fase 3] Ajudante Virtual v1.0");

  return {
    atendantWorkflow,
  };
}

export default app();

