import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix axis exchanges move missing cells without replacing their values', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const rows of [false, true]) {
    it(`v${version} method=${method} rows=${rows}`, () => {
      const source = [17, null, -8, 43, 5, 29, 71, -31, null, 11, 53, -47];
      const expected = Array.from({ length: 12 }, (_, i) => {
        const row = Math.floor(i / 4);
        const column = i % 4;
        const r = rows ? row === 0 ? 2 : row === 2 ? 0 : row : row;
        const c = rows ? column : column === 0 ? 3 : column === 3 ? 0 : column;
        return source[r * 4 + c];
      });
      const call = rows ? method ? 'm.swap_rows(0, 2)' : 'matrix.swap_rows(id=m, row2=2, row1=0)' : method ? 'm.swap_columns(0, 3)' : 'matrix.swap_columns(id=m, column2=3, column1=0)';
      const result = runCompatScript(`//@version=${version}
indicator("Missing axis exchanges")
m = matrix.new<float>(3, 4, 0)
${source.map((v, i) => `m.set(${Math.floor(i / 4)}, ${i % 4}, ${v === null ? 'na' : v})`).join('\n')}
${call}
${expected.map((_, i) => `plot(m.get(${Math.floor(i / 4)}, ${i % 4}), "Cell${i}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([4, 4, 4]);
    });
  }
});
