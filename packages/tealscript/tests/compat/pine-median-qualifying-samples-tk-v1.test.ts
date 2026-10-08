import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// ta.median computes length finite samples, ignoring missing source values.
describe('Median qualifying samples across holes', () => {
  for (const integer of [false, true]) {
    it(`integer=${integer} retains the finite sample median`, () => {
      const result = runCompatScript(`//@version=6
indicator("Median qualifying samples")
raw = bar_index == 0 ? 1.0 : bar_index == 2 ? 4.0 : bar_index == 4 ? 7.0 : bar_index == 6 ? 2.0 : bar_index == 8 ? 9.0 : float(na)
source = ${integer ? 'int(raw)' : 'raw / 2.0'}
plot(ta.median(source, 3), "Median")`, { bars: compatibilityBars.slice(0, 9) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Median').values.slice(4)).toEqual(integer ? [4, 4, 4, 4, 7] : [2, 2, 2, 2, 3.5]);
    });
  }
});
