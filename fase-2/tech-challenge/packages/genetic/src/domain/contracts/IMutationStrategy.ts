export interface IMutationStrategy<C> {
  mutate(chromosome: C): C;
}
