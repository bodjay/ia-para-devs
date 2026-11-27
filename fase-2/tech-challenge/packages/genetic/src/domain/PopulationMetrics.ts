import { Individual } from './Individual';

export interface PopulationMetrics {
  uniqueRatio: number;
  entropy: number;
  fitnessStdDev: number;
}

/**
 * Métricas de diversidade e convergência da aula 3.
 *
 * Soluções únicas: proporção de cromossomos distintos na população.
 * Entropia genética: H = -Σ p·log₂(p) sobre a frequência de cada cromossomo,
 * dividida pelo máximo possível (log₂ do tamanho da população), então vai de 0
 * (todos iguais) a 1 (todos diferentes).
 * Desvio padrão do fitness: quanto menor, mais parecidas estão as soluções.
 */
export function measurePopulation<C>(
  population: readonly Individual<C>[],
  keyOf: (chromosome: C) => string = (chromosome) => JSON.stringify(chromosome),
): PopulationMetrics {
  const size = population.length;

  if (size === 0) {
    return { uniqueRatio: 0, entropy: 0, fitnessStdDev: 0 };
  }

  const frequencies = new Map<string, number>();

  population.forEach(({ chromosome }) => {
    const key = keyOf(chromosome);
    frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
  });

  let entropy = 0;

  frequencies.forEach((count) => {
    const share = count / size;
    entropy -= share * Math.log2(share);
  });

  const meanFitness = population.reduce((sum, individual) => sum + individual.fitness, 0) / size;
  const variance = population.reduce((sum, individual) => sum + (individual.fitness - meanFitness) ** 2, 0) / size;

  return {
    uniqueRatio: frequencies.size / size,
    entropy: size > 1 ? entropy / Math.log2(size) : 0,
    fitnessStdDev: Math.sqrt(variance),
  };
}
