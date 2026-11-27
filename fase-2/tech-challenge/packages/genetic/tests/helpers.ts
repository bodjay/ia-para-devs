import {
  GeneticAlgorithm,
  GeneticAlgorithmConfig,
  GeneticOperators,
  IRandomGenerator,
  SeededRandomGenerator,
  TournamentSelection,
} from '../src';

export type Bits = number[];

export const BIT_COUNT = 20;

export class SequenceRandom implements IRandomGenerator {
  private index = 0;

  constructor(private readonly values: number[]) {}

  next(): number {
    const value = this.values[this.index % this.values.length];
    this.index++;

    return value;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

/**
 * Problema de brinquedo para testar o motor sem depender de nenhum jogo.
 * O fitness é a quantidade de zeros e a solução é o vetor só com uns.
 */
export function createBitsOperators(random: IRandomGenerator, tournamentSize = 3): GeneticOperators<Bits> {
  const zeros = (bits: Bits): number => bits.filter((bit) => bit === 0).length;

  return {
    chromosomeFactory: { create: () => Array.from({ length: BIT_COUNT }, () => random.nextInt(2)) },
    fitnessEvaluator: { evaluate: zeros, isSolution: (bits) => zeros(bits) === 0 },
    selection: new TournamentSelection<Bits>(random, tournamentSize),
    crossover: {
      crossover: (first, second) => {
        const cut = random.nextInt(BIT_COUNT);

        return [...first.slice(0, cut), ...second.slice(cut)];
      },
    },
    mutation: {
      mutate: (bits) => {
        const mutated = [...bits];
        const index = random.nextInt(BIT_COUNT);
        mutated[index] = mutated[index] === 0 ? 1 : 0;

        return mutated;
      },
    },
    random,
  };
}

export function createBitsAlgorithm(seed: number, config: GeneticAlgorithmConfig): GeneticAlgorithm<Bits> {
  return new GeneticAlgorithm(config, createBitsOperators(new SeededRandomGenerator(seed)));
}
