import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('Mode qualifying samples across holes', () => {
  for (const integer of [false, true]) {
    it(`integer=${integer} ignores holes and chooses the smallest tied value`, () => {
      const result = runCompatScript(`//@version=6
indicator("Mode qualifying samples")
raw = bar_index == 0 ? 7.0 : bar_index == 2 ? 4.0 : bar_index == 4 ? 7.0 : bar_index == 6 ? 2.0 : bar_index == 8 ? 2.0 : float(na)
source = ${integer ? 'int(raw)' : 'raw / 2.0'}
plot(ta.mode(source, 3), "Mode")`, { bars: compatibilityBars.slice(0, 9) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'Mode').values.slice(4)).toEqual(integer ? [7, 7, 2, 2, 2] : [3.5, 3.5, 1, 1, 1]);
    });
  }
});
