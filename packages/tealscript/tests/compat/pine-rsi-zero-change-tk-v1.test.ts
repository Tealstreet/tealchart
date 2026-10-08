import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

for (const moving of [false, true]) {
  it(`v6 RSI published ratio on ${moving ? 'rising' : 'flat'} changes`, () => {
    const result = runCompatScript(`//@version=6
indicator("RSI change ratio")
plot(ta.rsi(${moving ? 'bar_index + 7.0' : '7.0'}, 2), "RSI")`, { bars: compatibilityBars.slice(0, 6) });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'RSI').values.slice(2)).toEqual(moving ? [100, 100, 100, 100] : [null, null, null, null]);
  });
}

it('v6 RSI advances both RMAs through flat changes between movements', () => {
  const prices = [10, 12, 9, 9, 9, 15, 15, 12];
  const bars = compatibilityBars.slice(0, prices.length).map((bar, i) => ({ ...bar, close: prices[i] }));
  const result = runCompatScript(`//@version=6
indicator("RSI flat state")
plot(ta.rsi(close, 2), "RSI")`, { bars });
  expect(result.errors).toEqual([]);
  const values = getPlot(result, 'RSI').values;
  expect(values.slice(0, 2)).toEqual([null, null]);
  const expected = [40, 40, 40, 5000 / 53, 5000 / 53, 5000 / 149];
  expected.forEach((value, i) => expect(values[i + 2]).toBeCloseTo(value, 12));
});
