import {
  EvolutionResult,
  EvolutionRunner,
  GeneticAlgorithmConfig,
  ProgressListener,
  createConfig,
} from '@tech-challenge/genetic';
import { IJigsawAlgorithmFactory } from '../domain/JigsawAlgorithmFactory';
import { JigsawBoard, Mismatch, Placement } from '../domain/JigsawBoard';

export interface SolveJigsawRequest {
  puzzle: string;
  config?: Partial<GeneticAlgorithmConfig>;
  reportEvery?: number;
}

export interface JigsawView {
  placement: Placement;
  mismatches: Mismatch[];
}

export type JigsawResult = EvolutionResult<JigsawView>;

export type JigsawProgressListener = ProgressListener<JigsawView>;

export class SolveJigsawUseCase {
  constructor(
    private readonly algorithmFactory: IJigsawAlgorithmFactory,
    private readonly runner: EvolutionRunner,
  ) {}

  execute(
    request: SolveJigsawRequest,
    onProgress: JigsawProgressListener,
    signal?: AbortSignal,
  ): Promise<JigsawResult> {
    const config = createConfig(request.config);
    const board = JigsawBoard.fromString(request.puzzle);
    const algorithm = this.algorithmFactory.create(board, config);

    return this.runner.run(
      {
        algorithm,
        maxGenerations: config.maxGenerations,
        reportEvery: request.reportEvery,
        toView: (placement) => ({ placement, mismatches: board.findMismatches(placement) }),
      },
      onProgress,
      signal,
    );
  }
}
