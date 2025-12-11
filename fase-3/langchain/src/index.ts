import env from "dotenv";
import weatherAgent from "./agents/agente-meteorologico-local.js";

env.config();

(async function main() {
  const weatherResponse = await weatherAgent.invoke({
    messages: [{ role: "user", content: "Qual é a previsão do tempo em São Paulo?" }],
  })

  console.log({ weatherResponse });
})();
