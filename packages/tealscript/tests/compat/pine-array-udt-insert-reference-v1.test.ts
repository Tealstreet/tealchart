import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.insert
describe('UDT insertion shifts slots and retains the supplied object', () => {
  for (const index of [1, -1]) {
    for (const method of [false, true]) {
      it(`index ${index}, method=${method}`, () => {
        const result = runCompatScript(`//@version=6
indicator("Inserted object")
type Cell
    int value
first = Cell.new(3)
middle = Cell.new(7)
last = Cell.new(11)
incoming = Cell.new(17)
values = array.from(first, middle, last)
alias = values
snapshot = values.copy()
${method ? `values.insert(index=${index}, value=incoming)` : `array.insert(value=incoming, index=${index}, id=values)`}
plot(values.size(), "Size")
plot(values.get(0).value, "Slot0")
plot(values.get(1).value, "Slot1")
plot(values.get(2).value, "Slot2")
plot(values.get(3).value, "Slot3")
selected = values.get(${index === 1 ? 1 : 2})
selected.value := 71
plot(incoming.value, "Original")
incoming.value := 99
plot(selected.value, "Shared")
values.set(${index === 1 ? 1 : 2}, Cell.new(88))
plot(alias.get(${index === 1 ? 1 : 2}).value, "Replacement")
plot(incoming.value, "Retained")
plot(snapshot.size(), "SnapshotSize")
plot(snapshot.get(0).value, "Snapshot0")
plot(snapshot.get(1).value, "Snapshot1")
plot(snapshot.get(2).value, "Snapshot2")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        const slots = index === 1 ? [3, 17, 7, 11] : [3, 7, 17, 11];
        slots.forEach((value, i) => expect(getPlot(result, `Slot${i}`).values).toEqual([value]));
        const expected = { Size: 4, Original: 71, Shared: 99, Replacement: 88, Retained: 99, SnapshotSize: 3, Snapshot0: 3, Snapshot1: 7, Snapshot2: 11 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
