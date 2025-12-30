import createVectorStore from "../models/vector.store.js";
import loadDocumentsExample from "./documents.loading.js";
import splitDocumentsExample from "./documents.splitter.js";

const docs = await loadDocumentsExample();
const splittedDocs = await splitDocumentsExample(docs);

const vectorStore = createVectorStore();
await vectorStore.addDocuments(splittedDocs);

export default vectorStore;