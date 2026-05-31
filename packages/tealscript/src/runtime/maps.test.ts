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
} from './maps';

describe('PineMap', () => {
  it('creates, reads, writes, and sizes maps', () => {
    const map = createPineMap<string, number>();

    expect(isPineMap(map)).toBe(true);
    expect(getMapSize(map)).toBe(0);

    putMapValue(map, 'alpha', 1);
    putMapValue(map, 'beta', 2);
    putMapValue(map, 'alpha', 3);

    expect(getMapSize(map)).toBe(2);
    expect(getMapValue(map, 'alpha')).toBe(3);
    expect(getMapValue(map, 'missing')).toBeNaN();
    expect(containsMapKey(map, 'beta')).toBe(true);
  });

  it('removes, clears, and returns na for missing removals', () => {
    const map = createPineMap<string, number>();

    putMapValue(map, 'alpha', 1);
    putMapValue(map, 'beta', 2);

    expect(removeMapValue(map, 'alpha')).toBe(1);
    expect(removeMapValue(map, 'alpha')).toBeNaN();
    expect(getMapSize(map)).toBe(1);

    clearMap(map);
    expect(getMapSize(map)).toBe(0);
  });

  it('copies maps and preserves insertion order for keys and values', () => {
    const map = createPineMap<string, number>();

    putMapValue(map, 'first', 1);
    putMapValue(map, 'second', 2);
    putMapValue(map, 'third', 3);
    putMapValue(map, 'second', 22);

    const copy = copyMap(map);
    putMapValue(copy, 'fourth', 4);

    expect(getMapSize(map)).toBe(3);
    expect(getMapSize(copy)).toBe(4);
    expect(getArrayValue(mapKeys(map), 1)).toBe('second');
    expect(getArrayValue(mapValues(map), 1)).toBe(22);
  });

  it('puts all source pairs into the target in source insertion order', () => {
    const target = createPineMap<string, number>();
    const source = createPineMap<string, number>();

    putMapValue(target, 'a', 1);
    putMapValue(target, 'b', 2);
    putMapValue(source, 'b', 20);
    putMapValue(source, 'c', 30);
    putAllMapValues(target, source);

    expect(getMapSize(target)).toBe(3);
    expect(getArrayValue(mapKeys(target), 0)).toBe('a');
    expect(getArrayValue(mapKeys(target), 1)).toBe('b');
    expect(getArrayValue(mapKeys(target), 2)).toBe('c');
    expect(getArrayValue(mapValues(target), 1)).toBe(20);
  });

  it('rejects unsupported map keys', () => {
    const map = createPineMap();

    expect(() => putMapValue(map, Number.NaN, 1)).toThrow('Map keys must be finite value types');
    expect(() => putMapValue(map, {}, 1)).toThrow('Map keys must be value types');
  });
});
