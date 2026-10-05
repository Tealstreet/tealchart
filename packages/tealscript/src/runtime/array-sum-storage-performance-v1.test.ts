import { describe, expect, it } from 'vitest';

import { createPineArray, pushArrayValue, setArrayValue, sliceArray, sumArrayValue } from './arrays';

describe('owning numeric sum storage', () => {
  it('retains ordered sums and mutations while avoiding the required host snapshot cost', () => {
    for (const values of [[], [NaN], [-0], [1e16, 1, -1e16, NaN, 3], [Infinity, -Infinity]]) {
      const array = createPineArray<number>();
      for (const value of values) pushArrayValue(array, value);
      const present = values.filter((value) => !Number.isNaN(value));
      const expected = present.length ? present.reduce((sum, value) => sum + value, 0) : NaN;
      expect(Object.is(sumArrayValue(array), expected)).toBe(true);
    }
    const array = createPineArray<number>(3, NaN);
    setArrayValue(array, 1, 5);
    expect(sumArrayValue(array)).toBe(5);
    setArrayValue(array, 1, 7);
    expect(sumArrayValue(array)).toBe(7);
    expect(sumArrayValue(sliceArray(array, 1, 2))).toBe(7);
    array.values[Symbol.iterator] = function* (): Generator<number, undefined, unknown> {
      yield 3;
      yield 9;
    };
    expect(sumArrayValue(array)).toBe(12);

    const coercible = createPineArray<unknown>();
    pushArrayValue(coercible, {
      valueOf() {
        coercible.values[1] = 99;
        return 3;
      },
    });
    pushArrayValue(coercible, { valueOf: () => 5 });
    expect(sumArrayValue(coercible)).toBe(8);

    if (process.env.TEALSCRIPT_PERF_ASSERT !== '1') return;
    const owning = createPineArray<number>(5000, 1);
    const exposed = createPineArray<number>(5000, 1);
    expect(exposed.values.length).toBe(5000);
    const measure = (input: typeof owning) => {
      const started = process.cpuUsage();
      let result = 0;
      for (let index = 0; index < 10_000; index++) result += sumArrayValue(input);
      const cpu = process.cpuUsage(started);
      expect(result).toBe(50_000_000);
      return cpu.user + cpu.system;
    };
    const direct = [measure(owning), measure(owning)];
    const snapshot = [measure(exposed), measure(exposed)];
    expect(Math.min(...direct), `direct=${direct}, snapshot=${snapshot}`).toBeLessThan(Math.min(...snapshot) * 0.65);
  });
});
