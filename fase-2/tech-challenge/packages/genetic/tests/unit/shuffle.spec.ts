import { SeededRandomGenerator, shuffle } from '../../src';

describe('shuffle', () => {
  it('returns a permutation without changing the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const result = shuffle(input, new SeededRandomGenerator(3));

    expect([...result].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('SeededRandomGenerator', () => {
  it('produces the same sequence for the same seed', () => {
    const first = new SeededRandomGenerator(10);
    const second = new SeededRandomGenerator(10);

    const values = Array.from({ length: 5 }, () => first.next());

    expect(values).toEqual(Array.from({ length: 5 }, () => second.next()));
  });

  it('keeps nextInt inside the requested range', () => {
    const random = new SeededRandomGenerator(1);

    for (let index = 0; index < 200; index++) {
      const value = random.nextInt(7);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });
});
