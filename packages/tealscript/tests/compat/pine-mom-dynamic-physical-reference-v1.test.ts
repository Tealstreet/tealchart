import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([false, true])('ta.mom uses the current physical lag through holes, named=%s', (named) => {
  // Reference functions 218: source-source[length]; series-int length, included na.
  const prices = [10, -2, 99, 5, -8, 3, 0, 7];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
  const call = (source: string) => (named ? `ta.mom(length=length, source=${source})` : `ta.mom(${source}, length)`);
  const result = runCompatScript(
    `//@version=6
indicator("Documented dynamic momentum")
source = bar_index == 2 ? float(na) : close
length = 2 + bar_index % 2
plot(${call('source')}, "Original")
plot(${call('-2 * source + 11')}, "Affine")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(getPlot(result, 'Original').values).toEqual([null, null, null, -5, null, null, 8, 15]);
  expect(getPlot(result, 'Affine').values).toEqual([null, null, null, 10, null, null, -16, -30]);
});
