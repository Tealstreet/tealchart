import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Array elements initialize with the supplied value, which is an object reference for UDTs.
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.new<type>
describe('UDT array initialization retains the supplied object in every slot', () => {
  for (const constructor of ['array.new<Cell>(4, original)', 'array.new<Cell>(initial_value=original, size=4)']) {
    it(constructor, () => {
      const initial = Array.from({ length: 4 }, (_, i) => `plot(m.get(${i}).value, "Initial${i}")`).join('\n');
      const shared = Array.from({ length: 4 }, (_, i) => `plot(m.get(${i}).value, "Shared${i}")`).join('\n');
      const result = runCompatScript(`//@version=6
indicator("UDT initialization")
type Cell
    int value
original = Cell.new(17)
m = ${constructor}
alias = m
independent = array.new<Cell>(4, Cell.new(-8))
${initial}
selected = m.get(3)
selected.value := 99
${shared}
plot(original.value, "OriginalShared")
m.set(1, Cell.new(77))
plot(alias.get(1).value, "Replacement")
plot(m.get(3).value, "OtherRetained")
plot(selected.value, "SelectedRetained")
plot(independent.get(3).value, "Independent")
plot(m.size(), "Size")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      for (let i = 0; i < 4; i++) {
        expect(getPlot(result, `Initial${i}`).values).toEqual([17]);
        expect(getPlot(result, `Shared${i}`).values).toEqual([99]);
      }
      const expected = { OriginalShared: 99, Replacement: 77, OtherRetained: 99, SelectedRetained: 99, Independent: -8, Size: 4 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});

// https://www.tradingview.com/pine-script-docs/language/arrays/#declaring-arrays
describe('UDT array factories repeat the supplied object reference', () => {
  for (const version of [5, 6]) for (const named of [false, true]) {
    it(`v${version} ${named ? 'named' : 'positional'} initial value`, () => {
      const call = named ? 'array.new<Cell>(initial_value=shared, size=3)' : 'array.new<Cell>(3, shared)';
      const result = runCompatScript(`//@version=${version}
indicator("Repeated array initial value")
type Cell
    int value
shared = Cell.new(7)
a = ${call}
plot(a.size(), "Size")
shared.value := 17
plot(a.get(0).value, "First")
plot(a.get(1).value, "Middle")
plot(a.get(2).value, "Last")
a.set(1, Cell.new(100))
plot(a.get(0).value, "Retained first")
plot(a.get(1).value, "Replacement")
plot(a.get(2).value, "Retained last")
plot(shared.value, "External")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Size: 3, First: 17, Middle: 17, Last: 17,
        'Retained first': 17, Replacement: 100, 'Retained last': 17, External: 17 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
