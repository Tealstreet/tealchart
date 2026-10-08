import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/matrices/#for-in
describe('Matrix iteration row arrays retain shallow UDT references', () => {
  for (const indexed of [false,true]) {
    it(`indexed=${indexed}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT matrix row iteration")
type Cell
    int value
shared = Cell.new(7)
m = matrix.new<Cell>(2,2,shared)
array<Cell> last = array.new<Cell>()
int sum = 0
for ${indexed ? '[index,row]' : 'row'} in m
    current = row.get(0)
    current.value += 10
    sum += current.value
    row.set(0,Cell.new(100))
    last := row
last.set(1,Cell.new(200))
plot(sum,"Sum")
plot(shared.value,"Shared")
plot(m.get(0,0).value,"FirstMatrix")
plot(m.get(1,0).value,"SecondMatrix")
plot(m.get(1,1).value,"LastMatrix")
plot(last.get(0).value,"LastRowFirst")
plot(last.get(1).value,"LastRowSecond")
plot(m.rows(),"Rows")
plot(m.columns(),"Columns")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({Sum:44,Shared:27,FirstMatrix:27,SecondMatrix:27,LastMatrix:27,LastRowFirst:100,LastRowSecond:200,Rows:2,Columns:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
