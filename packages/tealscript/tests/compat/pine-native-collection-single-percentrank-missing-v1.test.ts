import { describe, expect, it } from 'vitest';

import { createPineArray, percentRankArrayValue, pushArrayValue } from '../../src/runtime/arrays';

const a = (...values: number[]) => {
  const result = createPineArray<number>();
  values.forEach((x) => pushArrayValue(result, x));
  return result;
};
// Native boundary/slot captures: archive ledger/collection-singles-ymk07v-v1/NATIVE-EVIDENCE-v1.json.
describe('native collection single percentrank-missing', () => {
  it('matches native missing index TARGET=0', () => expect(percentRankArrayValue(a(1, 2, 4), NaN)).toBe(0));
  it.each([-1, 3])('retains finite native index bounds %s', (i) =>
    expect(() => percentRankArrayValue(a(1, 2, 4), i)).toThrow(),
  );
});
