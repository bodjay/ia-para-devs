import { SolveQuery } from '../http/query';

export interface PuzzlePreset {
  id: string;
  label: string;
  value: string;
}

export interface GameModule {
  readonly id: string;
  readonly label: string;
  puzzles(): PuzzlePreset[];
  solve(query: SolveQuery, onProgress: (progress: unknown) => void, signal?: AbortSignal): Promise<unknown>;
}
