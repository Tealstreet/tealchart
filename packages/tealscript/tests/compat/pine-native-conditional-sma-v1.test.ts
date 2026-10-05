import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

const cases = [
  {
    capture: 'coverage-tad-1-v1.csv:rma_hole_reference', start: 41, length: 3,
    source: 'bar_index == 40 or bar_index == 41 ? na : 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)',
    captured: [52.333333333333336, 59.88888888888889, 62.25925925925927, 57.17283950617285],
  },
  {
    capture: 'conflicts-batch-2-v1.csv:CF047_literal', start: 16, length: 5,
    source: 'int(time / 120000) % 11 == 7 ? float(na) : 10.0 + float(int(time / 120000) % 7)',
    captured: [14.2, 14.559999999999999, 13.648, 13.118400000000001],
  },
];

describe('native conditional SMA call history', () => {
  for (const item of cases) {
    // Authority: oracle-probes/v2/captures/v2/<capture>; four bars starting at item.start.
    it(`matches ${item.capture} at bars ${item.start}–${item.start + 3}`, () => {
      const bars = Array.from({ length: item.start + 4 }, (_, index) => ({
        time: 1_788_134_400_000 + index * 120_000, open: 1, high: 1, low: 1, close: 1, volume: 1,
      }));
      const result = runCompatScript(`//@version=6
indicator("Native conditional SMA")
literal(src, length) =>
    alpha = 1.0 / length
    total = 0.0
    total := na(total[1]) ? ta.sma(src, length) : alpha * src + (1.0 - alpha) * nz(total[1])
    total
source = ${item.source}
plot(literal(source, ${item.length}), "literal")
`, { bars });
      expect(result.errors).toEqual([]);
      const actual = getPlot(result, 'literal').values.slice(item.start);
      expect(actual).toHaveLength(4);
      actual.forEach((value, index) => {
        expect(value).toBeCloseTo(item.captured[index], 12);
      });
    });
  }
});
