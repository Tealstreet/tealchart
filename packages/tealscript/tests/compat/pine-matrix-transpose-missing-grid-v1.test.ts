import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('rectangular transpose preserves missing position and source storage', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Transpose missing grid")
m = matrix.new<float>(3, 2, na)
${[17, null, -8, 43, 5, -31].map((value, i) => value === null ? '' : `matrix.set(m, ${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
t = ${receiver ? 'm.transpose()' : 'matrix.transpose(m)'}
${Array.from({ length: 6 }, (_, i) => `plot(matrix.get(t, ${Math.floor(i / 3)}, ${i % 3}), "Transposed${i}")\nplot(matrix.get(m, ${Math.floor(i / 2)}, ${i % 2}), "Source${i}")`).join('\n')}
matrix.set(t, 1, 0, 29)
matrix.set(m, 2, 0, 71)
plot(matrix.get(m, 0, 1), "SourceMissing")
plot(matrix.get(t, 0, 2), "TargetRetained")
plot(matrix.rows(t), "Rows")
plot(matrix.columns(t), "Columns")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [prefix, values] of [['Transposed', [17, -8, 5, null, 43, -31]], ['Source', [17, null, -8, 43, 5, -31]]] as const) {
        values.forEach((value, i) => expect(getPlot(result, `${prefix}${i}`).values).toEqual([value, value, value]));
      }
      expect(getPlot(result, 'SourceMissing').values).toEqual([null, null, null]);
      expect(getPlot(result, 'TargetRetained').values).toEqual([5, 5, 5]);
      expect(getPlot(result, 'Rows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3, 3]);
    });
  }
});
