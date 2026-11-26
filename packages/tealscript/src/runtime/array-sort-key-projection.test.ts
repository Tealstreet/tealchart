import type { PineArray } from './arrays';

import { describe, expect, it } from 'vitest';

import { createPineArray, getArraySize, getArrayValue, pushArrayValue, sortIndicesArrayValue } from './arrays';
import { createPineUdtObject } from './objects';

function arrayOf(values: unknown[]) {
  const array = createPineArray();
  for (const value of values) pushArrayValue(array, value);
  return array;
}

function valuesOf(array: PineArray) {
  return Array.from({ length: getArraySize(array) }, (_, index) => getArrayValue(array, index));
}

describe('sort_indices comparison key projection', () => {
  for (const field of [undefined, 'key', 0]) {
    it(`projects each UDT key once for field ${String(field)}`, () => {
      let reads = 0;
      const objects = Array.from({ length: 40 }, (_, index) => {
        const object = createPineUdtObject('Item', [['key', (index * 17) % 40]]);
        const get = object.fields.get.bind(object.fields);
        const values = object.fields.values.bind(object.fields);
        object.fields.get = (key) => {
          reads += 1;
          return get(key);
        };
        object.fields.values = () => {
          reads += 1;
          return values();
        };
        return object;
      });
      const result = sortIndicesArrayValue(arrayOf(objects), 'ascending', field);
      expect(valuesOf(result)).toEqual(Array.from({ length: 40 }, (_, key) => (key * 33) % 40));
      expect(reads).toBe(40);
    });
  }

  it('keeps ascending finite ties stable and missing values last', () => {
    expect(valuesOf(sortIndicesArrayValue(arrayOf([2, NaN, 1, 2, NaN])))).toEqual([2, 0, 3, 1, 4]);
  });

  it('keeps descending finite ties reversed and missing ties stable', () => {
    expect(valuesOf(sortIndicesArrayValue(arrayOf([2, NaN, 1, 2, NaN]), 'descending'))).toEqual([1, 4, 3, 0, 2]);
  });

  it('preserves infinity and signed-zero tie ordering', () => {
    const array = arrayOf([Infinity, -0, 0, -Infinity, Infinity]);
    expect(valuesOf(sortIndicesArrayValue(array))).toEqual([3, 1, 2, 0, 4]);
    expect(valuesOf(sortIndicesArrayValue(array, 'descending'))).toEqual([4, 0, 2, 1, 3]);
  });

  it('preserves UDT selected fields, input order and missing-ID refusal', () => {
    const a = createPineUdtObject('Item', [
      ['unused', 0],
      ['key', 2],
    ]);
    const b = createPineUdtObject('Item', [
      ['unused', 1],
      ['key', 1],
    ]);
    const array = arrayOf([a, b]);
    expect(valuesOf(sortIndicesArrayValue(array, 'ascending', 'key'))).toEqual([1, 0]);
    expect(valuesOf(array)).toEqual([a, b]);
    expect(() => sortIndicesArrayValue(arrayOf([a, NaN]), 'ascending', 'key')).toThrow('cannot sort na object IDs');
  });

  it('preserves strings, empty missing keys, empty results and independent indices', () => {
    const array = arrayOf(['b', '', 'a', 'b']);
    const result = sortIndicesArrayValue(array);
    expect(valuesOf(result)).toEqual([2, 0, 3, 1]);
    pushArrayValue(result, 99);
    expect(valuesOf(array)).toEqual(['b', '', 'a', 'b']);
    expect(valuesOf(sortIndicesArrayValue(arrayOf([])))).toEqual([]);
  });

  it('sorts UDTs by their first field when sort_field is omitted', () => {
    const items = [
      [3, 0],
      [1, 2],
      [3, 1],
      [2, 3],
    ].map(([first, second]) =>
      createPineUdtObject('Item', [
        ['first', first],
        ['second', second],
      ]),
    );
    expect(valuesOf(sortIndicesArrayValue(arrayOf(items)))).toEqual([1, 3, 0, 2]);
    expect(valuesOf(sortIndicesArrayValue(arrayOf(items), 'descending'))).toEqual([2, 0, 3, 1]);
    expect(valuesOf(sortIndicesArrayValue(arrayOf(items), 'ascending', 'second'))).toEqual([0, 2, 1, 3]);
  });

  it('does not inspect unused comparison fields for singleton arrays', () => {
    const object = createPineUdtObject('Item', [['key', 2]]);
    expect(valuesOf(sortIndicesArrayValue(arrayOf([object]), 'ascending', 'absent'))).toEqual([0]);
    expect(valuesOf(sortIndicesArrayValue(arrayOf([object]), 'ascending', 99))).toEqual([0]);
  });
});
