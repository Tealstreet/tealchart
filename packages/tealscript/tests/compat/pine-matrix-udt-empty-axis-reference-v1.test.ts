import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#inserting
describe('Empty UDT matrices initialize dimensions from supplied axes', () => {
  for (const row of [false, true]) {
    for (const method of [false, true]) {
      it(`rowFirst=${row}, method=${method}`, () => {
        const axis = row ? 'row' : 'col';
        const other = row ? 'col' : 'row';
        const coordinate = row ? '0, 1' : '1, 0';
        const result = runCompatScript(`//@version=6
indicator("Empty UDT matrix axis")
type Cell
    int value
first = Cell.new(11)
second = Cell.new(23)
third = Cell.new(31)
incoming = array.from(first, second)
values = matrix.new<Cell>()
${method ? `values.add_${axis}(0, incoming)` : `matrix.add_${axis}(array_id=incoming, id=values, ${row ? 'row' : 'column'}=0)`}
plot(values.rows(), "InitialRows")
plot(values.columns(), "InitialColumns")
plot(values.get(0, 0).value, "First")
plot(values.get(${coordinate}).value, "Second")
${method ? `values.add_${other}(1, array.from(third))` : `matrix.add_${other}(array_id=array.from(third), id=values, ${row ? 'column' : 'row'}=1)`}
plot(values.get(${row ? '0, 2' : '2, 0'}).value, "ShiftedSecond")
plot(values.get(${coordinate}).value, "InsertedThird")
first.value := 41
third.value := 53
plot(values.get(0, 0).value, "SharedFirst")
plot(values.get(${coordinate}).value, "SharedThird")
incoming.set(1, Cell.new(61))
plot(values.get(${row ? '0, 2' : '2, 0'}).value, "IndependentSlot")
plot(incoming.get(1).value, "IncomingReplacement")
plot(values.rows(), "Rows")
plot(values.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const expected = { InitialRows: row ? 1 : 2, InitialColumns: row ? 2 : 1, First: 11, Second: 23, ShiftedSecond: 23, InsertedThird: 31, SharedFirst: 41, SharedThird: 53, IndependentSlot: 23, IncomingReplacement: 61, Rows: row ? 1 : 3, Columns: row ? 3 : 1 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
