import readline from "readline";
import env from "dotenv";

// import agents from "../src/index.js";
import agents from "../src/index.js";

env.config();

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
        const response = await agents.atendantWorkflow.invoke({
          query: question
        });

        console.info("[Assistent]", response.finalAnswer)
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