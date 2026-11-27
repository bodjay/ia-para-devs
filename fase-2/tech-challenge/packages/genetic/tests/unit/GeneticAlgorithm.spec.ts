import { GeneticAlgorithm, GeneticOperators, InvalidConfigError, createConfig } from '../../src';
import { Bits, SequenceRandom, createBitsAlgorithm } from '../helpers';

function constantOperators(fitness: number, onCreate: () => void = () => undefined): GeneticOperators<Bits> {
  return {
    chromosomeFactory: { create: () => { onCreate(); return [0]; } },
    fitnessEvaluator: { evaluate: () => fitness, isSolution: () => fitness === 0 },
    selection: { select: (population) => population[0] },
    crossover: { crossover: (first) => first },
    mutation: { mutate: (bits) => bits },
    random: new SequenceRandom([0.5]),
  };
}

describe('GeneticAlgorithm', () => {
  it('starts at generation zero with the requested population size', () => {
    let created = 0;
    const config = createConfig({ populationSize: 10, eliteCount: 1 });
    const algorithm = new GeneticAlgorithm(config, constantOperators(0, () => created++));

    const snapshot = algorithm.evolve();

    expect(snapshot.generation).toBe(0);
    expect(snapshot.solved).toBe(true);
    expect(created).toBe(10);
  });

  it('never loses the best individual between generations', () => {
    const config = createConfig({ populationSize: 50, eliteCount: 2, stagnationLimit: 1000 });
    const algorithm = createBitsAlgorithm(5, config);

    let previous = algorithm.evolve().best.fitness;

    for (let generation = 0; generation < 50; generation++) {
      const current = algorithm.evolve().best.fitness;

      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it('restarts the population after the stagnation limit', () => {
    let created = 0;
    const config = createConfig({ populationSize: 5, eliteCount: 1, stagnationLimit: 3 });
    const algorithm = new GeneticAlgorithm(config, constantOperators(4, () => created++));

    algorithm.evolve();

    for (let step = 0; step < 3; step++) {
      expect(algorithm.evolve().restarts).toBe(0);
    }

    expect(algorithm.evolve().restarts).toBe(1);
    expect(created).toBe(10);
  });

  it('counts the generations without improvement in each snapshot', () => {
    const config = createConfig({ populationSize: 5, eliteCount: 1, stagnationLimit: 10 });
    const algorithm = new GeneticAlgorithm(config, constantOperators(4));

    const counts = Array.from({ length: 4 }, () => algorithm.evolve().stagnantGenerations);

    expect(counts).toEqual([0, 1, 2, 3]);
  });

  it('keeps the population of the snapshot even when a restart replaces it', () => {
    const config = createConfig({ populationSize: 5, eliteCount: 1, stagnationLimit: 1 });
    const algorithm = new GeneticAlgorithm(config, constantOperators(4));

    algorithm.evolve();
    const snapshot = algorithm.evolve();

    expect(snapshot.restarts).toBe(0);
    expect(snapshot.population).toHaveLength(5);
    expect(algorithm.evolve().population).not.toBe(snapshot.population);
  });

  it('keeps the best result found even after a restart', () => {
    const config = createConfig({ populationSize: 5, eliteCount: 1, stagnationLimit: 1 });
    const algorithm = new GeneticAlgorithm(config, constantOperators(4));

    let snapshot = algorithm.evolve();

    for (let step = 0; step < 5; step++) {
      snapshot = algorithm.evolve();
    }

    expect(snapshot.restarts).toBeGreaterThan(0);
    expect(snapshot.best.fitness).toBe(4);
  });

  it('solves the toy problem', () => {
    const config = createConfig({ populationSize: 60, eliteCount: 3 });
    const algorithm = createBitsAlgorithm(42, config);

    let snapshot = algorithm.evolve();

    while (!snapshot.solved && snapshot.generation < 500) {
      snapshot = algorithm.evolve();
    }

    expect(snapshot.solved).toBe(true);
    expect(snapshot.best.fitness).toBe(0);
  });

  describe('hotstart', () => {
    const countingOperators = (counter: { plain: number; hot: number }): GeneticOperators<Bits> => ({
      ...constantOperators(4, () => counter.plain++),
      hotstartFactory: { create: () => { counter.hot++; return [1]; } },
    });

    it('creates the configured share of the population with the heuristic', () => {
      const counter = { plain: 0, hot: 0 };
      const config = createConfig({ populationSize: 20, eliteCount: 1, hotstartRatio: 0.25 });

      new GeneticAlgorithm(config, countingOperators(counter)).evolve();

      expect(counter).toEqual({ plain: 15, hot: 5 });
    });

    it('keeps the same share when the population restarts', () => {
      const counter = { plain: 0, hot: 0 };
      const config = createConfig({ populationSize: 10, eliteCount: 1, stagnationLimit: 1, hotstartRatio: 0.5 });
      const algorithm = new GeneticAlgorithm(config, countingOperators(counter));

      algorithm.evolve();
      algorithm.evolve();

      expect(counter).toEqual({ plain: 10, hot: 10 });
    });

    it('ignores the heuristic when the ratio is zero', () => {
      const counter = { plain: 0, hot: 0 };

      new GeneticAlgorithm(createConfig({ populationSize: 10, eliteCount: 1 }), countingOperators(counter)).evolve();

      expect(counter).toEqual({ plain: 10, hot: 0 });
    });

    it('rejects a ratio above zero when the problem has no heuristic', () => {
      const config = createConfig({ populationSize: 10, eliteCount: 1, hotstartRatio: 0.1 });

      expect(() => new GeneticAlgorithm(config, constantOperators(0))).toThrow(InvalidConfigError);
    });
  });
});
