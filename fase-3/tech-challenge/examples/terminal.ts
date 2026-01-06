import readline from "readline";
import env from "dotenv";

import agents from "../src/index.js";
import logger from "../src/services/logger.js";

env.config();

async function runChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Chat iniciado com o Assistente. Digite '/sair' para sair.");
  console.log("\n");

  const chat = () => {
    rl.question("Você: ", async (question: string) => {
      if (question.toLowerCase() === "/sair") return rl.close();

      try {
        console.log("-----\n");
        const response = await agents.atendantWorkflow.invoke({
          query: question,
        });

        console.info("[Assistent]", response.finalAnswer)
        console.log("-----\n");
      } catch (error) {
        logger.error('[error: Terminal] Ocorreu um erro ao processar a consulta.', error);
        console.log("Desculpe, ocorreu um erro ao processar sua consulta.");
      }

      chat();
    });
  };

  chat();
}

runChat();