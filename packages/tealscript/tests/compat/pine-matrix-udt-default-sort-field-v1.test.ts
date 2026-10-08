import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('omitted matrix UDT sort_field selects declaration field zero', () => {
  for (const method of [false, true]) for (const descending of [false, true]) for (const explicit of [false, true]) {
    it(`method=${method} descending=${descending} explicit=${explicit}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const fields = explicit ? ', sort_field=0' : '';
      const call = method ? `m.sort(column=1, order=${order}${fields})` : `matrix.sort(id=m, column=1, order=${order}${fields})`;
      const result = runCompatScript(`//@version=6
indicator("Default UDT sort field")
type Cell
    int tag
    int score
m = matrix.new<Cell>(3, 2)
m.set(0, 0, Cell.new(101, 9))
m.set(1, 0, Cell.new(103, 11))
m.set(2, 0, Cell.new(102, 10))
m.set(0, 1, Cell.new(1, 2))
m.set(1, 1, Cell.new(3, -3))
m.set(2, 1, Cell.new(2, 1))
${call}
${Array.from({ length: 3 }, (_, row) => `plot(m.get(${row}, 1).tag, "Key${row}")\nplot(m.get(${row}, 0).tag, "Companion${row}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const keys = descending ? [3, 2, 1] : [1, 2, 3];
      keys.forEach((key, row) => {
        expect(getPlot(result, `Key${row}`).values).toEqual([key, key, key]);
        expect(getPlot(result, `Companion${row}`).values).toEqual([key + 100, key + 100, key + 100]);
      });
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
