import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_row
// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.add_col
describe('Matrix inserted UDT axes copy slots and retain references', () => {
  for (const axis of ['row', 'col']) {
    for (const method of [false, true]) {
      it(`${axis}, method=${method}`, () => {
        const row = axis === 'row';
        const coordinate = row ? '1, 0' : '0, 1';
        const second = row ? '1, 1' : '1, 1';
        const call = method ? `values.add_${axis}(array_id=incoming, ${row ? 'row' : 'column'}=1)` : `matrix.add_${axis}(array_id=incoming, ${row ? 'row' : 'column'}=1, id=values)`;
        const result = runCompatScript(`//@version=6
indicator("Inserted object axis")
type Cell
    int value
values = matrix.new<Cell>(2, 2)
values.set(0, 0, Cell.new(3))
values.set(0, 1, Cell.new(7))
values.set(1, 0, Cell.new(11))
values.set(1, 1, Cell.new(17))
left = Cell.new(23)
right = Cell.new(29)
incoming = array.from(left, right)
${call}
plot(values.rows(), "Rows")
plot(values.columns(), "Columns")
plot(values.get(${coordinate}).value, "InsertedLeft")
plot(values.get(${second}).value, "InsertedRight")
plot(values.get(${row ? '2, 0' : '0, 2'}).value, "Shifted")
inserted = values.get(${coordinate})
inserted.value := 71
plot(incoming.get(0).value, "ArrayShared")
incoming.set(0, Cell.new(88))
plot(values.get(${coordinate}).value, "MatrixRetained")
values.set(${second}, Cell.new(99))
plot(incoming.get(1).value, "ArrayRetained")
right.value := 53
plot(values.get(${second}).value, "ReplacementUnaffected")
plot(incoming.get(1).value, "ExternalShared")
incoming.push(Cell.new(44))
plot(incoming.size(), "InputSize")
plot(values.elements_count(), "MatrixSize")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const expected = { Rows: row ? 3 : 2, Columns: row ? 2 : 3, InsertedLeft: 23, InsertedRight: 29, Shifted: row ? 11 : 7, ArrayShared: 71, MatrixRetained: 71, ArrayRetained: 29, ReplacementUnaffected: 99, ExternalShared: 53, InputSize: 3, MatrixSize: 6 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
