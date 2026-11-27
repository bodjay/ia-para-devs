import { EvolutionRunner, IScheduler, InvalidConfigError, SeededRandomGenerator } from '@tech-challenge/genetic';
import {
  GenerateJigsawUseCase,
  InvalidJigsawError,
  JigsawAlgorithmFactory,
  JigsawBoard,
  SolveJigsawUseCase,
} from '../../src';

const immediate: IScheduler = { yield: () => Promise.resolve() };

function makeUseCase(seed = 1): SolveJigsawUseCase {
  return new SolveJigsawUseCase(
    new JigsawAlgorithmFactory(new SeededRandomGenerator(seed)),
    new EvolutionRunner(immediate),
  );
}

const puzzle = (size: number): string => JigsawBoard.generate(size, 3, new SeededRandomGenerator(1)).toString();

describe('SolveJigsawUseCase', () => {
  it('assembles a 4x4 puzzle with no loose edges', async () => {
    const result = await makeUseCase().execute({ puzzle: puzzle(4) }, () => undefined);

    expect(result.status).toBe('solved');
    expect(result.bestFitness).toBe(0);
    expect(result.view.mismatches).toEqual([]);
  });

  it('rebuilds the original picture when the solution is unique', async () => {
    const result = await makeUseCase().execute({ puzzle: puzzle(4) }, () => undefined);

    expect(result.view.placement).toEqual(Array.from({ length: 16 }, (_, index) => index));
  });

  it('reports the loose edges of the best attempt', async () => {
    const result = await makeUseCase().execute(
      { puzzle: puzzle(6), config: { populationSize: 10, eliteCount: 1, maxGenerations: 2 } },
      () => undefined,
    );

    expect(result.status).toBe('exhausted');
    expect(result.view.mismatches).toHaveLength(result.bestFitness);
  });

  it('stops when the signal is aborted', async () => {
    const abort = new AbortController();
    abort.abort();

    const result = await makeUseCase().execute({ puzzle: puzzle(6) }, () => undefined, abort.signal);

    expect(result.status).toBe('cancelled');
  });

  it('rejects a malformed puzzle', () => {
    expect(() => makeUseCase().execute({ puzzle: 'invalid' }, () => undefined)).toThrow(InvalidJigsawError);
  });

  it('rejects an invalid configuration', () => {
    const request = { puzzle: puzzle(3), config: { mutationRate: 2 } };

    expect(() => makeUseCase().execute(request, () => undefined)).toThrow(InvalidConfigError);
  });

  it('solves a larger puzzle faster with hotstart', async () => {
    const board = new GenerateJigsawUseCase(new SeededRandomGenerator(5)).execute({ size: 7 });
    const config = { maxGenerations: 3000 };

    const plain = await makeUseCase(2).execute({ puzzle: board, config }, () => undefined);
    const hot = await makeUseCase(2).execute({ puzzle: board, config: { ...config, hotstartRatio: 0.1 } }, () => undefined);

    expect(hot.status).toBe('solved');
    expect(plain.status !== 'solved' || hot.generation < plain.generation).toBe(true);
  });
});
