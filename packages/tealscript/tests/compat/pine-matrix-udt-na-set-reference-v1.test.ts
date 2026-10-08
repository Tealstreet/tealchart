import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.set
describe('Missing UDT matrix element replacement retains other references', () => {
  for (const method of [false, true]) {
    it(`named matrix set method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Missing UDT matrix element")
type Cell
    int value
shared = Cell.new(7)
m = matrix.new<Cell>(2,2,shared)
retained = m.get(0,1)
${method ? 'm.set(column=1,row=0,value=na)' : 'matrix.set(value=na,column=1,id=m,row=0)'}
retained.value := 13
plot(na(m.get(0,1)) ? 1 : 0,"Missing")
plot(m.get(0,0).value,"Left")
plot(m.get(1,0).value,"BelowLeft")
plot(m.get(1,1).value,"Below")
plot(retained.value,"Retained")
replacement = Cell.new(29)
${method ? 'm.set(column=1,row=0,value=replacement)' : 'matrix.set(value=replacement,column=1,id=m,row=0)'}
replacement.value := 31
plot(m.get(0,1).value,"Replacement")
plot(m.rows(),"Rows")
plot(m.columns(),"Columns")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Missing:1,Left:13,BelowLeft:13,Below:13,Retained:13,Replacement:31,Rows:2,Columns:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
