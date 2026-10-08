import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.sort
describe('UDT matrix sorting selects a declared field and moves complete rows', () => {
  for (const namespace of [false, true]) for (const field of ['1', '"score"']) {
    for (const descending of [false, true]) {
      it(`${namespace ? 'namespace' : 'receiver'} field ${field} ${descending ? 'descending' : 'ascending'}`, () => {
        const order = descending ? 'order.descending' : 'order.ascending';
        const result = runCompatScript(`//@version=6
indicator("UDT matrix integer sort field")
type Cell
    int tag
    int score
first = Cell.new(1, 2)
second = Cell.new(3, -3)
third = Cell.new(2, 1)
m = matrix.new<Cell>(3, 2)
m.set(0, 0, Cell.new(101, 9))
m.set(1, 0, Cell.new(103, 11))
m.set(2, 0, Cell.new(102, 10))
m.set(0, 1, first)
m.set(1, 1, second)
m.set(2, 1, third)
${namespace ? `matrix.sort(sort_field=${field}, order=${order}, column=1, id=m)` : `m.sort(sort_field=${field}, order=${order}, column=1)`}
plot(m.get(0, 1).tag, "FirstTag")
plot(m.get(1, 1).tag, "MiddleTag")
plot(m.get(2, 1).tag, "LastTag")
plot(m.get(0, 0).tag, "FirstCompanion")
plot(m.get(1, 0).tag, "MiddleCompanion")
plot(m.get(2, 0).tag, "LastCompanion")
first.score := 17
plot(m.get(${descending ? 0 : 2}, 1).score, "SharedField")
m.set(${descending ? 0 : 2}, 1, Cell.new(99, 100))
plot(first.score, "ExternalField")
plot(m.get(${descending ? 0 : 2}, 1).score, "ReplacedSlot")
`, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const tags = descending ? [1, 2, 3] : [3, 2, 1];
        for (const [title, value] of Object.entries({
          FirstTag: tags[0], MiddleTag: tags[1], LastTag: tags[2],
          FirstCompanion: tags[0]! + 100, MiddleCompanion: tags[1]! + 100, LastCompanion: tags[2]! + 100,
          SharedField: 17, ExternalField: 17, ReplacedSlot: 100,
        })) expect(getPlot(result, title).values, title).toEqual([value, value]);
      });
    }
  }
});
