import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const bars = [8, -3, 12, 0, -7].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close, low: close, close, volume: 100,
}));

// Pine arithmetic operators: an na operand propagates through numeric addition.
// Finite samples distinguish missing values from zero and verify recovery.
describe('numeric addition missing operands', () => {
  it.each([5, 6])('preserves missing operands and finite sums in v%s', (version) => {
    const result = runCompatScript(`//@version=${version}
indicator("Missing addition")
float value = bar_index == 0 or bar_index == 2 ? na : close
plot(value + 2, "Right")
plot(2 + value, "Left")
plot(value + value, "Both")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Right').values).toEqual([null, -1, null, 2, -5]);
    expect(getPlot(result, 'Left').values).toEqual([null, -1, null, 2, -5]);
    expect(getPlot(result, 'Both').values).toEqual([null, -6, null, 0, -14]);
  });
});
