export interface ICrossoverStrategy<C> {
  crossover(first: C, second: C): C;
}
