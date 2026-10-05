// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries950-953.
import type { PineArray } from './arrays';

import { expect, it } from 'vitest';

import { maxArrayValue, minArrayValue } from './arrays';

const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
timingIt(
  'keeps zero-rank extrema near a linear scan',
  () => {
    const values = Array.from({ length: 2048 }, (_, i) => (i * 7919) % 2048);
    const array: PineArray<number> = { __tealscriptArray: true, values };
    const control = () => {
      const copy = values.slice();
      let min = copy[0]!;
      let max = min;
      for (const value of copy) {
        if (value < min) min = value;
        if (value > max) max = value;
      }
      return min + max;
    };
    const actual = () => minArrayValue(array, 0) + maxArrayValue(array, 0);
    const measure = (fn: () => number) => {
      const start = process.cpuUsage();
      let sum = 0;
      for (let i = 0; i < 600; i++) sum += fn();
      const cpu = process.cpuUsage(start);
      expect(sum).toBe(600 * 2047);
      return cpu.user + cpu.system;
    };
    measure(actual);
    measure(control);
    const ratios = Array.from({ length: 5 }, (_, i) => {
      const first = measure(i % 2 ? control : actual);
      const second = measure(i % 2 ? actual : control);
      return i % 2 ? second / first : first / second;
    });
    const median = ratios.sort((a, b) => a - b)[2]!;
    console.info(JSON.stringify({ extremaCpuRatios: ratios, median }));
    expect(median).toBeLessThan(8);
  },
  30000,
);

it('matches stable sorting for zero and higher ranks without changing storage', () => {
  const cases = [[], [NaN], [0, -0], [-0, 0], [NaN, 3, 1.5, 3, -4], [Infinity, -Infinity, 7], ['2', null, false, -1]];
  for (const input of cases) {
    const array: PineArray = { __tealscriptArray: true, values: input.slice() };
    for (const rank of [undefined, 0, 1, 2, -1, 999, NaN, 1.9]) {
      const values = input.map(Number).filter((value) => !Number.isNaN(value));
      const index = Number.isNaN(Number(rank)) ? 0 : Math.trunc(Number(rank));
      const minimum = values.slice().sort((a, b) => a - b)[index] ?? NaN;
      const maximum = values.slice().sort((a, b) => b - a)[index] ?? NaN;
      expect(Object.is(minArrayValue(array, rank), minimum)).toBe(true);
      expect(Object.is(maxArrayValue(array, rank), maximum)).toBe(true);
      expect(array.values).toEqual(input);
    }
  }
});
