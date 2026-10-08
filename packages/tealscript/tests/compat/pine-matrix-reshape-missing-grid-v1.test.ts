import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix reshape retains row-major missing cells', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'alias.reshape(2, 3)' : 'matrix.reshape(alias, 2, 3)';
      const back = receiver ? 'alias.reshape(3, 2)' : 'matrix.reshape(alias, 3, 2)';
      const source = `//@version=${version}
indicator("Reshape missing grid")
m = matrix.new<float>(3, 2, na)
${[17, null, -8, 43, 5, -31].map((value, i) => value === null ? '' : `matrix.set(m, ${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
alias = m
${call}
${Array.from({ length: 6 }, (_, i) => `plot(matrix.get(m, ${Math.floor(i / 3)}, ${i % 3}), "Reshaped${i}")`).join('\n')}
plot(matrix.rows(m), "ReshapedRows")
plot(matrix.columns(m), "ReshapedColumns")
${back}
${Array.from({ length: 6 }, (_, i) => `plot(matrix.get(m, ${Math.floor(i / 2)}, ${i % 2}), "Restored${i}")`).join('\n')}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [prefix, values] of [['Reshaped', [17, null, -8, 43, 5, -31]], ['Restored', [17, null, -8, 43, 5, -31]]] as const) {
        values.forEach((value, index) => expect(getPlot(result, `${prefix}${index}`).values).toEqual([value, value, value]));
      }
      expect(getPlot(result, 'ReshapedRows').values).toEqual([2, 2, 2]);
      expect(getPlot(result, 'ReshapedColumns').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
