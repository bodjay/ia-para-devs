import agents from "../src/index.js";

import readline from "readline";

async function runChat() {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("Chat iniciado com doutor. Digite '!q' para sair.");

  const chat = () => {
    rl.question("Você: ", async (question: string) => {
      if (question.toLowerCase() === "!q") {
        rl.close();
        return;
      }
      try {
        // Invoke the chain with the user's question
        const response = await agents.weatherAgent.invoke({
          messages: [
            {
              role: "system", content: `
                Synthesize these search results to answer the original question: "${question}"

                - Combine information from multiple sources without redundancy
                - Highlight the most relevant and actionable information
                - Note any discrepancies between sources
                - Keep the response concise and well-organized
              `,
            },
            { role: "user", content: question }
          ]
        });
        // const response = await agents.graphAgent.invoke({
        //   query: question
        // });

        console.log(`Agente: ${response.messages.at(-1)?.content}`);
      } catch (error) {
        console.error("Ocorreu um erro:", error);
      }
      chat(); // Continue the chat loop
    });
  };

  chat();
}

runChat();