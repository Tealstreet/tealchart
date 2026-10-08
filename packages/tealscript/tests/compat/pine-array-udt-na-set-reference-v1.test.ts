import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.set
describe('Missing UDT array slot replacement preserves other references', () => {
  for (const method of [false, true]) for (const negative of [false, true]) {
    it(`method=${method} negative=${negative}`, () => {
      const index = negative ? '-2' : '1';
      const result = runCompatScript(`//@version=6
indicator("Missing UDT array slot")
type Cell
    int value
shared = Cell.new(7)
a = array.new<Cell>(3,shared)
retained = a.get(1)
${method ? `a.set(index=${index},value=na)` : `array.set(value=na,index=${index},id=a)`}
retained.value := 13
plot(na(a.get(1)) ? 1 : 0,"Missing")
plot(a.get(0).value,"Left")
plot(a.get(2).value,"Right")
plot(retained.value,"Retained")
replacement = Cell.new(29)
${method ? `a.set(index=${index},value=replacement)` : `array.set(value=replacement,index=${index},id=a)`}
replacement.value := 31
plot(a.get(1).value,"Replacement")
plot(a.size(),"Size")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Missing:1,Left:13,Right:13,Retained:13,Replacement:31,Size:3})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
