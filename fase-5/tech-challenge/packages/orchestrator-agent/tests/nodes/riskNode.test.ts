import { createRiskNode } from '../../src/infrastructure/graph/nodes/riskNode';
import { createMockOllamaClient } from '../helpers/mockOllamaClient';
import { CompactAnalysis } from '../../src/domain/entities/OrchestratorState';

const analysisContext: CompactAnalysis = {
  summary: 'Monolithic architecture with a single database',
  components: [],
  risks: [
    { title: 'SPOF', severity: 'high', description: 'Single database with no replica' },
    { title: 'High coupling', severity: 'medium', description: 'All modules share the same DB' },
  ],
  recommendations: [],
};

const baseState = {
  question: 'What is the most critical risk?',
  analysisContext,
  history: [],
  route: 'risk_analysis' as const,
  response: '',
  retrievedContext: [] as string[],
};

describe('riskNode', () => {
  it('returns a response from the LLM', async () => {
    const ollama = createMockOllamaClient('The most critical risk is the SPOF.');
    const node = createRiskNode(ollama);

    const result = await node(baseState);

    expect(result.response).toBe('The most critical risk is the SPOF.');
  });

  it('calls LLM with system prompt containing risks', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createRiskNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).toContain('SPOF');
    expect(system).toContain('[high]');
    expect(system).toContain('High coupling');
    expect(system).toContain('[medium]');
  });

  it('does not include components or recommendations in the system prompt', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createRiskNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).not.toContain('Components');
    expect(system).not.toContain('Recommendations');
  });

  it('shows fallback message when no risks exist', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createRiskNode(ollama);

    await node({ ...baseState, analysisContext: { ...analysisContext, risks: [] } });

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).toContain('No risks identified yet.');
  });

  it('trims history to last 4 messages', async () => {
    const ollama = createMockOllamaClient('ok');
    const node = createRiskNode(ollama);

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
