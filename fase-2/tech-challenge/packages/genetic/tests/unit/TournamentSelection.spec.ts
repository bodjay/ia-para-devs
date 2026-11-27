import { Individual, TournamentSelection } from '../../src';
import { SequenceRandom } from '../helpers';

describe('TournamentSelection', () => {
  const individual = (fitness: number): Individual<number[]> => ({ chromosome: [], fitness });

  it('returns the competitor with lower fitness', () => {
    const population = [individual(9), individual(2), individual(5)];
    const selection = new TournamentSelection(new SequenceRandom([0, 0.4, 0.9]), 3);

    expect(selection.select(population).fitness).toBe(2);
  });

  it('behaves as random choice when the tournament has one competitor', () => {
    const population = [individual(9), individual(2), individual(5)];
    const selection = new TournamentSelection(new SequenceRandom([0.9]), 1);

    expect(selection.select(population).fitness).toBe(5);
  });
});
