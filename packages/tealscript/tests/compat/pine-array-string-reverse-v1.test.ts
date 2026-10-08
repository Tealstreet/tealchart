import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string array reversal preserves mixed case and empty-string cells', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const original = ['Az', 'B', '', 'a', 'Z'];
      const call = receiver ? 'a.reverse()' : 'array.reverse(a)';
      const checks = (prefix: string, values: string[]) => values.map((value, i) => `plot(array.get(a, ${i}) == ${JSON.stringify(value)} ? 1 : 0, "${prefix}${i}")`).join('\n');
      const result = runCompatScript(`//@version=${version}
indicator("String reversal values")
a = array.from("Az", "B", "", "a", "Z")
${call}
${checks('Reversed', [...original].reverse())}
plot(array.size(a), "Size")
${call}
${checks('Restored', original)}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const prefix of ['Reversed', 'Restored']) for (let i = 0; i < 5; i++) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
