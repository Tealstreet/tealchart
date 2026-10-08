import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('MACD constant finite recovery across holes', () => {
  for (const version of [5, 6]) {
    it(`v${version} ignores holes without changing a settled constant tuple`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("MACD constant holes")
source = bar_index == 5 ? float(na) : 3.0
[line, signal, histogram] = ta.macd(source, 2, 3, 2)
plot(line, "Line")
plot(signal, "Signal")
plot(histogram, "Histogram")`, { bars: compatibilityBars.slice(0, 8) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      for (const title of ['Line', 'Signal', 'Histogram']) {
        const values = getPlot(result, title).values;
        expect([values[4], values[6], values[7]]).toEqual([0, 0, 0]);
      }
    });
  }
});
