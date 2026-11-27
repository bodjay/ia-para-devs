import { IRandomGenerator } from '../domain/contracts';

export class MathRandomGenerator implements IRandomGenerator {
  next(): number {
    return Math.random();
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}
