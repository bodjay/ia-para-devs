import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

async function loadDocuments() {
  const pTagSelector = "p";
  const cheerioLoader = new CheerioWebBaseLoader(
    "https://thehealthcareblog.com/",
    {
      selector: pTagSelector,
    }
  );

  const docs = await cheerioLoader.load();
  return docs;
}

export default loadDocuments;