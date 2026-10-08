import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#looping-through-a-map
describe('Map iteration preserves shared UDT values', () => {
  for (const shared of [false,true]) {
    it(`shared entries=${shared}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT map iteration")
type Cell
    int value
first = Cell.new(7)
second = ${shared ? 'first' : 'Cell.new(13)'}
m = map.new<string, Cell>()
m.put("z",first)
m.put("a",second)
int sum = 0
int order = 0
for [key,value] in m
    value.value += 10
    sum += value.value
    order := order*10 + (key == "z" ? 1 : 2)
plot(sum,"Sum")
plot(order,"Order")
plot(first.value,"First")
plot(second.value,"Second")
plot(m.get("z").value,"MapFirst")
plot(m.get("a").value,"MapSecond")
plot(m.size(),"Size")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Sum:shared?44:40,Order:12,First:shared?27:17,Second:shared?27:23,MapFirst:shared?27:17,MapSecond:shared?27:23,Size:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
