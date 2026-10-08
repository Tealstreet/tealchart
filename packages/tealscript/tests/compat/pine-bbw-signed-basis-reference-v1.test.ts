import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

for (const length of [3, 4]) {
  it.each([1, -1])(`ta.bbw length ${length} retains basis and multiplier signs at source scale %i`, (scale) => {
    // Reference functions 281 example: ((basis + dev - (basis - dev)) / basis) * 100.
    // Arithmetic progression has population variance 24 (n=3) or 45 (n=4).
    const prices = [6, 12, 18, 24, 30, 36];
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
indicator("Signed documented bandwidth")
plot(ta.bbw(close * ${scale}, ${length}, 2), "Positive")
plot(ta.bbw(series=close * ${scale}, length=${length}, mult=-2), "Negative")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    const deviation = Math.sqrt(length === 3 ? 24 : 45);
    const means = length === 3 ? [12, 18, 24, 30] : [15, 21, 27];
    for (const [title, multiplier] of [
      ['Positive', 2],
      ['Negative', -2],
    ] as const) {
      const actual = getPlot(result, title).values.slice(length - 1);
      expect(actual).toHaveLength(means.length);
      means.forEach((mean, index) =>
        expect(actual[index]).toBeCloseTo((200 * multiplier * deviation) / (scale * mean), 10),
      );
    }
  });
}
