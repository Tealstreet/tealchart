import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Nearest-rank percentile selects exact sorted ranks', () => {
  for (const version of [5, 6]) {
    it(`v${version} selects the ceiling rank rather than physical insertion order`, () => {
      const source = [7, 1, 11, 5, 9, 7, 1, 11, 5, 9, 7, 1];
      const cases = [
        { percentage: 10, expected: 1 },
        { percentage: 30, expected: 5 },
        { percentage: 50, expected: 7 },
        { percentage: 70, expected: 9 },
        { percentage: 90, expected: 11 },
        { percentage: 100, expected: 11 },
      ];
      const plots = cases.flatMap((item) => [
        `plot(ta.percentile_nearest_rank(close, 5, ${item.percentage}), "P${item.percentage}")`,
        `plot(ta.percentile_nearest_rank(percentage = ${item.percentage}, source = close, length = 5), "N${item.percentage}")`,
      ]);
      const result = runCompatScript(
        `//@version=${version}
indicator("Exact nearest ranks")
${plots.join('\n')}`,
        {
          bars: compatibilityBars.map((bar, i) => ({ ...bar, close: source[i] })),
        },
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const item of cases) {
        for (const prefix of ['P', 'N'])
          expect(getPlot(result, `${prefix}${item.percentage}`).values.slice(4)).toEqual(Array(8).fill(item.expected));
      }
    });
  }
});
