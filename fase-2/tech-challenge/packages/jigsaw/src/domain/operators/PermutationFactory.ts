import { IChromosomeFactory, IRandomGenerator, shuffle } from '@tech-challenge/genetic';
import { JigsawBoard, Placement } from '../JigsawBoard';

/**
 * Embaralha as peças dentro de cada classe de posição, então cantos ficam
 * nos cantos, peças de lado nos lados e peças de miolo no miolo.
 */
export class PermutationFactory implements IChromosomeFactory<Placement> {
  private readonly positionsByClass = new Map<string, number[]>();

  private readonly piecesByClass = new Map<string, number[]>();

  constructor(
    private readonly random: IRandomGenerator,
    board: JigsawBoard,
  ) {
    for (let index = 0; index < board.pieceCount; index++) {
      this.append(this.positionsByClass, board.classOfPosition(index), index);
      this.append(this.piecesByClass, board.classOfPiece(index), index);
    }
  }

  create(): Placement {
    const placement: Placement = Array(this.size()).fill(-1);

    this.positionsByClass.forEach((positions, key) => {
      const pieces = shuffle(this.piecesByClass.get(key) ?? [], this.random);

      positions.forEach((position, index) => {
        placement[position] = pieces[index];
      });
    });

    return placement;
  }

  private size(): number {
    let total = 0;
    this.positionsByClass.forEach((positions) => { total += positions.length; });

    return total;
  }

  private append(groups: Map<string, number[]>, key: string, value: number): void {
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
}
