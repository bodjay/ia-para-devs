import { buildOrchestratorGraph } from '../../infrastructure/graph/graph';
import {
  OrchestratorInput,
  OrchestratorOutput,
} from '../../domain/entities/OrchestratorState';

type OrchestratorGraph = ReturnType<typeof buildOrchestratorGraph>;

export class OrchestrateUseCase {
  private readonly graph: OrchestratorGraph;

  constructor(graph: OrchestratorGraph = buildOrchestratorGraph()) {
    this.graph = graph;
  }

  async execute(input: OrchestratorInput): Promise<OrchestratorOutput> {
    const result = await this.graph.invoke({
      question: input.question,
      analysisContext: input.analysisContext ?? null,
      history: input.history,
    });

    return {
      response: result.response || 'Sem resposta do modelo.',
      route: result.route,
    };
  }
}
