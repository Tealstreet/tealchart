import { expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const cases = [
  { start: 0.05, increment: 0.0, expected: [9, 9.0, 9.3, 9.685, 10.15075, 10.6932125] },
  { start: 0.0, increment: 0.1, expected: [9, 9.0, 9.6, 11.08, 12.664, 14.3312] },
] as const;

for (const { start, increment, expected } of cases) {
  it.each([1, -1])(`ta.sar preserves start=${start} increment=${increment} on reflected prices %i`, (direction) => {
    // Reference functions 223 example initializes acceleration from start and adds inc on new extremes.
    const bars = [10, 12, 14, 16, 18, 20, 22].map((price, index) => {
      const close = direction * price;
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
indicator("Documented zero SAR parameters")
plot(ta.sar(${start}, ${increment}, 0.2), "Positional")
plot(ta.sar(max=0.2, inc=${increment}, start=${start}), "Named")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    for (const title of ['Positional', 'Named']) {
      const actual = getPlot(result, title).values.slice(1);
      expect(actual).toHaveLength(expected.length);
      expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(direction * value, 10));
    }
  });
}
