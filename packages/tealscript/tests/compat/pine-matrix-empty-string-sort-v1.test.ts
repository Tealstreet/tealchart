import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#sorting
describe('matrix empty-string sort placement moves complete rows', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const call = receiver ? `m.sort(1, ${order})` : `matrix.sort(m, 1, ${order})`;
      const expected = descending ? ['', 'B', 'A'] : ['A', 'B', ''];
      const companions = descending ? ['second', 'first', 'third'] : ['third', 'first', 'second'];
      const result = runCompatScript(`//@version=6
indicator("Empty string matrix order")
m = matrix.new<string>(3, 2)
m.set(0, 0, "first")
m.set(0, 1, "B")
m.set(1, 0, "second")
m.set(1, 1, "")
m.set(2, 0, "third")
m.set(2, 1, "A")
${call}
${expected.map((value, row) => `plot(m.get(${row}, 1) == "${value}" ? 1 : 0, "Key${row}")`).join('\n')}
${companions.map((value, row) => `plot(m.get(${row}, 0) == "${value}" ? 1 : 0, "Row${row}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      for (const title of ['Key0', 'Key1', 'Key2', 'Row0', 'Row1', 'Row2']) {
        expect(getPlot(result, title).values, title).toEqual([1]);
      }
    });
  }
});
