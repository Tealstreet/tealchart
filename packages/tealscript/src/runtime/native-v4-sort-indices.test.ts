import { describe, expect, it } from 'vitest';
import { createPineArray, sortIndicesArrayValue } from './arrays';

describe('v4 native captured array outcomes', () => {
  it.each([
    [[2,1,2,1,2,3], [1,3,0,2,4,5], [5,4,2,0,3,1]],
    [[1,2,1,2,3,2], [0,2,1,3,5,4], [4,5,3,1,2,0]],
    [[2,1,2,3,2,1], [1,5,0,2,4,3], [3,4,2,0,5,1]],
  ])('captured ascending and descending permutations: %j', (values, ascending, descending) => {
    const array = createPineArray<number>();
    array.values = [...values];
    expect(sortIndicesArrayValue(array).values).toEqual(ascending);
    expect(sortIndicesArrayValue(array, 'descending').values).toEqual(descending);
    expect(array.values).toEqual(values);
  });
});
