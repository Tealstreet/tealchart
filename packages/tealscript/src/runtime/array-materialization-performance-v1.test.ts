import { describe, expect, it } from 'vitest';

import {
  copyArray,
  createPineArray,
  getArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  lastIndexOfArrayValue,
  setArrayValue,
  sliceArray,
} from './arrays';

// Engine performance witness: corpus-timeouts-be9795-v1, v7:114/115.
describe('array materialization', () => {
  it('copies plain arrays close to a direct dense copy', () => {
    const array = createPineArray<number>(100000, 7);
    const measure = (copy: () => number[]) => {
      let sum = 0;
      const start = process.cpuUsage();
      for (let index = 0; index < 100; index += 1) {
        const values = copy();
        sum += values.length + values[0]! + values.at(-1)!;
      }
      const cpu = process.cpuUsage(start);
      expect(sum).toBe(10001400);
      return (cpu.user + cpu.system) / 1000;
    };
    const actual: number[] = [];
    const direct: number[] = [];
    for (let round = 0; round < 3; round += 1) {
      actual.push(measure(() => copyArray(array).values));
      direct.push(measure(() => Array.from(array.values)));
    }
    const median = (values: number[]) => values.sort((a, b) => a - b)[1]!;
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(median(actual), `copy=${actual}, direct=${direct}`).toBeLessThan(median(direct) * 2 + 50);
    }
  }, 30000);

  // ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[942–943].
  // Sparse host slots and persistent metadata are engine invariants in this control.
  it('preserves dense missing values, shallow identities and independent nested-view copies', () => {
    const object = { value: 9 };
    const array = createPineArray<unknown>();
    array.values = [1, object, undefined, NaN, 5];
    delete array.values[0];
    array.persistent = true;
    const copied = copyArray(array);
    expect(copied.values).toEqual([undefined, object, undefined, NaN, 5]);
    expect(Object.hasOwn(copied.values, 0)).toBe(true);
    expect(copied.persistent).toBe(true);
    expect(copied.values).not.toBe(array.values);
    expect(copied.values[1]).toBe(object);
    setArrayValue(copied, 1, 22);
    expect(getArrayValue(array, 1)).toBe(object);
    const view = sliceArray(sliceArray(array, 1, 5), 1, 3);
    const viewCopy = copyArray(view);
    expect(viewCopy.values).toEqual([undefined, NaN]);
    setArrayValue(array, 2, 17);
    expect(viewCopy.values).toEqual([undefined, NaN]);
    expect(copyArray(view).values).toEqual([17, NaN]);
    array.values.length = 1;
    expect(() => copyArray(view)).toThrow('Slice is out of bounds');
  });

  it('searches plain arrays without materializing every lookup', () => {
    const array = createPineArray<number>(100000, 7);
    const measure = (search: () => number) => {
      let sum = 0;
      const start = process.cpuUsage();
      for (let index = 0; index < 100; index += 1) sum += search();
      const cpu = process.cpuUsage(start);
      expect(sum).toBe(-100);
      return (cpu.user + cpu.system) / 1000;
    };
    const actual: number[] = [];
    const direct: number[] = [];
    for (let round = 0; round < 3; round += 1) {
      actual.push(measure(() => indexOfArrayValue(array, -1)));
      direct.push(measure(() => array.values.indexOf(-1)));
    }
    const median = (values: number[]) => values.sort((a, b) => a - b)[1]!;
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(median(actual), `search=${actual}, direct=${direct}`).toBeLessThan(median(direct) * 2 + 25);
    }
  }, 30000);

  // ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[1010–1012,943].
  // Native v8 includes-NA is false; sparse host slots remain an engine invariant.
  it('preserves search equality, missing slots, live views and invalidated bounds', () => {
    const object = { value: 9 };
    const array = createPineArray<unknown>();
    array.values = [undefined, object, NaN, -0, undefined, object, 7, 7];
    delete array.values[0];
    expect(includesArrayValue(array, NaN)).toBe(false);
    expect(indexOfArrayValue(array, NaN)).toBe(-1);
    expect(lastIndexOfArrayValue(array, NaN)).toBe(-1);
    expect(indexOfArrayValue(array, undefined)).toBe(0);
    expect(lastIndexOfArrayValue(array, undefined)).toBe(4);
    expect(indexOfArrayValue(array, object)).toBe(1);
    expect(lastIndexOfArrayValue(array, object)).toBe(5);
    expect(indexOfArrayValue(array, { value: 9 })).toBe(-1);
    expect(includesArrayValue(array, 0)).toBe(true);
    expect(indexOfArrayValue(array, 0)).toBe(3);
    expect(lastIndexOfArrayValue(array, 7)).toBe(7);
    const view = sliceArray(sliceArray(array, 1, 8), 0, 5);
    expect(indexOfArrayValue(view, object)).toBe(0);
    expect(lastIndexOfArrayValue(view, object)).toBe(4);
    setArrayValue(array, 1, 17);
    expect(indexOfArrayValue(view, object)).toBe(4);
    expect(includesArrayValue(view, 17)).toBe(true);
    array.values.length = 2;
    expect(() => includesArrayValue(view, 17)).toThrow('Slice is out of bounds');
    expect(() => indexOfArrayValue(view, 17)).toThrow('Slice is out of bounds');
    expect(() => lastIndexOfArrayValue(view, 17)).toThrow('Slice is out of bounds');
  });
});
