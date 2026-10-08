import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/loops/#for-in-loops
describe('UDT array iteration separates local rebinding from field mutation', () => {
  for (const indexed of [false,true]) {
    it(`indexed=${indexed}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT array iteration binding")
type Cell
    int value
shared = Cell.new(7)
a = array.new<Cell>(2,shared)
int sum = 0
for ${indexed ? '[index,item]' : 'item'} in a
    item.value += 10
    sum += item.value
    item := Cell.new(100)
    item.value := 200
plot(sum,"Sum")
plot(shared.value,"Shared")
plot(a.get(0).value,"First")
plot(a.get(1).value,"Second")
plot(a.size(),"Size")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Sum:44,Shared:27,First:27,Second:27,Size:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
