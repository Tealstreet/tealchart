import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

it.each([0, 50])('ta.supertrend preserves zero factor through reversals at translation %i', (translation) => {
  // Reference functions 179 example: zero factor makes basic bands hl2; strict close comparisons select direction.
  const prices = [10, 12, 9, 15, 8, 14, 7, 16];
  const bars = prices.map((price, index) => {
    const close = price + translation;
    return {
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 100,
    };
  });
  const result = runCompatScript(
    `//@version=6
indicator("Documented zero-factor Supertrend")
[line, direction] = ta.supertrend(0, 2)
[namedLine, namedDirection] = ta.supertrend(atrPeriod=2, factor=0)
plot(line, "Line")
plot(direction, "Direction")
plot(namedLine, "NamedLine")
plot(namedDirection, "NamedDirection")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  for (const title of ['Line', 'NamedLine'])
    expect(getPlot(result, title).values.slice(2)).toEqual([9, 15, 8, 14, 7, 16].map((value) => value + translation));
  for (const title of ['Direction', 'NamedDirection'])
    expect(getPlot(result, title).values.slice(2)).toEqual([1, -1, 1, -1, 1, -1]);
});
