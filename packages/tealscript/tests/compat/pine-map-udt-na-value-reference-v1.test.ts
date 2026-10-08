import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_map.put
// map.contains concerns keys, independently of a stored missing value.
describe('UDT map missing values retain their keys', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const put = method ? 'values.put("a", na)' : 'map.put(value=na, key="a", id=values)';
      const result = runCompatScript(`//@version=6
indicator("Missing map value")
type Cell
    int value
original = Cell.new(23)
values = map.new<string, Cell>()
values.put("a", original)
values.put("b", Cell.new(31))
previous = ${put}
plot(values.size(), "Size")
plot(values.contains("a") ? 1 : 0, "Present")
plot(na(values.get("a")) ? 1 : 0, "StoredMissing")
plot(values.contains("absent") ? 1 : 0, "Absent")
plot(previous.value, "Previous")
previous.value := 41
plot(original.value, "SharedPrevious")
keys = values.keys()
plot(keys.get(0) == "a" and keys.get(1) == "b" ? 1 : 0, "Order")
removed = values.remove("a")
plot(na(removed) ? 1 : 0, "RemovedMissing")
plot(values.contains("a") ? 1 : 0, "AfterRemove")
plot(values.size(), "AfterSize")
values.put("a", Cell.new(53))
plot(previous.value, "Retained")
plot(values.get("a").value, "Replacement")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { Size: 2, Present: 1, StoredMissing: 1, Absent: 0, Previous: 23, SharedPrevious: 41, Order: 1, RemovedMissing: 1, AfterRemove: 0, AfterSize: 1, Retained: 41, Replacement: 53 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
