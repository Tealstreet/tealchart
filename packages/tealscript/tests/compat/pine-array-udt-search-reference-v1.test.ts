import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.indexof
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.lastindexof
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.includes
describe('Array searches retain UDT reference identity', () => {
  for (const member of ['indexof', 'lastindexof', 'includes']) {
    for (const method of [false, true]) {
      it(`${member}, method=${method}`, () => {
        const call = (value: string) => method ? `values.${member}(value=${value})` : `array.${member}(value=${value}, id=values)`;
        const numeric = (value: string) => member === 'includes' ? `(${call(value)} ? 1 : 0)` : call(value);
        const result = runCompatScript(`//@version=6
indicator("Object search IDs")
type Cell
    int value
target = Cell.new(7)
alias = target
sameFields = Cell.new(7)
other = Cell.new(11)
values = array.from(target, other, target)
plot(${numeric('alias')}, "Before")
plot(${numeric('sameFields')}, "DistinctObject")
target.value := 23
plot(${numeric('alias')}, "AfterFieldWrite")
values.set(0, sameFields)
plot(${numeric('alias')}, "AfterSlotWrite")
plot(${numeric('sameFields')}, "ReplacementFound")
values.remove(2)
plot(${numeric('alias')}, "Absent")
plot(${numeric('sameFields')}, "StillPresent")
values.clear()
plot(${numeric('sameFields')}, "Empty")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile.swallowedErrors ?? []).toEqual([]);
        const missing = member === 'includes' ? 0 : -1;
        const found = member === 'includes' ? 1 : 0;
        const before = member === 'lastindexof' ? 2 : found;
        const expected = { Before: before, DistinctObject: missing, AfterFieldWrite: before, AfterSlotWrite: member === 'includes' ? 1 : 2, ReplacementFound: found, Absent: missing, StillPresent: found, Empty: missing };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
