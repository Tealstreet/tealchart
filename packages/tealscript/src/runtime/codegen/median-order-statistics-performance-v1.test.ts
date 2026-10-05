import { expect, it } from 'vitest';

import { Median } from './ta-classes';

const timingIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
const sortedMedian = (values: number[]) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

it('matches full stable sorting through missing samples, snapshots and recomputation', () => {
  let seed = 1425;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (const length of [1, 2, 3, 8, 31, 64, 500]) {
    const median = new Median(length);
    let window: number[] = [];
    const advance = (values: number[], value: number) => {
      const next = Number.isNaN(value) ? values.slice() : [...values, value].slice(-length);
      return { next, result: next.length < length ? NaN : sortedMedian(next) };
    };
    for (let i = 0; i < 1200; i++) {
      const value = [NaN, 0, -0, Infinity, -Infinity, (random() % 37) - 18, random() / 0x100000000][random() % 7]!;
      const before = window.slice();
      const expected = advance(before, value);
      expect(Object.is(median.compute(value), expected.result)).toBe(true);
      window = expected.next;
      if (i % 11 === 0) {
        const replacement = (random() % 17) - 8;
        const revised = advance(before, replacement);
        expect(Object.is(median.recompute(replacement), revised.result)).toBe(true);
        window = revised.next;
      }
      if (i % 23 === 0) {
        const saved = median.save();
        const retained = window.slice();
        median.compute(999);
        median.restore(saved);
        const restored = advance(retained, -0);
        expect(Object.is(median.compute(-0), restored.result)).toBe(true);
        window = restored.next;
      }
    }
  }
});

timingIt('avoids full sorting cost in a 500-sample rolling median', () => {
  const values = Array.from({ length: 2500 }, (_, i) => ((i * 7919) % 2503) / 2503);
  const actual = () => {
    const median = new Median(500);
    let sum = 0;
    for (const value of values) {
      const result = median.compute(value);
      if (!Number.isNaN(result)) sum += result;
    }
    return sum;
  };
  const control = () => {
    let sum = 0;
    for (let i = 499; i < values.length; i++) sum += sortedMedian(values.slice(i - 499, i + 1));
    return sum;
  };
  expect(actual()).toBe(control());
  const measure = (fn: () => number) => {
    const start = process.cpuUsage();
    const sum = fn();
    const cpu = process.cpuUsage(start);
    expect(sum).toBe(control());
    return cpu.user + cpu.system;
  };
  const ratios = Array.from({ length: 5 }, (_, i) => {
    const first = measure(i % 2 ? control : actual);
    const second = measure(i % 2 ? actual : control);
    return i % 2 ? second / first : first / second;
  });
  const medianRatio = ratios.slice().sort((a, b) => a - b)[2]!;
  console.info(JSON.stringify({ medianCpuRatios: ratios, medianRatio }));
  expect(medianRatio).toBeLessThan(0.85);
}, 30000);
