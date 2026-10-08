import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [2, [-125.0, 300.0, 300.0, -87.5, -50.0]],
  [3, [100.0, -300.0, -200.0, -125.0]],
] as const;

it.each(cases)('ta.roc length %i retains the signed lagged denominator', (length, expected) => {
  // Reference functions 192: 100 * change(source, length) / source[length].
  // Negative lagged values retain their sign; uniform source scaling cancels.
  const prices = [-8, -4, 2, -16, 8, -2, 4];
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
indicator("Signed documented rate of change")
plot(ta.roc(close, ${length}), "Original")
plot(ta.roc(close * -3, ${length}), "Scaled")`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  for (const title of ['Original', 'Scaled']) {
    const actual = getPlot(result, title).values.slice(length);
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 12));
  }
});
