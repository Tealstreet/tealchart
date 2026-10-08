import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: Pine v6 variance/stdev entries functions194/196 allow a series bool biased flag.
// Population divides squared deviations by N; sample divides by N-1. Only clean full windows are asserted.
const prices = [-6, 9, -3, 12, -9, 6];
const bars = prices.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
}));

describe('TA per-bar population and sample estimates', () => {
  it.each(['variance', 'stdev'])('%s evaluates the current series biased flag', (member) => {
    const result = runCompatScript(
      `//@version=6
indicator("Series biased estimates")
population = bar_index % 2 == 0
plot(ta.${member}(biased=population, length=3, source=close), "Estimate")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expectedVariance = [42, 63, 78, 117];
    const expected = member === 'stdev' ? expectedVariance.map(Math.sqrt) : expectedVariance;
    const values = getPlot(result, 'Estimate').values.slice(2);
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(values[index], `bar${index + 2}`).toBeCloseTo(value, 12));
  });
});
