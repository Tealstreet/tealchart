import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#putting-and-getting-key-value-pairs
describe('Boolean UDT map keys preserve insertion order and reference values', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Boolean UDT keys")
type Cell
    int value
f = Cell.new(7)
t = Cell.new(11)
m = map.new<bool, Cell>()
${method ? `m.put(false,f)
m.put(true,t)` : `map.put(id=m,key=false,value=f)
map.put(value=t,key=true,id=m)`}
keys = m.keys()
values = m.values()
f.value := 13
plot(keys.get(0) ? 1 : 0,"FirstKey")
plot(keys.get(1) ? 1 : 0,"SecondKey")
plot(values.get(0).value,"FirstValue")
plot(m.get(false).value,"FalseValue")
removed = m.remove(false)
removed.value := 17
m.put(false,Cell.new(23))
fresh = m.keys()
plot(fresh.get(0) ? 1 : 0,"FreshFirst")
plot(fresh.get(1) ? 1 : 0,"FreshSecond")
plot(values.get(0).value,"OldSnapshot")
plot(m.get(false).value,"Reinserted")
plot(m.get(true).value,"TrueValue")
plot(m.size(),"Size")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({FirstKey:0,SecondKey:1,FirstValue:13,FalseValue:13,FreshFirst:1,FreshSecond:0,OldSnapshot:17,Reinserted:23,TrueValue:11,Size:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
