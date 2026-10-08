import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#removing-key-value-pairs
describe('Removing a shared UDT map value removes only its selected key', () => {
  for (const version of [5, 6]) for (const namespace of [false, true]) {
    it(`v${version} ${namespace ? 'namespace' : 'receiver'}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Shared map removal")
type Cell
    int value
cell = Cell.new(7)
m = map.new<string, Cell>()
m.put("z", cell)
m.put("a", cell)
removed = ${namespace ? 'map.remove(key="z", id=m)' : 'm.remove("z")'}
removed.value := 17
retained = m.get("a")
plot(m.size(), "Size")
plot(m.contains("z") ? 1 : 0, "RemovedKey")
plot(m.contains("a") ? 1 : 0, "RetainedKey")
plot(retained.value, "RetainedField")
plot(cell.value, "ExternalField")
m.put("a", Cell.new(100))
plot(removed.value, "RemovedAfterReplacement")
plot(m.get("a").value, "Replacement")
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title, value] of Object.entries({
        Size: 1, RemovedKey: 0, RetainedKey: 1, RetainedField: 17,
        ExternalField: 17, RemovedAfterReplacement: 17, Replacement: 100,
      })) expect(getPlot(result, title).values, title).toEqual([value, value, value]);
    });
  }
});
