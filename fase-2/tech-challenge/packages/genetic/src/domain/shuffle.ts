import { IRandomGenerator } from './contracts';

export function shuffle<T>(items: readonly T[], random: IRandomGenerator): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = random.nextInt(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}
