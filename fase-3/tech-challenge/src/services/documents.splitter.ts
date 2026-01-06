import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "langchain";

async function splitDocuments(docs: Document<Record<string, any>>[]) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allSplits = await splitter.splitDocuments(docs);

  return allSplits;
}

export default splitDocuments;