import { OrchestrateUseCase } from '../../src/application/use-cases/OrchestrateUseCase';
import { buildOrchestratorGraph } from '../../src/infrastructure/graph/graph';
import { OrchestratorInput } from '../../src/domain/entities/OrchestratorState';

type MockGraph = { invoke: jest.Mock };

function createMockGraph(result: object): MockGraph {
  return { invoke: jest.fn().mockResolvedValue(result) };
}

const input: OrchestratorInput = {
  question: 'What components exist?',
  analysisContext: {
    summary: 'Test architecture',
    components: [{ name: 'api', type: 'microservice', description: 'API service' }],
    risks: [],
    recommendations: [],
  },
  history: [],
};

describe('OrchestrateUseCase', () => {
  it('returns the response and route from the graph', async () => {
    const graph = createMockGraph({ response: 'There is an API service.', route: 'chat' });
    const useCase = new OrchestrateUseCase(graph as unknown as ReturnType<typeof buildOrchestratorGraph>);

    const result = await useCase.execute(input);

    expect(result.response).toBe('There is an API service.');
    expect(result.route).toBe('chat');
  });

  it('passes question, analysisContext and history to the graph', async () => {
    const graph = createMockGraph({ response: 'ok', route: 'chat' });
    const useCase = new OrchestrateUseCase(graph as unknown as ReturnType<typeof buildOrchestratorGraph>);

    await useCase.execute(input);

    expect(graph.invoke).toHaveBeenCalledWith({
      question: input.question,
      analysisContext: input.analysisContext,
      history: input.history,
    });
  });

  it('uses null for analysisContext when not provided', async () => {
    const graph = createMockGraph({ response: 'No diagram uploaded.', route: 'no_analysis' });
    const useCase = new OrchestrateUseCase(graph as unknown as ReturnType<typeof buildOrchestratorGraph>);

    await useCase.execute({ ...input, analysisContext: null });

    expect(graph.invoke).toHaveBeenCalledWith(
      expect.objectContaining({ analysisContext: null })
    );
  });

  it('returns fallback response when graph returns empty string', async () => {
    const graph = createMockGraph({ response: '', route: 'chat' });
    const useCase = new OrchestrateUseCase(graph as unknown as ReturnType<typeof buildOrchestratorGraph>);

    const result = await useCase.execute(input);

    expect(result.response).toBe('Sem resposta do modelo.');
  });

  it('propagates graph errors', async () => {
    const graph: MockGraph = { invoke: jest.fn().mockRejectedValue(new Error('Graph execution failed')) };
    const useCase = new OrchestrateUseCase(graph as unknown as ReturnType<typeof buildOrchestratorGraph>);

    await expect(useCase.execute(input)).rejects.toThrow('Graph execution failed');
  });
});
