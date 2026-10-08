import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: Pine v6 ta.cog example, functions275: -sum(source[i] * (i + 1)) / sum(source).
// Finite full windows only; missing inputs, startup and zero denominators are outside this witness.
const prices = [-6, 2, -3, 12, -8, 7];
const bars = prices.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
}));

describe('COG signed finite weights', () => {
  it('uses newest-first one-based weights at length 3 and cancels a common negative sign', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Signed COG 3")
plot(ta.cog(close, 3), "Signed")
plot(ta.cog(length=3, source=-close), "Negated")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [-17 / 7, -12 / 11, -7, -27 / 11];
    for (const title of ['Signed', 'Negated']) {
      const values = getPlot(result, title).values.slice(2);
      expect(values).toHaveLength(expected.length);
      expected.forEach((value, index) => expect(values[index], `${title} bar${index + 2}`).toBeCloseTo(value, 12));
    }
  });
  it('uses newest-first one-based weights at length 4 and cancels a common negative sign', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Signed COG 4")
plot(ta.cog(close, 4), "Signed")
plot(ta.cog(length=4, source=-close), "Negated")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [12 / 5, -5, -15 / 8];
    for (const title of ['Signed', 'Negated']) {
      const values = getPlot(result, title).values.slice(3);
      expect(values).toHaveLength(expected.length);
      expected.forEach((value, index) => expect(values[index], `${title} bar${index + 3}`).toBeCloseTo(value, 12));
    }
  });
});
