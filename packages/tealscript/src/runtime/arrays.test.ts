import { describe, expect, it } from 'vitest';

import {
  avgArrayValue,
  clearArray,
  concatArray,
  copyArray,
  createPineArray,
  firstArrayValue,
  getArraySize,
  getArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  insertArrayValue,
  isPineArray,
  joinArray,
  lastArrayValue,
  lastIndexOfArrayValue,
  maxArrayValue,
  minArrayValue,
  popArrayValue,
  pushArrayValue,
  removeArrayValue,
  reverseArray,
  setArrayValue,
  shiftArrayValue,
  sliceArray,
  sortArray,
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

  it('sorts and reverses arrays in place', () => {
    const array = createPineArray<number>();
    [3, Number.NaN, 1, 2].forEach((value) => pushArrayValue(array, value));

    sortArray(array);
    expect(array.values).toEqual([1, 2, 3, Number.NaN]);

    sortArray(array, 'descending');
    expect(array.values).toEqual([Number.NaN, 3, 2, 1]);

    reverseArray(array);
    expect(array.values).toEqual([1, 2, 3, Number.NaN]);
  });

  it('concatenates arrays in place and joins values with a separator', () => {
    const array = createPineArray<string>();
    ['z', 'a', ''].forEach((value) => pushArrayValue(array, value));
    const other = createPineArray<string>();
    pushArrayValue(other, 'm');

    sortArray(array);
    expect(array.values).toEqual(['a', 'z', '']);

    const returned = concatArray(array, other);
    setArrayValue(other, 0, 'changed');

    expect(returned).toBe(array);
    expect(array.values).toEqual(['a', 'z', '', 'm']);
    expect(joinArray(array, '|')).toBe('a|z||m');
  });

  it('sorts strings by code-unit order', () => {
    const array = createPineArray<string>();
    ['{ABC}', 'a', 'A', '1', '!'].forEach((value) => pushArrayValue(array, value));

    sortArray(array);
    expect(array.values).toEqual(['!', '1', 'A', 'a', '{ABC}']);

    sortArray(array, 'descending');
    expect(array.values).toEqual(['{ABC}', 'a', 'A', '1', '!']);
  });

  it('creates slice windows over parent arrays', () => {
    const array = createPineArray<number>();
    [0, 1, 2, 3].forEach((value) => pushArrayValue(array, value));

    const slice = sliceArray(array, 0, 3);
    expect(getArraySize(slice)).toBe(3);
    expect(getArrayValue(slice, 1)).toBe(1);
    expect(() => getArrayValue(slice, 3)).toThrow('Array index 3 is out of bounds. Array size is 3');

    expect(removeArrayValue(array, 0)).toBe(0);
    expect(getArrayValue(slice, 0)).toBe(1);
    expect(getArrayValue(slice, 2)).toBe(3);

    expect(pushArrayValue(slice, 4)).toBe(4);
    expect(array.values).toEqual([1, 2, 3, 4]);

    setArrayValue(slice, 1, 20);
    expect(array.values).toEqual([1, 20, 3, 4]);
  });

  it('mutates slice windows through common array helpers', () => {
    const array = createPineArray<number>();
    [0, 3, 1, 2, 4].forEach((value) => pushArrayValue(array, value));
    const slice = sliceArray(array, 1, 4);

    sortArray(slice);
    expect(array.values).toEqual([0, 1, 2, 3, 4]);

    expect(unshiftArrayValue(slice, 9)).toBe(4);
    expect(array.values).toEqual([0, 9, 1, 2, 3, 4]);
    expect(shiftArrayValue(slice)).toBe(9);
    expect(popArrayValue(slice)).toBe(3);
    expect(array.values).toEqual([0, 1, 2, 4]);
    expect(joinArray(slice, ',')).toBe('1,2');
  });

  it('throws when a parent mutation leaves a slice out of bounds', () => {
    const array = createPineArray<number>();
    [0, 1, 2, 3, 4].forEach((value) => pushArrayValue(array, value));
    const slice = sliceArray(array, 3, 5);

    removeArrayValue(array, 0);

    expect(() => getArraySize(slice)).toThrow('Slice is out of bounds of the parent array');
    expect(() => sliceArray(array, 2, 2)).toThrow("Index 'from' should be less than index 'to'");
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
