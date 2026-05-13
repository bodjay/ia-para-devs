import { VectorServiceClient } from '../../http/VectorServiceClient';
import { GraphStateType } from '../state';

const MAX_RESULTS = 5;
const SCORE_THRESHOLD = 0.6;

export function createRetrievalNode(vectorClient: VectorServiceClient) {
  return async function retrievalNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    if (!state.question || state.question.trim() === '') {
      return { retrievedContext: [] };
    }

    const results = await vectorClient.search(state.question, MAX_RESULTS);
    const retrievedContext = results
      .filter((r) => r.score <= SCORE_THRESHOLD)
      .map((r) => r.text);

    return { retrievedContext };
  };
}
