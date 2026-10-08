import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.pop
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.shift
describe('End removal returns original array UDT objects', () => {
  for (const operation of ['pop', 'shift']) {
    for (const method of [false, true]) {
      it(`${operation}, method=${method}`, () => {
        const result = runCompatScript(`//@version=6
indicator("Removed array object")
type Cell
    int value
first = Cell.new(3)
middle = Cell.new(7)
last = Cell.new(11)
values = array.from(first, middle, last)
alias = values
snapshot = values.copy()
removed = ${method ? `values.${operation}()` : `array.${operation}(id=values)`}
removed.value := 71
plot(${operation === 'pop' ? 'last' : 'first'}.value, "Original")
plot(snapshot.get(${operation === 'pop' ? 2 : 0}).value, "Snapshot")
plot(alias.size(), "Size")
plot(values.get(0).value, "Remaining0")
plot(values.get(1).value, "Remaining1")
values.set(0, Cell.new(99))
plot(removed.value, "Retained")
plot(alias.get(0).value, "Replacement")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        const expected = { Original: 71, Snapshot: 71, Size: 2, Remaining0: operation === 'pop' ? 3 : 7, Remaining1: operation === 'pop' ? 7 : 11, Retained: 71, Replacement: 99 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
