import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Ledger1431/1433, functions[584]/methods[165]: row indexing starts at zero.
// The literal expected grid follows exchanging row0 and row2, preserving row1.
// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.swap_rows
describe('matrix.swap_rows zero-based namespace and receiver calls', () => {
  it.each(['namespace', 'receiver'] as const)('%s swaps the first and last row and preserves a self-swap', (form) => {
    const swap = (first: number, second: number) =>
      form === 'namespace' ? `matrix.swap_rows(m, ${first}, ${second})` : `m.swap_rows(${first}, ${second})`;
    const source = `//@version=6
indicator("Row indexing")
m = matrix.new<int>(3, 2, 0)
matrix.set(m,0,0,17)
matrix.set(m,0,1,-8)
matrix.set(m,1,0,43)
matrix.set(m,1,1,5)
matrix.set(m,2,0,29)
matrix.set(m,2,1,-31)
${swap(0, 2)}
${[0, 1, 2].flatMap((row) => [0, 1].map((column) => `plot(matrix.get(m,${row},${column}),title="R${row}C${column}")`)).join('\n')}
${swap(2, 2)}
plot(matrix.get(m,0,0),title="Self first")
plot(matrix.get(m,1,0),title="Self middle")
plot(matrix.get(m,2,0),title="Self last")
plot(matrix.rows(m),title="Rows")
plot(matrix.columns(m),title="Columns")
`;
    const result = runCompatScript(source, { bars: compatibilityBars.slice(0, 1) });
    expect(result.errors).toEqual([]);
    const expected = {
      R0C0: 29,
      R0C1: -31,
      R1C0: 43,
      R1C1: 5,
      R2C0: 17,
      R2C1: -8,
      'Self first': 29,
      'Self middle': 43,
      'Self last': 17,
      Rows: 3,
      Columns: 2,
    };
    for (const [title, value] of Object.entries(expected))
      expect(getPlot(result, title).values, title).toEqual([value]);
  });
});
