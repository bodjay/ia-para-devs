import { Individual, measurePopulation } from '../../src';

const individual = (chromosome: number[], fitness: number): Individual<number[]> => ({ chromosome, fitness });

describe('measurePopulation', () => {
  it('reports full diversity when every chromosome is different', () => {
    const metrics = measurePopulation([individual([1], 1), individual([2], 1), individual([3], 1), individual([4], 1)]);

    expect(metrics.uniqueRatio).toBe(1);
    expect(metrics.entropy).toBeCloseTo(1);
  });

  it('reports no diversity when every chromosome is the same', () => {
    const metrics = measurePopulation([individual([1], 2), individual([1], 2), individual([1], 2)]);

    expect(metrics.uniqueRatio).toBeCloseTo(1 / 3);
    expect(metrics.entropy).toBe(0);
    expect(metrics.fitnessStdDev).toBe(0);
  });

  it('computes the normalized entropy of the lesson example', () => {
    const population = [individual([1], 0), individual([2], 0), individual([3], 0)];

    expect(measurePopulation(population).entropy).toBeCloseTo(1);
  });

  it('weights the entropy by how often each chromosome appears', () => {
    const population = [individual([1], 0), individual([1], 0), individual([2], 0), individual([3], 0)];

    expect(measurePopulation(population).entropy).toBeCloseTo(1.5 / 2);
  });

  it('computes the standard deviation of the fitness values', () => {
    const population = [individual([1], 2), individual([2], 4), individual([3], 4), individual([4], 4), individual([5], 5), individual([6], 5), individual([7], 7), individual([8], 9)];

    expect(measurePopulation(population).fitnessStdDev).toBeCloseTo(2);
  });

  it('accepts a custom key for comparing chromosomes', () => {
    const population = [individual([1, 2], 0), individual([2, 1], 0)];
    const sortedKey = (chromosome: number[]): string => [...chromosome].sort().join();

    expect(measurePopulation(population, sortedKey).uniqueRatio).toBe(0.5);
  });

  it('handles an empty population', () => {
    expect(measurePopulation([])).toEqual({ uniqueRatio: 0, entropy: 0, fitnessStdDev: 0 });
  });
});
