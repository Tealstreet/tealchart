import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('string matrix reshape preserves all cells and alias-visible shape', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const values = ['Az', '', 'a', 'Z', 'B', 'first'];
      const result = runCompatScript(`//@version=${version}
indicator("String reshape grid")
m = matrix.new<string>(2, 3, "")
${values.map((v, i) => `m.set(${Math.floor(i / 3)}, ${i % 3}, ${JSON.stringify(v)})`).join('\n')}
alias = m
${method ? 'alias.reshape(3, 2)' : 'matrix.reshape(id=alias, columns=2, rows=3)'}
${values.map((v, i) => `plot(m.get(${Math.floor(i / 2)}, ${i % 2}) == ${JSON.stringify(v)} ? 1 : 0, "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")
${method ? 'alias.reshape(2, 3)' : 'matrix.reshape(id=alias, rows=2, columns=3)'}
${values.map((v, i) => `plot(m.get(${Math.floor(i / 3)}, ${i % 3}) == ${JSON.stringify(v)} ? 1 : 0, "Restored${i}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 6; i++) for (const prefix of ['Cell', 'Restored']) expect(getPlot(result, `${prefix}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
