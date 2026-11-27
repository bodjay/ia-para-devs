import { IRandomGenerator } from '@tech-challenge/genetic';
import { JigsawBoard } from '../domain/JigsawBoard';
import { countSolutions } from '../domain/SolutionCounter';

export interface GenerateJigsawRequest {
  size: number;
  shapeCount?: number;
}

const DEFAULT_SHAPE_COUNT = 4;

const MAX_ATTEMPTS = 500;

const MAX_SEARCH_NODES = 2000000;

/**
 * Sorteia um quebra-cabeça novo. Quando o sorteio admite mais de uma
 * montagem válida, a imagem final poderia sair diferente da original.
 * O gerador descarta sorteios com peças idênticas e, em seguida, tenta
 * de novo até que a busca não ache uma segunda solução.
 * Nos lados pequenos isso prova a unicidade. Nos maiores a busca pode
 * estourar o limite de nós, e então vale apenas a ausência de segunda
 * solução dentro do limite. Se todas as tentativas falharem, devolve a última.
 */
export class GenerateJigsawUseCase {
  constructor(private readonly random: IRandomGenerator) {}

  execute(request: GenerateJigsawRequest): string {
    const shapeCount = request.shapeCount ?? DEFAULT_SHAPE_COUNT;
    let candidate = JigsawBoard.generate(request.size, shapeCount, this.random);

    for (let attempt = 1; attempt < MAX_ATTEMPTS && this.isAmbiguous(candidate); attempt++) {
      candidate = JigsawBoard.generate(request.size, shapeCount, this.random);
    }

    return candidate.toString();
  }

  private isAmbiguous(board: JigsawBoard): boolean {
    return board.hasDuplicatePieces() || countSolutions(board, 2, MAX_SEARCH_NODES).count > 1;
  }
}
