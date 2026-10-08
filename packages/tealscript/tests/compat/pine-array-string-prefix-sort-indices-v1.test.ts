import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ASCII string sort indices preserve source slots', () => {
  const cells = ['B', 'Az', 'A', 'a', 'Z'];
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const slice of [false, true]) for (const descending of [false, true]) {
    it(`v${version} receiver=${receiver} slice=${slice} descending=${descending}`, () => {
      const expected = descending ? [3, 4, 0, 1, 2] : [2, 1, 0, 4, 3];
      const result = runCompatScript(`//@version=${version}
indicator("String sort indices")
a = ${slice ? 'array.from("outside", "B", "Az", "A", "a", "Z", "excluded")' : 'array.from("B", "Az", "A", "a", "Z")'}
s = ${slice ? 'a.slice(1, 6)' : 'a'}
indices = ${receiver ? `s.sort_indices(order.${descending ? 'descending' : 'ascending'})` : `array.sort_indices(s, order.${descending ? 'descending' : 'ascending'})`}
${expected.map((v, i) => `plot(indices.get(${i}), "Index${i}")`).join('\n')}
${cells.map((v, i) => `plot(s.get(${i}) == "${v}" ? 1 : 0, "Source${i}")`).join('\n')}
plot(indices.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 5; i++) {
        expect(getPlot(result, `Index${i}`).values).toEqual(Array(3).fill(expected[i]));
        expect(getPlot(result, `Source${i}`).values).toEqual([1, 1, 1]);
      }
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
