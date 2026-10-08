import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#sorting
describe('empty strings follow the documented missing-position sorting rule', () => {
  for (const member of ['sort', 'sort_indices']) for (const receiver of [false, true]) {
    for (const descending of [false, true]) {
      it(`${member} ${receiver ? 'receiver' : 'namespace'} ${descending ? 'descending' : 'ascending'}`, () => {
        const order = descending ? 'order.descending' : 'order.ascending';
        const call = receiver ? `a.${member}(${order})` : `array.${member}(id=a, order=${order})`;
        const expected = descending ? ['', 'B', 'A'] : ['A', 'B', ''];
        const indices = descending ? [1, 0, 2] : [2, 0, 1];
        const operation = member === 'sort' ? call : `result = ${call}`;
        const checks = expected.map((value, index) => member === 'sort'
          ? `plot(a.get(${index}) == "${value}" ? 1 : 0, "Slot${index}")`
          : `plot(result.get(${index}), "Slot${index}")`).join('\n');
        const result = runCompatScript(`//@version=6
indicator("Empty string sorting")
a = array.from("B", "", "A")
${operation}
${checks}`, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors).toEqual([]);
        for (let index = 0; index < 3; index++) {
          const value = member === 'sort' ? 1 : indices[index];
          expect(getPlot(result, `Slot${index}`).values).toEqual([value, value]);
        }
      });
    }
  }
});
