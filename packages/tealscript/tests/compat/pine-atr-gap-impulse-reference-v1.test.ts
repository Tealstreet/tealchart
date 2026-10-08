import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  [2, [8.0, 4.0, 2.0, 1.0]],
  [4, [4.0, 3.0, 2.25, 1.6875]],
] as const;

for (const [length, expected] of cases) {
  it.each([1, -1])(`ta.atr length ${length} applies RMA decay after a reflected gap at scale %i`, (scale) => {
    // Reference functions 210: ATR is RMA of max(high-low, abs(high-close[1]), abs(low-close[1])).
    // Eight zero-range bars precede one gap of 16; remaining true ranges are zero.
    const prices = [...Array<number>(8).fill(0), ...Array<number>(4).fill(16 * scale)];
    const bars = prices.map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Documented ATR gap decay")
plot(ta.atr(${length}), "Positional")
plot(ta.atr(length=${length}), "Named")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const title of ['Positional', 'Named']) {
      const actual = getPlot(result, title).values.slice(8);
      expect(actual).toHaveLength(4);
      expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 12));
    }
  });
}
