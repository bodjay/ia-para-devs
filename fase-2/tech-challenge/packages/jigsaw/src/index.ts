export { GenerateJigsawUseCase } from './application/GenerateJigsawUseCase';
export type { GenerateJigsawRequest } from './application/GenerateJigsawUseCase';
export { SolveJigsawUseCase } from './application/SolveJigsawUseCase';
export type {
  JigsawProgressListener,
  JigsawResult,
  JigsawView,
  SolveJigsawRequest,
} from './application/SolveJigsawUseCase';
export { InvalidJigsawError } from './domain/InvalidJigsawError';
export { JigsawAlgorithmFactory } from './domain/JigsawAlgorithmFactory';
export type { IJigsawAlgorithmFactory } from './domain/JigsawAlgorithmFactory';
export { MAX_JIGSAW_SIZE, MIN_JIGSAW_SIZE, JigsawBoard, edgesFit } from './domain/JigsawBoard';
export type { Edge, Mismatch, PieceEdges, Placement, Side } from './domain/JigsawBoard';
export { countSolutions } from './domain/SolutionCounter';
export type { SolutionCount } from './domain/SolutionCounter';
export { BlockCrossover } from './domain/operators/BlockCrossover';
export { EdgeMismatchEvaluator } from './domain/operators/EdgeMismatchEvaluator';
export { GreedyPlacementFactory } from './domain/operators/GreedyPlacementFactory';
export { PermutationFactory } from './domain/operators/PermutationFactory';
export { SwapMutation } from './domain/operators/SwapMutation';
export { JIGSAW_PRESETS } from './puzzles';
export type { JigsawPreset } from './puzzles';
