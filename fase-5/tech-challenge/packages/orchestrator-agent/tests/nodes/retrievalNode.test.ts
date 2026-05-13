import { createRetrievalNode } from '../../src/infrastructure/graph/nodes/retrievalNode';
import { VectorServiceClient, VectorSearchResult } from '../../src/infrastructure/http/VectorServiceClient';

function createMockVectorClient(results: VectorSearchResult[] = []): jest.Mocked<VectorServiceClient> {
  return { search: jest.fn().mockResolvedValue(results) } as unknown as jest.Mocked<VectorServiceClient>;
}

const baseState = {
  question: 'What are the risks in a microservice architecture?',
  analysisContext: null,
  history: [],
  route: 'chat' as const,
  response: '',
  retrievedContext: [],
};

describe('retrievalNode', () => {
  it('returns retrieved texts as retrievedContext', async () => {
    const results: VectorSearchResult[] = [
      { text: 'Risk [high] "SPOF": Gateway is not HA.', chunkType: 'risk', diagramId: 'd1', score: 0.2 },
      { text: 'Recommendation [high] "Add LB": Deploy multiple instances.', chunkType: 'recommendation', diagramId: 'd1', score: 0.35 },
    ];
    const client = createMockVectorClient(results);
    const node = createRetrievalNode(client);

    const result = await node(baseState);

    expect(result.retrievedContext).toHaveLength(2);
    expect(result.retrievedContext![0]).toContain('SPOF');
    expect(result.retrievedContext![1]).toContain('Add LB');
  });

  it('filters out results with score above threshold (0.6)', async () => {
    const results: VectorSearchResult[] = [
      { text: 'Relevant chunk', chunkType: 'risk', diagramId: 'd1', score: 0.4 },
      { text: 'Irrelevant chunk', chunkType: 'summary', diagramId: 'd2', score: 0.75 },
    ];
    const client = createMockVectorClient(results);
    const node = createRetrievalNode(client);

    const result = await node(baseState);

    expect(result.retrievedContext).toHaveLength(1);
    expect(result.retrievedContext![0]).toBe('Relevant chunk');
  });

  it('returns empty array when no question is provided', async () => {
    const client = createMockVectorClient();
    const node = createRetrievalNode(client);

    const result = await node({ ...baseState, question: '' });

    expect(result.retrievedContext).toEqual([]);
    expect(client.search).not.toHaveBeenCalled();
  });

  it('returns empty array when vector service returns nothing', async () => {
    const client = createMockVectorClient([]);
    const node = createRetrievalNode(client);

    const result = await node(baseState);

    expect(result.retrievedContext).toEqual([]);
  });

  it('returns empty array when vector service fails', async () => {
    const client = { search: jest.fn().mockResolvedValue([]) } as unknown as jest.Mocked<VectorServiceClient>;
    const node = createRetrievalNode(client);

    const result = await node(baseState);

    expect(result.retrievedContext).toEqual([]);
  });
});
