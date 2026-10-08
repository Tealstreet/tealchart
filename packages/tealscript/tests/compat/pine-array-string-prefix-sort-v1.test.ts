import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array string sorting distinguishes case length and proper prefixes', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sliced of [false, true]) for (const descending of [false, true]) {
    it(`v${version} receiver=${receiver} sliced=${sliced} descending=${descending}`, () => {
      const expected = ['A', 'Az', 'B', 'Z', 'a'];
      if (descending) expected.reverse();
      const order = descending ? 'order.descending' : 'order.ascending';
      const result = runCompatScript(`//@version=${version}
indicator("String prefix sorting")
${sliced ? 'parent = array.from("outside", "B", "Az", "A", "a", "Z", "excluded")\na = parent.slice(1, 6)' : 'a = array.from("B", "Az", "A", "a", "Z")'}
${receiver ? `a.sort(${order})` : `array.sort(a, ${order})`}
${expected.map((value, i) => `plot(a.get(${i}) == "${value}" ? 1 : 0, "Cell${i}")`).join('\n')}
${sliced ? 'plot(parent.get(0) == "outside" and parent.get(6) == "excluded" ? 1 : 0, "Outside")' : 'plot(a.size(), "Size")'}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < expected.length; i++) expect(getPlot(result, `Cell${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, sliced ? 'Outside' : 'Size').values).toEqual(Array(3).fill(sliced ? 1 : 5));
    });
  }
});
