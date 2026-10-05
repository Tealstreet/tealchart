import { describe, expect, it } from 'vitest';

import {
  createPineArray,
  getArraySize,
  getArrayValue,
  medianArrayValue,
  modeArrayValue,
  percentileLinearInterpolationArrayValue,
  percentileNearestRankArrayValue,
  pushArrayValue,
  setArrayValue,
  sliceArray,
} from './arrays';

function arrayOf(values: unknown[]) {
  const array = createPineArray();
  for (const value of values) pushArrayValue(array, value);
  return array;
}

function expected(values: unknown[], percentage: number) {
  const sorted = values
    .map(Number)
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : NaN;
  const nearest = !sorted.length
    ? NaN
    : Number.isNaN(percentage)
      ? sorted[0]
      : !Number.isFinite(percentage)
        ? NaN
        : (sorted[Math.max(0, Math.ceil((percentage / 100) * values.length) - 1)] ?? NaN);
  const rank = Math.max(0, Math.min(values.length - 1, (percentage / 100) * values.length - 0.5));
  const lower = Math.floor(rank),
    upper = Math.ceil(rank);
  const linear =
    !sorted.length || !Number.isFinite(percentage) || (lower !== upper && sorted.length !== values.length)
      ? NaN
      : sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
  return [median, nearest, linear];
}

describe('numeric array order statistics', () => {
  it('avoids full sorting for scalar ranks', () => {
    const original = Array.prototype.sort;
    let calls = 0;
    Array.prototype.sort = function (...args: Parameters<typeof original>) {
      calls++;
      return original.apply(this, args);
    };
    try {
      const array = arrayOf(Array.from({ length: 4096 }, (_, index) => (index * 173) % 4096));
      expect(medianArrayValue(array)).toBe(2047.5);
      expect(percentileNearestRankArrayValue(array, 75)).toBe(3071);
      expect(percentileLinearInterpolationArrayValue(array, 75)).toBe(3071.5);
    } finally {
      Array.prototype.sort = original;
    }
    expect(calls).toBe(0);
  });

  it('matches stable sorted ranks bit-for-bit including signed zero and infinities', () => {
    const sets = [
      [],
      [NaN],
      [1],
      [0, -0],
      [-0, 0],
      [Infinity, -Infinity, 0, -0, Infinity],
      [4, NaN, 1, 4, -2],
      [7, 3, 2, 9, 6, 1],
      ['3', null, true, undefined, '2'],
    ];
    for (let seed = 0; seed < 30; seed++)
      sets.push(Array.from({ length: seed + 2 }, (_, i) => ((i * 17 + seed * 13) % 11) - 5));
    for (const values of sets)
      for (const percentage of [0, 1, 25, 50, 75, 99, 100, NaN, Infinity]) {
        const array = arrayOf(values);
        const actual = [
          medianArrayValue(array),
          percentileNearestRankArrayValue(array, percentage),
          percentileLinearInterpolationArrayValue(array, percentage),
        ];
        actual.forEach((value, index) => expect(Object.is(value, expected(values, percentage)[index])).toBe(true));
        expect(Array.from({ length: getArraySize(array) }, (_, index) => getArrayValue(array, index))).toEqual(values);
      }
  });

  it.each([
    ['missing filtering', [NaN, 8, 2, 5]],
    ['signed-zero stable ties', [0, -0]],
    ['Infinity ranks', [-Infinity, 1, Infinity]],
    ['duplicates', [5, 1, 5, 2, 2]],
    ['odd size', [3, 1, 2]],
    ['even size', [4, 1, 3, 2]],
  ] as const)('retains %s', (_label, values) => {
    const array = arrayOf([...values]);
    const result = [
      medianArrayValue(array),
      percentileNearestRankArrayValue(array, 50),
      percentileLinearInterpolationArrayValue(array, 50),
    ];
    result.forEach((value, index) => expect(Object.is(value, expected([...values], 50)[index])).toBe(true));
  });

  it('matches deterministic randomized full-sort differentials', () => {
    let seed = 0x5318c0de;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const boundaries = [0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE];
    for (let sample = 0; sample < 1000; sample++) {
      const values = Array.from({ length: random() % 65 }, () =>
        random() % 4 === 0 ? boundaries[random() % boundaries.length] : ((random() % 101) - 50) / 7,
      );
      const percentage = (random() % 10001) / 100;
      const array = arrayOf(values);
      const result = [
        medianArrayValue(array),
        percentileNearestRankArrayValue(array, percentage),
        percentileLinearInterpolationArrayValue(array, percentage),
      ];
      result.forEach((value, index) => expect(Object.is(value, expected(values, percentage)[index])).toBe(true));
    }
  });

  it('retains coercion order, exposed storage and live slices', () => {
    const reads: number[] = [];
    const array = arrayOf(
      [3, 1, 2].map((value) => ({
        valueOf() {
          reads.push(value);
          return value;
        },
      })),
    );
    expect(medianArrayValue(array)).toBe(2);
    expect(reads).toEqual([3, 1, 2]);
    const parent = arrayOf([9, 3, 1, 2, 8]);
    const slice = sliceArray(parent, 1, 4);
    expect(medianArrayValue(slice)).toBe(2);
    setArrayValue(parent, 2, 7);
    expect(medianArrayValue(slice)).toBe(3);
    parent.values[3] = 20;
    expect(medianArrayValue(slice)).toBe(7);
    expect(modeArrayValue(arrayOf([2, 1, 2, 1]))).toBe(1);
  });

  it('retains percentage refusal domains', () => {
    for (const percentage of [-1, 101]) {
      expect(() => percentileNearestRankArrayValue(arrayOf([1, 2]), percentage)).toThrow();
      expect(() => percentileLinearInterpolationArrayValue(arrayOf([1, 2]), percentage)).toThrow();
    }
  });
});
