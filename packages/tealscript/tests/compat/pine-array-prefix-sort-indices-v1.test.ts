import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#sorting
describe('string sort_indices preserves source slots and returns independent indices', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const call = receiver ? `a.sort_indices(${order})` : `array.sort_indices(id=a, order=${order})`;
      const expected = descending ? [0, 1, 2] : [2, 1, 0];
      const result = runCompatScript(`//@version=6
indicator("Independent prefix sort indices")
a = array.from("B", "Az", "A")
indices = ${call}
${expected.map((_, index) => `plot(indices.get(${index}), "Index${index}")`).join('\n')}
indices.set(0, 99)
indices.push(77)
plot(indices.size(), "Result size")
plot(a.size(), "Source size")
plot(a.get(0) == "B" ? 1 : 0, "Source0")
plot(a.get(1) == "Az" ? 1 : 0, "Source1")
plot(a.get(2) == "A" ? 1 : 0, "Source2")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, index) => expect(getPlot(result, `Index${index}`).values).toEqual([value, value]));
      expect(getPlot(result, 'Result size').values).toEqual([4, 4]);
      expect(getPlot(result, 'Source size').values).toEqual([3, 3]);
      for (const title of ['Source0', 'Source1', 'Source2']) expect(getPlot(result, title).values, title).toEqual([1, 1]);
    });
  }
});
