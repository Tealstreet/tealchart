import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_map.values
// Extracted arrays own their slots; UDT elements retain their reference identity.
describe('Map UDT values have independent extracted slots', () => {
  for (const method of [false, true]) {
    it(`snapshot slot writes, method=${method}`, () => {
      const call = method ? 'source.values()' : 'map.values(id=source)';
      const result = runCompatScript(`//@version=6
indicator("Map values slots")
type Cell
    int value
left = Cell.new(17)
middle = Cell.new(3)
right = Cell.new(11)
source = map.new<string, Cell>()
source.put("zebra", left)
source.put("apple", middle)
source.put("middle", right)
snapshot = ${call}
second = ${call}
snapshot.set(0, Cell.new(88))
removed = snapshot.remove(1)
removed.value := 71
snapshot.unshift(Cell.new(44))
fresh = ${call}
plot(source.size(), "MapSize")
plot(source.get("zebra").value, "OriginalLeft")
plot(source.get("apple").value, "SharedRemoved")
plot(snapshot.get(0).value, "Inserted")
plot(snapshot.get(1).value, "Replaced")
plot(snapshot.get(2).value, "Right")
plot(fresh.get(0).value, "FreshLeft")
plot(fresh.get(1).value, "FreshMiddle")
plot(fresh.get(2).value, "FreshRight")
source.put("middle", Cell.new(99))
source.remove("zebra")
plot(second.size(), "SecondSize")
plot(second.get(0).value, "RetainedLeft")
plot(second.get(1).value, "RetainedMiddle")
plot(second.get(2).value, "RetainedRight")
retained = second.get(2)
retained.value := 53
plot(right.value, "ExternalRight")
plot(source.get("middle").value, "ReplacementUnaffected")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { MapSize: 3, OriginalLeft: 17, SharedRemoved: 71, Inserted: 44, Replaced: 88, Right: 11, FreshLeft: 17, FreshMiddle: 71, FreshRight: 11, SecondSize: 3, RetainedLeft: 17, RetainedMiddle: 71, RetainedRight: 11, ExternalRight: 53, ReplacementUnaffected: 99 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
