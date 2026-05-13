import { createRecommendationNode } from '../../src/infrastructure/graph/nodes/recommendationNode';
import { createMockOllamaClient } from '../helpers/mockOllamaClient';
import { CompactAnalysis } from '../../src/domain/entities/OrchestratorState';

const analysisContext: CompactAnalysis = {
  summary: 'Distributed system with Kafka and multiple microservices',
  components: [],
  risks: [],
  recommendations: [
    { title: 'Add circuit breaker', priority: 'high', description: 'Prevent cascading failures' },
    { title: 'Enable auto-scaling', priority: 'medium', description: 'Handle traffic spikes' },
  ],
};

const baseState = {
  question: 'What should we prioritize first?',
  analysisContext,
  history: [],
  route: 'recommendations' as const,
  response: '',
  retrievedContext: [] as string[],
};

describe('recommendationNode', () => {
  it('returns a response from the LLM', async () => {
    const ollama = createMockOllamaClient('Prioritize the circuit breaker pattern.');
    const node = createRecommendationNode(ollama);

    const result = await node(baseState);

    expect(result.response).toBe('Prioritize the circuit breaker pattern.');
  });

  it('calls LLM with system prompt containing recommendations', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createRecommendationNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).toContain('Add circuit breaker');
    expect(system).toContain('[high]');
    expect(system).toContain('Enable auto-scaling');
    expect(system).toContain('[medium]');
  });

  it('does not include components or risks in the system prompt', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createRecommendationNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).not.toContain('Components');
    expect(system).not.toContain('Identified Risks');
  });

  it('shows fallback message when no recommendations exist', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createRecommendationNode(ollama);

    await node({ ...baseState, analysisContext: { ...analysisContext, recommendations: [] } });

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).toContain('No recommendations identified yet.');
  });

  it('trims history to last 4 messages', async () => {
    const ollama = createMockOllamaClient('ok');
    const node = createRecommendationNode(ollama);

    const history = Array.from({ length: 8 }, (_, i) => {
      const role: 'user' | 'assistant' = i % 2 === 0 ? 'user' : 'assistant';
      return { role, content: `msg ${i}` };
    });

    await node({ ...baseState, history });

    const [messages] = ollama.chat.mock.calls[0];
    // system + 4 history + 1 user = 6
    expect(messages).toHaveLength(6);
  });
});
