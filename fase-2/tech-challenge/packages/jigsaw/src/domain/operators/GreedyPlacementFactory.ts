import { IChromosomeFactory, IRandomGenerator } from '@tech-challenge/genetic';
import { JigsawBoard, Placement, edgesFit } from '../JigsawBoard';

const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;

/**
 * Heurística de hotstart, equivalente ao vizinho mais próximo do caixeiro
 * viajante. Preenche o tabuleiro da esquerda para a direita e de cima para
 * baixo, escolhendo ao acaso uma peça livre da mesma classe que encaixe com
 * as vizinhas de cima e da esquerda. Quando nenhuma encaixa, usa qualquer
 * peça livre da classe. O sorteio entre as candidatas mantém a diversidade.
 */
export class GreedyPlacementFactory implements IChromosomeFactory<Placement> {
  private readonly piecesByClass = new Map<string, number[]>();

  constructor(
    private readonly random: IRandomGenerator,
    private readonly board: JigsawBoard,
  ) {
    for (let piece = 0; piece < board.pieceCount; piece++) {
      const key = board.classOfPiece(piece);
      this.piecesByClass.set(key, [...(this.piecesByClass.get(key) ?? []), piece]);
    }
  }

  create(): Placement {
    const placement: Placement = Array(this.board.pieceCount).fill(-1);
    const used: boolean[] = Array(this.board.pieceCount).fill(false);

    for (let position = 0; position < this.board.pieceCount; position++) {
      const free = (this.piecesByClass.get(this.board.classOfPosition(position)) ?? []).filter((piece) => !used[piece]);
      const fitting = free.filter((piece) => this.fitsNeighbors(placement, position, piece));
      const options = fitting.length > 0 ? fitting : free;
      const chosen = options[this.random.nextInt(options.length)];

      placement[position] = chosen;
      used[chosen] = true;
    }

    return placement;
  }

  private fitsNeighbors(placement: Placement, position: number, piece: number): boolean {
    const size = this.board.size;
    const edges = this.board.edgesOf(piece);
    const row = Math.floor(position / size);
    const column = position % size;

    const fitsTop = row === 0 || edgesFit(this.board.edgesOf(placement[position - size])[BOTTOM], edges[TOP]);
    const fitsLeft = column === 0 || edgesFit(this.board.edgesOf(placement[position - 1])[RIGHT], edges[LEFT]);

    return fitsTop && fitsLeft;
  }
}
