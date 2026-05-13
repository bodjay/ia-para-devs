import { Annotation } from '@langchain/langgraph';
import { CompactAnalysis, ConversationMessage, RouteType } from '../../domain/entities/OrchestratorState';

export const GraphState = Annotation.Root({
  question: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  history: Annotation<ConversationMessage[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  analysisContext: Annotation<CompactAnalysis | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  route: Annotation<RouteType>({
    reducer: (_, next) => next,
    default: () => 'chat',
  }),
  response: Annotation<string>({
    reducer: (_, next) => next,
    default: () => '',
  }),
  retrievedContext: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
});

export type GraphStateType = typeof GraphState.State;
