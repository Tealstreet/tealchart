import { beforeAll, describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const operators = ['==', '!='] as const;
const cases = [
  { title: 'nvi_zero_synthetic_doc', start: 5199, captured: [5.405052320614763e-10] },
  { title: 'pvi_zero_synthetic_doc', start: 5071, captured: [5.267404750509985e-10] },
  { title: 'pvi_prior_volume_na_synthetic_doc', start: 21206, captured: [5.44322704652104e-10] },
];

describe('native zero comparisons in volume-index formulas', () => {
  const results = new Map<string, ReturnType<typeof runCompatScript>>();
  beforeAll(() => {
    const bars = Array.from({ length: 22810 }, (_, index) => ({
      time: 1_788_134_400_000 + index * 120_000,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    for (const operator of operators) {
      const previous =
        operator === '==' ? 'nz(value[1], 0.0) == 0.0 ? 1.0 : value[1]' : 'nz(value[1], 0.0) != 0.0 ? value[1] : 1.0';
      results.set(
        operator,
        runCompatScript(
          `//@version=6
indicator("Native zero comparison")
f_vi(c, v, decrease) =>
    float value = 1.0
    float previous = ${previous}
    if nz(c, 0.0) == 0.0 or nz(c[1], 0.0) == 0.0
        value := previous
    else
        value := (decrease ? v < nz(v[1], 0.0) : v > nz(v[1], 0.0)) ? previous + ((c - c[1]) / c[1]) * previous : previous
    value
phase = bar_index % 64
priceClean = 10.0 + phase % 7
priceZero = phase == 8 ? 0.0 : priceClean
volumeRiseZero = phase == 16 ? 0.0 : 100.0 + phase
volumeRiseHole = phase == 20 ? na : 100.0 + phase
volumeFallZero = phase == 16 ? 0.0 : 100.0 - phase
plot(f_vi(priceZero, volumeFallZero, true), "nvi_zero_synthetic_doc")
plot(f_vi(priceZero, volumeRiseZero, false), "pvi_zero_synthetic_doc")
plot(f_vi(priceClean, volumeRiseHole, false), "pvi_prior_volume_na_synthetic_doc")
`,
          { bars },
        ),
      );
    }
  });
  for (const item of cases) {
    // Native authority: oracle-probes/v2/captures/v2/coverage-register-ta-1-v1.csv,
    // batch7 first native divergence at the zero-based item.start. != is the nz-defined complement.
    it.each(operators)(`${item.title}, bar ${item.start}, %s`, (operator) => {
      const result = results.get(operator)!;
      expect(result.errors).toEqual([]);
      const actual = getPlot(result, item.title).values.slice(item.start, item.start + item.captured.length);
      expect(actual).toHaveLength(item.captured.length);
      actual.forEach((value, index) => expect(value).toBeCloseTo(item.captured[index], 12));
    });
  }
});
