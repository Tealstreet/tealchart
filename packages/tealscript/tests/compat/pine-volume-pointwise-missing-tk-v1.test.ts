import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

// Official III/WVAD examples are pointwise formulas, with no accumulated state.
describe('Pointwise volume variables missing inputs', () => {
  for (const version of [5, 6]) {
    it(`v${version} propagates holes and recovers without accumulation`, () => {
      const bars = [[2, 6, 0, 4, 9], [2, 6, 0, NaN, 9], [4, 8, 2, 5, 12], [2, 6, 0, 4, NaN], [1, 1, 1, 1, 9], [2, 6, 0, 4, 9]]
        .map(([open, high, low, close, volume], index) => ({ time: 1700000000000 + index * 60000, open, high, low, close, volume }));
      const result = runCompatScript(`//@version=${version}
indicator("Pointwise missing volume")
plot(ta.iii, "III")
plot(ta.wvad, "WVAD")`, { bars });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(getPlot(result, 'III').values).toEqual([3, null, 0, null, null, 3]);
      expect(getPlot(result, 'WVAD').values).toEqual([3, null, 2, null, null, 3]);
    });
  }
});
