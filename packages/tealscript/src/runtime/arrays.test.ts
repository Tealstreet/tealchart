import { describe, expect, it } from 'vitest';

import {
  clearArray,
  createPineArray,
  getArraySize,
  getArrayValue,
  isPineArray,
  popArrayValue,
  pushArrayValue,
  setArrayValue,
  shiftArrayValue,
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
});
