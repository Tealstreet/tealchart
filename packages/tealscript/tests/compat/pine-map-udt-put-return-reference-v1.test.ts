import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// map.put returns the previous value; replacing an existing key preserves its order.
// https://www.tradingview.com/pine-script-reference/v6/#fun_map.put
describe('UDT map put returns the displaced object without cloning it', () => {
  for (const receiver of [false, true]) {
    it(receiver ? 'receiver named binding' : 'namespace reordered named binding', () => {
      const put = (key: string, value: string) => receiver
        ? `m.put(value=${value}, key="${key}")`
        : `map.put(value=${value}, key="${key}", id=m)`;
      const result = runCompatScript(`//@version=6
indicator("UDT displaced map values")
type Cell
    int value
original = Cell.new(17)
incoming = Cell.new(29)
m = map.new<string, Cell>()
m.put("alpha", original)
m.put("beta", Cell.new(5))
snapshot = m.values()
previous = ${put('alpha', 'incoming')}
plot(previous.value, "PreviousInitial")
previous.value := 99
plot(original.value, "OriginalShared")
plot(snapshot.get(0).value, "SnapshotShared")
plot(m.get("alpha").value, "ReplacementUnchanged")
incoming.value := 31
plot(m.get("alpha").value, "IncomingShared")
plot(previous.value, "PreviousRetained")
added = ${put('gamma', 'Cell.new(71)')}
plot(na(added) ? 1 : 0, "AbsentPrevious")
keys = m.keys()
plot(keys.get(0) == "alpha" ? 1 : 0, "FirstKey")
plot(keys.get(1) == "beta" ? 1 : 0, "SecondKey")
plot(keys.get(2) == "gamma" ? 1 : 0, "ThirdKey")
previousNext = ${put('alpha', 'Cell.new(77)')}
previousNext.value := -37
plot(incoming.value, "SecondDisplacedShared")
plot(m.get("alpha").value, "SecondReplacement")
plot(m.get("beta").value, "OtherPair")
plot(m.size(), "Size")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      const expected = { PreviousInitial: 17, OriginalShared: 99, SnapshotShared: 99, ReplacementUnchanged: 29, IncomingShared: 31, PreviousRetained: 99, AbsentPrevious: 1, FirstKey: 1, SecondKey: 1, ThirdKey: 1, SecondDisplacedShared: -37, SecondReplacement: 77, OtherPair: 5, Size: 3 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
