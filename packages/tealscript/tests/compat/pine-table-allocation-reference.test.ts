import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('table.new reference population and allocation remarks', () => {
  // Ledger visual-output-v1#609/610 (global ranks269/270), functions[546].
  // https://www.tradingview.com/pine-script-reference/v6/#fun_table.new
  // Same-position replacement: Tables manual, deleting-and-replacing-tables.
  it('retains an empty table object until a cell is populated', () => {
    const empty = runCompatScript(`//@version=6
indicator("Empty table")
var t = table.new(position.top_right, 1, 1, bgcolor=color.blue, frame_color=color.red, frame_width=2)
plot(array.size(table.all), "Count")
`);
    const populated = runCompatScript(`//@version=6
indicator("Populated table")
var t = table.new(position.top_right, 1, 1, bgcolor=color.blue, frame_color=color.red, frame_width=2)
if barstate.islast
    table.cell(t, 0, 0, "")
plot(array.size(table.all), "Count")
`);

    for (const result of [empty, populated]) {
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Count').values).toEqual(compatibilityBars.map(() => 1));
      expect(result.drawings).toHaveLength(1);
    }
    expect(empty.drawings[0]).toMatchObject({ type: 'table', cells: [] });
    expect(populated.drawings[0]).toMatchObject({ type: 'table', cells: [{ column: 0, row: 0, text: '' }] });
  });

  it.each([
    { name: 'each bar', declaration: 't = table.new(position.top_right, 1, 1)', counts: [1, 1, 1], born: [2] },
    { name: 'var', declaration: 'var t = table.new(position.top_right, 1, 1)', counts: [1, 1, 1], born: [0] },
    {
      name: 'islast',
      declaration: 'if barstate.islast\n    t = table.new(position.top_right, 1, 1)',
      counts: [0, 0, 1],
      born: [2],
    },
  ])('allocates $name tables on the documented bars', ({ declaration, counts, born }) => {
    const result = runCompatScript(
      `//@version=6
indicator("Table allocation")
${declaration}
plot(array.size(table.all), "Count")
`,
      { bars: compatibilityBars.slice(0, 3) },
    );

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual(counts);
    expect(result.drawings.map((drawing) => drawing.barIndex)).toEqual(born);
    expect(result.drawings.every((drawing) => drawing.type === 'table')).toBe(true);
  });
});
