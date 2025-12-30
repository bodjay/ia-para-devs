import { AIMessage, ToolMessage } from "langchain";
import agents from "../src/index.js";

import readline from "readline";

async function runChat() {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.clear();
  console.log("Chat iniciado com o Assistente. Digite '/sair' para sair.");
  console.log("\n");

  const chat = () => {
    rl.question("Você: ", async (question: string) => {
      if (question.toLowerCase() === "/sair") {
        rl.close();
        return;
      }
      try {
        console.log("-----\n");
        // Invoke the chain with the user's question
        const response = await agents.weatherAgent.invoke(question);

        const refs = [];
        for (const message of response.messages || []) {
          if (message instanceof AIMessage) {
            if (!message.content) continue;
            console.log(`[Assistente]: ${message.content}`);
          }

          if (message instanceof ToolMessage) {
            refs.push(...message.artifact);
          }
        }

        if (refs.length > 0) {
          const formatted = refs.reduce((acc, curr) => {
            return acc + `\n -${curr?.metadata.source}`;
          }, "");
          console.log("\n");
          console.log(`[Referencias] ${formatted}`);
        }

        console.log("-----\n");
      } catch (error) {
        console.error("Ocorreu um erro:", error);
      }
      chat(); // Continue the chat loop
    });
  };

  chat();
}

runChat();