import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it('ta.vwma weights signed sources and gives a zero-volume bar zero influence', () => {
  // Authority: https://www.tradingview.com/pine-script-reference/v6/,
  // functions[178], ta.vwma: sma(source * volume, length) / sma(volume, length).
  // Finite denominators reject SMA, ordinal WMA, absolute prices and skipped zero-volume bars.
  const volumes = [2, 0, 1, 4, 3];
  const script = `//@version=6
indicator("VWMA documented weights")
plot(ta.vwma(close, 3), "Positional")
plot(ta.vwma(length=3, source=close), "Named")`;
  for (const zeroVolumePrice of [-4, 1000]) {
    const prices = [5, zeroVolumePrice, 8, 2, -6];
    const bars = prices.map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close, high: close + 1, low: close - 1, close, volume: volumes[index],
    }));
    const result = runCompatScript(script, { bars });
    expect(result.errors).toEqual([]);
    // Last-three weighted sums/volumes: 18/3, 16/5, -2/8.
    for (const title of ['Positional', 'Named']) {
      const values = getPlot(result, title).values.slice(2);
      expect(values).toHaveLength(3);
      [6, 3.2, -0.25].forEach((value, index) => expect(values[index]).toBeCloseTo(value, 12));
    }
  }
});
