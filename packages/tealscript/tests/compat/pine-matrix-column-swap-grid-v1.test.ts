import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.swap_columns
describe('rectangular matrix column swaps preserve the complete numeric grid', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'alias.swap_columns(0, 2)' : 'matrix.swap_columns(id=alias, column2=2, column1=0)';
      const self = receiver ? 'alias.swap_columns(1, 1)' : 'matrix.swap_columns(id=alias, column1=1, column2=1)';
      const values = [17, -8, 43, 5, 29, -31];
      const source = `//@version=${version}
indicator("Column grid exchange")
m = matrix.new<int>(2, 3, 0)
alias = m
${values.map((value, index) => `m.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}
${call}
${self}
${values.map((_, index) => `plot(m.get(${Math.floor(index / 3)}, ${index % 3}), "Cell${index}")`).join('\n')}
plot(m.rows(), "Rows")
plot(m.columns(), "Columns")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      for (const [index, value] of [43, -8, 17, -31, 29, 5].entries()) {
        expect(getPlot(result, `Cell${index}`).values).toEqual([value, value]);
      }
      expect(getPlot(result, 'Rows').values).toEqual([2, 2]);
      expect(getPlot(result, 'Columns').values).toEqual([3, 3]);
    });
  }
});
