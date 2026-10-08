import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const setup = (name: string, rows: number, columns: number, values: number[]) => `${name} = matrix.new<int>(${rows}, ${columns}, 0)
${values.map((value, index) => `${name}.set(${Math.floor(index / columns)}, ${index % columns}, ${value})`).join('\n')}`;

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.mult
// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.kron
describe('rectangular numeric product grids', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const member of ['mult', 'kron']) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${member}`, () => {
      const multiply = member === 'mult';
      const rows = 2;
      const columns = multiply ? 2 : 4;
      const a = multiply ? setup('a', 2, 3, [2, -1, 3, 4, 0, -2]) : setup('a', 1, 2, [2, -3]);
      const b = multiply ? setup('b', 3, 2, [1, 5, -3, 2, 4, -1]) : setup('b', 2, 2, [1, 4, -2, 5]);
      const expected = multiply ? [17, 5, -4, 22] : [2, 8, -3, -12, -4, 10, 6, -15];
      const call = receiver ? `a.${member}(b)` : `matrix.${member}(id2=b, id1=a)`;
      const result = runCompatScript(`//@version=${version}
indicator("Rectangular product grids")
${a}
${b}
c = ${call}
${expected.map((_, index) => `plot(c.get(${Math.floor(index / columns)}, ${index % columns}), "Cell${index}")`).join('\n')}
plot(c.rows(), "Rows")
plot(c.columns(), "Columns")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expected.forEach((value, index) => expect(getPlot(result, `Cell${index}`).values).toEqual([value, value]));
      expect(getPlot(result, 'Rows').values).toEqual([rows, rows]);
      expect(getPlot(result, 'Columns').values).toEqual([columns, columns]);
    });
  }
});
