import type { ExecutionResult } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: Pine v6 reference entries, retrieved 2026-10-03.
// Native v3 scalar-07 supersedes the identical-remerge expectation.
// Other expectations use the published descriptions and remarks.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const bars = compatibilityBars.slice(0, 1);

function run(body: string): ExecutionResult {
  return runCompatScript(`//@version=6\nindicator("Drawing reference", overlay=true)\n${body}`, { bars });
}

function plotValues(result: ExecutionResult, title: string, values: number[]): void {
  expect(result.errors).toEqual([]);
  expect(getPlot(result, title).values).toEqual(values);
}

function table(result: ExecutionResult) {
  expect(result.errors).toEqual([]);
  expect(result.drawings).toHaveLength(1);
  const drawing = result.drawings?.[0];
  if (drawing?.type !== 'table') throw new Error('Expected the table drawing');
  return drawing;
}

const families = [
  { family: 'line', constructor: 'line.new(4, -7, 1, 13)', allEntry: 184, deleteEntry: 898 },
  { family: 'label', constructor: 'label.new(4, -7, "oldest")', allEntry: 183, deleteEntry: 927 },
  { family: 'box', constructor: 'box.new(4, 13, 1, -7)', allEntry: 186, deleteEntry: 859 },
  {
    family: 'table',
    constructor: 'table.new(x == 4 ? position.top_left : x == 1 ? position.bottom_left : position.top_right, 2, 3)',
    allEntry: 187,
    deleteEntry: 1023,
  },
  {
    family: 'polyline',
    constructor: 'polyline.new(array.from(chart.point.from_index(4, -7), chart.point.from_index(1, 13)))',
    allEntry: 203,
    deleteEntry: 1176,
  },
  {
    family: 'linefill',
    constructor: 'linefill.new(line.new(4, -7, 1, 13), line.new(4, 19, 1, -3), color.red)',
    allEntry: 185,
    deleteEntry: 906,
  },
] as const;

describe('Official Pine v6 drawing reference', () => {
  for (const { family, constructor, allEntry, deleteEntry } of families) {
    // .all description/remarks and .delete description. Three distinct IDs,
    // nonmonotonic coordinates, and a middle deletion reject coordinate sorting,
    // newest-first order, stale deleted IDs, and deleting the wrong object.
    it(`${family}.all oldest-first and selective deletion [${allEntry}, ${deleteEntry}]`, () => {
      const result = run(`x = 4
a = ${constructor.replaceAll('(4,', '(x,')}
x := 1
b = ${constructor.replaceAll('(4,', '(x,')}
x := 3
c = ${constructor.replaceAll('(4,', '(x,')}
plot(array.size(${family}.all), title="before")
plot(${['line', 'label'].includes(family) ? `array.get(${family}.all, 0) == a and array.get(${family}.all, 1) == b and array.get(${family}.all, 2) == c` : `array.indexof(${family}.all, a) == 0 and array.indexof(${family}.all, b) == 1 and array.indexof(${family}.all, c) == 2`} ? 1 : 0, title="order")
${family}.delete(b)
plot(array.size(${family}.all), title="after")
plot(${['line', 'label'].includes(family) ? `array.get(${family}.all, 0) == a and array.get(${family}.all, 1) == c` : `array.indexof(${family}.all, a) == 0 and array.indexof(${family}.all, c) == 1`} ? 1 : 0, title="survivors")
${family}.delete(a)
${family}.delete(c)
plot(array.size(${family}.all), title="empty")`);
      plotValues(result, 'before', [3]);
      plotValues(result, 'order', [1]);
      plotValues(result, 'after', [2]);
      plotValues(result, 'survivors', [1]);
      plotValues(result, 'empty', [0]);
    });
  }

  // table.delete does not document repeat deletion; do not infer that rule.
  for (const { family, constructor, deleteEntry } of families.filter(({ family }) => family !== 'table')) {
    it(`${family}.delete tolerates an already deleted ID [${deleteEntry}]`, () => {
      const result = run(`a = ${constructor}
b = ${constructor}
${family}.delete(a)
${family}.delete(a)
plot(array.size(${family}.all), title="count")
plot(${['line', 'label'].includes(family) ? `array.get(${family}.all, 0) == b` : `array.indexof(${family}.all, b) == 0`} ? 1 : 0, title="survivor")`);
      plotValues(result, 'count', [1]);
      plotValues(result, 'survivor', [1]);
    });
  }

  // #fun_line.get_price, entry 903 remarks: extrapolate as extend.both.
  // Descending x, negative y, an interior x, and x on both sides reject clamps,
  // endpoint selection, absolute slope, and implementations honoring extend.
  it.each(['none', 'left', 'right', 'both'])('line.get_price extrapolates with extend.%s [903]', (extend) => {
    const result = run(`l = line.new(4, -7, 1, 11, extend=extend.${extend})
plot(line.get_price(l, -2), title="left")
plot(line.get_price(l, 2), title="inside")
plot(line.get_price(l, 7), title="right")`);
    plotValues(result, 'left', [29]);
    plotValues(result, 'inside', [5]);
    plotValues(result, 'right', [-25]);
  });

  // #fun_line.copy [883], #fun_label.copy [904], #fun_box.copy [856].
  // Mutate both the original and clone differently: aliasing, blank clones,
  // lost styles, and mutations targeting the original all become visible.
  it('line.copy keeps coordinates and style independently [883]', () => {
    const result = run(`a = line.new(4, -7, 1, 13, color=color.red, style=line.style_dashed, width=3)
b = line.copy(a)
line.set_xy1(a, 8, -19)
line.set_xy2(b, 2, 23)
plot(line.get_x1(a), title="ax")
plot(line.get_y1(a), title="ay")
plot(line.get_x1(b), title="bx")
plot(line.get_y1(b), title="by")
plot(line.get_y2(a), title="endA")
plot(line.get_y2(b), title="endB")`);
    for (const [title, value] of Object.entries({ ax: 8, ay: -19, bx: 4, by: -7, endA: 13, endB: 23 })) {
      plotValues(result, title, [value]);
    }
    expect(result.drawings).toHaveLength(2);
    expect(result.drawings?.map((d) => d.type === 'line' && [d.color, d.style, d.width])).toEqual([
      ['#F23645', 'dashed', 3],
      ['#F23645', 'dashed', 3],
    ]);
  });

  it('label.copy keeps text and coordinates independently [904]', () => {
    const result = run(`a = label.new(4, -7, "original", tooltip="keep", color=color.red)
b = label.copy(a)
label.set_xy(a, 8, -19)
label.set_text(a, "changed")
label.set_y(b, 23)
plot(label.get_x(b), title="x")
plot(label.get_y(b), title="y")
plot(label.get_y(a), title="originalY")
plot(label.get_text(a) == "changed" and label.get_text(b) == "original" ? 1 : 0, title="text")`);
    plotValues(result, 'x', [4]);
    plotValues(result, 'y', [23]);
    plotValues(result, 'originalY', [-19]);
    plotValues(result, 'text', [1]);
    expect(result.drawings).toHaveLength(2);
    expect(result.drawings?.map((d) => d.type === 'label' && [d.color, d.tooltip])).toEqual([
      ['#F23645', 'keep'],
      ['#F23645', 'keep'],
    ]);
  });

  it('box.copy keeps corners and text independently [856]', () => {
    const result = run(`a = box.new(4, 13, 1, -7, text="keep", border_width=3)
b = box.copy(a)
box.set_lefttop(a, 8, 19)
box.set_rightbottom(b, 2, -23)
plot(box.get_left(b), title="left")
plot(box.get_top(b), title="top")
plot(box.get_bottom(a), title="bottomA")
plot(box.get_bottom(b), title="bottomB")`);
    plotValues(result, 'left', [4]);
    plotValues(result, 'top', [13]);
    plotValues(result, 'bottomA', [-7]);
    plotValues(result, 'bottomB', [-23]);
    expect(result.drawings).toHaveLength(2);
    expect(result.drawings?.map((d) => d.type === 'box' && [d.text, d.borderWidth])).toEqual([
      ['keep', 3],
      ['keep', 3],
    ]);
  });

  // #fun_polyline.new [1175] description and defaults. Nonmonotonic points
  // reject sorting/reversal, lost points, accidental closure and wrong defaults.
  it('polyline.new preserves point order and documented defaults [1175]', () => {
    const result =
      run(`points = array.from(chart.point.from_index(4, -7), chart.point.from_index(1, 13), chart.point.from_index(3, -2))
p = polyline.new(points)`);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings?.[0]).toMatchObject({
      type: 'polyline',
      points: [
        { index: 4, price: -7 },
        { index: 1, price: 13 },
        { index: 3, price: -2 },
      ],
      curved: false,
      closed: false,
      xloc: 'bar_index',
      lineColor: '#2962FF',
      fillColor: null,
      lineStyle: 'solid',
      lineWidth: 1,
    });
  });

  // #fun_table.cell [1030] remarks: overwrite ALL previously defined attributes.
  it('table.cell overwrites omitted properties with defaults [1030]', () => {
    const result = run(`t = table.new(position.top_right, 2, 3)
table.cell(t, 1, 2, "old", width=12, height=9, bgcolor=color.blue, text_halign=text.align_left, tooltip="old tip")
table.cell(t, 1, 2, text_color=color.red)`);
    expect(table(result).cells[0]?.tooltip).toBeUndefined();
    expect(table(result).cells).toEqual([
      expect.objectContaining({
        column: 1,
        row: 2,
        text: '',
        width: undefined,
        height: undefined,
        bgcolor: null,
        textColor: '#F23645',
        textHalign: 'center',
      }),
    ]);
  });

  // #fun_table.cell_set_text_color [1037] and table.cell [1030] remarks.
  // A nonzero row/column and unrelated attributes reject transpose and reset.
  it('table.cell_set_text_color preserves unrelated cell properties [1037, 1030]', () => {
    const result = run(`t = table.new(position.top_right, 2, 3)
table.cell(t, 1, 2, "keep", width=12, height=9, bgcolor=#123456, text_halign=text.align_left, tooltip="keep tip")
table.cell_set_text_color(t, 1, 2, color.red)`);
    expect(table(result).cells).toEqual([
      expect.objectContaining({
        column: 1,
        row: 2,
        text: 'keep',
        width: 12,
        height: 9,
        bgcolor: '#123456',
        textColor: '#F23645',
        textHalign: 'left',
        tooltip: 'keep tip',
      }),
    ]);
  });

  // #fun_table.clear [1042] description: inclusive rectangle, not a row or suffix.
  const grid = `t = table.new(position.top_right, 3, 3)
for column = 0 to 2
    for row = 0 to 2
        table.cell(t, column, row, str.tostring(column) + ":" + str.tostring(row))`;

  it('table.clear removes exactly the inclusive rectangle [1042]', () => {
    const drawing = table(run(`${grid}\ntable.clear(t, 1, 0, 2, 1)`));
    expect(drawing.cells.map((cell) => cell.text).sort()).toEqual(['0:0', '0:1', '0:2', '1:2', '2:2']);
  });

  // #fun_table.merge_cells [1111] remarks expressly permit undefined cells.
  it('table.merge_cells permits cells without table.cell definitions [1111]', () => {
    const drawing = table(
      run(`t = table.new(position.top_right, 3, 2)
table.merge_cells(t, 1, 0, 2, 1)`),
    );
    expect(drawing.mergedCells).toEqual([{ startColumn: 1, startRow: 0, endColumn: 2, endRow: 1 }]);
  });

  it('table.merge_cells rejects partially overlapping cells [1111]', () => {
    const result = run(`t = table.new(position.top_right, 3, 2)
table.merge_cells(t, 0, 0, 1, 0)
table.merge_cells(t, 1, 0, 2, 1)
plot(99, title="unreachable")`);
    expect(result.errors).toHaveLength(1);
    expect(result.plots).toEqual([]);
  });

  // Open defects use executable expected failures; repaired cases use ordinary
  // tests. Every case was proven red, then green under documented behavior.
  const referenceCases = [
    {
      name: 'line.get_price refuses time-based coordinates',
      openDefect: 'line-get-price-time-xloc-refusal',
      citation: `${reference}#fun_line.get_price`,
      entry: 903,
      source:
        'l = line.new(time, -7, time + 60000, 13, xloc=xloc.bar_time)\nplot(line.get_price(l, 0), title="unreachable")',
      verify: (result: ExecutionResult) => {
        expect(result.errors).toHaveLength(1);
        expect(result.plots).toEqual([]);
      },
    },
    ...(['a', 'b'] as const).map((parent) => ({
      name: `linefill is deleted when parent ${parent} is deleted`,
      openDefect: 'linefill-parent-delete-cascade',
      citation: `${reference}#fun_linefill.new`,
      entry: 905,
      // A second independent pair rejects deleting all fills or both parents.
      source: `a = line.new(4, -7, 1, 13)
b = line.new(4, 19, 1, -3)
f = linefill.new(a, b, color.red)
other = linefill.new(line.new(4, 21, 1, 2), line.new(4, 31, 1, 8), color.blue)
line.delete(${parent})
plot(array.size(linefill.all), title="count")
plot(array.indexof(linefill.all, other) == 0 ? 1 : 0, title="survivor")
plot(array.size(line.all), title="lines")`,
      verify: (result: ExecutionResult) => {
        plotValues(result, 'count', [1]);
        plotValues(result, 'survivor', [1]);
        plotValues(result, 'lines', [3]);
      },
    })),
    {
      name: 'table.clear omitted bounds remove only the specified cell',
      openDefect: 'table-clear-default-bounds',
      citation: `${reference}#fun_table.clear`,
      entry: 1042,
      source: `${grid}\ntable.clear(t, 1, 1)`,
      verify: (result: ExecutionResult) => {
        expect(
          table(result)
            .cells.map((cell) => cell.text)
            .sort(),
        ).toEqual(['0:0', '0:1', '0:2', '1:0', '1:2', '2:0', '2:1', '2:2']);
      },
    },
    {
      name: 'table.clear defaults each omitted bound independently',
      openDefect: 'table-clear-default-bounds',
      citation: `${reference}#fun_table.clear`,
      entry: 1042,
      source: `${grid}\ntable.clear(t, 1, 1, end_row=2)`,
      verify: (result: ExecutionResult) => {
        expect(
          table(result)
            .cells.map((cell) => cell.text)
            .sort(),
        ).toEqual(['0:0', '0:1', '0:2', '1:0', '2:0', '2:1', '2:2']);
      },
    },
    {
      name: 'table.merge_cells accepts the native identical repeated merge',
      openDefect: 'table-remerge-native-acceptance',
      citation: `${reference}#fun_table.merge_cells`,
      entry: 1111,
      source: `t = table.new(position.top_right, 3, 2)
table.merge_cells(t, 0, 0, 1, 0)
table.merge_cells(t, 0, 0, 1, 0)
plot(99, title="unreachable")`,
      verify: (result: ExecutionResult) => {
        expect(result.errors).toEqual([]);
        expect(result.plots[0]!.values.every((value) => value === 99)).toBe(true);
      },
    },
    {
      name: 'table.cell binds positional tooltip before font and formatting',
      openDefect: 'table-cell-positional-tooltip-order',
      citation: `${reference}#fun_table.cell`,
      entry: 1030,
      source: `t = table.new(position.top_right, 2, 3)
table.cell(t, 1, 2, "keep", 12, 9, color.red, text.align_left, text.align_top, size.small, #123456, "tip", font.family_monospace, text.format_bold)`,
      verify: (result: ExecutionResult) => {
        expect(table(result).cells).toEqual([
          expect.objectContaining({
            column: 1,
            row: 2,
            text: 'keep',
            width: 12,
            height: 9,
            textColor: '#F23645',
            textHalign: 'left',
            textValign: 'top',
            textSize: 'small',
            bgcolor: '#123456',
            tooltip: 'tip',
            textFontFamily: 'monospace',
            textFormatting: 'bold',
          }),
        ]);
      },
    },
  ];

  for (const test of referenceCases) {
    const metadata = { ownerLane: 'runtime/strategy', reason: 'open-defect', ...test } as const;
    it(`reference ${metadata.openDefect}: ${metadata.name} [${metadata.entry}] ${metadata.citation}`, () => {
      metadata.verify(run(metadata.source));
    });
  }
});
