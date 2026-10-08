import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.fill
describe('Bounded missing UDT matrix fill', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const call = method ? 'values.fill(na, 0, 2, 1, 2)' : 'matrix.fill(to_column=2, value=na, id=values, from_row=0, to_row=2, from_column=1)';
      const result = runCompatScript(`//@version=6
indicator("Missing matrix fill")
type Cell
    int value = 7
original = Cell.new(23)
values = matrix.new<Cell>(2, 3, original)
${call}
plot(na(values.get(0, 0)) ? 1 : 0, "Mask0")
plot(na(values.get(0, 1)) ? 1 : 0, "Mask1")
plot(na(values.get(0, 2)) ? 1 : 0, "Mask2")
plot(na(values.get(1, 0)) ? 1 : 0, "Mask3")
plot(na(values.get(1, 1)) ? 1 : 0, "Mask4")
plot(na(values.get(1, 2)) ? 1 : 0, "Mask5")
original.value := 31
plot(original.value, "Retained")
plot(values.get(1, 2).value, "OutsideShared")
values.set(0, 1, Cell.new(41))
plot(values.get(0, 1).value, "Replacement")
plot(na(values.get(1, 1)) ? 1 : 0, "OtherMissing")
plot(values.rows(), "Rows")
plot(values.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { Mask0: 0, Mask1: 1, Mask2: 0, Mask3: 0, Mask4: 1, Mask5: 0, Retained: 31, OutsideShared: 31, Replacement: 41, OtherMissing: 1, Rows: 2, Columns: 3 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
