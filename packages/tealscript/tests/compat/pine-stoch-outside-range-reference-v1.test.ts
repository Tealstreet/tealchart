import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.stoch
// The documented ratio has no saturation when the source lies outside the extrema.
describe('stochastic source outside the supplied range', () => {
  it('length 3 preserves values above 100 and below zero', () => {
    const bars = [-6, 2, -3, 12, -8, 7].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Stochastic outside range")
plot(ta.stoch(close + 50, high, low, 3), "Above")
plot(ta.stoch(close - 50, high, low, 3), "Below")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const above = [5600 / 13, 340, 212, 272];
    getPlot(result, 'Above')
      .values.slice(2)
      .forEach((value, index) => expect(value).toBeCloseTo(above[index]!, 12));
    const below = [-4400 / 13, -160, -188, -128];
    getPlot(result, 'Below')
      .values.slice(2)
      .forEach((value, index) => expect(value).toBeCloseTo(below[index]!, 12));
  });
  it('length 4 preserves values above 100 and below zero', () => {
    const bars = [-6, 2, -3, 12, -8, 7].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Stochastic outside range")
plot(ta.stoch(close + 50, high, low, 4), "Above")
plot(ta.stoch(close - 50, high, low, 4), "Below")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const above = [7100 / 23, 212, 272];
    getPlot(result, 'Above')
      .values.slice(3)
      .forEach((value, index) => expect(value).toBeCloseTo(above[index]!, 12));
    const below = [-2900 / 23, -188, -128];
    getPlot(result, 'Below')
      .values.slice(3)
      .forEach((value, index) => expect(value).toBeCloseTo(below[index]!, 12));
  });
});
