import { IRandomGenerator, ISelectionStrategy } from '../contracts';
import { Individual } from '../Individual';

export class TournamentSelection<C> implements ISelectionStrategy<C> {
  constructor(
    private readonly random: IRandomGenerator,
    private readonly tournamentSize: number,
  ) {}

  select(population: readonly Individual<C>[]): Individual<C> {
    let winner = this.pick(population);

    for (let round = 1; round < this.tournamentSize; round++) {
      const challenger = this.pick(population);

      if (challenger.fitness < winner.fitness) {
        winner = challenger;
      }
    }

    return winner;
  }

  private pick(population: readonly Individual<C>[]): Individual<C> {
    return population[this.random.nextInt(population.length)];
  }
}
