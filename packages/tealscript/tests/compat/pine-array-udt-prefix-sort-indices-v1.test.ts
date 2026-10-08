import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#sorting-arrays-of-user-defined-types
describe('UDT sorted indices select string fields while retaining source references', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) for (const namedField of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'} ${namedField ? 'field name' : 'field index'}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const field = namedField ? '"key"' : '1';
      const call = receiver ? `a.sort_indices(${order}, ${field})` : `array.sort_indices(id=a, order=${order}, sort_field=${field})`;
      const expected = descending ? [0, 1, 2] : [2, 1, 0];
      const result = runCompatScript(`//@version=6
indicator("UDT field prefix indices")
type Cell
    int tag
    string key
first = Cell.new(30, "B")
second = Cell.new(10, "Az")
third = Cell.new(20, "A")
a = array.from(first, second, third)
indices = ${call}
${expected.map((_, index) => `plot(indices.get(${index}), "Index${index}")`).join('\n')}
second.tag := 77
plot(a.get(0).tag, "First")
plot(a.get(1).tag, "Second shared")
plot(a.get(2).tag, "Third")
indices.set(0, 99)
plot(a.get(1).tag, "Retained shared")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, index) => expect(getPlot(result, `Index${index}`).values).toEqual([value, value]));
      for (const [title, value] of Object.entries({ First: 30, 'Second shared': 77, Third: 20, 'Retained shared': 77 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
