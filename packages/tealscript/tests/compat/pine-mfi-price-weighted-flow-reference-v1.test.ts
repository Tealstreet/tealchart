import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.mfi
// The helper weights directional flow by source times volume, not price change.
describe('MFI finite price-weighted flow', () => {
  it('length 3 uses unequal volume and retains positive source scaling', () => {
    const volumes = [2, 3, 5, 7, 11, 13, 17, 19];
    const bars = [10, 15, 11, 11, 18, 12, 16, 13].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: volumes[index]!,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("MFI price-weighted flow")
plot(ta.mfi(close, 3), "Original")
plot(ta.mfi(2 * close, 3), "Scaled")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [45, 1800 / 23, 3300 / 59, 23500 / 313, 1088 / 27];
    for (const title of ['Original', 'Scaled']) {
      const values = getPlot(result, title).values.slice(3);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 12));
    }
  });
  it('length 4 uses unequal volume and retains positive source scaling', () => {
    const volumes = [2, 3, 5, 7, 11, 13, 17, 19];
    const bars = [10, 15, 11, 11, 18, 12, 16, 13].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: volumes[index]!,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("MFI price-weighted flow")
plot(ta.mfi(close, 4), "Original")
plot(ta.mfi(2 * close, 4), "Scaled")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [12150 / 149, 19800 / 409, 23500 / 313, 47000 / 873];
    for (const title of ['Original', 'Scaled']) {
      const values = getPlot(result, title).values.slice(4);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 12));
    }
  });
});
