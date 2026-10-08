import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('RMA preserves seeded state across missing samples', () => {
  for (const version of [5, 6]) {
    it(`v${version} applies alpha one third to subsequent finite samples`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("RMA missing state")
src = bar_index < 3 ? 3.0 : bar_index == 3 or bar_index == 5 ? na : bar_index == 4 ? 9.0 : 11.0
plot(ta.rma(src, 3), "RMA")`, { bars: compatibilityBars.slice(0, 7) });
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'RMA').values;
      expect([values[2], values[4], values[6]]).toEqual([3, 5, 7]);
    });
  }
});
