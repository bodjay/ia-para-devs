import "cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

const KNOWLEDGE_PATH = "./knowledges";

export default async function loadDocumentsExample() {
  const knowledge_1 = new PDFLoader(`${KNOWLEDGE_PATH}/saude-mental-meninas-mulheres.pdf`);
  const knowledge_2 = new PDFLoader(`${KNOWLEDGE_PATH}/saude-mental-perinatal.pdf`);

  const docs = await knowledge_1.load();
  const docs2 = await knowledge_2.load();

  return [...docs, ...docs2];
}