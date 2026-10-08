import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.concat
describe('Matrix UDT concat preserves identity with empty-row operands', () => {
  for (const emptyLeft of [false,true]) for (const receiver of [false,true]) {
    it(`emptyLeft=${emptyLeft} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=6
indicator("UDT empty matrix concat")
type Cell
    int value
shared = Cell.new(7)
a = matrix.new<Cell>(1,2,shared)
b = matrix.new<Cell>(1,2,shared)
${emptyLeft ? 'a' : 'b'}.remove_row(0)
joined = ${receiver ? 'a.concat(b)' : 'matrix.concat(id2=b,id1=a)'}
ref = joined.get(0,0)
ref.value := 17
joined.set(0,0,Cell.new(100))
plot(a.get(0,0).value,"DestinationSlot")
plot(a.get(0,1).value,"SharedSlot")
plot(shared.value,"External")
plot(${emptyLeft ? 'b.get(0,0).value' : 'b.rows()'},"Source")
plot(a.rows(),"Rows")
plot(a.columns(),"Columns")
plot(b.rows(),"SourceRows")
plot(b.columns(),"SourceColumns")`, { bars: compatibilityBars.slice(0,1) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,value] of Object.entries({DestinationSlot:100,SharedSlot:17,External:17,Source:emptyLeft ? 17 : 0,Rows:1,Columns:2,SourceRows:emptyLeft ? 1 : 0,SourceColumns:2})) expect(getPlot(result,title).values,title).toEqual([value]);
    });
  }
});
