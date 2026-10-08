import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix missing fill preserves every surrounding border cell', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const original = [17, -8, 43, 5, 29, -31, 71, -19, 97, 11, -23, 13, 37, -41, 47, 53];
      const call = receiver ? 'alias.fill(float(na), 1, 3, 1, 3)' :
        'matrix.fill(to_column=3, value=float(na), id=alias, from_row=1, to_row=3, from_column=1)';
      const result = runCompatScript(`//@version=${version}
indicator("Interior missing fill")
m = matrix.new<float>(4, 4, 0)
${original.map((value, i) => `matrix.set(m, ${Math.floor(i / 4)}, ${i % 4}, ${value})`).join('\n')}
alias = m
${call}
${original.map((_, i) => `plot(matrix.get(m, ${Math.floor(i / 4)}, ${i % 4}), "Cell${i}")`).join('\n')}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      original.forEach((value, i) => {
        const row = Math.floor(i / 4);
        const column = i % 4;
        const expected = row >= 1 && row < 3 && column >= 1 && column < 3 ? null : value;
        expect(getPlot(result, `Cell${i}`).values).toEqual([expected, expected, expected]);
      });
      for (const title of ['Rows', 'Columns']) expect(getPlot(result, title).values).toEqual([4, 4, 4]);
    });
  }
});
