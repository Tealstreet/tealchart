import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('rectangular submatrix retains missing cells and independent storage', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const values = [17, -8, 43, 5, -31, 29, null, -47, 71, 97, -19, 11, 53, null, -23];
      const result = runCompatScript(`//@version=${version}
indicator("Missing submatrix")
m = matrix.new<float>(3, 5, 0)
${values.map((value, i) => `matrix.set(m, ${Math.floor(i / 5)}, ${i % 5}, ${value === null ? 'na' : `${value}.0`})`).join('\n')}
s = ${receiver ? 'm.submatrix(1, 3, 1, 4)' : 'matrix.submatrix(to_column=4, from_row=1, id=m, to_row=3, from_column=1)'}
${Array.from({ length: 6 }, (_, i) => `plot(matrix.get(s, ${Math.floor(i / 3)}, ${i % 3}), "Cell${i}")`).join('\n')}
plot(matrix.rows(s), "Rows")
plot(matrix.columns(s), "Columns")
s.set(0, 0, 83)
plot(na(m.get(1, 1)) ? 1 : 0, "OriginalMissing")
m.set(2, 2, -61)
plot(s.get(1, 1), "CopyRetained")
plot(s.get(0, 0), "CopyChanged")
plot(m.get(2, 2), "OriginalChanged")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [null, -47, 71, 11, 53, null].forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      const expected = { Rows: 2, Columns: 3, OriginalMissing: 1, CopyRetained: 53, CopyChanged: 83, OriginalChanged: -61 };
      for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values).toEqual([value, value, value]);
    });
  }
});
