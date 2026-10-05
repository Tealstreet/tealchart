import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Native v4 corpus5-table-na-row-v1: OUTCOME=1 throughout; visual.png paints X top-right.
describe('native v5 missing table row', () => {
  it('runs the captured missing-row call and paints its one-cell table', () => {
    const result = runCompatScript(
      `//@version=5
indicator("CORPUS5-TABLE-NA-ROW-V1")
value = table.new(position.top_right, 1, 1)
table.cell(value, 0, int(na), "X")
plot(1, "OUTCOME")`,
      { bars: compatibilityBars.slice(0, 3) },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual([1, 1, 1]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings![0]).toMatchObject({ type: 'table', cells: [{ column: 0, row: 0, text: 'X' }] });
    const invalid = runCompatScript(
      `//@version=5
indicator("Finite row control")
value = table.new(position.top_right, 1, 1)
table.cell(value, 0, 1, "X")
plot(1, "OUTCOME")`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(invalid.errors).toEqual([expect.objectContaining({ message: expect.stringContaining('row 1') })]);
    expect(invalid.plots).toEqual([]);
  });
});
