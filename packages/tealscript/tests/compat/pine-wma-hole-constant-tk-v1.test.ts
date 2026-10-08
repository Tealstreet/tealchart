import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('WMA constant finite source across holes', () => {
  for (const version of [5, 6]) {
    it(`v${version} ignores holes without changing constant finite results`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("WMA constant holes")
source = bar_index == 3 ? float(na) : -3.0
plot(ta.wma(source, 3), "WMA")`, { bars: compatibilityBars.slice(0, 6) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      const values = getPlot(result, 'WMA').values;
      expect([values[2], values[4], values[5]]).toEqual([-3, -3, -3]);
    });
  }
});
