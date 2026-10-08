import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string array searches retain exact values and selected duplicate positions', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} method=${method} slice=${sliced}`, () => {
      const call = (name: string, value: string) => method ? `a.${name}("${value}")` : `array.${name}(id=a, value="${value}")`;
      const queries = [['A', 0, 3], ['a', 2, 2], ['', 1, 4], ['Az', 5, 5], ['AZ', -1, -1], ['outside', -1, -1]] as const;
      const result = runCompatScript(`//@version=${version}
indicator("String search window")
parent = array.from(${sliced ? '"outside", "A", "", "a", "A", "", "Az", "outside"' : '"A", "", "a", "A", "", "Az"'})
a = ${sliced ? 'parent.slice(1, 7)' : 'parent'}
${queries.map(([value], i) => `plot(${call('indexof', value)}, "First${i}")\nplot(${call('lastindexof', value)}, "Last${i}")\nplot(${call('includes', value)} ? 1 : 0, "Has${i}")`).join('\n')}
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      queries.forEach(([, first, last], i) => {
        expect(getPlot(result, `First${i}`).values).toEqual([first, first, first]);
        expect(getPlot(result, `Last${i}`).values).toEqual([last, last, last]);
        expect(getPlot(result, `Has${i}`).values).toEqual(first < 0 ? [0, 0, 0] : [1, 1, 1]);
      });
      expect(getPlot(result, 'Size').values).toEqual([6, 6, 6]);
    });
  }
});
