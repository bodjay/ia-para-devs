import { Annotation } from "@langchain/langgraph";
import AgentOutput from "./agent.output.js";
import Classification from "./classification.js";

export default Annotation.Root({
  query: Annotation<string>(),
  classification: Annotation<Classification>(),
  results: Annotation<AgentOutput[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  finalAnswer: Annotation<string>(),
});
