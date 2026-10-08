import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#shallow-copies
// Plain copies own slots and keep their UDT references after the source is cleared.
describe('Plain UDT array copies survive source slot changes', () => {
  for (const method of [false, true]) {
    it(`independent array slots, method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Plain object array copy")
type Cell
    int value
left = Cell.new(3)
middle = Cell.new(7)
right = Cell.new(11)
values = array.from(left, middle, right, middle)
copied = ${method ? 'values.copy()' : 'array.copy(id=values)'}
plot(copied.get(0).value, "InitialLeft")
plot(copied.get(1).value, "InitialMiddle")
plot(copied.get(2).value, "InitialRight")
plot(copied.get(3).value, "InitialDuplicate")
selected = copied.get(1)
selected.value := 23
plot(values.get(1).value, "OriginalShared")
plot(values.get(3).value, "DuplicateShared")
copied.set(0, Cell.new(31))
values.set(2, Cell.new(41))
plot(values.get(0).value, "OriginalLeftUnaffected")
plot(copied.get(2).value, "CopiedRightUnaffected")
values.clear()
middle.value := 53
right.value := 61
plot(values.size(), "OriginalSize")
plot(copied.size(), "CopiedSize")
plot(copied.get(0).value, "RetainedReplacement")
plot(copied.get(1).value, "RetainedMiddle")
plot(copied.get(2).value, "RetainedRight")
plot(copied.get(3).value, "RetainedDuplicate")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { InitialLeft: 3, InitialMiddle: 7, InitialRight: 11, InitialDuplicate: 7, OriginalShared: 23, DuplicateShared: 23, OriginalLeftUnaffected: 3, CopiedRightUnaffected: 11, OriginalSize: 0, CopiedSize: 4, RetainedReplacement: 31, RetainedMiddle: 53, RetainedRight: 61, RetainedDuplicate: 53 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
