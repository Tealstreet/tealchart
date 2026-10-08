import { describe, expect, it } from 'vitest';

import { createPineArray, percentileLinearInterpolationArrayValue, pushArrayValue } from '../../src/runtime/arrays';

const a = (...values: number[]) => {
  const result = createPineArray<number>();
  values.forEach((x) => pushArrayValue(result, x));
  return result;
};
// Functional regression: preserve the argument and result contract.
describe('native collection single linear-domain', () => {
  it.each([-1, 101])('rejects native finite percentage %s', (p) =>
    expect(() => percentileLinearInterpolationArrayValue(a(1, 2, 4), p)).toThrow('range'),
  );
  it('keeps native missing percentage', () =>
    expect(percentileLinearInterpolationArrayValue(a(1, 2, 4), NaN)).toBeNaN());
});
