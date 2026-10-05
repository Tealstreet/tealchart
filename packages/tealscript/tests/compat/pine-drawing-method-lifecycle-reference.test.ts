import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const run = (source: string) =>
  runCompatScript(`//@version=6\nindicator("Method lifecycle")\n${source}`, { bars: compatibilityBars.slice(0, 1) });
// Authority: Pine v6 delete/copy/get_price/clear/merge function and method entries.
describe('Documented drawing method lifecycle', () => {
  for (const [family, create] of [
    ['line', 'line.new(4, 13, 1, -7)'],
    ['label', 'label.new(4, 13, "keep")'],
    ['box', 'box.new(4, 13, 1, -7)'],
    ['table', 'table.new(position.top_left, 2, 2)'],
    ['polyline', 'polyline.new(array.from(chart.point.from_index(4,13), chart.point.from_index(1,-7)))'],
    ['linefill', 'linefill.new(line.new(4,13,1,-7),line.new(4,19,1,-23),color.red)'],
  ] as const) {
    it(`${family}.delete method deletes only its receiver`, () => {
      const result = run(
        `a = ${create}\nb = ${family === 'table' ? create.replace('position.top_left', 'position.bottom_left') : create}\na.delete()\nplot(array.size(${family}.all), title="count")\nplot(${['line', 'label'].includes(family) ? `array.get(${family}.all, 0) == b` : `array.indexof(${family}.all, b) == 0`} ? 1 : 0, title="survivor")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'count').values).toEqual([1]);
      expect(getPlot(result, 'survivor').values).toEqual([1]);
    });
  }
  for (const [family, create, setter, getter, value] of [
    ['line', 'line.new(4,13,1,-7)', 'set_y1', 'get_y1', 13],
    ['label', 'label.new(4,13,"keep")', 'set_y', 'get_y', 13],
    ['box', 'box.new(4,13,1,-7)', 'set_top', 'get_top', 13],
  ] as const) {
    it(`${family}.copy method creates independent attributes`, () => {
      const result = run(
        `a = ${create}\nb = a.copy()\na.${setter}(-23)\nplot(b.${getter}(), title="copy")\nplot(a.${getter}(), title="source")\nplot(${['line', 'label'].includes(family) ? 'a != b' : 'array.indexof(array.from(a), b) < 0'} ? 1 : 0, title="identity")`,
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'copy').values).toEqual([value]);
      expect(getPlot(result, 'source').values).toEqual([-23]);
      expect(getPlot(result, 'identity').values).toEqual([1]);
    });
  }
  it('line.get_price method extrapolates using coordinates after mutation', () => {
    const result = run(
      'id = line.new(4,13,1,-7)\nplot(id.get_price(7), title="before")\nid.set_y1(23)\nplot(id.get_price(7), title="after")',
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'before').values).toEqual([33]);
    expect(getPlot(result, 'after').values).toEqual([53]);
  });
  it('table.clear method uses an omitted single-cell end and explicit rectangle', () => {
    const result = run(
      'id = table.new(position.top_left,3,3)\nid.cell(0,0,"keep")\nid.cell(1,1,"single")\nid.cell(2,1,"range")\nid.clear(1,1)\nid.clear(2,1,2,2)',
    );
    expect(result.errors).toEqual([]);
    const table = result.drawings![0];
    if (table?.type !== 'table') throw new Error('Expected table');
    expect(table.cells.map(({ column, row, text }) => ({ column, row, text }))).toEqual([
      { column: 0, row: 0, text: 'keep' },
    ]);
  });
  for (const [args, expected] of [
    ['start_column=1,start_row=1', ['keep', 'range']],
    ['start_column=1,start_row=1,end_column=2,end_row=1', ['keep']],
  ] as const) {
    it(`table.clear named method arguments ${args}`, () => {
      const result = run(
        `id = table.new(position.top_left,3,3)\nid.cell(0,0,"keep")\nid.cell(1,1,"single")\nid.cell(2,1,"range")\nid.clear(${args})`,
      );
      expect(result.errors).toEqual([]);
      const table = result.drawings![0];
      if (table?.type !== 'table') throw new Error('Expected table');
      expect(table.cells.map((cell) => cell.text)).toEqual(expected);
    });
  }
  it('table.merge_cells method preserves the start cell attributes', () => {
    const result = run(
      'id = table.new(position.top_left,2,1)\nid.cell(0,0,"start",bgcolor=color.red)\nid.cell(1,0,"covered",bgcolor=color.blue)\nid.merge_cells(0,0,1,0)',
    );
    expect(result.errors).toEqual([]);
    const table = result.drawings![0];
    if (table?.type !== 'table') throw new Error('Expected table');
    expect(table.mergedCells).toEqual([{ startColumn: 0, startRow: 0, endColumn: 1, endRow: 0 }]);
    expect(table.cells[0]).toMatchObject({ text: 'start', bgcolor: '#F23645' });
  });
});
