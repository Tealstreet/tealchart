import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: Pine v6 ta.cci functions193: (source - SMA) / (0.015 * mean absolute deviation).
// Signed finite full windows only; zero deviation, missing inputs and startup are outside this witness.
const prices = [-6, 2, -3, 12, -8, 7];
const bars = prices.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
}));

describe('CCI signed mean absolute deviation values', () => {
  it('uses signed deviations and the 0.015 scale at length 3', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Signed CCI 3")
plot(ta.cci(close, 3), "Signed")
plot(ta.cci(length=3, source=-close), "Negated")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [-200 / 13, 100, -500 / 7, 200 / 7];
    for (const [title, sign] of [
      ['Signed', 1],
      ['Negated', -1],
    ] as const) {
      const values = getPlot(result, title).values.slice(2);
      expect(values).toHaveLength(expected.length);
      expected.forEach((value, index) =>
        expect(values[index], `${title} bar${index + 2}`).toBeCloseTo(sign * value, 12),
      );
    }
  });
  it('uses signed deviations and the 0.015 scale at length 4', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Signed CCI 4")
plot(ta.cci(close, 4), "Signed")
plot(ta.cci(length=4, source=-close), "Negated")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [8600 / 69, -280 / 3, 400 / 9];
    for (const [title, sign] of [
      ['Signed', 1],
      ['Negated', -1],
    ] as const) {
      const values = getPlot(result, title).values.slice(3);
      expect(values).toHaveLength(expected.length);
      expected.forEach((value, index) =>
        expect(values[index], `${title} bar${index + 3}`).toBeCloseTo(sign * value, 12),
      );
    }
  });
});
