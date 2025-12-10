import env from "dotenv";
import localAgent from "./agents/agente-local.js";
import weatherAgent from "./agents/agente-meteorologico.js";

env.config();

(async function main() {
  const localAgentResponse = await localAgent.invoke("olá, entende pt-BR?");
  console.log({ localAgentResponse });

  const weatherResponse = await weatherAgent.invoke({
    messages: [{ role: "user", content: "Qual é a previsão do tempo em São Paulo?" }],
  })
  console.log({ weatherResponse });
})();
