import { describe, expect, it } from 'vitest';

import { covarianceArrayValue, createPineArray, pushArrayValue } from '../../src/runtime/arrays';

const a = (...values: number[]) => {
  const result = createPineArray<number>();
  values.forEach((x) => pushArrayValue(result, x));
  return result;
};
// Native boundary/slot captures: archive ledger/collection-singles-ymk07v-v1/NATIVE-EVIDENCE-v1.json.
describe('native collection single covariance', () => {
  it.each([
    [2, 3],
    [3, 2],
  ])('rejects unequal native sizes %s/%s', (left, right) => {
    expect(() => covarianceArrayValue(a(...[1, 2, 3].slice(0, left)), a(...[2, 5, 7].slice(0, right)))).toThrow(
      'sizes',
    );
  });
});
