import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#sorting
// Unicode ASCII order: Bee < Zoo < apple; case-fold order differs.
describe('UDT matrix sorting compares lowercase string fields and moves complete rows', () => {
  for (const namespace of [false, true]) for (const field of ['1', '"score"']) {
    for (const descending of [false, true]) {
      it(`${namespace ? 'namespace' : 'receiver'} field ${field} ${descending ? 'descending' : 'ascending'}`, () => {
        const order = descending ? 'order.descending' : 'order.ascending';
        const result = runCompatScript(`//@version=6
indicator("UDT matrix sort field")
type Cell
    int tag
    string score
first = Cell.new(1, "Zoo")
second = Cell.new(3, "apple")
third = Cell.new(2, "Bee")
m = matrix.new<Cell>(3, 2)
m.set(0, 0, Cell.new(101, "ant"))
m.set(1, 0, Cell.new(103, "zoo"))
m.set(2, 0, Cell.new(102, "mid"))
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
first.score := "updated"
plot(m.get(1, 1).score == "updated" ? 17 : 0, "SharedField")
m.set(1, 1, Cell.new(99, "replacement"))
plot(first.score == "updated" ? 17 : 0, "ExternalField")
plot(m.get(1, 1).score == "replacement" ? 100 : 0, "ReplacedSlot")
`, { bars: compatibilityBars.slice(0, 2) });
        expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const tags = descending ? [3, 1, 2] : [2, 1, 3];
        for (const [title, value] of Object.entries({
          FirstTag: tags[0], MiddleTag: tags[1], LastTag: tags[2],
          FirstCompanion: tags[0]! + 100, MiddleCompanion: tags[1]! + 100, LastCompanion: tags[2]! + 100,
          SharedField: 17, ExternalField: 17, ReplacedSlot: 100,
        })) expect(getPlot(result, title).values, title).toEqual([value, value]);
      });
    }
  }
});
