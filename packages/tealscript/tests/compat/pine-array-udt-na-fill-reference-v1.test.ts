import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.fill
describe('Bounded missing UDT array fill', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const call = method ? 'values.fill(na, 1, 3)' : 'array.fill(index_to=3, value=na, id=values, index_from=1)';
      const result = runCompatScript(`//@version=6
indicator("Missing array fill")
type Cell
    int value
original = Cell.new(23)
values = array.new<Cell>(4, original)
${call}
plot(na(values.get(0)) ? 1 : 0, "Mask0")
plot(na(values.get(1)) ? 1 : 0, "Mask1")
plot(na(values.get(2)) ? 1 : 0, "Mask2")
plot(na(values.get(3)) ? 1 : 0, "Mask3")
original.value := 31
plot(original.value, "Retained")
plot(values.get(3).value, "OutsideShared")
values.set(1, Cell.new(41))
plot(values.get(1).value, "Replacement")
plot(na(values.get(2)) ? 1 : 0, "OtherMissing")
plot(values.size(), "Size")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { Mask0: 0, Mask1: 1, Mask2: 1, Mask3: 0, Retained: 31, OutsideShared: 31, Replacement: 41, OtherMissing: 1, Size: 4 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
