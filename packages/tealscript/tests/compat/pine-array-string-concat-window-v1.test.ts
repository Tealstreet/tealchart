import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string concat appends the selected window including empty values', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} receiver=${receiver} sliced=${sliced}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("String concat window")
a = array.from("B", "")
${sliced ? 'parent = array.from("outside", "Az", "", "a", "excluded")\nb = parent.slice(1, 4)' : 'b = array.from("Az", "", "a")'}
c = ${receiver ? 'a.concat(b)' : 'array.concat(a, b)'}
${['B', '', 'Az', '', 'a'].map((value, i) => `plot(c.get(${i}) == "${value}" ? 1 : 0, "Cell${i}")`).join('\n')}
plot(a.size(), "LeftSize")
plot(b.size(), "RightSize")
c.set(0, "Z")
plot(a.get(0) == "Z" ? 1 : 0, "SameLeft")
c.set(2, "changed")
plot(b.get(0) == "Az" ? 1 : 0, "RightPreserved")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Cell0', 'Cell1', 'Cell2', 'Cell3', 'Cell4', 'SameLeft', 'RightPreserved']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'LeftSize').values).toEqual([5, 5, 5]);
      expect(getPlot(result, 'RightSize').values).toEqual([3, 3, 3]);
    });
  }
});
