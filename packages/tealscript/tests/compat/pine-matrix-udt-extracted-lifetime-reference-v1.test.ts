import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#retrieving
// Extracted arrays have independent slots and shared UDT references.
describe('Extracted UDT axes survive removal of their source axis', () => {
  for (const axis of ['row', 'col']) {
    for (const method of [false, true]) {
      it(`${axis}, method=${method}`, () => {
        const row = axis === 'row';
        const extract = method ? `values.${axis}(1)` : `matrix.${axis}(id=values, ${row ? 'row' : 'column'}=1)`;
        const result = runCompatScript(`//@version=6
indicator("Extracted axis lifetime")
type Cell
    int value
first = Cell.new(11)
second = Cell.new(23)
values = matrix.new<Cell>(2, 2, Cell.new(7))
values.set(${row ? '1, 0' : '0, 1'}, first)
values.set(1, 1, second)
retained = ${extract}
values.remove_${axis}(1)
plot(retained.size(), "Size")
plot(retained.get(0).value, "First")
plot(retained.get(1).value, "Second")
first.value := 31
second.value := 41
plot(retained.get(0).value, "SharedFirst")
plot(retained.get(1).value, "SharedSecond")
retained.set(0, Cell.new(53))
plot(first.value, "OldFirst")
plot(values.get(0, 0).value, "Survivor")
plot(values.rows(), "Rows")
plot(values.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const expected = { Size: 2, First: 11, Second: 23, SharedFirst: 31, SharedSecond: 41, OldFirst: 31, Survivor: 7, Rows: row ? 1 : 2, Columns: row ? 2 : 1 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
