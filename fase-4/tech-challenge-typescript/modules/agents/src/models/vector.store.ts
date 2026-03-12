import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";

function createVectorStore() {
  const embeddings = new OllamaEmbeddings({
    model: "qwen2.5:0.5b",
  });

  return new MemoryVectorStore(embeddings);
}

export default createVectorStore;