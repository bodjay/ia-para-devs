import { JigsawBoard, edgesFit } from './JigsawBoard';

export interface SolutionCount {
  count: number;
  complete: boolean;
}

/**
 * Conta as montagens válidas por busca em profundidade, posição por posição.
 * A contagem para ao atingir o limite de soluções ou o limite de nós visitados.
 * Quando o limite de nós estoura, complete é falso e a contagem é parcial.
 */
export function countSolutions(board: JigsawBoard, limit: number, maxNodes: number): SolutionCount {
  const size = board.size;
  const total = board.pieceCount;
  const placement: number[] = Array(total).fill(-1);
  const used: boolean[] = Array(total).fill(false);
  let count = 0;
  let nodes = 0;
  let aborted = false;

  const fits = (piece: number, position: number): boolean => {
    const row = Math.floor(position / size);
    const column = position % size;
    const [top, right, bottom, left] = board.edgesOf(piece);

    const topFits = row === 0 ? top === 0 : edgesFit(board.edgesOf(placement[position - size])[2], top);
    const leftFits = column === 0 ? left === 0 : edgesFit(board.edgesOf(placement[position - 1])[1], left);
    const rightFits = column < size - 1 || right === 0;
    const bottomFits = row < size - 1 || bottom === 0;

    return topFits && leftFits && rightFits && bottomFits;
  };

  const place = (position: number): void => {
    if (position === total) {
      count++;
      return;
    }

    for (let piece = 0; piece < total && count < limit && !aborted; piece++) {
      if (used[piece]) continue;

      nodes++;

      if (nodes > maxNodes) {
        aborted = true;
        return;
      }

      if (!fits(piece, position)) continue;

      used[piece] = true;
      placement[position] = piece;
      place(position + 1);
      used[piece] = false;
      placement[position] = -1;
    }
  };

  place(0);

  return { count, complete: !aborted };
}
