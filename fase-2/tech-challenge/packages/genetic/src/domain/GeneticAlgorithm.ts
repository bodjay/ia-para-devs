import {
  IChromosomeFactory,
  ICrossoverStrategy,
  IFitnessEvaluator,
  IMutationStrategy,
  IRandomGenerator,
  ISelectionStrategy,
} from './contracts';
import { InvalidConfigError } from './errors/InvalidConfigError';
import { GeneticAlgorithmConfig } from './GeneticAlgorithmConfig';
import { Individual, byLowerFitness } from './Individual';

export interface GeneticOperators<C> {
  chromosomeFactory: IChromosomeFactory<C>;
  fitnessEvaluator: IFitnessEvaluator<C>;
  selection: ISelectionStrategy<C>;
  crossover: ICrossoverStrategy<C>;
  mutation: IMutationStrategy<C>;
  random: IRandomGenerator;
  hotstartFactory?: IChromosomeFactory<C>;
}

export interface GenerationSnapshot<C> {
  generation: number;
  best: Individual<C>;
  currentBestFitness: number;
  averageFitness: number;
  restarts: number;
  stagnantGenerations: number;
  solved: boolean;
  population: readonly Individual<C>[];
}

export class GeneticAlgorithm<C> {
  private population: Individual<C>[] = [];

  private generation = 0;

  private restarts = 0;

  private stagnantGenerations = 0;

  private bestOfCurrentRun = Number.POSITIVE_INFINITY;

  private bestEver: Individual<C> | undefined;

  constructor(
    private readonly config: GeneticAlgorithmConfig,
    private readonly operators: GeneticOperators<C>,
  ) {
    if (config.hotstartRatio > 0 && !operators.hotstartFactory) {
      throw new InvalidConfigError('Este problema não oferece hotstart, então hotstartRatio deve ser 0.');
    }
  }

  evolve(): GenerationSnapshot<C> {
    if (this.population.length === 0) {
      this.population = this.randomPopulation();
    } else {
      this.population = this.breedNextGeneration();
      this.generation++;
    }

    this.population.sort(byLowerFitness);
    this.rememberBest(this.population[0]);

    const snapshot = this.snapshot();

    this.handleStagnation();

    return snapshot;
  }

  private breedNextGeneration(): Individual<C>[] {
    const { selection, crossover, mutation, random } = this.operators;
    const offspring = this.population.slice(0, this.config.eliteCount);

    while (offspring.length < this.config.populationSize) {
      const mother = selection.select(this.population);
      const father = selection.select(this.population);

      let child = crossover.crossover(mother.chromosome, father.chromosome);

      if (random.next() < this.config.mutationRate) {
        child = mutation.mutate(child);
      }

      offspring.push(this.toIndividual(child));
    }

    return offspring;
  }

  private rememberBest(candidate: Individual<C>): void {
    if (!this.bestEver || candidate.fitness < this.bestEver.fitness) {
      this.bestEver = candidate;
    }
  }

  /**
   * Quando a população fica presa em um mínimo local por muitas gerações,
   * ela é recriada do zero. O melhor indivíduo já encontrado continua
   * guardado à parte, mas não volta para a população, evitando que ela
   * convirja de novo para o mesmo ponto.
   */
  private handleStagnation(): void {
    const currentBest = this.population[0].fitness;

    if (currentBest < this.bestOfCurrentRun) {
      this.bestOfCurrentRun = currentBest;
      this.stagnantGenerations = 0;
      return;
    }

    this.stagnantGenerations++;

    if (this.stagnantGenerations >= this.config.stagnationLimit) {
      this.restart();
    }
  }

  private restart(): void {
    this.population = this.randomPopulation().sort(byLowerFitness);
    this.bestOfCurrentRun = Number.POSITIVE_INFINITY;
    this.stagnantGenerations = 0;
    this.restarts++;
  }

  /**
   * Hotstart: uma parte da população nasce de uma heurística do problema,
   * e o restante é aleatório para manter a diversidade. Os reinícios por
   * estagnação usam a mesma composição.
   */
  private randomPopulation(): Individual<C>[] {
    const { chromosomeFactory, hotstartFactory } = this.operators;
    const hotstartCount = hotstartFactory ? Math.round(this.config.populationSize * this.config.hotstartRatio) : 0;

    return Array.from({ length: this.config.populationSize }, (_, index) => {
      const factory = hotstartFactory && index < hotstartCount ? hotstartFactory : chromosomeFactory;

      return this.toIndividual(factory.create());
    });
  }

  private toIndividual(chromosome: C): Individual<C> {
    return {
      chromosome,
      fitness: this.operators.fitnessEvaluator.evaluate(chromosome),
    };
  }

  private snapshot(): GenerationSnapshot<C> {
    const best = this.bestEver ?? this.population[0];
    const totalFitness = this.population.reduce((sum, individual) => sum + individual.fitness, 0);

    return {
      generation: this.generation,
      best,
      currentBestFitness: this.population[0].fitness,
      averageFitness: totalFitness / this.population.length,
      restarts: this.restarts,
      stagnantGenerations: this.population[0].fitness < this.bestOfCurrentRun ? 0 : this.stagnantGenerations + 1,
      solved: this.operators.fitnessEvaluator.isSolution(best.chromosome),
      population: this.population,
    };
  }
}
