import { describe, expect, it } from 'vitest';

import { KCW } from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official v6 reference entry759 keeps source EMA and span EMA independent.
const reference = `f_kcw(src, length, mult, useTrueRange) =>
    float basis = ta.ema(src, length)
    float span = (useTrueRange) ? ta.tr : (high - low)
    float rangeEma = ta.ema(span, length)

    ((basis + rangeEma * mult) - (basis - rangeEma * mult)) / basis

`;

describe('TOP20 job 12 documented Keltner width composition', () => {
  it.each([true, false])('keeps basis and span independent with useTrueRange=%s', (useTrueRange) => {
    const bars = Array.from({ length: 14 }, (_, index) => {
      const close = 100 + index * 3;
      return {
        ...compatibilityBars[0],
        time: compatibilityBars[0].time + index * 60_000,
        open: close,
        high: close + 1 + (index % 3),
        low: close - 1,
        close: index === 10 ? NaN : close,
      };
    });
    const result = runCompatScript(
      `//@version=6
indicator("Documented KC width")
${reference}
src = bar_index == 8 ? na : 100.0 + bar_index
plot(ta.kcw(src, 5, 4, ${useTrueRange}), "WIDTH")
plot(f_kcw(src, 5, 4, ${useTrueRange}), "REFERENCE")
plot(ta.ema(src, 5), "BASIS")
plot(ta.ema(${useTrueRange ? 'ta.tr' : 'high - low'}, 5), "SPAN")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const widths = getPlot(result, 'WIDTH').values;
    expect(widths[11], 'documented strict true-range publication').toBe(getPlot(result, 'REFERENCE').values[11]);
    expect(widths).toEqual(getPlot(result, 'REFERENCE').values);
    expect(widths[8]).toBeNull();
    expect(getPlot(result, 'BASIS').values[8]).toBeNull();
    expect(getPlot(result, 'SPAN').values[8]).not.toBeNull();
    expect(getPlot(result, 'SPAN').values[8]).not.toBe(getPlot(result, 'SPAN').values[7]);
    if (useTrueRange) {
      expect(getPlot(result, 'SPAN').values[11]).toBeNull();
      expect(widths[11]).toBeNull();
    } else {
      expect(getPlot(result, 'SPAN').values[11]).not.toBeNull();
      expect(widths[11]).not.toBeNull();
    }
    const kernel = new KCW(5, 4, useTrueRange);
    for (const [index, bar] of bars.entries()) {
      const src = index === 8 ? NaN : 100 + index;
      const snapshot = kernel.save();
      const expected = getPlot(result, 'REFERENCE').values[index];
      const actual = kernel.compute(src, bar.high, bar.low, bar.close);
      expect(Number.isNaN(actual) ? null : actual).toBe(expected);
      kernel.recompute(900, 901, 899, 900);
      const replaced = kernel.recompute(src, bar.high, bar.low, bar.close);
      expect(Number.isNaN(replaced) ? null : replaced).toBe(expected);
      kernel.restore(snapshot);
      const replayed = kernel.compute(src, bar.high, bar.low, bar.close);
      expect(Number.isNaN(replayed) ? null : replayed).toBe(expected);
    }
  });
});
