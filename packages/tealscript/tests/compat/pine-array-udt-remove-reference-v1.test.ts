import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.remove
describe('Plain array removal returns the original UDT', () => {
  for (const index of [1, -2]) {
    for (const method of [false, true]) {
      it(`index=${index}, method=${method}`, () => {
        const result = runCompatScript(`//@version=6
indicator("Remove object")
type Cell
    int value
first = Cell.new(3)
middle = Cell.new(7)
last = Cell.new(11)
values = array.from(first, middle, last)
snapshot = values.copy()
removed = ${method ? `values.remove(${index})` : `array.remove(index=${index}, id=values)`}
plot(removed.value, "Removed")
plot(values.size(), "Size")
plot(values.get(0).value, "First")
plot(values.get(1).value, "Last")
removed.value := 23
plot(middle.value, "Original")
plot(snapshot.get(1).value, "Snapshot")
values.set(1, Cell.new(31))
last.value := 41
plot(snapshot.get(2).value, "OldLast")
plot(values.get(1).value, "Replacement")
values.clear()
plot(removed.value, "AfterClear")
plot(snapshot.size(), "SnapshotSize")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const expected = { Removed: 7, Size: 2, First: 3, Last: 11, Original: 23, Snapshot: 23, OldLast: 41, Replacement: 31, AfterClear: 23, SnapshotSize: 3 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
