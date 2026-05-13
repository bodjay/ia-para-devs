import { createConversationNode } from '../../src/infrastructure/graph/nodes/conversationNode';
import { createMockOllamaClient } from '../helpers/mockOllamaClient';
import { CompactAnalysis } from '../../src/domain/entities/OrchestratorState';

const analysisContext: CompactAnalysis = {
  summary: 'Event-driven microservices with Kafka and MongoDB',
  components: [
    { name: 'bff', type: 'microservice', description: 'API Gateway' },
    { name: 'kafka', type: 'broker', description: 'Message broker' },
  ],
  risks: [],
  recommendations: [],
};

const baseState = {
  question: 'What is the role of the BFF?',
  analysisContext,
  history: [],
  route: 'chat' as const,
  response: '',
  retrievedContext: [] as string[],
};

describe('conversationNode', () => {
  it('returns a response from the LLM', async () => {
    const ollama = createMockOllamaClient('The BFF acts as an API Gateway.');
    const node = createConversationNode(ollama);

    const result = await node(baseState);

    expect(result.response).toBe('The BFF acts as an API Gateway.');
  });

  it('calls LLM with system prompt containing summary and components', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createConversationNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('Event-driven microservices');
    expect(system.content).toContain('bff(microservice)');
    expect(system.content).toContain('kafka(broker)');
  });

  it('does not include risks or recommendations in the system prompt', async () => {
    const ollama = createMockOllamaClient('response');
    const node = createConversationNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const system = messages[0].content as string;
    expect(system).not.toContain('Risks');
    expect(system).not.toContain('Recommendations');
  });

  it('trims history to last 6 messages', async () => {
    const ollama = createMockOllamaClient('ok');
    const node = createConversationNode(ollama);

    const history = Array.from({ length: 10 }, (_, i) => {
      const role: 'user' | 'assistant' = i % 2 === 0 ? 'user' : 'assistant';
      return { role, content: `msg ${i}` };
    });

    await node({ ...baseState, history });

    const [messages] = ollama.chat.mock.calls[0];
    // system + 6 history + 1 user question = 8
    expect(messages).toHaveLength(8);
  });

  it('includes the user question as the last message', async () => {
    const ollama = createMockOllamaClient('ok');
    const node = createConversationNode(ollama);

    await node(baseState);

    const [messages] = ollama.chat.mock.calls[0];
    const last = messages[messages.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toBe('What is the role of the BFF?');
  });
});
