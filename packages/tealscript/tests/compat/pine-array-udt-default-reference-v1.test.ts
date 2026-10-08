import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.new<type>
// Omitted initial values are missing references, not constructed UDT instances.
describe('UDT arrays default to independent missing slots', () => {
  for (const constructor of ['array.new<Cell>(3)', 'array.new<Cell>(size=3)']) {
    it(constructor, () => {
      const result = runCompatScript(`//@version=6
indicator("Missing object array elements")
type Cell
    int value = 7
values = ${constructor}
alias = values
plot(values.size(), "Size")
plot(na(values.get(0)) ? 1 : 0, "FirstMissing")
plot(na(values.get(1)) ? 1 : 0, "MiddleMissing")
plot(na(values.get(2)) ? 1 : 0, "LastMissing")
replacement = Cell.new(17)
values.set(1, replacement)
replacement.value := 23
plot(alias.get(1).value, "ReplacementShared")
plot(na(alias.get(0)) ? 1 : 0, "FirstStillMissing")
plot(na(alias.get(2)) ? 1 : 0, "LastStillMissing")
values.set(0, Cell.new())
plot(values.get(0).value, "ConstructedDefault")
plot(values.get(1).value, "MiddleUnaffected")
plot(na(values.get(2)) ? 1 : 0, "LastUnaffected")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { Size: 3, FirstMissing: 1, MiddleMissing: 1, LastMissing: 1, ReplacementShared: 23, FirstStillMissing: 1, LastStillMissing: 1, ConstructedDefault: 7, MiddleUnaffected: 23, LastUnaffected: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
