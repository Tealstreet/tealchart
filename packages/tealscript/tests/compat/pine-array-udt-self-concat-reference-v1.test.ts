import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.concat
describe('UDT array self-concat appends one shared-reference sequence', () => {
  for (const namespace of [false, true]) {
    it(namespace ? 'namespace named concat' : 'receiver concat', () => {
      const result = runCompatScript(`//@version=6
indicator("UDT array self concat")
type Cell
    int value
first = Cell.new(7)
second = Cell.new(13)
a = array.from(first, second)
joined = ${namespace ? 'array.concat(id2=a, id1=a)' : 'a.concat(a)'}
plot(a.size(), "Size")
appended = joined.get(2)
appended.value := 17
plot(a.get(0).value, "OriginalShared")
plot(a.get(2).value, "AppendedShared")
joined.set(2, Cell.new(100))
second.value := 31
plot(a.get(0).value, "OriginalSlot")
plot(a.get(1).value, "SecondOriginal")
plot(a.get(2).value, "ReplacedSlot")
plot(a.get(3).value, "SecondAppended")
`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
      for (const [title, value] of Object.entries({
        Size: 4, OriginalShared: 17, AppendedShared: 17,
        OriginalSlot: 17, SecondOriginal: 31, ReplacedSlot: 100, SecondAppended: 31,
      })) expect(getPlot(result, title).values, title).toEqual([value, value, value]);
    });
  }
});
