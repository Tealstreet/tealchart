import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#removing
// https://www.tradingview.com/pine-script-docs/language/matrices/#inserting
describe('Removing and restoring the last UDT matrix axis', () => {
  for (const axis of ['row','col']) for (const method of [false,true]) {
    it(`${axis} method=${method}`, () => {
      const row = axis === 'row';
      const result = runCompatScript(`//@version=6
indicator("Last UDT axis")
type Cell
    int value
shared = Cell.new(7)
m = matrix.new<Cell>(${row ? '1,2' : '2,1'},shared)
removed = ${method ? `m.remove_${axis}(0)` : `matrix.remove_${axis}(id=m,${row ? 'row' : 'column'}=0)`}
plot(m.rows(),"EmptyRows")
plot(m.columns(),"EmptyColumns")
plot(m.elements_count(),"EmptyCount")
retained = removed.get(0)
retained.value := 13
plot(removed.get(1).value,"SharedRemoved")
${method ? `m.add_${axis}(0,removed)` : `matrix.add_${axis}(id=m,${row ? 'row' : 'column'}=0,array_id=removed)`}
removed.set(0,Cell.new(29))
shared.value := 31
plot(m.get(0,0).value,"FirstRestored")
plot(m.get(${row ? '0,1' : '1,0'}).value,"SecondRestored")
plot(removed.get(0).value,"IndependentRemovedSlot")
plot(m.rows(),"RestoredRows")
plot(m.columns(),"RestoredColumns")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({EmptyRows:row?0:2,EmptyColumns:row?2:0,EmptyCount:0,SharedRemoved:13,FirstRestored:31,SecondRestored:31,IndependentRemovedSlot:29,RestoredRows:row?1:2,RestoredColumns:row?2:1})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
