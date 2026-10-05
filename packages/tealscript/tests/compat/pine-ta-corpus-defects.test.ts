import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('documented Pine TA corpus regressions', () => {
  it('TA-SUPERTREND-SERIES-FACTOR: series admission retains the initially sampled factor', () => {
    // Native v6 standalone first2/first3 captures supersede the live-factor reference model.
    // The local fixed-factor call remains an admission and independent-state control.
    const bars: Bar[] = Array.from({ length: 5 }, (_, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: 10,
      high: 13,
      low: 8,
      close: 10,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("series factor")
factor = bar_index == 2 ? 0.5 : bar_index == 3 ? 3.0 : bar_index >= 4 ? 0.25 : 2.0
f(float multiplier) =>
    ta.supertrend(multiplier, 2)
[line, direction] = ta.supertrend(factor=factor, atrPeriod=2)
[localLine, localDirection] = f(2)
plot(line, "line")
plot(direction, "direction")
plot(localLine, "local line")
plot(localDirection, "local direction")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    for (const title of ['line', 'local line']) {
      expect(getPlot(result, title).values).toEqual([0, 20.5, 20.5, 20.5, 20.5]);
    }
    for (const title of ['direction', 'local direction']) {
      expect(getPlot(result, title).values.slice(1)).toEqual([1, 1, 1, 1]);
    }
  });
});
