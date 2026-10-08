import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('asymmetric missing matrix fill distinguishes row and column bounds', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const values = Array.from({ length: 20 }, (_, i) => i % 2 ? -i - 7 : i + 17);
      const result = runCompatScript(`//@version=${version}
indicator("Asymmetric missing fill")
m = matrix.new<float>(4, 5, 0)
${values.map((value, i) => `matrix.set(m, ${Math.floor(i / 5)}, ${i % 5}, ${value}.0)`).join('\n')}
${receiver ? 'm.fill(na, 1, 3, 2, 4)' : 'matrix.fill(to_column=4, value=na, from_row=1, id=m, to_row=3, from_column=2)'}
${values.map((_, i) => `plot(matrix.get(m, ${Math.floor(i / 5)}, ${i % 5}), "Cell${i}")`).join('\n')}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      values.forEach((value, i) => {
        const row = Math.floor(i / 5), column = i % 5;
        const expected = row >= 1 && row < 3 && column >= 2 && column < 4 ? null : value;
        expect(getPlot(result, `Cell${i}`).values).toEqual([expected, expected, expected]);
      });
      expect(getPlot(result, 'Rows').values).toEqual([4, 4, 4]);
      expect(getPlot(result, 'Columns').values).toEqual([5, 5, 5]);
    });
  }
});
