import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('UDT copies preserve independent bool string and color fields', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Primitive field copy")
type State
    bool flag = false
    string text = ""
    color tint = color.red
a = State.new()
b = ${receiver ? 'a.copy()' : 'State.copy(a)'}
plot(not b.flag and b.text == "" and b.tint == color.red ? 1 : 0, "Initial")
b.flag := true
b.text := "Az"
b.tint := color.blue
plot(not a.flag and a.text == "" and a.tint == color.red ? 1 : 0, "Source")
a.text := "B"
a.tint := color.green
plot(b.flag and b.text == "Az" and b.tint == color.blue ? 1 : 0, "Copy")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Initial', 'Source', 'Copy']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    });
  }
});
