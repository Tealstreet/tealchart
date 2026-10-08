import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('nested string slice copies materialize only selected slots', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Nested string copy")
a = array.from("outside", "guard", "Az", "", "a", "end", "tail")
outer = a.slice(1, 6)
s = outer.slice(1, 4)
c = ${receiver ? 's.copy()' : 'array.copy(id=s)'}
plot(c.get(0) == "Az" ? 1 : 0, "First")
plot(c.get(1) == "" ? 1 : 0, "Empty")
plot(c.get(2) == "a" ? 1 : 0, "Last")
c.set(0, "new")
s.set(2, "source")
c.push("B")
plot(a.get(2) == "Az" ? 1 : 0, "SourceFirst")
plot(a.get(4) == "source" ? 1 : 0, "SourceLast")
plot(c.get(2) == "a" ? 1 : 0, "CopyLast")
plot(c.get(3) == "B" ? 1 : 0, "Pushed")
plot(c.size(), "CopySize")
plot(a.size(), "ParentSize")
plot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['First', 'Empty', 'Last', 'SourceFirst', 'SourceLast', 'CopyLast', 'Pushed']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      for (const [title, n] of [['CopySize', 4], ['ParentSize', 7], ['SliceSize', 3]] as const) expect(getPlot(result, title).values).toEqual([n, n, n]);
    });
  }
});
