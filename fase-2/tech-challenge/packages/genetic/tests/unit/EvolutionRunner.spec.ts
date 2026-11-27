import { EvolutionProgress, EvolutionRunner, IScheduler, createConfig } from '../../src';
import { Bits, createBitsAlgorithm } from '../helpers';

const immediate: IScheduler = { yield: () => Promise.resolve() };

const toView = (bits: Bits): number => bits.filter((bit) => bit === 1).length;

describe('EvolutionRunner', () => {
  const runner = new EvolutionRunner(immediate);

  it('solves the problem and reports progress from generation zero', async () => {
    const progress: EvolutionProgress<number>[] = [];
    const config = createConfig({ populationSize: 60, eliteCount: 3 });

    const result = await runner.run(
      { algorithm: createBitsAlgorithm(42, config), maxGenerations: 500, reportEvery: 1, toView },
      (update) => progress.push(update),
    );

    expect(result.status).toBe('solved');
    expect(result.bestFitness).toBe(0);
    expect(result.view).toBe(20);
    expect(progress[0].generation).toBe(0);
    expect(progress.length).toBeGreaterThan(1);
  });

  it('stops when the generation limit is reached', async () => {
    const config = createConfig({ populationSize: 10, eliteCount: 1 });

    const result = await runner.run(
      { algorithm: createBitsAlgorithm(1, config), maxGenerations: 2, toView },
      () => undefined,
    );

    expect(result.status).toBe('exhausted');
    expect(result.generation).toBe(2);
  });

  it('stops when the signal is aborted', async () => {
    const abort = new AbortController();
    abort.abort();
    const config = createConfig({ populationSize: 10, eliteCount: 1 });

    const result = await runner.run(
      { algorithm: createBitsAlgorithm(1, config), maxGenerations: 100, toView },
      () => undefined,
      abort.signal,
    );

    expect(result.status).toBe('cancelled');
  });

  it('reports progress only on the configured interval', async () => {
    const generations: number[] = [];
    const config = createConfig({ populationSize: 10, eliteCount: 1 });

    await runner.run(
      { algorithm: createBitsAlgorithm(1, config), maxGenerations: 20, reportEvery: 5, toView },
      (update) => generations.push(update.generation),
    );

    expect(generations).toEqual([0, 5, 10, 15, 20]);
  });

  it('reports diversity, stagnation and elapsed time with each progress', async () => {
    const progress: EvolutionProgress<number>[] = [];
    const config = createConfig({ populationSize: 30, eliteCount: 2 });

    await runner.run(
      { algorithm: createBitsAlgorithm(3, config), maxGenerations: 5, reportEvery: 1, toView },
      (update) => progress.push(update),
    );

    progress.forEach((update) => {
      expect(update.uniqueRatio).toBeGreaterThan(0);
      expect(update.uniqueRatio).toBeLessThanOrEqual(1);
      expect(update.entropy).toBeGreaterThanOrEqual(0);
      expect(update.entropy).toBeLessThanOrEqual(1);
      expect(update.fitnessStdDev).toBeGreaterThanOrEqual(0);
      expect(update.stagnantGenerations).toBeGreaterThanOrEqual(0);
      expect(update.elapsedMs).toBeGreaterThanOrEqual(0);
    });
    expect(progress[0].uniqueRatio).toBeGreaterThan(0.5);
  });
});
