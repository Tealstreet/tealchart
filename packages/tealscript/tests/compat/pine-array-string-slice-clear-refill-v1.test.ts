import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('clearing a selected string window preserves borders and supports refill', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const nested of [false, true]) {
    it(`v${version} method=${method} nested=${nested}`, () => {
      const clear = method ? 'a.clear()' : 'array.clear(id=a)';
      const result = runCompatScript(`//@version=${version}
indicator("Clear string window")
parent = array.from("outside", "guard", "Az", "", "a", "tail")
${nested ? 'outer = parent.slice(1, 6)\na = outer.slice(1, 4)' : 'a = parent.slice(2, 5)'}
${clear}
plot(a.size(), "Empty")
plot(parent.size(), "ParentEmpty")
${['outside', 'guard', 'tail'].map((value, i) => `plot(parent.get(${i}) == "${value}" ? 1 : 0, "Border${i}")`).join('\n')}
a.push("B")
a.unshift("Z")
plot(a.size(), "Refilled")
${['outside', 'guard', 'Z', 'B', 'tail'].map((value, i) => `plot(parent.get(${i}) == "${value}" ? 1 : 0, "Parent${i}")`).join('\n')}
plot(a.get(0) == "Z" ? 1 : 0, "First")
plot(a.get(1) == "B" ? 1 : 0, "Last")
${clear}
plot(a.size(), "EmptyAgain")
plot(parent.size(), "ParentAgain")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Empty', 'EmptyAgain']) expect(getPlot(result, title).values).toEqual([0, 0, 0]);
      for (const title of ['ParentEmpty', 'ParentAgain']) expect(getPlot(result, title).values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Refilled').values).toEqual([2, 2, 2]);
      for (const title of ['Border0', 'Border1', 'Border2', 'Parent0', 'Parent1', 'Parent2', 'Parent3', 'Parent4', 'First', 'Last']) expect(getPlot(result, title).values).toEqual([1, 1, 1]);
    });
  }
});
