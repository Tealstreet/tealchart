import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#clearing-a-map
describe('Clearing UDT map slots preserves retained objects', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const call = method ? 'values.clear()' : 'map.clear(id=values)';
      const result = runCompatScript(`//@version=6
indicator("Clear object map")
type Cell
    int value
first = Cell.new(11)
second = Cell.new(23)
values = map.new<string, Cell>()
values.put("a", first)
values.put("b", second)
retained = values.get("b")
snapshot = values.copy()
${call}
plot(values.size(), "Empty")
plot(values.contains("a") ? 1 : 0, "Absent")
plot(snapshot.size(), "SnapshotSize")
retained.value := 31
plot(second.value, "External")
plot(snapshot.get("b").value, "SnapshotShared")
values.put("b", Cell.new(41))
plot(values.get("b").value, "Fresh")
plot(snapshot.get("b").value, "Old")
plot(snapshot.get("a").value, "First")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { Empty: 0, Absent: 0, SnapshotSize: 2, External: 31, SnapshotShared: 31, Fresh: 41, Old: 31, First: 11 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
