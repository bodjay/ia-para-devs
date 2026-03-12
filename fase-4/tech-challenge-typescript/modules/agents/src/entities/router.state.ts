import { Annotation } from "@langchain/langgraph";
import AgentOutput from "./agent.output.js";
import { Classification } from "./classification.js";

export default Annotation.Root({
  query: Annotation<string | Buffer>(),
  filePath: Annotation<string | null>(),
  summary: Annotation<string>(),
  classification: Annotation<Classification>(),
  sentiment: Annotation<Object | string>(),
  results: Annotation<AgentOutput[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  finalAnswer: Annotation<string>(),
});
