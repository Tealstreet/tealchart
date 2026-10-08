import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.first
// https://www.tradingview.com/pine-script-reference/v6/#fun_array.last
describe('Array endpoint reads retain original UDT references', () => {
  for (const operation of ['first', 'last']) {
    for (const method of [false, true]) {
      it(`${operation}, method=${method}`, () => {
        const first = operation === 'first';
        const call = (receiver: string) => method ? `${receiver}.${operation}()` : `array.${operation}(id=${receiver})`;
        const result = runCompatScript(`//@version=6
indicator("Endpoint objects")
type Cell
    int value
left = Cell.new(3)
middle = Cell.new(7)
right = Cell.new(11)
values = array.from(left, middle, right)
alias = values
snapshot = values.copy()
selected = ${call('values')}
plot(selected.value, "Before")
selected.value := 71
plot(${first ? 'left' : 'right'}.value, "OriginalShared")
plot(snapshot.get(${first ? 0 : 2}).value, "SnapshotShared")
plot(values.size(), "Size")
values.set(${first ? 0 : 2}, Cell.new(88))
plot(${call('alias')}.value, "FreshReplacement")
selected.value := 99
plot(snapshot.get(${first ? 0 : 2}).value, "Retained")
plot(${call('values')}.value, "EndpointUnaffected")
values.${first ? 'unshift' : 'push'}(Cell.new(44))
plot(${call('values')}.value, "FreshInserted")
plot(values.size(), "InsertedSize")
plot(middle.value, "MiddleUnaffected")`, { bars: compatibilityBars.slice(0, 1) });
        expect(result.errors).toEqual([]);
        expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
        expect(result.profile?.swallowedErrors ?? []).toEqual([]);
        const expected = { Before: first ? 3 : 11, OriginalShared: 71, SnapshotShared: 71, Size: 3, FreshReplacement: 88, Retained: 99, EndpointUnaffected: 88, FreshInserted: 44, InsertedSize: 4, MiddleUnaffected: 7 };
        for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
      });
    }
  }
});
