import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('WMA retains signed newest-heavy weighted sums', () => {
  it('uses length 2 signed sums with zero source inputs', () => {
    const bars = [0, 12, -24, 0, 24, -6, 0, -18].map((close, index) => ({
      time: 1700000000000 + index * 60000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 10,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Signed WMA")
plot(ta.wma(close, 2), "Base")
plot(ta.wma(source=-3 * close, length=2), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    const expected = [8.0, -12.0, -8.0, 16.0, 4.0, -2.0, -12.0];
    expect(getPlot(result, 'Base').values.slice(1)).toEqual(expected);
    const reflected = getPlot(result, 'Reflected').values.slice(1);
    expect(reflected).toHaveLength(expected.length);
    reflected.forEach((value, index) => expect(value).toBeCloseTo(-3 * expected[index], 12));
  });
  it('uses length 4 signed sums with zero source inputs', () => {
    const bars = [0, 12, -24, 0, 24, -6, 0, -18].map((close, index) => ({
      time: 1700000000000 + index * 60000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 10,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Signed WMA")
plot(ta.wma(close, 4), "Base")
plot(ta.wma(source=-3 * close, length=4), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    const expected = [-4.8, 6.0, 2.4, 3.0, -6.0];
    expect(getPlot(result, 'Base').values.slice(3)).toEqual(expected);
    const reflected = getPlot(result, 'Reflected').values.slice(3);
    expect(reflected).toHaveLength(expected.length);
    reflected.forEach((value, index) => expect(value).toBeCloseTo(-3 * expected[index], 12));
  });
});
