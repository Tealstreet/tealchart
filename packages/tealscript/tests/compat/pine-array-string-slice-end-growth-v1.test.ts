import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string slice growth inserts at its logical endpoints', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const nested of [false, true]) {
    it(`v${version} receiver=${receiver} nested=${nested}`, () => {
      const parent = ['outside', 'guard', 'Z', 'Az', '', 'a', 'B', 'end', 'tail'];
      const selected = ['Z', 'Az', '', 'a', 'B'];
      const result = runCompatScript(`//@version=${version}
indicator("String slice end growth")
a = array.from("outside", "guard", "Az", "", "a", "end", "tail")
outer = a.slice(1, 6)
s = ${nested ? 'outer.slice(1, 4)' : 'a.slice(2, 5)'}
${receiver ? 's.push("B")' : 'array.push(s, "B")'}
${receiver ? 's.unshift("Z")' : 'array.unshift(s, "Z")'}
${parent.map((v, i) => `plot(a.get(${i}) == "${v}" ? 1 : 0, "Parent${i}")`).join('\n')}
${selected.map((v, i) => `plot(s.get(${i}) == "${v}" ? 1 : 0, "Selected${i}")`).join('\n')}
plot(a.size(), "ParentSize")
plot(s.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 9; i++) expect(getPlot(result, `Parent${i}`).values).toEqual([1, 1, 1]);
      for (let i = 0; i < 5; i++) expect(getPlot(result, `Selected${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'ParentSize').values).toEqual([9, 9, 9]);
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
