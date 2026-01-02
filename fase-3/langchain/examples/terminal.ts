import { AIMessage, ToolMessage } from "langchain";
import readline from "readline";
import env from "dotenv";

// import agents from "../src/index.js";
import basicAgent from "../src/agents/doctor-assistant.js";

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
        basicAgent.invoke({
          query: question
        })
        // Invoke the chain with the user's question
        const response = await basicAgent.invoke({
          query: question
        });

        console.log(response)
        // const refs = [];
        // const toolsCalls = [];
        // for (const message of response || []) {
        //   if (message instanceof AIMessage) {
        //     if (!message.content) continue;
        //     console.log(`[Assistente]: ${message.content}`);
        //   }

        //   if (message instanceof ToolMessage) {
        //     toolsCalls.push(message.name);

        //     if (message.artifact)
        //       refs.push(...message.artifact);
        //   }
        // }

        // if (toolsCalls.length > 0) {
        //   console.log("\n");
        //   console.log(`[Ferramentas utilizadas]`);
        //   console.log(`${toolsCalls.reduce((acc, curr) => {
        //     return acc + `\n - ${curr}`;
        //   }, "")}`)
        // }

        // if (refs.length > 0) {
        //   const sources = refs.map(ref => ref?.metadata.source);
        //   const uniques = [...new Set(sources)];

        //   console.log("\n");
        //   console.log(`[Referencias]`);
        //   console.log(uniques.reduce((acc, curr) => {
        //     return acc + `\n - ${curr}`;
        //   }, ""))
        // }

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