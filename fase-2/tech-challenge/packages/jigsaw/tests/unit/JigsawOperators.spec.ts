import { SeededRandomGenerator } from '@tech-challenge/genetic';
import {
  BlockCrossover,
  EdgeMismatchEvaluator,
  JigsawBoard,
  PermutationFactory,
  Placement,
  SwapMutation,
} from '../../src';
import { SMALL_PUZZLE, SequenceRandom } from '../fixtures';

const isPermutation = (values: number[], length: number): boolean =>
  [...values].sort((first, second) => first - second).join() === Array.from({ length }, (_, index) => index).join();

const keepsClasses = (board: JigsawBoard, placement: Placement): boolean =>
  placement.every((piece, position) => board.classOfPiece(piece) === board.classOfPosition(position));

describe('EdgeMismatchEvaluator', () => {
  const board = JigsawBoard.fromString(SMALL_PUZZLE);
  const evaluator = new EdgeMismatchEvaluator(board);

  it('scores zero for the assembled puzzle', () => {
    expect(evaluator.evaluate([0, 1, 2, 3])).toBe(0);
    expect(evaluator.isSolution([0, 1, 2, 3])).toBe(true);
  });

  it('scores the number of loose edges', () => {
    const placement = [1, 0, 2, 3];

    expect(evaluator.evaluate(placement)).toBe(board.findMismatches(placement).length);
    expect(evaluator.evaluate(placement)).toBeGreaterThan(0);
    expect(evaluator.isSolution(placement)).toBe(false);
  });
});

describe('piece classes', () => {
  const board = JigsawBoard.generate(4, 3, new SeededRandomGenerator(1));

  it('give every piece of the original picture the class of its own position', () => {
    expect(keepsClasses(board, board.solvedPlacement())).toBe(true);
  });

  it('separate corners, sides and the middle', () => {
    const classes = new Set(board.solvedPlacement().map((position) => board.classOfPosition(position)));

    expect(classes.size).toBe(9);
    expect(board.classOfPosition(5)).toBe('0000');
    expect(board.classOfPosition(0)).toBe('1001');
  });
});

describe('PermutationFactory', () => {
  const board = JigsawBoard.generate(4, 3, new SeededRandomGenerator(1));
  const factory = new PermutationFactory(new SeededRandomGenerator(5), board);

  it('creates a permutation of all pieces', () => {
    for (let index = 0; index < 20; index++) {
      expect(isPermutation(factory.create(), 16)).toBe(true);
    }
  });

  it('keeps corners, sides and middle pieces in positions of their own class', () => {
    for (let index = 0; index < 20; index++) {
      expect(keepsClasses(board, factory.create())).toBe(true);
    }
  });

  it('never leaves a loose outer edge', () => {
    const isOuter = ({ position, side }: { position: number; side: string }): boolean =>
      (side === 'top' && position < 4) ||
      (side === 'left' && position % 4 === 0) ||
      (side === 'right' && position % 4 === 3) ||
      (side === 'bottom' && position >= 12);

    for (let index = 0; index < 20; index++) {
      expect(board.findMismatches(factory.create()).filter(isOuter)).toEqual([]);
    }
  });
});

describe('BlockCrossover', () => {
  const board = JigsawBoard.generate(4, 3, new SeededRandomGenerator(1));
  const factory = new PermutationFactory(new SeededRandomGenerator(8), board);
  const identity = board.solvedPlacement();

  it('always creates a valid permutation that respects the classes', () => {
    const crossover = new BlockCrossover(new SeededRandomGenerator(3), board);

    for (let index = 0; index < 100; index++) {
      const child = crossover.crossover(factory.create(), factory.create());

      expect(isPermutation(child, 16)).toBe(true);
      expect(keepsClasses(board, child)).toBe(true);
    }
  });

  it('keeps the chosen block from the first parent', () => {
    const crossover = new BlockCrossover(new SequenceRandom([0.34, 0.34, 0, 0]), board);
    const father = factory.create();

    const child = crossover.crossover(identity, father);

    expect([child[0], child[1], child[4], child[5]]).toEqual([0, 1, 4, 5]);
  });

  it('puts leftover pieces in free positions of the same class', () => {
    const father = [...identity];
    [father[5], father[6]] = [father[6], father[5]];
    const crossover = new BlockCrossover(new SequenceRandom([0, 0, 0.25, 0.25]), board);

    const child = crossover.crossover(identity, father);

    expect(child).toEqual(identity);
  });

  it('does not change the parents', () => {
    const crossover = new BlockCrossover(new SeededRandomGenerator(2), board);
    const mother = factory.create();
    const father = factory.create();
    const motherCopy = [...mother];
    const fatherCopy = [...father];

    crossover.crossover(mother, father);

    expect(mother).toEqual(motherCopy);
    expect(father).toEqual(fatherCopy);
  });
});

describe('SwapMutation', () => {
  const board = JigsawBoard.generate(4, 3, new SeededRandomGenerator(1));
  const placement = new PermutationFactory(new SeededRandomGenerator(6), board).create();

  it('swaps exactly two positions of the same class', () => {
    const mutation = new SwapMutation(new SeededRandomGenerator(6), board);

    for (let index = 0; index < 50; index++) {
      const mutated = mutation.mutate(placement);
      const changed = mutated.filter((piece, position) => piece !== placement[position]);

      expect(changed).toHaveLength(2);
      expect(isPermutation(mutated, 16)).toBe(true);
      expect(keepsClasses(board, mutated)).toBe(true);
    }
  });

  it('does not change the original placement', () => {
    const copy = [...placement];

    new SwapMutation(new SeededRandomGenerator(2), board).mutate(placement);

    expect(placement).toEqual(copy);
  });

  it('returns an unchanged copy when no class has two positions', () => {
    const small = JigsawBoard.fromString(SMALL_PUZZLE);
    const mutation = new SwapMutation(new SeededRandomGenerator(1), small);

    const mutated = mutation.mutate([0, 1, 2, 3]);

    expect(mutated).toEqual([0, 1, 2, 3]);
  });
});
