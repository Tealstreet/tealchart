import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Independent reference composition: mean +/- multiplier * population stdev.
// The rolling sample includes the last three non-missing source values.
function expectedBands(samples: Array<number | null>) {
  const window: number[] = [];
  return samples.map((sample) => {
    if (sample !== null) {
      window.push(sample);
      if (window.length > 3) window.shift();
    }
    if (window.length < 3) return [null, null, null];
    const mean = window.reduce((a, b) => a + b, 0) / 3;
    const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / 3;
    return [mean, mean + 2 * Math.sqrt(variance), mean - 2 * Math.sqrt(variance)];
  });
}

describe('ledger gaps 25 Bollinger Band contracts', () => {
  for (const holes of [false, true]) {
    it(`ranks 972–973: ${holes ? 'missing-source' : 'finite-source'} tuple follows the documented SMA/stdev composition`, () => {
      const closes = [10, 14, 16, 18, 22, 24, 26];
      const bars = closes.map((close, i) => ({
        ...compatibilityBars[0]!,
        time: compatibilityBars[0]!.time + i * 60000,
        close,
      }));
      const samples = closes.map((value, i) => (holes && (i === 2 || i === 5) ? null : value));
      const source = `//@version=6
indicator("Ledger 25 BB composition")
src = ${holes ? 'bar_index == 2 or bar_index == 5 ? float(na) : close' : 'close'}
[basis, upper, lower] = ta.bb(src, 3, 2)
mean = ta.sma(src, 3)
dev = 2 * ta.stdev(src, 3)
plot(basis, "Basis")
plot(upper, "Upper")
plot(lower, "Lower")
plot(mean, "Composed Basis")
plot(mean + dev, "Composed Upper")
plot(mean - dev, "Composed Lower")
`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, { bars });
      expect(result.errors).toEqual([]);
      const expected = expectedBands(samples);
      for (const [column, name] of ['Basis', 'Upper', 'Lower'].entries()) {
        for (const prefix of ['', 'Composed ']) {
          const values = getPlot(result, prefix + name).values;
          expect(values).toHaveLength(samples.length);
          values.forEach((value, index) => {
            const target = expected[index]![column];
            if (target === null) expect(value).toBeNull();
            else expect(value).toBeCloseTo(target!, 10);
          });
        }
      }
    });
  }
});
