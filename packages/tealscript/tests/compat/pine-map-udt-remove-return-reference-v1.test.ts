import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';
// https://www.tradingview.com/pine-script-reference/v6/#fun_map.remove
describe('Removed map UDT identity', () => {
  for (const call of ['m.remove("middle")', 'map.remove(key="middle", id=m)']) {
    it(call, () => {
      const result = runCompatScript(`//@version=6
indicator("Removed object")
type Cell
    int value
original = Cell.new(17)
m = map.new<string, Cell>()
m.put("first", Cell.new(3))
m.put("middle", original)
m.put("last", Cell.new(9))
alias = m
snapshot = m.values()
removed = ${call}
removed.value := 71
plot(original.value, "Original")
plot(snapshot.get(1).value, "Snapshot")
plot(na(alias.get("middle")) ? 1 : 0, "Absent")
plot(na(m.remove("middle")) ? 1 : 0, "Missing")
plot(m.size(), "Size")
m.put("middle", Cell.new(88))
original.value := 99
plot(removed.value, "Retained")
plot(alias.get("middle").value, "Replacement")
keys = m.keys()
plot(keys.get(0) == "first" ? 1 : 0, "First")
plot(keys.get(1) == "last" ? 1 : 0, "Second")
plot(keys.get(2) == "middle" ? 1 : 0, "Third")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile?.swallowedErrors ?? []).toEqual([]);
      const expected = { Original: 71, Snapshot: 71, Absent: 1, Missing: 1, Size: 2, Retained: 99, Replacement: 88, First: 1, Second: 1, Third: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
