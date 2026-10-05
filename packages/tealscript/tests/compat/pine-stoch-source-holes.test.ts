import { describe, expect, it } from 'vitest';

import { Stoch } from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('stochastic missing-value contracts', () => {
  it('retains the last output through source holes while advancing the high/low window', () => {
    const prices = [
      [10, 0, 2],
      [10, 0, 4],
      [10, 0, 6],
      [100, -100, 40],
      [20, 1, 10],
      [12, 2, 8],
    ];
    const bars = prices.map(([high, low, close], index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close!,
      high: high!,
      low: low!,
      close: close!,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Stochastic source holes")
source = bar_index == 3 or bar_index == 4 ? na : close
plot(ta.stoch(source, high, low, 3), title="Builtin")
plot(100 * (source - ta.lowest(low, 3)) / (ta.highest(high, 3) - ta.lowest(low, 3)), title="Formula")
plot(ta.stoch(close, high, low, 3), title="Clean")
plot(ta.stoch(float(na), high, low, 3), title="Missing from start")`,
      { bars },
    );

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Builtin').values).toEqual([null, null, 60, 60, 60, 54]);
    expect(getPlot(result, 'Formula').values).toEqual([null, null, 60, null, null, 54]);
    expect(getPlot(result, 'Clean').values).toEqual([null, null, 60, 70, 55, 54]);
    expect(getPlot(result, 'Missing from start').values).toEqual([null, null, null, null, null, null]);
  });

  it('restores the retained output and extrema when recomputing or restoring a source hole', () => {
    const stoch = new Stoch(2);
    expect(stoch.compute(2, 10, 0)).toBeNaN();
    expect(stoch.compute(6, 10, 0)).toBe(60);
    const beforeHole = stoch.save();

    expect(stoch.compute(NaN, 100, -100)).toBe(60);
    expect(stoch.recompute(NaN, 20, 1)).toBe(60);
    expect(stoch.compute(8, 12, 2)).toBeCloseTo((100 * 7) / 19, 12);

    stoch.restore(beforeHole);
    expect(stoch.compute(NaN, 100, -100)).toBe(60);
    expect(stoch.compute(8, 12, 2)).toBe(54);
    stoch.restore(beforeHole);
    expect(stoch.compute(NaN, 20, 1)).toBe(60);
  });

  it.each([1, 4])('returns NA for a flat window at length %i, with a nonflat recovery control', (length) => {
    const result = runCompatScript(
      `//@version=6
indicator("Flat stochastic")
source = bar_index == 9 ? na : 5.0
upper = bar_index == 4 ? 7.0 : 5.0
lower = bar_index == 4 ? 3.0 : 5.0
plot(ta.stoch(5.0, 5.0, 5.0, ${length}), title="Flat")
plot(ta.stoch(source, upper, lower, ${length}), title="Recovery")`,
      { bars: compatibilityBars.slice(0, 10) },
    );

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Flat').values).toEqual(Array(10).fill(null));
    expect(getPlot(result, 'Recovery').values).toEqual([null, null, null, null, 50, 50, 50, 50, 50, 50]);
  });
});
