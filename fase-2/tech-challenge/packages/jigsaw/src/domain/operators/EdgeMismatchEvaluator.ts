import { IFitnessEvaluator } from '@tech-challenge/genetic';
import { JigsawBoard, Placement } from '../JigsawBoard';

/**
 * O fitness é a quantidade de bordas que não se encaixam.
 * Zero significa que o quebra-cabeça está montado.
 */
export class EdgeMismatchEvaluator implements IFitnessEvaluator<Placement> {
  constructor(private readonly board: JigsawBoard) {}

  evaluate(chromosome: Placement): number {
    return this.board.findMismatches(chromosome).length;
  }

  isSolution(chromosome: Placement): boolean {
    return this.evaluate(chromosome) === 0;
  }
}
