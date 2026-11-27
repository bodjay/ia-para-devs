import { IRandomGenerator } from '@tech-challenge/genetic';
import { InvalidJigsawError } from './InvalidJigsawError';

/**
 * Cada borda é um inteiro. Zero é borda reta. Um valor positivo é um pino
 * e um valor negativo é um encaixe. O módulo identifica o formato, então
 * duas bordas só se encaixam quando somam zero e não são retas.
 */
export type Edge = number;

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type PieceEdges = readonly [top: Edge, right: Edge, bottom: Edge, left: Edge];

/**
 * Peça que ocupa cada posição do tabuleiro, lida da esquerda para a direita
 * e de cima para baixo. A peça de número i pertence à posição i da imagem pronta.
 */
export type Placement = number[];

export interface Mismatch {
  position: number;
  side: Side;
}

const TOP = 0;
const RIGHT = 1;
const BOTTOM = 2;
const LEFT = 3;

export const MIN_JIGSAW_SIZE = 2;

export const MAX_JIGSAW_SIZE = 10;

export function edgesFit(first: Edge, second: Edge): boolean {
  return first !== 0 && first + second === 0;
}

export class JigsawBoard {
  private constructor(
    readonly size: number,
    private readonly pieces: readonly PieceEdges[],
  ) {}

  /**
   * Monta a imagem pronta e sorteia o formato de cada junção entre peças.
   * Como as peças vêm de uma imagem real, sempre existe ao menos uma solução.
   */
  static generate(size: number, shapeCount: number, random: IRandomGenerator): JigsawBoard {
    ensureValidSize(size);

    if (!Number.isInteger(shapeCount) || shapeCount < 1) {
      throw new InvalidJigsawError('shapeCount deve ser um inteiro maior ou igual a 1.');
    }

    const edges = Array.from({ length: size * size }, () => [0, 0, 0, 0]);
    const randomEdge = (): Edge => (random.nextInt(2) === 0 ? 1 : -1) * (1 + random.nextInt(shapeCount));

    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const id = row * size + column;

        if (column < size - 1) {
          const edge = randomEdge();
          edges[id][RIGHT] = edge;
          edges[id + 1][LEFT] = -edge;
        }

        if (row < size - 1) {
          const edge = randomEdge();
          edges[id][BOTTOM] = edge;
          edges[id + size][TOP] = -edge;
        }
      }
    }

    return new JigsawBoard(size, edges.map(([top, right, bottom, left]) => [top, right, bottom, left]));
  }

  /**
   * Formato "lado:bordas", com quatro bordas por peça na ordem
   * topo, direita, base e esquerda. Exemplo: "2:0,1,-1,0,...".
   */
  static fromString(value: string): JigsawBoard {
    const [sizeText, edgesText, ...extra] = value.split(':');
    const size = Number(sizeText);
    const edges = (edgesText ?? '').split(',').map(Number);

    if (extra.length > 0 || !Number.isInteger(size)) {
      throw new InvalidJigsawError('O quebra-cabeça deve seguir o formato "lado:bordas".');
    }

    ensureValidSize(size);

    if (edges.length !== size * size * 4 || !edges.every((edge) => Number.isInteger(edge))) {
      throw new InvalidJigsawError(`O quebra-cabeça de lado ${size} precisa de ${size * size * 4} bordas inteiras.`);
    }

    const pieces: PieceEdges[] = [];

    for (let index = 0; index < edges.length; index += 4) {
      pieces.push([edges[index], edges[index + 1], edges[index + 2], edges[index + 3]]);
    }

    const board = new JigsawBoard(size, pieces);

    if (board.findMismatches(board.solvedPlacement()).length > 0) {
      throw new InvalidJigsawError('As bordas informadas não formam uma imagem completa, então não há solução.');
    }

    return board;
  }

  get pieceCount(): number {
    return this.size * this.size;
  }

  edgesOf(piece: number): PieceEdges {
    return this.pieces[piece];
  }

  /**
   * Duas peças com as mesmas bordas são intercambiáveis, o que cria
   * montagens alternativas com a imagem trocada.
   */
  hasDuplicatePieces(): boolean {
    return new Set(this.pieces.map((edges) => edges.join(','))).size < this.pieces.length;
  }

  /**
   * Sem rotação, uma peça com bordas retas só serve em posições com as mesmas
   * bordas externas: cantos, lados e miolo. A classe é essa assinatura.
   */
  classOfPiece(piece: number): string {
    return this.pieces[piece].map((edge) => (edge === 0 ? '1' : '0')).join('');
  }

  classOfPosition(position: number): string {
    const row = Math.floor(position / this.size);
    const column = position % this.size;

    return [row === 0, column === this.size - 1, row === this.size - 1, column === 0]
      .map((isOuter) => (isOuter ? '1' : '0'))
      .join('');
  }

  solvedPlacement(): Placement {
    return Array.from({ length: this.pieceCount }, (_, index) => index);
  }

  /**
   * Lista cada borda que não se encaixa. Uma junção entre duas peças é
   * reportada uma única vez, na peça de cima ou da esquerda, e as bordas
   * externas precisam ser retas.
   */
  findMismatches(placement: Placement): Mismatch[] {
    const mismatches: Mismatch[] = [];

    placement.forEach((piece, position) => {
      const row = Math.floor(position / this.size);
      const column = position % this.size;
      const edges = this.pieces[piece];

      if (row === 0 && edges[TOP] !== 0) {
        mismatches.push({ position, side: 'top' });
      }

      if (column === 0 && edges[LEFT] !== 0) {
        mismatches.push({ position, side: 'left' });
      }

      if (column === this.size - 1) {
        if (edges[RIGHT] !== 0) mismatches.push({ position, side: 'right' });
      } else if (!edgesFit(edges[RIGHT], this.pieces[placement[position + 1]][LEFT])) {
        mismatches.push({ position, side: 'right' });
      }

      if (row === this.size - 1) {
        if (edges[BOTTOM] !== 0) mismatches.push({ position, side: 'bottom' });
      } else if (!edgesFit(edges[BOTTOM], this.pieces[placement[position + this.size]][TOP])) {
        mismatches.push({ position, side: 'bottom' });
      }
    });

    return mismatches;
  }

  toString(): string {
    return `${this.size}:${this.pieces.map((edges) => edges.join(',')).join(',')}`;
  }
}

function ensureValidSize(size: number): void {
  if (!Number.isInteger(size) || size < MIN_JIGSAW_SIZE || size > MAX_JIGSAW_SIZE) {
    throw new InvalidJigsawError(
      `O lado do tabuleiro deve ser um inteiro entre ${MIN_JIGSAW_SIZE} e ${MAX_JIGSAW_SIZE}.`,
    );
  }
}
