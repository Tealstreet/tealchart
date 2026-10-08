import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('explicit UDT defaults yield to only supplied constructor fields', () => {
  for (const version of [5, 6]) for (const form of ['default', 'partial-named', 'partial-positional', 'full-named']) {
    it(`v${version} ${form}`, () => {
      const args = form === 'partial-named' ? 'score=0.0, text=""' : form === 'partial-positional' ? '0' : form === 'full-named' ? 'tint=color.blue, text="Z", enabled=false, score=43.25, count=-31' : '';
      const result = runCompatScript(`//@version=${version}
indicator("Explicit UDT defaults")
type Cell
    int count = 17
    float score = -8.5
    bool enabled = true
    string text = "Az"
    color tint = color.red
c = Cell.new(${args})
plot(c.count, "Count")
plot(c.score, "Score")
plot(c.enabled ? 1 : 0, "Enabled")
plot(c.text == ${form === 'full-named' ? '"Z"' : form === 'partial-named' ? '""' : '"Az"'} ? 1 : 0, "Text")
plot(c.tint == ${form === 'full-named' ? 'color.blue' : 'color.red'} ? 1 : 0, "Tint")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = { Count: form === 'full-named' ? -31 : form === 'partial-positional' ? 0 : 17, Score: form === 'full-named' ? 43.25 : form === 'partial-named' ? 0 : -8.5, Enabled: form === 'full-named' ? 0 : 1, Text: 1, Tint: 1 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
