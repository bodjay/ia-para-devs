import { JIGSAW_PRESETS, SolveJigsawUseCase } from '@tech-challenge/jigsaw';
import { SolveQuery, parseGeneticConfig, requireText } from '../http/query';
import { GameModule, PuzzlePreset } from './GameModule';

export class JigsawGameModule implements GameModule {
  readonly id = 'jigsaw';

  readonly label = 'Encaixe';

  constructor(private readonly solveJigsaw: SolveJigsawUseCase) {}

  puzzles(): PuzzlePreset[] {
    return JIGSAW_PRESETS.map((puzzle) => ({ ...puzzle }));
  }

  solve(query: SolveQuery, onProgress: (progress: unknown) => void, signal?: AbortSignal): Promise<unknown> {
    const request = {
      puzzle: requireText(query, 'puzzle'),
      config: parseGeneticConfig(query),
    };

    return this.solveJigsaw.execute(request, onProgress, signal);
  }
}
