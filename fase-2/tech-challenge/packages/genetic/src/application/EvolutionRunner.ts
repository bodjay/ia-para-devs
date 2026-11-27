import { GenerationSnapshot, GeneticAlgorithm } from '../domain/GeneticAlgorithm';
import { measurePopulation } from '../domain/PopulationMetrics';
import { IScheduler } from './IScheduler';

export type EvolutionStatus = 'solved' | 'exhausted' | 'cancelled';

export interface EvolutionOptions<C, V> {
  algorithm: GeneticAlgorithm<C>;
  maxGenerations: number;
  toView: (chromosome: C) => V;
  reportEvery?: number;
}

export interface EvolutionProgress<V> {
  generation: number;
  bestFitness: number;
  currentBestFitness: number;
  averageFitness: number;
  restarts: number;
  stagnantGenerations: number;
  uniqueRatio: number;
  entropy: number;
  fitnessStdDev: number;
  elapsedMs: number;
  view: V;
}

export interface EvolutionResult<V> extends EvolutionProgress<V> {
  status: EvolutionStatus;
}

export type ProgressListener<V> = (progress: EvolutionProgress<V>) => void;

const DEFAULT_REPORT_EVERY = 10;

/**
 * Conduz a evolução geração a cada geração, publica o progresso em lotes
 * e interrompe quando há solução, limite de gerações ou cancelamento.
 */
export class EvolutionRunner {
  constructor(private readonly scheduler: IScheduler) {}

  async run<C, V>(
    options: EvolutionOptions<C, V>,
    onProgress: ProgressListener<V>,
    signal?: AbortSignal,
  ): Promise<EvolutionResult<V>> {
    const startedAt = Date.now();
    const reportEvery = Math.max(1, options.reportEvery ?? DEFAULT_REPORT_EVERY);
    const toProgress = (snapshot: GenerationSnapshot<C>): EvolutionProgress<V> => {
      const metrics = measurePopulation(snapshot.population);

      return {
        generation: snapshot.generation,
        bestFitness: snapshot.best.fitness,
        currentBestFitness: snapshot.currentBestFitness,
        averageFitness: round(snapshot.averageFitness, 2),
        restarts: snapshot.restarts,
        stagnantGenerations: snapshot.stagnantGenerations,
        uniqueRatio: round(metrics.uniqueRatio, 3),
        entropy: round(metrics.entropy, 3),
        fitnessStdDev: round(metrics.fitnessStdDev, 2),
        elapsedMs: Date.now() - startedAt,
        view: options.toView(snapshot.best.chromosome),
      };
    };
    const finish = (status: EvolutionStatus, snapshot: GenerationSnapshot<C>): EvolutionResult<V> => ({
      ...toProgress(snapshot),
      status,
    });

    let snapshot = options.algorithm.evolve();

    onProgress(toProgress(snapshot));

    while (!snapshot.solved && snapshot.generation < options.maxGenerations) {
      if (signal?.aborted) {
        return finish('cancelled', snapshot);
      }

      snapshot = options.algorithm.evolve();

      if (snapshot.generation % reportEvery === 0) {
        onProgress(toProgress(snapshot));
        await this.scheduler.yield();
      }
    }

    return finish(snapshot.solved ? 'solved' : 'exhausted', snapshot);
  }
}

function round(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}
