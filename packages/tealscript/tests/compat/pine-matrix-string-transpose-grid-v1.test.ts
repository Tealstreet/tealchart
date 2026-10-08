import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('rectangular string transpose preserves exact values and independent storage', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const original = ['Az', 'B', '', 'a', 'Z', 'first'];
      const transposed = ['Az', 'a', 'B', 'Z', '', 'first'];
      const checks = (name: string, columns: number, values: string[]) => values.map((value, i) => `plot(matrix.get(${name}, ${Math.floor(i / columns)}, ${i % columns}) == ${JSON.stringify(value)} ? 1 : 0, "${name}${i}")`).join('\n');
      const result = runCompatScript(`//@version=${version}
indicator("String matrix transpose")
m = matrix.new<string>(2, 3)
${original.map((value, i) => `matrix.set(m, ${Math.floor(i / 3)}, ${i % 3}, ${JSON.stringify(value)})`).join('\n')}
n = ${receiver ? 'm.transpose()' : 'matrix.transpose(id=m)'}
${checks('m', 3, original)}
${checks('n', 2, transposed)}
plot(matrix.rows(n), "Rows")
plot(matrix.columns(n), "Columns")
n.set(0, 0, "copy")
plot(m.get(0, 0) == "Az" ? 1 : 0, "OriginalRetained")
m.set(1, 2, "parent")
plot(n.get(2, 1) == "first" ? 1 : 0, "CopyRetained")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const name of ['m', 'n']) for (let i = 0; i < 6; i++) expect(getPlot(result, `${name}${i}`).values).toEqual([1, 1, 1]);
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
      for (const name of ['OriginalRetained', 'CopyRetained']) expect(getPlot(result, name).values).toEqual([1, 1, 1]);
    });
  }
});
