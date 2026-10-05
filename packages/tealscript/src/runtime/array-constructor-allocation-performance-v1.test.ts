import { describe, expect, it, vi } from 'vitest';

import { createPineArray, getArraySize, getArrayValue } from './arrays';
import { createPineUdtObject } from './objects';

describe('owning array initialization allocation', () => {
  it('initializes dense storage without per-slot callbacks', () => {
    const from = vi.spyOn(Array, 'from');
    let callbackCalls: number;
    let arrays;
    try {
      arrays = [createPineArray(0, 7), createPineArray(4, 7), createPineArray(128, 7)];
      callbackCalls = from.mock.calls.filter(([, callback]) => typeof callback === 'function').length;
    } finally {
      from.mockRestore();
    }
    expect(callbackCalls).toBe(0);
    expect(arrays.map(getArraySize)).toEqual([0, 4, 128]);
    expect(arrays[1].values).toEqual([7, 7, 7, 7]);
    expect(getArrayValue(arrays[2], 127)).toBe(7);
  });

  it('retains size coercion, missing slots and shared seed identity', () => {
    const seed = createPineUdtObject('Seed', [['value', 19]]);
    const conversions: string[] = [];
    const size = {
      valueOf: () => {
        conversions.push('size');
        return 3.9;
      },
    };
    const array = createPineArray(size as unknown as number, seed);
    expect(conversions).toEqual(['size']);
    expect(getArraySize(array)).toBe(3);
    expect(array.elementType).toBe('udt');
    for (const value of array.values) expect(value).toBe(seed);
    expect(Object.keys(createPineArray(3).values)).toEqual(['0', '1', '2']);
    expect(createPineArray(3).values.every(Number.isNaN)).toBe(true);
    expect(createPineArray(2, null).values).toEqual([null, null]);
    expect(() => createPineArray(-1)).toThrow('Cannot create an array with a negative size');
    expect(() => createPineArray(100_001)).toThrow('Array is too large. Maximum size is 100000');
  });
});
