import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('concat appends into a selected destination and returns that same view', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const empty of [false, true]) {
    it(`v${version} method=${method} empty=${empty}`, () => {
      const appended = empty ? [] : ['Az', '', 'a'];
      const expected = ['outside', 'A', 'B', ...appended, 'tail'];
      const result = runCompatScript(`//@version=${version}
indicator("Selected destination concat")
parent = array.from("outside", "A", "B", "tail")
a = parent.slice(1, 3)
b = ${empty ? 'array.new<string>(0)' : 'array.from("Az", "", "a")'}
c = ${method ? 'a.concat(id2=b)' : 'array.concat(id2=b, id1=a)'}
${expected.map((value, i) => `plot(parent.get(${i}) == "${value}" ? 1 : 0, "Parent${i}")`).join('\n')}
plot(a.size(), "LeftSize")
plot(b.size(), "RightSize")
c.set(0, "Z")
plot(a.get(0) == "Z" ? 1 : 0, "SameLeft")
plot(parent.get(1) == "Z" ? 1 : 0, "SameParent")
c.push("X")
plot(a.get(${2 + appended.length}) == "X" ? 1 : 0, "Appended")
plot(parent.get(${4 + appended.length}) == "tail" ? 1 : 0, "Tail")
plot(b.size(), "RightAgain")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < expected.length; i++) expect(getPlot(result, `Parent${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'LeftSize').values).toEqual([2 + appended.length, 2 + appended.length, 2 + appended.length]);
      for (const title of ['RightSize', 'RightAgain']) expect(getPlot(result, title).values).toEqual([appended.length, appended.length, appended.length]);
      for (const title of ['SameLeft', 'SameParent', 'Appended', 'Tail']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    });
  }
});
