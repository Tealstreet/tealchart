import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#copying-a-map
describe('Map UDT copies separate pairs while retaining object references', () => {
  for (const receiver of [false,true]) {
    it(`receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Map UDT shallow copy")
type Cell
    int value
shared = Cell.new(7)
m = map.new<string,Cell>()
m.put("z",shared)
m.put("a",shared)
copied = ${receiver ? 'm.copy()' : 'map.copy(id = m)'}
ref = copied.get("z")
ref.value := 17
copied.remove("z")
copied.put("z",Cell.new(100))
originalKeys = m.keys()
copiedKeys = copied.keys()
plot(m.get("z").value,"OriginalValue")
plot(copied.get("a").value,"SharedValue")
plot(shared.value,"ExternalValue")
plot(copied.get("z").value,"NewValue")
plot(originalKeys.get(0) == "z" and originalKeys.get(1) == "a" ? 1 : 0,"OriginalOrder")
plot(copiedKeys.get(0) == "a" and copiedKeys.get(1) == "z" ? 1 : 0,"CopiedOrder")
m.clear()
plot(copied.size(),"CopySurvives")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({OriginalValue:17,SharedValue:17,ExternalValue:17,NewValue:100,OriginalOrder:1,CopiedOrder:1,CopySurvives:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
