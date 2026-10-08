import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#sorting
describe('UDT arrays use case-sensitive string-field ordering', () => {
  for (const receiver of [false, true]) for (const field of ['1', '"score"']) {
    for (const descending of [false, true]) {
      it(`${receiver ? 'receiver' : 'namespace'} ${field} ${descending ? 'descending' : 'ascending'}`, () => {
        const order = descending ? 'order.descending' : 'order.ascending';
        const call = receiver ? `a.sort(order=${order}, sort_field=${field})` :
          `array.sort(id=a, order=${order}, sort_field=${field})`;
        const tags = descending ? [3, 1, 2] : [2, 1, 3];
        const result = runCompatScript(`//@version=6
indicator("Mixed case UDT arrays")
type Cell
    int tag
    string score
first = Cell.new(1, "Zoo")
a = array.from(first, Cell.new(3, "apple"), Cell.new(2, "Bee"))
${call}
plot(a.get(0).tag, "First")
plot(a.get(1).tag, "Middle")
plot(a.get(2).tag, "Last")
first.score := "updated"
plot(a.get(1).score == "updated" ? 17 : 0, "Shared")
a.set(1, Cell.new(99, "replacement"))
plot(first.score == "updated" ? 17 : 0, "External")
plot(a.get(1).score == "replacement" ? 100 : 0, "Replaced")`, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors).toEqual([]);
        for (const [title, value] of Object.entries({ First: tags[0], Middle: tags[1], Last: tags[2],
          Shared: 17, External: 17, Replaced: 100 })) {
          expect(getPlot(result, title).values, title).toEqual([value, value]);
        }
      });
    }
  }
});
