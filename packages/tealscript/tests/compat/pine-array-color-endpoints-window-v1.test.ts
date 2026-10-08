import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('color array endpoint reads follow selected window mutations', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const slice of [false, true]) {
    it(`v${version} receiver=${receiver} slice=${slice}`, () => {
      const call = (name: string) => receiver ? `s.${name}()` : `array.${name}(s)`;
      const result = runCompatScript(`//@version=${version}
indicator("Color endpoints")
a = ${slice ? 'array.from(color.orange, color.red, color.green, color.blue, color.yellow)' : 'array.from(color.red, color.green, color.blue)'}
s = ${slice ? 'a.slice(1, 4)' : 'a'}
plot(${call('first')} == color.red ? 1 : 0, "First")
plot(${call('last')} == color.blue ? 1 : 0, "Last")
s.set(0, color.aqua)
s.set(2, color.fuchsia)
plot(${call('first')} == color.aqua ? 1 : 0, "ChangedFirst")
plot(${call('last')} == color.fuchsia ? 1 : 0, "ChangedLast")
s.shift()
s.pop()
plot(${call('first')} == color.green ? 1 : 0, "SingletonFirst")
plot(${call('last')} == color.green ? 1 : 0, "SingletonLast")
plot(s.size(), "Size")
${slice ? 'plot(a.get(0) == color.orange and a.get(2) == color.yellow ? 1 : 0, "Guards")' : 'plot(1, "Guards")'}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['First', 'Last', 'ChangedFirst', 'ChangedLast', 'SingletonFirst', 'SingletonLast', 'Size', 'Guards']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    });
  }
});
