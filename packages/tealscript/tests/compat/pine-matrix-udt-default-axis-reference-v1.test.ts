import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_row
// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_col
describe('Omitted matrix insertion arrays retain missing UDT slots', () => {
  for (const axis of ['row', 'col']) {
    for (const method of [false, true]) {
      it(`${axis}, method=${method}`, () => {
        const row = axis === 'row';
        const coordinate = row ? '1, 0' : '0, 1';
        const call = method ? `values.add_${axis}(${row ? 'row' : 'column'}=1)` : `matrix.add_${axis}(${row ? 'row' : 'column'}=1, id=values)`;
        const result = runCompatScript(`//@version=6
indicator("Default missing object axis")
type Cell
    int value = 77
original = Cell.new()
values = matrix.new<Cell>(2, 2, original)
${call}
plot(values.rows(), "Rows")
plot(values.columns(), "Columns")
plot(na(values.get(${coordinate})) ? 1 : 0, "FirstMissing")
plot(na(values.get(1, 1)) ? 1 : 0, "SecondMissing")
plot(values.get(${row ? '2, 0' : '0, 2'}).value, "Shifted")
values.set(${coordinate}, Cell.new(88))
plot(values.get(${coordinate}).value, "Replacement")
plot(na(values.get(1, 1)) ? 1 : 0, "OtherStillMissing")
original.value := 23
plot(values.get(0, 0).value, "OriginalShared")
plot(values.get(${row ? '2, 1' : '1, 2'}).value, "ShiftedShared")
plot(values.get(${coordinate}).value, "ReplacementUnaffected")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const expected = { Rows: row ? 3 : 2, Columns: row ? 2 : 3, FirstMissing: 1, SecondMissing: 1, Shifted: 77, Replacement: 88, OtherStillMissing: 1, OriginalShared: 23, ShiftedShared: 23, ReplacementUnaffected: 88 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
