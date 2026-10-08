import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
describe('UDT copies share matrix referents but retain independent field slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'static'}`, () => {
      const call = receiver ? 'original.copy()' : 'Holder.copy(original)';
      const result = runCompatScript(`//@version=${version}
indicator("Copied matrix field")
type Holder
    matrix<int> data
m = matrix.new<int>(1, 2)
m.set(0, 0, 4)
m.set(0, 1, 8)
original = Holder.new(m)
copied = ${call}
matrix.set(copied.data, 0, 0, -7)
plot(matrix.get(original.data, 0, 0), "Shared original")
plot(m.get(0, 0), "Shared external")
copied.data := matrix.new<int>(1, 2, 9)
matrix.set(original.data, 0, 0, -3)
plot(matrix.get(original.data, 0, 0), "Original")
plot(matrix.get(copied.data, 0, 0), "Copy detached")
plot(matrix.get(original.data, 0, 1), "Original second")
plot(matrix.get(copied.data, 0, 1), "Copy second")
original.data := matrix.new<int>(1, 2, 12)
plot(matrix.get(copied.data, 0, 0), "Copy retained")
plot(m.get(0, 0), "Displaced retained")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ 'Shared original': -7, 'Shared external': -7, Original: -3,
        'Copy detached': 9, 'Original second': 8, 'Copy second': 9, 'Copy retained': 9, 'Displaced retained': -3 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
