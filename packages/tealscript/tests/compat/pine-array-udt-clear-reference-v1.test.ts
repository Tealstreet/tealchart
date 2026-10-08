import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Clearing an array removes its elements without deleting referenced objects.
// https://www.tradingview.com/pine-script-docs/faq/data-structures/
describe('UDT array clear preserves external objects and independent copies', () => {
  for (const clear of ['items.clear()', 'array.clear(id=items)']) {
    it(clear, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT array clear")
type Cell
    int value
first = Cell.new(17)
second = Cell.new(-8)
items = array.from(first, second)
alias = items
copied = items.copy()
retained = items.get(1)
${clear}
plot(items.size(), "Empty")
plot(alias.size(), "AliasEmpty")
plot(copied.size(), "CopySize")
plot(first.value, "FirstRetained")
plot(second.value, "SecondRetained")
retained.value := 43
plot(copied.get(1).value, "CopyShared")
plot(second.value, "ExternalShared")
items.push(Cell.new(71))
plot(alias.size(), "AliasRefilled")
plot(alias.get(0).value, "NewElement")
plot(copied.get(0).value, "CopyFirst")
plot(copied.size(), "CopyStillTwo")
${clear}
plot(items.size(), "EmptyAgain")
plot(copied.get(1).value, "ObjectSurvivesAgain")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      const expected = { Empty: 0, AliasEmpty: 0, CopySize: 2, FirstRetained: 17, SecondRetained: -8, CopyShared: 43, ExternalShared: 43, AliasRefilled: 1, NewElement: 71, CopyFirst: 17, CopyStillTwo: 2, EmptyAgain: 0, ObjectSurvivesAgain: 43 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
