import { SeededRandomGenerator } from '@tech-challenge/genetic';
import { InvalidJigsawError, JIGSAW_PRESETS, JigsawBoard, MAX_JIGSAW_SIZE, edgesFit } from '../../src';
import { SMALL_PUZZLE } from '../fixtures';

describe('edgesFit', () => {
  it('fits a tab with a blank of the same shape', () => {
    expect(edgesFit(2, -2)).toBe(true);
    expect(edgesFit(-2, 2)).toBe(true);
  });

  it('does not fit different shapes or two tabs', () => {
    expect(edgesFit(2, -3)).toBe(false);
    expect(edgesFit(2, 2)).toBe(false);
    expect(edgesFit(-2, -2)).toBe(false);
  });

  it('never fits flat edges, not even with each other', () => {
    expect(edgesFit(0, 0)).toBe(false);
    expect(edgesFit(0, 2)).toBe(false);
  });
});

describe('JigsawBoard.generate', () => {
  const board = JigsawBoard.generate(4, 3, new SeededRandomGenerator(9));

  it('creates one piece per position', () => {
    expect(board.pieceCount).toBe(16);
  });

  it('assembles with no mismatches in the original order', () => {
    expect(board.findMismatches(board.solvedPlacement())).toEqual([]);
  });

  it('makes the outer edges flat', () => {
    for (let index = 0; index < 4; index++) {
      expect(board.edgesOf(index)[0]).toBe(0);
      expect(board.edgesOf(index * 4)[3]).toBe(0);
      expect(board.edgesOf(index * 4 + 3)[1]).toBe(0);
      expect(board.edgesOf(12 + index)[2]).toBe(0);
    }
  });

  it('gives every internal junction a tab on one side and a blank on the other', () => {
    expect(board.edgesOf(0)[1]).toBe(-board.edgesOf(1)[3]);
    expect(board.edgesOf(0)[2]).toBe(-board.edgesOf(4)[0]);
    expect(board.edgesOf(0)[1]).not.toBe(0);
  });

  it('only uses the requested number of shapes', () => {
    const shapes = new Set<number>();

    for (let piece = 0; piece < board.pieceCount; piece++) {
      board.edgesOf(piece).forEach((edge) => shapes.add(Math.abs(edge)));
    }

    expect([...shapes].sort()).toEqual([0, 1, 2, 3]);
  });

  it('is reproducible for the same seed', () => {
    const again = JigsawBoard.generate(4, 3, new SeededRandomGenerator(9));

    expect(again.toString()).toBe(board.toString());
  });

  it('rejects invalid sizes and shape counts', () => {
    expect(() => JigsawBoard.generate(1, 3, new SeededRandomGenerator(1))).toThrow(InvalidJigsawError);
    expect(() => JigsawBoard.generate(2.5, 3, new SeededRandomGenerator(1))).toThrow(InvalidJigsawError);
    expect(() => JigsawBoard.generate(3, 0, new SeededRandomGenerator(1))).toThrow(InvalidJigsawError);
  });

  it('accepts the maximum size and rejects anything above it', () => {
    const random = new SeededRandomGenerator(1);

    expect(JigsawBoard.generate(MAX_JIGSAW_SIZE, 3, random).pieceCount).toBe(MAX_JIGSAW_SIZE ** 2);
    expect(() => JigsawBoard.generate(MAX_JIGSAW_SIZE + 1, 3, random)).toThrow(InvalidJigsawError);
  });
});

describe('JigsawBoard.fromString', () => {
  it('reads and writes the same text', () => {
    expect(JigsawBoard.fromString(SMALL_PUZZLE).toString()).toBe(SMALL_PUZZLE);
  });

  it.each([
    'abc',
    '1:0,0,0,0',
    '2:0,1,-2,0',
    '2:0,1,-2,0,0,0,3,-1,2,4,0,0,-3,0,0,x',
    '2:0,1,-2,0,0,0,3,-1,2,4,0,0,-3,0,0,-4:extra',
  ])('rejects malformed text %s', (value) => {
    expect(() => JigsawBoard.fromString(value)).toThrow(InvalidJigsawError);
  });

  it('rejects pieces that do not form a complete picture', () => {
    const broken = '2:0,1,-2,0,0,0,3,-9,2,4,0,0,-3,0,0,-4';

    expect(() => JigsawBoard.fromString(broken)).toThrow(InvalidJigsawError);
  });

  it('rejects a size above the maximum', () => {
    expect(() => JigsawBoard.fromString(`${MAX_JIGSAW_SIZE + 1}:0`)).toThrow(InvalidJigsawError);
  });

  it('accepts every preset', () => {
    JIGSAW_PRESETS.forEach((preset) => expect(() => JigsawBoard.fromString(preset.value)).not.toThrow());
  });
});

describe('JigsawBoard.findMismatches', () => {
  const board = JigsawBoard.fromString(SMALL_PUZZLE);

  it('reports nothing for the solved placement', () => {
    expect(board.findMismatches([0, 1, 2, 3])).toEqual([]);
  });

  it('reports a junction once, on the piece above or to the left', () => {
    const mismatches = board.findMismatches([1, 0, 2, 3]);

    expect(mismatches.filter((item) => item.position === 0 && item.side === 'right')).toHaveLength(1);
    expect(mismatches.filter((item) => item.position === 1 && item.side === 'left')).toHaveLength(0);
  });

  it('reports outer edges that are not flat', () => {
    const mismatches = board.findMismatches([2, 3, 0, 1]);

    expect(mismatches).toContainEqual({ position: 0, side: 'top' });
  });

  it('counts every mismatch of a fully wrong placement', () => {
    expect(board.findMismatches([3, 2, 1, 0]).length).toBeGreaterThan(4);
  });
});

describe('JigsawBoard.hasDuplicatePieces', () => {
  it('is false when every piece has its own edges', () => {
    expect(JigsawBoard.fromString(SMALL_PUZZLE).hasDuplicatePieces()).toBe(false);
  });

  it('detects interchangeable pieces', () => {
    const board = JigsawBoard.generate(8, 1, new SeededRandomGenerator(3));

    expect(board.hasDuplicatePieces()).toBe(true);
  });
});
