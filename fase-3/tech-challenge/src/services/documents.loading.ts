import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

export default async function loadDocumentsExample() {
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