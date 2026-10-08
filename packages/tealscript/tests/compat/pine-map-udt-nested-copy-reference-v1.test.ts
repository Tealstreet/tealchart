import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/maps/#shallow-copies
describe('Map copies share UDT nested fields but keep independent pair slots', () => {
  for (const namespace of [false, true]) {
    it(namespace ? 'namespace copy' : 'receiver copy', () => {
      const result = runCompatScript(`//@version=6
indicator("Nested map copy")
type Holder
    array<int> samples
    matrix<int> cells
    map<string, int> keyed
samples = array.from(5)
cells = matrix.new<int>(1, 1, 7)
keyed = map.new<string, int>()
keyed.put("x", 11)
wrapped = Holder.new(samples, cells, keyed)
original = map.new<string, Holder>()
original.put("holder", wrapped)
copied = ${namespace ? 'map.copy(original)' : 'original.copy()'}
selected = copied.get("holder")
selected.samples.set(0, 13)
selected.cells.set(0, 0, 17)
selected.keyed.put("x", 19)
plot(samples.get(0), "SharedArray")
plot(cells.get(0, 0), "SharedMatrix")
plot(keyed.get("x"), "SharedMap")
selected.samples := array.from(29)
selected.cells := matrix.new<int>(1, 1, 31)
replacement = map.new<string, int>()
replacement.put("x", 37)
selected.keyed := replacement
retained = original.get("holder")
plot(retained.samples.get(0), "ReassignedArray")
plot(retained.cells.get(0, 0), "ReassignedMatrix")
plot(retained.keyed.get("x"), "ReassignedMap")
copied.put("holder", Holder.new(array.from(100), matrix.new<int>(1, 1, 100), replacement))
retained = original.get("holder")
plot(retained.samples.get(0), "OriginalSlot")
plot(copied.get("holder").samples.get(0), "CopiedSlot")
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title, value] of Object.entries({
        SharedArray: 13, SharedMatrix: 17, SharedMap: 19,
        ReassignedArray: 29, ReassignedMatrix: 31, ReassignedMap: 37,
        OriginalSlot: 29, CopiedSlot: 100,
      })) expect(getPlot(result, title).values, title).toEqual([value, value, value]);
    });
  }
});
