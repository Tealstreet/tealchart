import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
// Shallow copies retain chart.point references but own their field slots.
describe('UDT copy retains shared chart.point fields', () => {
  for (const method of [false, true]) {
    it(`independent point field replacement, method=${method}`, () => {
      const result = runCompatScript(`//@version=6
indicator("Copied point field")
type Holder
    chart.point point
    int count
external = chart.point.from_index(3, 7)
original = Holder.new(external, 4)
copied = ${method ? 'original.copy()' : 'Holder.copy(original)'}
copied.count := 9
copied.point.price := 11
plot(original.count, "OriginalCount")
plot(copied.count, "CopiedCount")
plot(original.point.price, "SharedOriginal")
plot(external.price, "SharedExternal")
copied.point := chart.point.from_index(5, 17)
original.point.price := 23
plot(original.point.price, "OriginalAfterReplacement")
plot(copied.point.price, "CopiedAfterReplacement")
plot(original.point.index, "OriginalIndex")
plot(copied.point.index, "CopiedIndex")
original.point := chart.point.from_index(8, 29)
external.price := 31
plot(original.point.price, "OriginalNewPoint")
plot(copied.point.price, "CopiedUnaffected")
plot(external.price, "OldPoint")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      const expected = { OriginalCount: 4, CopiedCount: 9, SharedOriginal: 11, SharedExternal: 11, OriginalAfterReplacement: 23, CopiedAfterReplacement: 17, OriginalIndex: 3, CopiedIndex: 5, OriginalNewPoint: 29, CopiedUnaffected: 17, OldPoint: 31 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
    });
  }
});
