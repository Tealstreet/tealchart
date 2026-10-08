import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.concat
describe('Self-concatenated UDT matrices preserve references and independent slots', () => {
  for (const receiver of [false,true]) {
    it(`receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Self UDT matrix concat")
type Cell
    int value
first = Cell.new(7)
second = Cell.new(13)
m = matrix.new<Cell>(1,2,first)
m.set(0,1,second)
joined = ${receiver ? 'm.concat(m)' : 'matrix.concat(id2=m,id1=m)'}
ref = joined.get(1,0)
ref.value := 17
joined.set(1,0,Cell.new(100))
plot(m.get(0,0).value,"OriginalFirst")
plot(m.get(0,1).value,"OriginalSecond")
plot(m.get(1,0).value,"AppendedFirst")
plot(m.get(1,1).value,"AppendedSecond")
plot(first.value,"External")
plot(m.rows(),"Rows")
plot(m.columns(),"Columns")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({OriginalFirst:17,OriginalSecond:13,AppendedFirst:100,AppendedSecond:13,External:17,Rows:2,Columns:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
