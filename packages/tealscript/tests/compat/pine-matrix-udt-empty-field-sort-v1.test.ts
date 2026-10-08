import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#sorting-matrices-of-user-defined-types
describe('matrix selected empty string fields obey missing placement and retain objects', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) for (const namedField of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'} ${namedField ? 'field name' : 'field index'}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const field = namedField ? '"key"' : '1';
      const call = receiver ? `m.sort(0, ${order}, ${field})` : `matrix.sort(m, 0, ${order}, ${field})`;
      const tags = descending ? [10, 30, 20] : [20, 30, 10];
      const emptyRow = descending ? 0 : 2;
      const result = runCompatScript(`//@version=6
indicator("Matrix empty string field order")
type Cell
    int tag
    string key
first = Cell.new(30, "B")
second = Cell.new(10, "")
third = Cell.new(20, "A")
m = matrix.new<Cell>(3, 2)
m.set(0, 0, first)
m.set(1, 0, second)
m.set(2, 0, third)
m.set(0, 1, Cell.new(130, "ignored"))
m.set(1, 1, Cell.new(110, "ignored"))
m.set(2, 1, Cell.new(120, "ignored"))
${call}
${tags.map((_, row) => `plot(m.get(${row}, 0).tag, "Key${row}")\nplot(m.get(${row}, 1).tag, "Companion${row}")`).join('\n')}
second.tag := 77
plot(m.get(${emptyRow}, 0).tag, "Shared empty object")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      tags.forEach((tag, row) => {
        expect(getPlot(result, `Key${row}`).values).toEqual([tag, tag]);
        expect(getPlot(result, `Companion${row}`).values).toEqual([tag + 100, tag + 100]);
      });
      expect(getPlot(result, 'Shared empty object').values).toEqual([77, 77]);
    });
  }
});
