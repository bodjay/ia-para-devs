import { IMutationStrategy, IRandomGenerator } from '@tech-challenge/genetic';
import { JigsawBoard, Placement } from '../JigsawBoard';

/**
 * Troca duas peças da mesma classe de posição, o que mantém a permutação
 * válida e cada peça no tipo de posição que ela admite.
 */
export class SwapMutation implements IMutationStrategy<Placement> {
  private readonly groups: number[][];

  private readonly swappable: number[];

  constructor(
    private readonly random: IRandomGenerator,
    board: JigsawBoard,
  ) {
    const byClass = new Map<string, number[]>();

    for (let position = 0; position < board.pieceCount; position++) {
      const key = board.classOfPosition(position);
      byClass.set(key, [...(byClass.get(key) ?? []), position]);
    }

    this.groups = [...byClass.values()].filter((positions) => positions.length >= 2);
    this.swappable = this.groups.flat();
  }

  mutate(chromosome: Placement): Placement {
    const mutated = [...chromosome];

    if (this.swappable.length === 0) {
      return mutated;
    }

    const first = this.swappable[this.random.nextInt(this.swappable.length)];
    const group = this.groups.find((positions) => positions.includes(first)) ?? [];
    const others = group.filter((position) => position !== first);
    const second = others[this.random.nextInt(others.length)];

    [mutated[first], mutated[second]] = [mutated[second], mutated[first]];

    return mutated;
  }
}
