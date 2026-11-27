import { SeededRandomGenerator } from '@tech-challenge/genetic';
import { JigsawBoard, countSolutions } from '../../src';
import { SMALL_PUZZLE } from '../fixtures';

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];

  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]),
  );
}

function bruteForceCount(board: JigsawBoard): number {
  return permutations(board.solvedPlacement()).filter((placement) => board.findMismatches(placement).length === 0)
    .length;
}

describe('countSolutions', () => {
  it('finds the only solution of a small puzzle', () => {
    const result = countSolutions(JigsawBoard.fromString(SMALL_PUZZLE), 10, 1000);

    expect(result).toEqual({ count: 1, complete: true });
  });

  it.each([1, 2, 3, 4, 5, 6])('matches exhaustive enumeration on a random 2x2 puzzle (seed %i)', (seed) => {
    const board = JigsawBoard.generate(2, 1, new SeededRandomGenerator(seed));

    expect(countSolutions(board, 100, 100000).count).toBe(bruteForceCount(board));
  });

  it.each([1, 2, 3])('matches exhaustive enumeration on a random 3x3 puzzle (seed %i)', (seed) => {
    const board = JigsawBoard.generate(3, 1, new SeededRandomGenerator(seed));

    expect(countSolutions(board, 1000, 1000000).count).toBe(bruteForceCount(board));
  });

  it('stops at the solution limit', () => {
    const board = JigsawBoard.generate(3, 1, new SeededRandomGenerator(1));

    expect(countSolutions(board, 1, 1000000).count).toBe(1);
  });

  it('reports an incomplete search when the node limit is reached', () => {
    const board = JigsawBoard.generate(6, 3, new SeededRandomGenerator(1));

    expect(countSolutions(board, 2, 5).complete).toBe(false);
  });
});
