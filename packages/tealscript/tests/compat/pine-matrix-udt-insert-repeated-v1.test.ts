import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#inserting
// UDT elements share object references, while input array slots stay independent.
describe('matrix inserted axes retain repeated UDT references', () => {
  for (const axis of ['row', 'col']) for (const receiver of [false, true]) {
    it(`${axis} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? `m.add_${axis}(1, values)` : `matrix.add_${axis}(m, 1, values)`;
      const first = axis === 'row' ? '1, 0' : '0, 1';
      const last = axis === 'row' ? '1, 1' : '1, 1';
      const result = runCompatScript(`//@version=6
indicator("Inserted repeated object references")
type Cell
    int value
outside = Cell.new(3)
shared = Cell.new(7)
values = array.from(shared, shared)
m = matrix.new<Cell>(2, 2, outside)
${call}
shared.value := 17
plot(m.get(${first}).value, "First inserted")
plot(m.get(${last}).value, "Last inserted")
plot(m.get(0, 0).value, "Outside")
array.set(values, 0, Cell.new(100))
plot(m.get(${first}).value, "Matrix retained")
m.set(${first}, Cell.new(200))
plot(m.get(${first}).value, "Matrix replacement")
plot(m.get(${last}).value, "Other reference")
plot(array.get(values, 0).value, "Input replacement")
plot(array.get(values, 1).value, "Input shared")
plot(shared.value, "External")
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ 'First inserted': 17, 'Last inserted': 17, Outside: 3,
        'Matrix retained': 17, 'Matrix replacement': 200, 'Other reference': 17,
        'Input replacement': 100, 'Input shared': 17, External: 17,
        Rows: axis === 'row' ? 3 : 2, Columns: axis === 'row' ? 2 : 3 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
