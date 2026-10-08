import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Reference: https://www.tradingview.com/pine-script-reference/v6/, functions[546]/[554].
// Repeated calls check cell attributes; the production TS-loader benchmark proves the timing change.
describe('table cell argument binding performance', () => {
  it('preserves mixed cell arguments across repeated updates', () => {
    const bars = Array.from({ length: 500 }, (_, index) => ({
      ...compatibilityBars[0],
      time: compatibilityBars[0].time + index * 120_000,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("Table argument performance")
var id = table.new(position.top_right, 1, 1)
for iteration = 0 to 1999
    table.cell(id, 0, 0, "updated", text_color=#123456, bgcolor=#ABCDEF, text_size=size.small, tooltip="tooltip")
plot(close, "price")
`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'price').values).toEqual(bars.map((bar) => bar.close));
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({
      type: 'table',
      cells: [
        {
          column: 0,
          row: 0,
          text: 'updated',
          textColor: '#123456',
          bgcolor: '#ABCDEF',
          textSize: 'small',
          tooltip: 'tooltip',
        },
      ],
    });
  });

  it('clears prior text and attributes when the replacement omits them', () => {
    const result = runCompatScript(`//@version=6
indicator("Table replacement controls")
var id = table.new(position.top_right, 2, 1)
table.cell(id, 0, 0, "before", bgcolor=#ABCDEF, tooltip="before")
table.cell(id, 0, 0, text_color=#123456)
table.cell(text="named", table_id=id, row=0, column=1, tooltip="second", text_color=#FF00AA)
plot(bar_index, "index")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'index').values).toEqual(compatibilityBars.map((_, index) => index));
    expect(result.drawings).toHaveLength(1);
    const table = result.drawings[0];
    expect(table.type).toBe('table');
    if (table.type !== 'table') throw new Error('Missing table');
    expect(table.cells).toHaveLength(2);
    expect(table.cells[0]).toMatchObject({ column: 0, row: 0, text: '', textColor: '#123456', bgcolor: null });
    expect(table.cells[0]).not.toHaveProperty('tooltip');
    expect(table.cells[1]).toMatchObject({ column: 1, row: 0, text: 'named', textColor: '#FF00AA', tooltip: 'second' });
  });
});
