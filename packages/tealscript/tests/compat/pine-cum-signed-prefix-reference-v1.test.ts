import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([1, -3])('ta.cum includes signed contributions and zero at scale %i', (scale) => {
  // Reference functions 214: cumulative total is the sum of all source elements.
  const prices = [5, -8, 0, 3, -7, 7, 2, -2];
  const expected = [5, -3, -3, 0, -7, 0, 2, 0];
  const bars = prices.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100,
  }));
  const result = runCompatScript(
    `//@version=6
indicator("Signed cumulative prefixes")
plot(ta.cum(close * ${scale}), "Positional")
plot(ta.cum(source=close * ${scale}), "Named")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  for (const title of ['Positional', 'Named']) {
    expect(getPlot(result, title).values).toEqual(expected.map((value) => (value === 0 ? 0 : value * scale)));
  }
});
