import { SeededRandomGenerator } from '@tech-challenge/genetic';
import {
  GenerateJigsawUseCase,
  InvalidJigsawError,
  JigsawBoard,
  MAX_JIGSAW_SIZE,
  countSolutions,
} from '../../src';

const makeUseCase = (seed = 1): GenerateJigsawUseCase => new GenerateJigsawUseCase(new SeededRandomGenerator(seed));

describe('GenerateJigsawUseCase', () => {
  it.each([2, 3, 5, 8, MAX_JIGSAW_SIZE])('creates a valid puzzle with side %i', (size) => {
    const board = JigsawBoard.fromString(makeUseCase().execute({ size }));

    expect(board.size).toBe(size);
    expect(board.pieceCount).toBe(size * size);
  });

  it.each([2, 4, 7])('creates a puzzle with a single solution and no repeated pieces (side %i)', (size) => {
    const board = JigsawBoard.fromString(makeUseCase(size).execute({ size }));

    expect(board.hasDuplicatePieces()).toBe(false);
    expect(countSolutions(board, 2, 5000000)).toEqual({ count: 1, complete: true });
  });

  it('is reproducible for the same seed', () => {
    expect(makeUseCase(7).execute({ size: 5 })).toBe(makeUseCase(7).execute({ size: 5 }));
  });

  it('creates different puzzles for different seeds', () => {
    expect(makeUseCase(1).execute({ size: 5 })).not.toBe(makeUseCase(2).execute({ size: 5 }));
  });

  it('returns the last attempt when uniqueness is impossible', () => {
    const board = JigsawBoard.fromString(makeUseCase().execute({ size: 4, shapeCount: 1 }));

    expect(board.pieceCount).toBe(16);
  });

  it('rejects an invalid size', () => {
    expect(() => makeUseCase().execute({ size: 1 })).toThrow(InvalidJigsawError);
    expect(() => makeUseCase().execute({ size: MAX_JIGSAW_SIZE + 1 })).toThrow(InvalidJigsawError);
  });
});
