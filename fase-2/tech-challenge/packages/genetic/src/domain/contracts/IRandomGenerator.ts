export interface IRandomGenerator {
  next(): number;
  nextInt(maxExclusive: number): number;
}
