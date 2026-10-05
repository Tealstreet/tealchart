import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

describe('PARTIAL 1052: variance non-missing sample quantity', () => {
  // Frozen reference ta.variance: length non-na values and population/sample bias.
  for (const length of [3, 4]) {
    it(`retains ${length} finite observations across leading and consecutive holes`, () => {
      const values = [NaN, 2, NaN, 4, NaN, NaN, 8, 14, NaN, 20, NaN, 5];
      const bars = values.map((close, index) => ({
        time: index * 60_000,
        open: 1,
        high: 25,
        low: 1,
        close,
        volume: 1,
      }));
      const population =
        length === 3
          ? [null, null, null, null, null, null, 56 / 9, 152 / 9, 152 / 9, 24, 24, 38]
          : [null, null, null, null, null, null, null, 21, 21, 36.75, 36.75, 33.1875];
      const result = runCompatScript(
        `//@version=6
indicator("Variance non-missing quantity")
plot(ta.variance(close, ${length}), "Default")
plot(ta.variance(close, ${length}, true), "Population")
plot(ta.variance(close, ${length}, false), "Sample")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      for (const [title, divisor] of [
        ['Default', 1],
        ['Population', 1],
        ['Sample', length / (length - 1)],
      ] as const) {
        const actual = getPlot(result, title).values;
        expect(actual).toHaveLength(values.length);
        population.forEach((expected, index) => {
          if (expected === null) expect(actual[index]).toBeNull();
          else expect(actual[index]).toBeCloseTo(expected * divisor, 10);
        });
      }
    });
  }
});
