import { Individual } from '../Individual';

export interface ISelectionStrategy<C> {
  select(population: readonly Individual<C>[]): Individual<C>;
}
