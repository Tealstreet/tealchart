import { describe, expect, it } from 'vitest';

import { Supertrend } from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Official v6 reference entry 655, "The same on Pine Script" recurrence.
// Fixed factors preserve the separately captured initial-factor rule.
const reference = `pine_supertrend(factor, atrPeriod) =>
    src = hl2
    atr = ta.atr(atrPeriod)
    upperBand = src + factor * atr
    lowerBand = src - factor * atr
    prevLowerBand = nz(lowerBand[1])
    prevUpperBand = nz(upperBand[1])

    lowerBand := lowerBand > prevLowerBand or close[1] < prevLowerBand ? lowerBand : prevLowerBand
    upperBand := upperBand < prevUpperBand or close[1] > prevUpperBand ? upperBand : prevUpperBand
    int _direction = na
    float superTrend = na
    prevSuperTrend = superTrend[1]
    if na(atr[1])
        _direction := 1
    else if prevSuperTrend == prevUpperBand
        _direction := close > upperBand ? -1 : 1
    else
        _direction := close < lowerBand ? 1 : -1
    superTrend := _direction == -1 ? lowerBand : upperBand
    [superTrend, _direction]

`;

const closes = [100, 102, 104, 80, 79, 125, 130, 75, 78, 140, 145, 90, 92, 150, 148, 85, 80, 160];

function barsFor(missing: 'none' | 'high' | 'low' | 'close') {
  return closes.map((close, index) => ({
    ...compatibilityBars[0],
    time: compatibilityBars[0].time + index * 60_000,
    open: close,
    high: missing === 'high' && index === 7 ? NaN : close + 1,
    low: missing === 'low' && index === 7 ? NaN : close - 1,
    close: missing === 'close' && index === 7 ? NaN : close,
  }));
}

describe('TOP20 job 11 documented Supertrend recurrence', () => {
  it.each(['none', 'high', 'low', 'close'] as const)('retains bands and direction through %s holes', (missing) => {
    const bars = barsFor(missing);
    const result = runCompatScript(
      `//@version=6
indicator("Documented Supertrend recurrence")
${reference}
[builtinLine, builtinDirection] = ta.supertrend(3, 3)
[referenceLine, referenceDirection] = pine_supertrend(3, 3)
plot(builtinLine, "LINE")
plot(referenceLine, "REFERENCE_LINE")
plot(builtinDirection, "DIRECTION")
plot(referenceDirection, "REFERENCE_DIRECTION")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'LINE').values).toEqual(getPlot(result, 'REFERENCE_LINE').values);
    const directions = getPlot(result, 'DIRECTION').values;
    expect(directions).toEqual(getPlot(result, 'REFERENCE_DIRECTION').values);
    expect(directions).toContain(1);
    expect(directions).toContain(-1);
    expect(directions.slice(0, 3)).toEqual([1, 1, 1]);
    expect(
      getPlot(result, 'LINE')
        .values.slice(10)
        .every((value) => value !== null),
    ).toBe(true);
  });

  it('restores high-hole ATR state during recompute and snapshot replay', () => {
    const uninterrupted = new Supertrend(3);
    const revisited = new Supertrend(3);
    for (const bar of barsFor('high')) {
      const expected = uninterrupted.compute(bar.high, bar.low, bar.close, 3);
      const snapshot = revisited.save();
      expect(revisited.compute(bar.high, bar.low, bar.close, 3)).toEqual(expected);
      revisited.recompute(500, 499, 500, 3);
      expect(revisited.recompute(bar.high, bar.low, bar.close, 3)).toEqual(expected);
      revisited.restore(snapshot);
      expect(revisited.compute(bar.high, bar.low, bar.close, 3)).toEqual(expected);
    }
  });
});
