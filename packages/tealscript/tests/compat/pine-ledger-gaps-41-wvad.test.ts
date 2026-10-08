import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/ variables[23].
// Ranks1615/1618: the pointwise example uses OHLCV; no cumulative missing-state rule is inferred.
const base = { time: 1700000000000, open: 10, high: 14, low: 6, close: 12, volume: 200 };
const source = '//@version=6\nindicator("Williams variable accumulation distribution")\nplot(ta.wvad, "value")';

describe('documented Williams variable accumulation distribution', () => {
  it.each(['open', 'high', 'low', 'close', 'volume'] as const)('publishes na when %s is missing', (field) => {
    const result = runCompatScript(source, { bars: [base, { ...base, time: base.time + 60000, [field]: NaN }] });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual([50, null]);
  });

  it('publishes na for a flat zero-over-zero bar', () => {
    const result = runCompatScript(source, { bars: [{ ...base, high: 10, low: 10, open: 10, close: 10 }] });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual([null]);
  });

  it('uses signed candle movement, range, and volume without accumulating', () => {
    const bars = [12, 8, 10, 14].map((close, index) => ({ ...base, close, time: base.time + index * 60000 }));
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual([50, -50, 0, 100]);
  });
});
