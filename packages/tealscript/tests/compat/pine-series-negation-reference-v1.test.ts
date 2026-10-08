import { expect, it } from 'vitest';

import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
// Entries: bool(x) → series bool (function 295), not (keyword 2).
// Missing/zero/sign/recovery samples reject missing-as-true and positive-only casts.
it('not bool(series) treats missing and zero as false and both finite signs as true', () => {
  const bars: Bar[] = [8, -3, 12, 0, -7, 4].map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 100,
  }));
  const result = runCompatScript(`//@version=6
indicator("Series negation")
float sample = bar_index == 0 or bar_index == 2 ? na : close
plot(not bool(sample) ? 1 : 0, "negated")
plot(bool(sample) ? 1 : 0, "converted")`, { bars });

  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(getPlot(result, 'negated').values).toEqual([1, 0, 1, 1, 0, 0]);
  expect(getPlot(result, 'converted').values).toEqual([0, 1, 0, 0, 1, 1]);
});
