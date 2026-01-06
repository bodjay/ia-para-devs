import createVectorStore from "../models/vector.store.js";
import loadDocuments from "./documents.loading.js";
import splitDocuments from "./documents.splitter.js";
import logger from "./logger.js";

const docs = await loadDocuments();
if (docs.length > 0)
  logger.info(`Total de caractéres: ${docs[0].pageContent.length} carregados de ${docs[0].metadata.source}`);

const splittedDocs = await splitDocuments(docs);
logger.info(`Postagem de blog separada em ${splittedDocs.length} para melhorar a interpretação do modelo`);

const vectorStore = createVectorStore();
await vectorStore.addDocuments(splittedDocs);

export default vectorStore;