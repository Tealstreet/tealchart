import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/arrays/#history-referencing
describe('Historical UDT arrays read previous array instances and object fields', () => {
  for (const version of [5,6]) {
    it(`v${version}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("UDT array history")
type Cell
    int value
cell = Cell.new(bar_index)
a = array.from(cell)
float priorValue = na
float historicalObject = na
if bar_index >= 1
    previous = a[1]
    previousCell = cell[1]
    ref = previous.get(0)
    priorValue := ref.value
    historicalObject := previousCell.value
plot(cell.value,"Current")
plot(a.get(0).value,"CurrentSlot")
plot(priorValue,"PreviousObject")
plot(historicalObject,"PreviousReference")
`, { bars: compatibilityBars.slice(0,4) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title,values] of Object.entries({Current:[0,1,2,3],CurrentSlot:[0,1,2,3],PreviousObject:[null,0,1,2],PreviousReference:[null,0,1,2]})) expect(getPlot(result,title).values,title).toEqual(values);
    });
  }
});
