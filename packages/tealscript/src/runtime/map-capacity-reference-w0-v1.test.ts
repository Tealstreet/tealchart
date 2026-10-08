import { expect, it } from 'vitest';
import { createPineMap, getMapSize, getMapValue, putMapValue, removeMapValue } from './maps';
const authority = 'https://www.tradingview.com/pine-script-docs/language/maps/';
it('capacity belongs to each map and overwrite does not consume a pair', () => {
  const first = createPineMap<number, number>();
  const second = createPineMap<number, number>();
  for (let key = 0; key < 50000; key += 1) {
    putMapValue(first, key, key + 7);
    putMapValue(second, key, -key - 9);
  }
  expect(getMapSize(first), authority).toBe(50000);
  expect(getMapSize(second)).toBe(50000);
  expect(putMapValue(first, 49999, 81)).toBe(50006);
  expect(getMapValue(first, 49999)).toBe(81);
  expect(getMapValue(second, 49999)).toBe(-50008);
  expect(() => putMapValue(first, 50000, 3)).toThrow();
  expect(getMapSize(first)).toBe(50000);
});
it('deleting one pair frees exactly one capacity slot', () => {
  const map = createPineMap<number, number>();
  for (let key = 0; key < 50000; key += 1) putMapValue(map, key, key + 7);
  expect(removeMapValue(map, 123), authority).toBe(130);
  expect(getMapSize(map)).toBe(49999);
  putMapValue(map, 50000, 83);
  expect(getMapValue(map, 50000)).toBe(83);
  expect(getMapSize(map)).toBe(50000);
  expect(() => putMapValue(map, 50001, 5)).toThrow();
});
