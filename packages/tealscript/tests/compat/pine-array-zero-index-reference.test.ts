import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array.new_float reference remark: indices start at zero', () => {
  // Ledger collections-v1#253 (global rank256), reference functions[457].
  // https://www.tradingview.com/pine-script-reference/v6/#fun_array.new_float
  it('addresses first, middle, and last initialized elements without shifting neighbors', () => {
    const result = runCompatScript(`//@version=6
indicator("Zero-based float array")
values = array.new_float(3, 7.5)
array.set(values, 0, close)
values.set(values.size() - 1, high)
plot(array.get(values, 0), "First")
plot(values.get(1), "Middle")
plot(values.get(values.size() - 1), "Last")
plot(values.size(), "Size")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First').values).toEqual(compatibilityBars.map((bar) => bar.close));
    expect(getPlot(result, 'Middle').values).toEqual(compatibilityBars.map(() => 7.5));
    expect(getPlot(result, 'Last').values).toEqual(compatibilityBars.map((bar) => bar.high));
    expect(getPlot(result, 'Size').values).toEqual(compatibilityBars.map(() => 3));
  });
});
