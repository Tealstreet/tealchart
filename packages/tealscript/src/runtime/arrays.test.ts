import { describe, expect, it } from 'vitest';

import {
  avgArrayValue,
  clearArray,
  copyArray,
  createPineArray,
  firstArrayValue,
  getArraySize,
  getArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  insertArrayValue,
  isPineArray,
  lastArrayValue,
  lastIndexOfArrayValue,
  maxArrayValue,
  minArrayValue,
  popArrayValue,
  pushArrayValue,
  removeArrayValue,
  setArrayValue,
  shiftArrayValue,
  sumArrayValue,
  unshiftArrayValue,
} from './arrays';

describe('PineArray', () => {
  it('creates mutable arrays with an initial size and value', () => {
    const array = createPineArray(3, 7);

    expect(isPineArray(array)).toBe(true);
    expect(getArraySize(array)).toBe(3);
    expect(array.values).toEqual([7, 7, 7]);
  });

  it('reads and writes by numeric index', () => {
    const array = createPineArray<number>(2);

    setArrayValue(array, 0, 10);
    setArrayValue(array, 1, 20);

    expect(getArrayValue(array, 0)).toBe(10);
    expect(getArrayValue(array, 1)).toBe(20);
  });

  it('writes negative indices from the end', () => {
    const array = createPineArray<number>(3, 0);

    setArrayValue(array, -1, 30);

    expect(array.values).toEqual([0, 0, 30]);
  });

  it('throws when setting an out-of-bounds index', () => {
    const array = createPineArray<number>(2, 0);

    expect(() => setArrayValue(array, 2, 30)).toThrow('Array index 2 is out of bounds. Array size is 2');
    expect(() => setArrayValue(array, -3, 30)).toThrow('Array index -3 is out of bounds. Array size is 2');
    expect(array.values).toEqual([0, 0]);
  });

  it('supports stack and queue operations', () => {
    const array = createPineArray<number>();

    expect(pushArrayValue(array, 1)).toBe(1);
    expect(pushArrayValue(array, 2)).toBe(2);
    expect(unshiftArrayValue(array, 0)).toBe(3);
    expect(array.values).toEqual([0, 1, 2]);
    expect(shiftArrayValue(array)).toBe(0);
    expect(popArrayValue(array)).toBe(2);
    expect(array.values).toEqual([1]);
  });

  it('clears arrays in place', () => {
    const array = createPineArray(2, 'x');

    clearArray(array);

    expect(getArraySize(array)).toBe(0);
    expect(array.values).toEqual([]);
  });

  it('copies arrays by value', () => {
    const array = createPineArray<number>();
    pushArrayValue(array, 1);
    pushArrayValue(array, 2);

    const copy = copyArray(array);
    setArrayValue(copy, 0, 99);

    expect(array.values).toEqual([1, 2]);
    expect(copy.values).toEqual([99, 2]);
  });

  it('supports search and edge reads', () => {
    const array = createPineArray<number>();
    [3, 5, 3].forEach((value) => pushArrayValue(array, value));

    expect(firstArrayValue(array)).toBe(3);
    expect(lastArrayValue(array)).toBe(3);
    expect(includesArrayValue(array, 5)).toBe(true);
    expect(indexOfArrayValue(array, 3)).toBe(0);
    expect(lastIndexOfArrayValue(array, 3)).toBe(2);
  });

  it('supports insert and remove operations', () => {
    const array = createPineArray<number>();
    pushArrayValue(array, 1);
    pushArrayValue(array, 3);

    expect(insertArrayValue(array, 1, 2)).toBe(3);
    expect(array.values).toEqual([1, 2, 3]);
    expect(removeArrayValue(array, 1)).toBe(2);
    expect(array.values).toEqual([1, 3]);
  });

  it('summarizes numeric arrays', () => {
    const array = createPineArray<number>();
    [2, 4, 6].forEach((value) => pushArrayValue(array, value));

    expect(minArrayValue(array)).toBe(2);
    expect(maxArrayValue(array)).toBe(6);
    expect(sumArrayValue(array)).toBe(12);
    expect(avgArrayValue(array)).toBe(4);
  });

  it('skips NaN values in numeric summaries', () => {
    const array = createPineArray<number>();
    [2, Number.NaN, 6].forEach((value) => pushArrayValue(array, value));

    expect(minArrayValue(array)).toBe(2);
    expect(maxArrayValue(array)).toBe(6);
    expect(sumArrayValue(array)).toBe(8);
    expect(avgArrayValue(array)).toBe(4);
  });

  it('returns NaN for empty numeric summaries', () => {
    const array = createPineArray<number>();

    expect(minArrayValue(array)).toBeNaN();
    expect(maxArrayValue(array)).toBeNaN();
    expect(sumArrayValue(array)).toBeNaN();
    expect(avgArrayValue(array)).toBeNaN();
  });
});
