import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#scope-and-history
describe('Historical UDT maps retain previous keys and object field values', () => {
  for (const version of [5, 6]) {
    it(`v${version}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("UDT map history")
type Cell
    int value
cell = Cell.new(bar_index)
m = map.new<int, Cell>()
m.put(bar_index, cell)
float previousValue = na
float previousKey = na
float hasCurrentKey = na
if bar_index >= 1
    previous = m[1]
    ref = previous.get(bar_index - 1)
    previousValue := ref.value
    previousKey := previous.keys().get(0)
    hasCurrentKey := previous.contains(bar_index) ? 1 : 0
plot(m.get(bar_index).value, "Current")
plot(previousValue, "PreviousValue")
plot(previousKey, "PreviousKey")
plot(hasCurrentKey, "HasCurrentKey")
`, { bars: compatibilityBars.slice(0, 4) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title, values] of Object.entries({
        Current: [0, 1, 2, 3],
        PreviousValue: [null, 0, 1, 2],
        PreviousKey: [null, 0, 1, 2],
        HasCurrentKey: [null, 0, 0, 0],
      })) expect(getPlot(result, title).values, title).toEqual(values);
    });
  }
});
