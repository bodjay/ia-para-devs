import { createRouterNode } from '../../src/infrastructure/graph/nodes/routerNode';
import { createMockOllamaClient } from '../helpers/mockOllamaClient';
import { CompactAnalysis } from '../../src/domain/entities/OrchestratorState';

const analysisContext: CompactAnalysis = {
  summary: 'Microservices architecture with Kafka',
  components: [],
  risks: [],
  recommendations: [],
};

describe('routerNode', () => {
  it('returns no_analysis when analysisContext is null', async () => {
    const ollama = createMockOllamaClient();
    const node = createRouterNode(ollama);

    const result = await node({ question: 'anything', analysisContext: null, history: [], route: 'chat', response: '', retrievedContext: [] });

    expect(result.route).toBe('no_analysis');
    expect(ollama.chat).not.toHaveBeenCalled();
  });

  it('returns route from LLM when analysisContext exists', async () => {
    const ollama = createMockOllamaClient('risk_analysis');
    const node = createRouterNode(ollama);

    const result = await node({ question: 'What are the risks?', analysisContext, history: [], route: 'chat', response: '', retrievedContext: [] });

    expect(result.route).toBe('risk_analysis');
    expect(ollama.chat).toHaveBeenCalledTimes(1);
  });

  it('falls back to chat when LLM returns an unknown route', async () => {
    const ollama = createMockOllamaClient('unknown_route_xyz');
    const node = createRouterNode(ollama);

    const result = await node({ question: 'Tell me more', analysisContext, history: [], route: 'chat', response: '', retrievedContext: [] });

    expect(result.route).toBe('chat');
  });

  it('accepts all valid route values from LLM', async () => {
    const validRoutes = ['chat', 'risk_analysis', 'recommendations'] as const;

    for (const route of validRoutes) {
      const ollama = createMockOllamaClient(route);
      const node = createRouterNode(ollama);

      const result = await node({ question: 'question', analysisContext, history: [], route: 'chat', response: '', retrievedContext: [] });

      expect(result.route).toBe(route);
    }
  });

  it('trims whitespace from LLM response before matching', async () => {
    const ollama = createMockOllamaClient('  recommendations  ');
    const node = createRouterNode(ollama);

    const result = await node({ question: 'How can we improve?', analysisContext, history: [], route: 'chat', response: '', retrievedContext: [] });

    expect(result.route).toBe('recommendations');
  });
});
