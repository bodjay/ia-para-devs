import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";

function createVectorStore() {
  const embeddings = new OllamaEmbeddings({
    model: "llama3.2:1b", // llama3.2:1b, ministral-3:3b
  });

  return new MemoryVectorStore(embeddings);
}

export default createVectorStore;