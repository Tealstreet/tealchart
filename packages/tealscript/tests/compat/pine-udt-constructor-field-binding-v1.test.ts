import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('UDT constructor positional and reordered named fields agree', () => {
  for (const version of [5, 6]) for (const form of ['positional', 'named', 'mixed']) {
    it(`v${version} ${form}`, () => {
      const args = form === 'positional' ? '17, -2.5, true, "Az", color.blue' :
        form === 'named' ? 'tint=color.blue, title="Az", enabled=true, amount=-2.5, count=17' :
          '17, -2.5, tint=color.blue, title="Az", enabled=true';
      const result = runCompatScript(`//@version=${version}
indicator("Constructor field binding")
type Item
    int count
    float amount
    bool enabled
    string title
    color tint
item = Item.new(${args})
plot(item.count, "Count")
plot(item.amount, "Amount")
plot(item.enabled ? 1 : 0, "Enabled")
plot(item.title == "Az" ? 1 : 0, "Title")
plot(item.tint == color.blue ? 1 : 0, "Tint")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Count: 17, Amount: -2.5, Enabled: 1, Title: 1, Tint: 1 })) {
        expect(getPlot(result, title).values).toEqual([value, value, value]);
      }
    });
  }
});
