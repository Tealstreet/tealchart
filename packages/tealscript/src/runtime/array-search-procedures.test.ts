import { describe, expect, it } from 'vitest';

import {
  binarySearchArrayValue,
  binarySearchLeftmostArrayValue,
  binarySearchRightmostArrayValue,
  createPineArray,
} from './arrays';

const families = [
  { member: 'array.binary_search', ranks: [903, 908, 913, 917], search: binarySearchArrayValue, visits: [3, 1, 2] },
  {
    member: 'array.binary_search_leftmost',
    ranks: [828, 832, 836, 839],
    search: binarySearchLeftmostArrayValue,
    visits: [4, 2, 1, 2],
  },
  {
    member: 'array.binary_search_rightmost',
    ranks: [802, 806, 809],
    search: binarySearchRightmostArrayValue,
    visits: [4, 2, 3, 2],
  },
];
describe('packet008 documented binary comparison procedure', () => {
  for (const family of families)
    for (const rank of family.ranks) {
      it(`rank ${rank}: ${family.member} compares middles within successively halved ranges`, () => {
        const visits: number[] = [];
        const instrumented = createPineArray<unknown>();
        instrumented.values = Array.from({ length: 8 }, (_, index) => ({
          toString: () => {
            visits.push(index);
            return String(index).padStart(2, '0');
          },
        }));
        expect(family.search(instrumented, '02')).toBe(2);
        expect(visits).toEqual(family.visits);
        const ordinary = createPineArray<number>();
        ordinary.values = [0, 1, 2, 3, 4, 5, 6, 7];
        expect(family.search(ordinary, 2)).toBe(2);
      });
    }
});
