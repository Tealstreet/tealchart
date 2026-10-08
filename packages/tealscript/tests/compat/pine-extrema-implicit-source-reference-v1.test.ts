import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.lowest
// The implicit source is high/low, whose ordering differs from constant close.
describe('extrema implicit source independent value oracles', () => {
  it('highest length 3 selects high for the one-argument overload', () => {
    const highs = [5, 9, 6, 12, 7, 11];
    const lows = [-8, -2, -9, -3, -7, -4];
    const bars = highs.map((high, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: 0,
      high,
      low: lows[index]!,
      close: 0,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Extrema implicit source")
plot(ta.highest(3), "Implicit")
plot(ta.highest(source=high, length=3), "Explicit")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    for (const title of ['Implicit', 'Explicit'])
      expect(getPlot(result, title).values.slice(2)).toEqual([9, 12, 12, 12]);
  });
  it('highest length 4 selects high for the one-argument overload', () => {
    const highs = [5, 9, 6, 12, 7, 11];
    const lows = [-8, -2, -9, -3, -7, -4];
    const bars = highs.map((high, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: 0,
      high,
      low: lows[index]!,
      close: 0,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Extrema implicit source")
plot(ta.highest(4), "Implicit")
plot(ta.highest(source=high, length=4), "Explicit")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    for (const title of ['Implicit', 'Explicit']) expect(getPlot(result, title).values.slice(3)).toEqual([12, 12, 12]);
  });
  it('lowest length 3 selects low for the one-argument overload', () => {
    const highs = [5, 9, 6, 12, 7, 11];
    const lows = [-8, -2, -9, -3, -7, -4];
    const bars = highs.map((high, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: 0,
      high,
      low: lows[index]!,
      close: 0,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Extrema implicit source")
plot(ta.lowest(3), "Implicit")
plot(ta.lowest(source=low, length=3), "Explicit")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    for (const title of ['Implicit', 'Explicit'])
      expect(getPlot(result, title).values.slice(2)).toEqual([-9, -9, -9, -7]);
  });
  it('lowest length 4 selects low for the one-argument overload', () => {
    const highs = [5, 9, 6, 12, 7, 11];
    const lows = [-8, -2, -9, -3, -7, -4];
    const bars = highs.map((high, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: 0,
      high,
      low: lows[index]!,
      close: 0,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Extrema implicit source")
plot(ta.lowest(4), "Implicit")
plot(ta.lowest(source=low, length=4), "Explicit")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    for (const title of ['Implicit', 'Explicit']) expect(getPlot(result, title).values.slice(3)).toEqual([-9, -9, -9]);
  });
});
