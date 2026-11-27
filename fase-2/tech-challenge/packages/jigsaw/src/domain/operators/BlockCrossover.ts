import { ICrossoverStrategy, IRandomGenerator } from '@tech-challenge/genetic';
import { JigsawBoard, Placement } from '../JigsawBoard';

/**
 * Preserva um bloco retangular inteiro do primeiro pai, já que peças
 * vizinhas que se encaixam são o que o algoritmo precisa manter. O resto
 * vem do segundo pai, nas mesmas posições quando a peça ainda está livre.
 * As peças que sobram ocupam as posições vazias da mesma classe, então
 * cantos, lados e miolo continuam no lugar certo.
 */
export class BlockCrossover implements ICrossoverStrategy<Placement> {
  constructor(
    private readonly random: IRandomGenerator,
    private readonly board: JigsawBoard,
  ) {}

  crossover(first: Placement, second: Placement): Placement {
    const size = this.board.size;
    const height = 1 + this.random.nextInt(size - 1);
    const width = 1 + this.random.nextInt(size - 1);
    const top = this.random.nextInt(size - height + 1);
    const left = this.random.nextInt(size - width + 1);

    const child: number[] = Array(first.length).fill(-1);
    const used: boolean[] = Array(first.length).fill(false);

    for (let row = top; row < top + height; row++) {
      for (let column = left; column < left + width; column++) {
        const position = row * size + column;

        child[position] = first[position];
        used[first[position]] = true;
      }
    }

    second.forEach((piece, position) => {
      if (child[position] === -1 && !used[piece]) {
        child[position] = piece;
        used[piece] = true;
      }
    });

    const leftovers = this.groupByClass(second.filter((piece) => !used[piece]));

    return child.map((piece, position) =>
      piece === -1 ? this.takeLeftover(leftovers, this.board.classOfPosition(position)) : piece,
    );
  }

  private groupByClass(pieces: number[]): Map<string, number[]> {
    const groups = new Map<string, number[]>();

    pieces.forEach((piece) => {
      const key = this.board.classOfPiece(piece);
      groups.set(key, [...(groups.get(key) ?? []), piece]);
    });

    return groups;
  }

  private takeLeftover(leftovers: Map<string, number[]>, key: string): number {
    const group = leftovers.get(key) ?? [];
    const piece = group.shift();

    return piece === undefined ? -1 : piece;
  }
}
