export interface IFitnessEvaluator<C> {
  evaluate(chromosome: C): number;
  isSolution(chromosome: C): boolean;
}
