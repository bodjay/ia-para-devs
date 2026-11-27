export interface Individual<C> {
  chromosome: C;
  fitness: number;
}

export function byLowerFitness<C>(first: Individual<C>, second: Individual<C>): number {
  return first.fitness - second.fitness;
}
