import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.rsi
// Exact Wilder gain/loss recurrences isolate finite affine source controls.
describe('RSI finite affine gain-loss controls', () => {
  it('length 2 preserves scaling and complements reflected source', () => {
    const bars = [-3, 3, -3, 3, -3, 3, -3, 3].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("RSI affine controls")
plot(ta.rsi(close, 2), "Original")
plot(ta.rsi(2 * close + 11, 2), "Scaled")
plot(ta.rsi(-2 * close + 11, 2), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [50, 75, 75 / 2, 275 / 4, 275 / 8, 1075 / 16];
    for (const title of ['Original', 'Scaled', 'Reflected']) {
      const values = getPlot(result, title).values.slice(2);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) =>
        expect(value).toBeCloseTo(title === 'Reflected' ? 100 - expected[index]! : expected[index]!, 12),
      );
    }
  });
  it('length 4 preserves scaling and complements reflected source', () => {
    const bars = [-3, 3, -3, 3, -3, 3, -3, 3].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("RSI affine controls")
plot(ta.rsi(close, 4), "Original")
plot(ta.rsi(2 * close + 11, 4), "Scaled")
plot(ta.rsi(-2 * close + 11, 4), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [50, 125 / 2, 375 / 8, 1925 / 32];
    for (const title of ['Original', 'Scaled', 'Reflected']) {
      const values = getPlot(result, title).values.slice(4);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) =>
        expect(value).toBeCloseTo(title === 'Reflected' ? 100 - expected[index]! : expected[index]!, 12),
      );
    }
  });
});
