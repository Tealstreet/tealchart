import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Range qualifying samples across holes', () => {
  for (const integer of [false, true]) {
    it(`integer=${integer} uses the latest three finite samples`, () => {
      const result = runCompatScript(`//@version=6
indicator("Range qualifying samples")
raw = bar_index == 0 ? 7.0 : bar_index == 2 ? 4.0 : bar_index == 4 ? 7.0 : bar_index == 6 ? 2.0 : bar_index == 8 ? 9.0 : float(na)
source = ${integer ? 'int(raw)' : 'raw / 2.0'}
plot(ta.range(source, 3), "Range")`, { bars: compatibilityBars.slice(0, 9) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Range').values.slice(4)).toEqual(integer ? [3, 3, 5, 5, 7] : [1.5, 1.5, 2.5, 2.5, 3.5]);
    });
  }
});
