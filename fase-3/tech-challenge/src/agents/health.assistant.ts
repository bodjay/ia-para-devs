import { ChatOllama } from "@langchain/ollama";
import AgentInput from "../entities/agent.input.js";
import { createAgent } from "langchain";
import logger from "../services/logger.js";

const fineTunnedModel = new ChatOllama({
  model: "trained",
});

async function HealthAssistant(state: AgentInput) {
  const questionAgent = createAgent({
    model: fineTunnedModel,
  });

  logger.info('[debug: HealthAssistant] Processando sua dúvida...')

  const result = await questionAgent.invoke({
    messages: [
      {
        role: "system", content: `
            You're medical assistant that auxiliate general practitioner while his screening.
            Avoid duplicated explanations. \n
          
            <|begin_of_question|>
              ${state.query}
            <|end_of_question|>`.trim()
      },
      { role: "user", content: state.query }
    ]
  });

  logger.info('[debug: HealthAssistant] Resultado:', result);

  return { results: [{ source: "question", result: result.messages.at(-1)?.content }] };
}


export default HealthAssistant;