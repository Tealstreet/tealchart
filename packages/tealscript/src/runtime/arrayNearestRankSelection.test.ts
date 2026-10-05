import { describe, expect, it, vi } from 'vitest';

import {
  asReadOnlyPineArray,
  createPineArray,
  getArraySize,
  getArrayValue,
  percentileNearestRankArrayValue,
  popArrayValue,
  pushArrayValue,
  selectNumericArrayRanks,
  setArrayValue,
  sliceArray,
  unshiftArrayValue,
} from './arrays';

function arrayOf(values: unknown[]) {
  const array = createPineArray();
  for (const value of values) pushArrayValue(array, value);
  return array;
}

function getArrayValues(array: ReturnType<typeof createPineArray>) {
  return Array.from({ length: getArraySize(array) }, (_, index) => getArrayValue(array, index));
}

function sortedRank(values: unknown[], percentage: number): number {
  const sorted = values
    .map(Number)
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  const rank = Number.isNaN(percentage) ? 0 : Math.max(0, Math.ceil((percentage / 100) * values.length) - 1);
  return sorted[rank] ?? Number.NaN;
}

describe('scalar nearest rank selection', () => {
  it('avoids mapped index and result vectors for one requested rank', () => {
    const array = arrayOf(Array.from({ length: 350 }, (_, index) => (index * 173) % 350));
    const original = Array.prototype.map;
    let mapped = 0;
    const spy = vi.spyOn(Array.prototype, 'map').mockImplementation(function (this: unknown[], ...args) {
      mapped++;
      return original.apply(this, args);
    });
    let value: number;
    try {
      value = percentileNearestRankArrayValue(array, 85);
    } finally {
      spy.mockRestore();
    }
    expect(value).toBe(297);
    expect(mapped).toBe(0);
  });

  it('matches stable sorted signed-zero ranks in either input order', () => {
    for (const values of [
      [1, -0, -1, 0, -0],
      [0, -0],
      [-0, 0],
      [-Infinity, -0, Infinity, 0],
    ]) {
      const array = arrayOf(values);
      for (const percentage of [0, 1, 20, 40, 50, 60, 80, 100, Number.NaN]) {
        expect(Object.is(percentileNearestRankArrayValue(array, percentage), sortedRank(values, percentage))).toBe(
          true,
        );
        expect(getArrayValues(array)).toEqual(values);
      }
    }
  });

  it('retains logical prefix, live view, exposed and read-only snapshot order', () => {
    const parent = arrayOf([7, 3, 1, 5]);
    unshiftArrayValue(parent, 9);
    unshiftArrayValue(parent, 11);
    const view = sliceArray(parent, 1, 5);
    const readonly = asReadOnlyPineArray(parent);
    for (const array of [parent, view, readonly]) {
      const values = getArrayValues(array);
      expect(percentileNearestRankArrayValue(array, 50)).toBe(sortedRank(values, 50));
      expect(getArrayValues(array)).toEqual(values);
    }
    setArrayValue(parent, 2, -13);
    expect(percentileNearestRankArrayValue(view, 50)).toBe(1);
    parent.values[3] = 17;
    expect(percentileNearestRankArrayValue(view, 50)).toBe(1);
    expect(percentileNearestRankArrayValue(view, 75)).toBe(9);
  });

  it('recomputes after writes, prepends, removal and exposed mutations', () => {
    const array = arrayOf([3, 1, 2]);
    expect(percentileNearestRankArrayValue(array, 50)).toBe(2);
    setArrayValue(array, 1, 7);
    expect(percentileNearestRankArrayValue(array, 50)).toBe(3);
    unshiftArrayValue(array, -5);
    expect(percentileNearestRankArrayValue(array, 50)).toBe(2);
    popArrayValue(array);
    expect(percentileNearestRankArrayValue(array, 50)).toBe(3);
    array.values[0] = 11;
    expect(percentileNearestRankArrayValue(array, 50)).toBe(7);
  });

  it('preserves coercion order and ranks based on unfiltered input size', () => {
    const reads: number[] = [];
    const values = [NaN, 8, 2, 5];
    const array = arrayOf(
      values.map((value) => ({
        valueOf() {
          reads.push(value);
          return value;
        },
      })),
    );
    expect(percentileNearestRankArrayValue(array, 50)).toBe(5);
    expect(reads).toEqual(values);
    expect(Number.isNaN(percentileNearestRankArrayValue(array, 100))).toBe(true);
  });

  it('matches Object.is stable-sort references across randomized ties, zeros and missing values', () => {
    let seed = 0x27698a53;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const special = [0, -0, NaN, undefined, null, Infinity, -Infinity, Number.MIN_VALUE, -Number.MIN_VALUE];
    for (let sample = 0; sample < 2000; sample++) {
      const values = Array.from({ length: random() % 81 }, () =>
        random() % 3 === 0 ? special[random() % special.length] : ((random() % 17) - 8) / 3,
      );
      const array = arrayOf(values);
      for (const percentage of [0, 1, 15, 50, 85, 99, 100, NaN, (random() % 10001) / 100]) {
        expect(Object.is(percentileNearestRankArrayValue(array, percentage), sortedRank(values, percentage))).toBe(
          true,
        );
      }
      expect(getArrayValues(array)).toEqual(values);
    }
  });

  it('leaves the exported multi-rank input untouched', () => {
    const values = [7, -0, 1, 0, -5];
    const copy = values.slice();
    const result = selectNumericArrayRanks(values, [0, 1, 2, 3, 4]);
    expect(result).toEqual([-5, -0, 0, 1, 7]);
    expect(values).toEqual(copy);
  });
});
