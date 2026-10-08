import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('UDT copies keep independent mixed value fields', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'static'}`, () => {
      const source = `//@version=${version}
indicator("Copied value fields")
type Item
    int count
    float amount
    bool enabled
    string title
    color tint
original = Item.new(17, -2.5, true, "B", color.red)
copied = ${receiver ? 'original.copy()' : 'Item.copy(original)'}
plot(copied.count == 17 and copied.amount == -2.5 and copied.enabled and copied.title == "B" and copied.tint == color.red ? 1 : 0, "Initial")
copied.count := -8
copied.amount := 3.25
copied.enabled := false
copied.title := "Az"
copied.tint := color.blue
plot(original.count == 17 and original.amount == -2.5 and original.enabled and original.title == "B" and original.tint == color.red ? 1 : 0, "Original")
original.count := 43
original.amount := -4.75
original.enabled := false
original.title := "A"
original.tint := color.green
plot(copied.count == -8 and copied.amount == 3.25 and not copied.enabled and copied.title == "Az" and copied.tint == color.blue ? 1 : 0, "Copied")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Initial', 'Original', 'Copied']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    });
  }
});
