import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([1, -3])('ta.nvi/pvi retain signed price returns at uniform scale %i', (scale) => {
  // Reference variables 27/28 examples: update previous index by signed relative close change on strict volume changes.
  const prices = [8, -4, 2, -16, 8, -2, 4, -8];
  const volumes = [100, 90, 110, 110, 80, 120, 120, 70];
  const expected = {
    NVI: [1, -0.5, -0.5, -0.5, 0.25, 0.25, 0.25, -0.5],
    PVI: [1, 1.0, -0.5, -0.5, -0.5, 0.125, 0.125, 0.125],
  };
  const bars = prices.map((price, index) => {
    const close = price * scale;
    return {
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: volumes[index],
    };
  });
  const result = runCompatScript(
    `//@version=6
indicator("Documented signed volume-index returns")
plot(ta.nvi, "NVI")
plot(ta.pvi, "PVI")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  for (const title of ['NVI', 'PVI'] as const) expect(getPlot(result, title).values).toEqual(expected[title]);
});
