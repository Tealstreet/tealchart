import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#sorting
describe('array string sorting distinguishes proper prefixes from string length', () => {
  for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const call = receiver ? `a.sort(${order})` : `array.sort(id=a, order=${order})`;
      const expected = descending ? ['B', 'Az', 'A'] : ['A', 'Az', 'B'];
      const result = runCompatScript(`//@version=6
indicator("String prefix order")
a = array.from("B", "Az", "A")
alias = a
${call}
${expected.map((value, index) => `plot(alias.get(${index}) == "${value}" ? 1 : 0, "Slot${index}")`).join('\n')}
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const title of ['Slot0', 'Slot1', 'Slot2']) expect(getPlot(result, title).values, title).toEqual([1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([3, 3]);
    });
  }
});
