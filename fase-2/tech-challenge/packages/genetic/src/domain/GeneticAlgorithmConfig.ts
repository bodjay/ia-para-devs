import { InvalidConfigError } from './errors/InvalidConfigError';

export interface GeneticAlgorithmConfig {
  populationSize: number;
  eliteCount: number;
  mutationRate: number;
  tournamentSize: number;
  maxGenerations: number;
  stagnationLimit: number;
  hotstartRatio: number;
}

export const DEFAULT_CONFIG: GeneticAlgorithmConfig = {
  populationSize: 300,
  eliteCount: 15,
  mutationRate: 0.3,
  tournamentSize: 3,
  maxGenerations: 5000,
  stagnationLimit: 300,
  hotstartRatio: 0,
};

export function createConfig(
  overrides: Partial<GeneticAlgorithmConfig> = {},
  defaults: GeneticAlgorithmConfig = DEFAULT_CONFIG,
): GeneticAlgorithmConfig {
  const config: GeneticAlgorithmConfig = { ...defaults, ...overrides };

  ensureInteger('populationSize', config.populationSize, 2);
  ensureInteger('eliteCount', config.eliteCount, 0);
  ensureInteger('tournamentSize', config.tournamentSize, 1);
  ensureInteger('maxGenerations', config.maxGenerations, 1);
  ensureInteger('stagnationLimit', config.stagnationLimit, 1);

  if (config.eliteCount >= config.populationSize) {
    throw new InvalidConfigError('eliteCount deve ser menor que populationSize.');
  }

  ensureRatio('mutationRate', config.mutationRate);
  ensureRatio('hotstartRatio', config.hotstartRatio);

  return config;
}

function ensureRatio(name: string, value: number): void {
  if (!(value >= 0 && value <= 1)) {
    throw new InvalidConfigError(`${name} deve estar entre 0 e 1.`);
  }
}

function ensureInteger(name: string, value: number, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new InvalidConfigError(`${name} deve ser um inteiro maior ou igual a ${minimum}.`);
  }
}
