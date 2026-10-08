import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_map.put_all
describe('UDT map merge retains incoming missing values as pairs', () => {
  for (const method of [false,true]) {
    it(`method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT missing merge")
type Cell
    int value
old = Cell.new(7)
shared = Cell.new(11)
target = map.new<string, Cell>()
source = map.new<string, Cell>()
target.put("z",old)
target.put("a",shared)
source.put("new",na)
source.put("z",na)
${method ? 'target.put_all(id2=source)' : 'map.put_all(id2=source,id=target)'}
keys = target.keys()
plot(target.size(),"Size")
plot(target.contains("z") and target.contains("new") ? 1 : 0,"PairsPresent")
plot(na(target.get("z")) and na(target.get("new")) ? 1 : 0,"ValuesMissing")
plot(keys.get(0) == "z" and keys.get(1) == "a" and keys.get(2) == "new" ? 1 : 0,"Order")
old.value := 13
shared.value := 17
source.put("z",Cell.new(23))
source.clear()
plot(old.value,"RetainedOld")
plot(target.get("a").value,"SharedRetained")
plot(na(target.get("z")) ? 1 : 0,"IndependentPairs")
plot(source.size(),"SourceCleared")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Size:3,PairsPresent:1,ValuesMissing:1,Order:1,RetainedOld:13,SharedRetained:17,IndependentPairs:1,SourceCleared:0})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
