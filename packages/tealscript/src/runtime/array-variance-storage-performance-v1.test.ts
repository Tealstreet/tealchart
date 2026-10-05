import { describe, expect, it } from 'vitest';

import { createPineArray, pushArrayValue, varianceArrayValue } from './arrays';

describe('unexposed numeric variance storage cost', () => {
  it('reduces unexposed numeric storage faster than a required host snapshot', () => {
    const array = createPineArray<number>();
    const exposed = createPineArray<number>();
    for (let index = 0; index < 5000; index++) {
      const value = Math.log(index + 1);
      pushArrayValue(array, value);
      pushArrayValue(exposed, value);
    }
    expect(exposed.values.length).toBe(5000);
    const measure = (input: typeof array) => {
      const start = process.cpuUsage();
      let variance = 0;
      for (let index = 0; index < 10_000; index++) variance = varianceArrayValue(input);
      const cpu = process.cpuUsage(start);
      expect(variance).toBe(0.9912837083517942);
      return cpu.user + cpu.system;
    };
    const actual: number[] = [];
    const snapshot: number[] = [];
    for (let round = 0; round < 3; round++) {
      actual.push(measure(array));
      snapshot.push(measure(exposed));
    }
    const median = (values: number[]) => values.sort((a, b) => a - b)[1]!;
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(median(actual), `direct=${actual}, snapshot=${snapshot}`).toBeLessThan(median(snapshot) * 0.65 + 10_000);
    }
  }, 30_000);

  it('retains ordered snapshot coercion when objects mutate source storage', () => {
    const array = createPineArray<unknown>();
    const conversions: string[] = [];
    pushArrayValue(array, {
      valueOf() {
        conversions.push('first');
        array.values[1] = 99;
        return 3;
      },
    });
    pushArrayValue(array, {
      valueOf() {
        conversions.push('second');
        return 7;
      },
    });
    expect(varianceArrayValue(array)).toBe(4);
    expect(conversions).toEqual(['first', 'second']);
    expect(array.values[1]).toBe(99);
  });

  it('filters missing numeric slots before both biased variance reductions', () => {
    const array = createPineArray<number>();
    for (const value of [1, NaN, 5]) pushArrayValue(array, value);
    expect(varianceArrayValue(array)).toBe(4);
    expect(varianceArrayValue(array, false)).toBe(8);
  });

  it('retains host iteration after exposing backing storage', () => {
    const array = createPineArray<number>();
    pushArrayValue(array, 1);
    pushArrayValue(array, 5);
    array.values[Symbol.iterator] = function* (): Generator<number, undefined, unknown> {
      yield 3;
      yield 9;
    };
    expect(varianceArrayValue(array)).toBe(9);
  });
});
