import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string slice reversal retains outside slots and restores its full window', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const original = ['outside', 'Az', 'B', '', 'a', 'Z', 'tail'];
      const reversed = ['outside', 'Z', 'a', '', 'B', 'Az', 'tail'];
      const check = (title: string, values: string[]) => values.map((value, i) => `plot(parent.get(${i}) == "${value}" ? 1 : 0, "${title}${i}")`).join('\n');
      const reverse = method ? 'a.reverse()' : 'array.reverse(id=a)';
      const result = runCompatScript(`//@version=${version}
indicator("Reverse string slice")
parent = array.from("outside", "Az", "B", "", "a", "Z", "tail")
a = parent.slice(1, 6)
${reverse}
${check('Reversed', reversed)}
plot(a.size(), "Size")
${reverse}
${check('Restored', original)}
plot(parent.size(), "ParentSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const prefix of ['Reversed', 'Restored']) for (let i = 0; i < 7; i++) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
      expect(getPlot(result, 'ParentSize').values).toEqual([7, 7, 7]);
    });
  }
});
