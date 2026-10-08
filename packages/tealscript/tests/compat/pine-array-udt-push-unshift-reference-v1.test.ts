import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.push
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.unshift
describe('Repeated array endpoint insertion retains supplied UDT identity', () => {
  for (const operation of ['push', 'unshift']) {
    for (const method of [false, true]) {
      it(`${operation}, method=${method}`, () => {
        const position = operation === 'push' ? 2 : 0;
        const call = method ? `values.${operation}(value=incoming)` : `array.${operation}(value=incoming, id=values)`;
        const result = runCompatScript(`//@version=6
indicator("Repeated endpoint insertion")
type Cell
    int value
first = Cell.new(3)
last = Cell.new(7)
incoming = Cell.new(17)
values = array.from(first, last)
alias = values
snapshot = values.copy()
${call}
${call}
plot(values.size(), "Size")
plot(values.get(0).value, "Slot0")
plot(values.get(1).value, "Slot1")
plot(values.get(2).value, "Slot2")
plot(values.get(3).value, "Slot3")
selected = values.get(${position})
selected.value := 71
plot(incoming.value, "Original")
plot(values.get(${position + 1}).value, "DuplicateShared")
incoming.value := 99
values.set(${position}, Cell.new(88))
plot(alias.get(${position}).value, "Replacement")
plot(values.get(${position + 1}).value, "OtherRetained")
plot(selected.value, "DisplacedRetained")
plot(snapshot.size(), "SnapshotSize")
plot(snapshot.get(0).value, "Snapshot0")
plot(snapshot.get(1).value, "Snapshot1")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        const slots = operation === 'push' ? [3, 7, 17, 17] : [17, 17, 3, 7];
        slots.forEach((value, i) => expect(getPlot(result, `Slot${i}`).values).toEqual([value]));
        const expected = { Size: 4, Original: 71, DuplicateShared: 71, Replacement: 88, OtherRetained: 99, DisplacedRetained: 99, SnapshotSize: 2, Snapshot0: 3, Snapshot1: 7 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
