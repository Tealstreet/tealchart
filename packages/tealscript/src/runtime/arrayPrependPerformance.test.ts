import type { PineArray } from './arrays';

import { describe, expect, it } from 'vitest';

import {
  asReadOnlyPineArray,
  clearArray,
  copyArray,
  createPineArray,
  getArraySize,
  getArrayValue,
  indexOfArrayValue,
  insertArrayValue,
  lastIndexOfArrayValue,
  popArrayValue,
  pushArrayValue,
  removeArrayValue,
  setArrayValue,
  shiftArrayValue,
  sliceArray,
  sumArrayValue,
  unshiftArrayValue,
  varianceArrayValue,
} from './arrays';
import { createPineUdtObject } from './objects';
import { cloneRuntimeSnapshot, Scope } from './scope';

function prepended<T>(values: T[]): PineArray<T> {
  const array = createPineArray<T>();
  for (let index = values.length - 1; index >= 0; index--) unshiftArrayValue(array, values[index]!);
  return array;
}

function entries<T>(array: PineArray<T>): T[] {
  return Array.from({ length: getArraySize(array) }, (_, index) => getArrayValue(array, index) as T);
}

describe('owning array prepend storage', () => {
  it('preserves order across both ends, indexed writes and structural edits', () => {
    const array = prepended([2, 3, 4]);
    expect(pushArrayValue(array, 5)).toBe(4);
    expect(unshiftArrayValue(array, 1)).toBe(5);
    setArrayValue(array, -2, 40);
    expect(entries(array)).toEqual([1, 2, 3, 40, 5]);
    expect(shiftArrayValue(array)).toBe(1);
    expect(popArrayValue(array)).toBe(5);
    insertArrayValue(array, 1, 20);
    expect(removeArrayValue(array, -2)).toBe(3);
    expect(entries(array)).toEqual([2, 20, 40]);
    clearArray(array);
    expect(getArraySize(array)).toBe(0);
    expect(() => popArrayValue(array)).toThrow('empty');
    expect(() => shiftArrayValue(array)).toThrow('empty');
    unshiftArrayValue(array, 9);
    expect(popArrayValue(array)).toBe(9);
  });

  it('retains exposed backing identity and external edits after materialization', () => {
    const array = prepended([2, 3]);
    const backing = array.values;
    expect(backing).toEqual([2, 3]);
    unshiftArrayValue(array, 1);
    pushArrayValue(array, 4);
    expect(array.values).toBe(backing);
    expect(backing).toEqual([1, 2, 3, 4]);
    backing.splice(1, 2, 7);
    expect(entries(array)).toEqual([1, 7, 4]);
    array.values = [11, 12];
    const replacement = array.values;
    unshiftArrayValue(array, 10);
    expect(array.values).toBe(replacement);
    expect(entries(array)).toEqual([10, 11, 12]);
    expect(backing).toEqual([1, 7, 4]);
  });

  it('keeps live nested slice positions and writes through to logical parent slots', () => {
    const array = prepended([10, 20, 30, 40]);
    const view = sliceArray(array, 1, 4);
    const nested = sliceArray(view, 1, 3);
    unshiftArrayValue(array, 0);
    expect(entries(view)).toEqual([10, 20, 30]);
    expect(entries(nested)).toEqual([20, 30]);
    setArrayValue(nested, 0, 21);
    expect(entries(array)).toEqual([0, 10, 21, 30, 40]);
    unshiftArrayValue(view, 5);
    expect(entries(array)).toEqual([0, 5, 10, 21, 30, 40]);
    expect(entries(view)).toEqual([5, 10, 21, 30]);
    expect(entries(nested)).toEqual([10, 21]);
    expect(pushArrayValue(nested, 22)).toBe(3);
    expect(entries(array)).toEqual([0, 5, 10, 21, 22, 30, 40]);
    clearArray(array);
    expect(() => getArrayValue(nested, Number.NaN)).toThrow('Slice is out of bounds');
  });

  it('copies buffered values without sharing storage and snapshots replay independently', () => {
    const array = prepended([2, 3]);
    array.persistent = true;
    const copy = copyArray(array);
    const snapshot = cloneRuntimeSnapshot(array) as PineArray<number>;
    unshiftArrayValue(array, 1);
    setArrayValue(array, 1, 20);
    expect(entries(copy)).toEqual([2, 3]);
    expect(entries(snapshot)).toEqual([2, 3]);
    expect(copy.persistent).toBe(true);
    setArrayValue(copy, 0, 200);
    setArrayValue(snapshot, 1, 300);
    expect(entries(array)).toEqual([1, 20, 3]);
    expect(entries(copy)).toEqual([200, 3]);
    expect(entries(snapshot)).toEqual([2, 300]);
  });

  it('restores persistent scope arrays without changing the saved snapshot', () => {
    const scope = new Scope();
    scope.declare('values', 'var', prepended([4, 5]));
    const snapshot = scope.snapshot();
    unshiftArrayValue(scope.get('values') as PineArray<number>, 3);
    scope.restore(snapshot);
    expect(entries(scope.get('values') as PineArray<number>)).toEqual([4, 5]);
    unshiftArrayValue(scope.get('values') as PineArray<number>, 2);
    scope.restore(snapshot);
    expect(entries(scope.get('values') as PineArray<number>)).toEqual([4, 5]);
  });

  it('preserves search positions and invalidates cached first matches', () => {
    const array = createPineArray<number | undefined>(130, 7);
    for (let i = 0; i < 35; i++) expect(indexOfArrayValue(array, 7)).toBe(0);
    unshiftArrayValue(array, 8);
    expect(indexOfArrayValue(array, 7)).toBe(1);
    expect(lastIndexOfArrayValue(array, 7)).toBe(130);
    unshiftArrayValue(array, undefined);
    expect(indexOfArrayValue(array, undefined)).toBe(0);
    unshiftArrayValue(array, Number.NaN);
    expect(indexOfArrayValue(array, Number.NaN)).toBe(-1);
    expect(indexOfArrayValue(array, undefined)).toBe(1);
    setArrayValue(array, 2, 7);
    expect(indexOfArrayValue(array, 7)).toBe(2);
  });

  it('preserves missing indices, fractional flooring and ordered variance', () => {
    const array = prepended([1, 2, 4]);
    expect(getArrayValue(array, Number.NaN)).toBeNaN();
    expect(getArrayValue(array, 1.8)).toBe(2);
    expect(getArrayValue(array, -0.2)).toBe(4);
    expect(() => getArrayValue(array, 3)).toThrow('out of bounds');
    expect(varianceArrayValue(array)).toBe((1 + 4 + 16) / 3 - (7 / 3) ** 2);
  });

  it('reduces the full logical sequence in its original floating-point order', () => {
    const array = prepended([1e16, 1, -1e16]);
    expect(sumArrayValue(array)).toBe(0);
    pushArrayValue(array, 7);
    expect(sumArrayValue(array)).toBe(7);
    expect(entries(array)).toEqual([1e16, 1, -1e16, 7]);
  });

  it('retains capacity errors, read-only protection and ordinary host arrays', () => {
    const array = createPineArray(99_999, 0);
    expect(unshiftArrayValue(array, 1)).toBe(100_000);
    expect(() => pushArrayValue(array, 2)).toThrow('Maximum size is 100000');
    expect(() => unshiftArrayValue(array, 2)).toThrow('Maximum size is 100000');
    expect(getArrayValue(array, 0)).toBe(1);
    const readOnly = asReadOnlyPineArray(prepended([2, 3]));
    expect(() => unshiftArrayValue(readOnly, 1)).toThrow('read-only');
    expect(entries(readOnly)).toEqual([2, 3]);
    const host: PineArray<number> = { __tealscriptArray: true, values: [4] };
    unshiftArrayValue(host, 3);
    expect(host.values).toEqual([3, 4]);
  });

  it('retains UDT provenance and shallow copy element identities', () => {
    const object = createPineUdtObject('Entry', [['value', 7]]);
    const array = prepended([object]);
    const copy = copyArray(array);
    expect(array.elementType).toBe('udt');
    expect(copy.elementType).toBe('udt');
    expect(getArrayValue(copy, 0)).toBe(object);
    object.fields.set('value', 8);
    expect((getArrayValue(copy, 0) as typeof object).fields.get('value')).toBe(8);
  });

  it.runIf(process.env.TEALSCRIPT_PERF_ASSERT === '1')(
    'prepends five full-history arrays within an isolated CPU budget',
    () => {
      const run = () => {
        const arrays = Array.from({ length: 5 }, () => createPineArray<number>());
        for (let bar = 0; bar < 23_924; bar++) {
          for (const array of arrays) unshiftArrayValue(array, bar);
        }
        return arrays;
      };
      run();
      const started = process.cpuUsage();
      const arrays = run();
      const elapsed = process.cpuUsage(started);
      for (const array of arrays) {
        expect(getArraySize(array)).toBe(23_924);
        expect(getArrayValue(array, 0)).toBe(23_923);
        expect(getArrayValue(array, -1)).toBe(0);
      }
      expect(elapsed.user + elapsed.system).toBeLessThan(100_000);
    },
  );
});
