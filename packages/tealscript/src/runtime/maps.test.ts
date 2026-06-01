import { describe, expect, it } from 'vitest';

import { getArrayValue } from './arrays';
import {
  clearMap,
  containsMapKey,
  copyMap,
  createPineMap,
  getMapSize,
  getMapValue,
  isPineMap,
  mapKeys,
  mapValues,
  putAllMapValues,
  putMapValue,
  removeMapValue,
  type PineMap,
} from './maps';

describe('PineMap', () => {
  it('stores value keys, preserves insertion order on overwrite, and extracts copied arrays', () => {
    const map = createPineMap();

    expect(isPineMap(map)).toBe(true);
    expect(getMapSize(map)).toBe(0);

    putMapValue(map, 'A', 1);
    putMapValue(map, 'B', 2);
    putMapValue(map, 'A', 10);

    expect(getMapSize(map)).toBe(2);
    expect(containsMapKey(map, 'A')).toBe(true);
    expect(getMapValue(map, 'A')).toBe(10);
    expect(getArrayValue(mapKeys(map), 0)).toBe('A');
    expect(getArrayValue(mapValues(map), 0)).toBe(10);
  });

  it('returns na for missing get and remove calls', () => {
    const map = createPineMap();

    putMapValue(map, 'A', 1);
    expect(removeMapValue(map, 'A')).toBe(1);
    expect(getMapSize(map)).toBe(0);
    expect(Number.isNaN(getMapValue(map, 'Missing'))).toBe(true);
    expect(Number.isNaN(removeMapValue(map, 'Missing'))).toBe(true);
  });

  it('copies, merges, and clears maps without aliasing entries', () => {
    const left = createPineMap();
    putMapValue(left, 'A', 1);
    putMapValue(left, 'B', 2);
    const right = createPineMap();
    putMapValue(right, 'B', 20);
    putMapValue(right, 'C', 30);

    const copy = copyMap(left);
    putAllMapValues(copy, right);
    clearMap(left);

    expect(getMapSize(left)).toBe(0);
    expect(getMapSize(copy)).toBe(3);
    expect(getArrayValue(mapKeys(copy), 0)).toBe('A');
    expect(getArrayValue(mapKeys(copy), 1)).toBe('B');
    expect(getArrayValue(mapKeys(copy), 2)).toBe('C');
    expect(getMapValue(copy, 'B')).toBe(20);
    expect(getMapValue(copy, 'C')).toBe(30);
  });

  it('rejects non-value and non-finite keys', () => {
    const map = createPineMap();

    expect(() => putMapValue(map, Number.NaN, 1)).toThrow('Map keys must be finite value types');
    expect(() => putMapValue(map, {}, 1)).toThrow('Map keys must be value types');
  });

  it('enforces the Pine map capacity limit for new keys', () => {
    const map: PineMap<string, number> = {
      __tealscriptMap: true,
      entries: new Map(Array.from({ length: 50_000 }, (_value, index) => [`K${index}`, index])),
    };

    putMapValue(map, 'K1', 100);
    expect(getMapValue(map, 'K1')).toBe(100);
    expect(() => putMapValue(map, 'Overflow', 1)).toThrow('Map cannot contain more than 50000 key-value pairs');
  });
});
