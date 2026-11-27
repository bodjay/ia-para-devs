import { GeneticAlgorithmConfig } from '@tech-challenge/genetic';
import { Request } from 'express';
import { InvalidQueryError } from './InvalidQueryError';

export type SolveQuery = Readonly<Record<string, string | undefined>>;

export function toQuery(raw: Request['query']): SolveQuery {
  const query: Record<string, string> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      query[key] = value;
    }
  }

  return query;
}

const CONFIG_FIELDS: readonly (keyof GeneticAlgorithmConfig)[] = [
  'populationSize',
  'eliteCount',
  'mutationRate',
  'tournamentSize',
  'maxGenerations',
  'stagnationLimit',
  'hotstartRatio',
];

export function requireText(query: SolveQuery, key: string): string {
  const value = query[key];

  if (!value) {
    throw new InvalidQueryError(`Informe o parâmetro ${key}.`);
  }

  return value;
}

export function readOptionalNumber(query: SolveQuery, key: string): number | undefined {
  const raw = query[key];

  if (raw === undefined || raw === '') {
    return undefined;
  }

  const value = Number(raw);

  if (Number.isNaN(value)) {
    throw new InvalidQueryError(`O parâmetro ${key} deve ser numérico.`);
  }

  return value;
}

export function parseGeneticConfig(query: SolveQuery): Partial<GeneticAlgorithmConfig> {
  const config: Partial<GeneticAlgorithmConfig> = {};

  for (const field of CONFIG_FIELDS) {
    const value = readOptionalNumber(query, field);

    if (value !== undefined) {
      config[field] = value;
    }
  }

  return config;
}
