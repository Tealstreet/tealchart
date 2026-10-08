import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#inspecting-keys-and-values
describe('Map keys are independent ordered snapshots', () => {
  for (const method of [false, true]) {
    it(`method=${method}`, () => {
      const read = method ? 'values.keys()' : 'map.keys(id=values)';
      const result = runCompatScript(`//@version=6
indicator("Map key snapshot")
type Cell
    int value
values = map.new<string, Cell>()
values.put("z", Cell.new(11))
values.put("a", Cell.new(23))
values.put("m", Cell.new(31))
old = ${read}
old.set(0, "changed")
old.remove(1)
old.push("extra")
plot(values.contains("z") ? 1 : 0, "OriginalKey")
plot(values.contains("a") ? 1 : 0, "RemovedArrayKey")
plot(values.contains("extra") ? 1 : 0, "ExtraAbsent")
values.remove("a")
values.put("a", Cell.new(41))
fresh = ${read}
plot(fresh.get(0) == "z" and fresh.get(1) == "m" and fresh.get(2) == "a" ? 1 : 0, "ReinsertOrder")
plot(old.get(0) == "changed" and old.get(1) == "m" and old.get(2) == "extra" ? 1 : 0, "OldUnchanged")
values.clear()
plot(fresh.size(), "RetainedSize")
plot(fresh.get(0) == "z" and fresh.get(1) == "m" and fresh.get(2) == "a" ? 1 : 0, "AfterClear")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { OriginalKey: 1, RemovedArrayKey: 1, ExtraAbsent: 0, ReinsertOrder: 1, OldUnchanged: 1, RetainedSize: 3, AfterClear: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
