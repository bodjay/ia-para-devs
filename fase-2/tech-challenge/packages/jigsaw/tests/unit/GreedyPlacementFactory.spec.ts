import { SeededRandomGenerator } from '@tech-challenge/genetic';
import {
  EdgeMismatchEvaluator,
  GenerateJigsawUseCase,
  GreedyPlacementFactory,
  JigsawBoard,
  PermutationFactory,
  Placement,
} from '../../src';
import { SMALL_PUZZLE } from '../fixtures';

const isPermutation = (values: number[], length: number): boolean =>
  [...values].sort((first, second) => first - second).join() === Array.from({ length }, (_, index) => index).join();

const keepsClasses = (board: JigsawBoard, placement: Placement): boolean =>
  placement.every((piece, position) => board.classOfPiece(piece) === board.classOfPosition(position));

const averageFitness = (board: JigsawBoard, create: () => Placement, samples: number): number => {
  const evaluator = new EdgeMismatchEvaluator(board);
  let total = 0;

  for (let index = 0; index < samples; index++) {
    total += evaluator.evaluate(create());
  }

  return total / samples;
};

describe('GreedyPlacementFactory', () => {
  const board = JigsawBoard.fromString(new GenerateJigsawUseCase(new SeededRandomGenerator(3)).execute({ size: 6 }));

  it('creates a valid permutation that respects the piece classes', () => {
    const factory = new GreedyPlacementFactory(new SeededRandomGenerator(1), board);

    for (let index = 0; index < 20; index++) {
      const placement = factory.create();

      expect(isPermutation(placement, 36)).toBe(true);
      expect(keepsClasses(board, placement)).toBe(true);
    }
  });

  it('assembles a puzzle where every choice is forced', () => {
    const small = JigsawBoard.fromString(SMALL_PUZZLE);
    const factory = new GreedyPlacementFactory(new SeededRandomGenerator(1), small);

    expect(factory.create()).toEqual([0, 1, 2, 3]);
  });

  it('starts with a clearly lower fitness than a random placement', () => {
    const greedy = new GreedyPlacementFactory(new SeededRandomGenerator(2), board);
    const random = new PermutationFactory(new SeededRandomGenerator(2), board);

    const greedyFitness = averageFitness(board, () => greedy.create(), 50);
    const randomFitness = averageFitness(board, () => random.create(), 50);

    expect(greedyFitness).toBeLessThan(randomFitness * 0.75);
  });

  it('varies between calls so the population keeps diversity', () => {
    const factory = new GreedyPlacementFactory(new SeededRandomGenerator(4), board);
    const placements = new Set(Array.from({ length: 10 }, () => factory.create().join(',')));

    expect(placements.size).toBeGreaterThan(1);
  });
});
