import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string end removals retain empty slots and logical slice bounds', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const slice of [false, true]) {
    it(`v${version} receiver=${receiver} slice=${slice}`, () => {
      const call = (name: string) => receiver ? `s.${name}()` : `array.${name}(s)`;
      const result = runCompatScript(`//@version=${version}
indicator("String end removals")
a = ${slice ? 'array.from("outside", "Az", "", "a", "", "B", "excluded")' : 'array.from("Az", "", "a", "", "B")'}
s = ${slice ? 'a.slice(1, 6)' : 'a'}
p = ${call('pop')}
f = ${call('shift')}
e = ${call('pop')}
plot(p == "B" ? 1 : 0, "Popped")
plot(f == "Az" ? 1 : 0, "Shifted")
plot(e == "" ? 1 : 0, "EmptyReturned")
plot(s.get(0) == "" ? 1 : 0, "First")
plot(s.get(1) == "a" ? 1 : 0, "Last")
plot(s.size(), "Size")
plot(a.size(), "ParentSize")
${slice ? 'plot(a.get(0) == "outside" and a.get(3) == "excluded" ? 1 : 0, "Guards")' : 'plot(1, "Guards")'}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Popped', 'Shifted', 'EmptyReturned', 'First', 'Last', 'Guards']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'ParentSize').values).toEqual(Array(3).fill(slice ? 4 : 2));
    });
  }
});
