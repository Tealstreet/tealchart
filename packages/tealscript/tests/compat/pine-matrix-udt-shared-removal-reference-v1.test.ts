import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/
describe('removed matrix axes retain references shared with the remaining axis', () => {
  for (const column of [false, true]) for (const receiver of [false, true]) {
    it(`${column ? 'column' : 'row'} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const member = column ? 'remove_col' : 'remove_row';
      const call = receiver ? `m.${member}(0)` : `matrix.${member}(m, 0)`;
      const retained = column ? 'm.get(1, 0)' : 'm.get(0, 1)';
      const result = runCompatScript(`//@version=6
indicator("Shared axis removal")
type Cell
    int value
shared = Cell.new(7)
m = matrix.new<Cell>(2, 2)
m.set(0, 0, shared)
m.set(0, 1, Cell.new(11))
m.set(1, 0, Cell.new(13))
m.set(1, 1, shared)
removed = ${call}
plot(removed.get(0).value, "Removed first")
plot(removed.get(1).value, "Removed second")
plot(m.get(0, 0).value, "Remaining first")
firstRemoved = removed.get(0)
firstRemoved.value := 17
plot(${retained}.value, "Retained shared")
plot(shared.value, "External")
removed.set(0, Cell.new(100))
plot(removed.get(0).value, "Replacement")
plot(${retained}.value, "Independent slot")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ 'Removed first': 7, 'Removed second': column ? 13 : 11,
        'Remaining first': column ? 11 : 13, 'Retained shared': 17, External: 17, Replacement: 100,
        'Independent slot': 17, Rows: column ? 2 : 1, Columns: column ? 1 : 2 })) {
        expect(getPlot(result, title).values, title).toEqual([value]);
      }
    });
  }
});
