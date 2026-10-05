import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const bars = [
  { ...compatibilityBars[0], time: Date.UTC(2026, 7, 31, 23, 58) },
  { ...compatibilityBars[1], time: Date.UTC(2026, 8, 1, 0, 0) },
  { ...compatibilityBars[2], time: Date.UTC(2026, 8, 1, 0, 2) },
];

describe('native v6 timeframe first-bar anchor', () => {
  it('does not fabricate an initial daily boundary, then recognizes midnight', () => {
    // Native v1 volume-vwap day anchor is zero at bar0; later boundaries follow UTC dates.
    const result = runCompatScript(`//@version=6
indicator("Daily boundary")
plot(timeframe.change("1D") ? 1 : 0, "Anchor")`, {
      bars,
      engineOptions: { runtime: { syminfo: { timezone: 'UTC' } } },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Anchor').values).toEqual([0, 1, 0]);
  });

  it('keeps first-bar initialization explicit without reading an empty prior period', () => {
    const result = runCompatScript(`//@version=6
indicator("Explicit initial period")
var values = array.new_float()
if timeframe.change("1D")
    previous = array.last(values)
if barstate.isfirst or timeframe.change("1D")
    array.push(values, close)
plot(array.last(values), "Value")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([bars[0].close, bars[1].close, bars[1].close]);
  });

  it('initializes VWAP with its explicit first-bar anchor and resets at midnight', () => {
    const result = runCompatScript(`//@version=6
indicator("Explicit VWAP anchor")
plot(ta.vwap(close, barstate.isfirst or timeframe.change("1D")), "VWAP")`, { bars });
    expect(result.errors).toEqual([]);
    const average = (bars[1].close * bars[1].volume! + bars[2].close * bars[2].volume!)
      / (bars[1].volume! + bars[2].volume!);
    expect(getPlot(result, 'VWAP').values).toEqual([bars[0].close, bars[1].close, average]);
  });
});
