import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('rectangular string matrix reversal preserves exact values across both axes', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const original = ['Az', 'B', '', 'a', 'Z', 'first'];
      const call = receiver ? 'm.reverse()' : 'matrix.reverse(m)';
      const checks = (prefix: string, values: string[]) => values.map((value, i) => `plot(matrix.get(m, ${Math.floor(i / 3)}, ${i % 3}) == ${JSON.stringify(value)} ? 1 : 0, "${prefix}${i}")`).join('\n');
      const result = runCompatScript(`//@version=${version}
indicator("String matrix reversal")
m = matrix.new<string>(2, 3)
${original.map((value, i) => `matrix.set(m, ${Math.floor(i / 3)}, ${i % 3}, ${JSON.stringify(value)})`).join('\n')}
${call}
${checks('Reversed', [...original].reverse())}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")
${call}
${checks('Restored', original)}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const prefix of ['Reversed', 'Restored']) for (let i = 0; i < 6; i++) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});
