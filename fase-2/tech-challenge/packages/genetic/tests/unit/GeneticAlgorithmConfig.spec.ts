import { DEFAULT_CONFIG, InvalidConfigError, createConfig } from '../../src';

describe('createConfig', () => {
  it('uses default values when nothing is informed', () => {
    expect(createConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('applies overrides', () => {
    const config = createConfig({ populationSize: 50, eliteCount: 5 });

    expect(config.populationSize).toBe(50);
    expect(config.eliteCount).toBe(5);
    expect(config.mutationRate).toBe(DEFAULT_CONFIG.mutationRate);
  });

  it('accepts custom defaults', () => {
    const defaults = { ...DEFAULT_CONFIG, populationSize: 80, eliteCount: 4 };

    expect(createConfig({ eliteCount: 8 }, defaults)).toEqual({ ...defaults, eliteCount: 8 });
  });

  it.each([
    { populationSize: 1 },
    { populationSize: 10.5 },
    { eliteCount: -1 },
    { tournamentSize: 0 },
    { maxGenerations: 0 },
    { stagnationLimit: 0 },
    { mutationRate: 1.5 },
    { mutationRate: Number.NaN },
    { hotstartRatio: -0.1 },
    { hotstartRatio: 1.1 },
  ])('rejects invalid value %o', (override) => {
    expect(() => createConfig(override)).toThrow(InvalidConfigError);
  });

  it('rejects an elite as large as the population', () => {
    expect(() => createConfig({ populationSize: 10, eliteCount: 10 })).toThrow(InvalidConfigError);
  });
});
