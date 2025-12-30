import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

export default async function loadDocumentsExample() {
  const pTagSelector = "p";
  const cheerioLoader = new CheerioWebBaseLoader(
    "https://lilianweng.github.io/posts/2023-06-23-agent/",
    {
      selector: pTagSelector,
    }
  );

  const docs = await cheerioLoader.load();

  console.assert(docs.length === 1);
  console.log(`Total characters: ${docs[0].pageContent.length} loaded from ${docs[0].metadata.source}`);

  return docs;
}