import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix nonadjacent row swaps retain the middle row', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = (a: number, b: number) => receiver ? `alias.swap_rows(${a}, ${b})` : `matrix.swap_rows(alias, ${a}, ${b})`;
      const source = `//@version=${version}
indicator("Nonadjacent row swaps")
m = matrix.new<int>(3, 2, 0)
${[17, -8, 43, 5, 29, -31].map((value, i) => `matrix.set(m, ${Math.floor(i / 2)}, ${i % 2}, ${value})`).join('\n')}
alias = m
${call(0, 2)}
${call(1, 1)}
${[29, -31, 43, 5, 17, -8].map((_, i) => `plot(matrix.get(m, ${Math.floor(i / 2)}, ${i % 2}), "Swapped${i}")`).join('\n')}
${call(2, 0)}
${[17, -8, 43, 5, 29, -31].map((_, i) => `plot(matrix.get(m, ${Math.floor(i / 2)}, ${i % 2}), "Restored${i}")`).join('\n')}
plot(matrix.rows(m), "Rows")
plot(matrix.columns(m), "Columns")`;
      const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [prefix, values] of [['Swapped', [29, -31, 43, 5, 17, -8]], ['Restored', [17, -8, 43, 5, 29, -31]]] as const) {
        values.forEach((value, index) => expect(getPlot(result, `${prefix}${index}`).values).toEqual([value, value, value]));
      }
      expect(getPlot(result, 'Rows').values).toEqual([3, 3, 3]);
      expect(getPlot(result, 'Columns').values).toEqual([2, 2, 2]);
    });
  }
});
