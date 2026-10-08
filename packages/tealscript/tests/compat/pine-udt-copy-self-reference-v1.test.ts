import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-docs/language/objects/#copying-objects
// https://www.tradingview.com/pine-script-docs/language/type-system/#user-defined-types
describe('shallow copying a self-reference retains the original referent', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'static'}`, () => {
      const call = receiver ? 'original.copy()' : 'Node.copy(original)';
      const result = runCompatScript(`//@version=${version}
indicator("Shallow self-reference copy")
type Node
    int value
    Node next = na
original = Node.new(7)
original.next := original
copied = ${call}
copied.value := 9
plot(original.value, "Original scalar")
plot(copied.value, "Copied scalar")
plot(copied.next.value, "Copied link")
copied.next.value := 17
plot(original.value, "Shared original")
plot(original.next.value, "Original self link")
plot(copied.value, "Copy scalar retained")
copied.next := Node.new(100)
plot(original.next.value, "Original link retained")
plot(copied.next.value, "Copied replacement")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ 'Original scalar': 7, 'Copied scalar': 9, 'Copied link': 7,
        'Shared original': 17, 'Original self link': 17, 'Copy scalar retained': 9,
        'Original link retained': 17, 'Copied replacement': 100 })) {
        expect(getPlot(result, title).values, title).toEqual([value, value]);
      }
    });
  }
});
