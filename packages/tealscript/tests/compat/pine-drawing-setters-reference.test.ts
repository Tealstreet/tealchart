import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json (2026-10-03), zero-based entries[]
// offsets below. Each function is published at
// https://www.tradingview.com/pine-script-reference/v6/#fun_<function-name>.
// Setter expectations use its description/parameters and the constructor's
// parameters. Distinct signed coordinates and different initial/updated values
// reject no-ops, wrong endpoints, swapped arguments, and resetting other fields.
const bars = compatibilityBars.slice(0, 1);
const firstTime = 1_700_000_000_000;
const secondTime = 1_700_000_060_000;

const line = {
  source:
    'id = line.new(4, -7, 1, 13, extend=extend.left, color=color.red, style=line.style_dashed, width=3, force_overlay=true)',
  entry: 885,
  fields: {
    type: 'line',
    x1: 4,
    y1: -7,
    x2: 1,
    y2: 13,
    xloc: 'bar_index',
    extend: 'left',
    color: '#F23645',
    style: 'dashed',
    width: 3,
    forceOverlay: true,
  },
};

const label = {
  source:
    'id = label.new(4, -7, "keep", color=color.red, style=label.style_label_up, textcolor=color.white, size=size.normal, textalign=text.align_left, tooltip="keep tip", text_font_family=font.family_default, force_overlay=true, text_formatting=text.format_none)',
  entry: 912,
  fields: {
    type: 'label',
    x: 4,
    y: -7,
    text: 'keep',
    xloc: 'bar_index',
    yloc: 'price',
    color: '#F23645',
    style: 'label_up',
    textColor: '#FFFFFF',
    size: 'normal',
    textAlign: 'left',
    tooltip: 'keep tip',
    textFontFamily: 'default',
    textFormatting: 'none',
    forceOverlay: true,
  },
};

const box = {
  source:
    'id = box.new(4, 13, 1, -7, border_color=color.red, border_width=3, border_style=line.style_dashed, extend=extend.left, bgcolor=#123456, text="keep", text_size=size.normal, text_color=color.white, text_halign=text.align_left, text_valign=text.align_top, text_wrap=text.wrap_none, text_font_family=font.family_default, force_overlay=true, text_formatting=text.format_none)',
  entry: 858,
  fields: {
    type: 'box',
    left: 4,
    top: 13,
    right: 1,
    bottom: -7,
    xloc: 'bar_index',
    borderColor: '#F23645',
    borderWidth: 3,
    borderStyle: 'dashed',
    extend: 'left',
    bgcolor: '#123456',
    text: 'keep',
    textSize: 'normal',
    textColor: '#FFFFFF',
    textHalign: 'left',
    textValign: 'top',
    textWrap: 'none',
    textFontFamily: 'default',
    textFormatting: 'none',
    forceOverlay: true,
  },
};

interface SetterCase {
  name: string;
  entry: number;
  args: string;
  fields: Record<string, string | number>;
}

const lineSetters: SetterCase[] = [
  { name: 'line.set_x1', entry: 887, args: '3', fields: { x1: 3 } },
  { name: 'line.set_y1', entry: 888, args: '-19', fields: { y1: -19 } },
  { name: 'line.set_xy1', entry: 889, args: '3, -19', fields: { x1: 3, y1: -19 } },
  { name: 'line.set_x2', entry: 890, args: '2', fields: { x2: 2 } },
  { name: 'line.set_y2', entry: 891, args: '23', fields: { y2: 23 } },
  { name: 'line.set_xy2', entry: 892, args: '2, 23', fields: { x2: 2, y2: 23 } },
  {
    name: 'line.set_xloc',
    entry: 893,
    args: `${firstTime}, ${secondTime}, xloc.bar_time`,
    fields: { x1: firstTime, x2: secondTime, xloc: 'bar_time' },
  },
  { name: 'line.set_extend', entry: 894, args: 'extend.both', fields: { extend: 'both' } },
  { name: 'line.set_color', entry: 895, args: '#123456', fields: { color: '#123456' } },
  { name: 'line.set_style', entry: 896, args: 'line.style_dotted', fields: { style: 'dotted' } },
  { name: 'line.set_width', entry: 897, args: '5', fields: { width: 5 } },
  {
    name: 'line.set_first_point',
    entry: 1151,
    args: `chart.point.new(${firstTime}, 3, -19)`,
    fields: { x1: 3, y1: -19 },
  },
  {
    name: 'line.set_second_point',
    entry: 1152,
    args: `chart.point.new(${secondTime}, 2, 23)`,
    fields: { x2: 2, y2: 23 },
  },
];

const labelSetters: SetterCase[] = [
  { name: 'label.set_x', entry: 913, args: '3', fields: { x: 3 } },
  { name: 'label.set_y', entry: 914, args: '-19', fields: { y: -19 } },
  { name: 'label.set_xy', entry: 915, args: '3, -19', fields: { x: 3, y: -19 } },
  {
    name: 'label.set_xloc',
    entry: 916,
    args: `${firstTime}, xloc.bar_time`,
    fields: { x: firstTime, xloc: 'bar_time' },
  },
  { name: 'label.set_yloc', entry: 917, args: 'yloc.abovebar', fields: { yloc: 'abovebar' } },
  { name: 'label.set_text', entry: 918, args: '"changed"', fields: { text: 'changed' } },
  { name: 'label.set_text_formatting', entry: 919, args: 'text.format_bold', fields: { textFormatting: 'bold' } },
  {
    name: 'label.set_text_font_family',
    entry: 920,
    args: 'font.family_monospace',
    fields: { textFontFamily: 'monospace' },
  },
  { name: 'label.set_color', entry: 921, args: '#123456', fields: { color: '#123456' } },
  { name: 'label.set_style', entry: 922, args: 'label.style_flag', fields: { style: 'flag' } },
  { name: 'label.set_textcolor', entry: 923, args: 'color.red', fields: { textColor: '#F23645' } },
  { name: 'label.set_size', entry: 924, args: 'size.small', fields: { size: 'small' } },
  { name: 'label.set_textalign', entry: 925, args: 'text.align_right', fields: { textAlign: 'right' } },
  { name: 'label.set_tooltip', entry: 926, args: '"new tip"', fields: { tooltip: 'new tip' } },
  { name: 'label.set_point', entry: 1153, args: `chart.point.new(${firstTime}, 3, -19)`, fields: { x: 3, y: -19 } },
];

const boxSetters: SetterCase[] = [
  { name: 'box.set_left', entry: 864, args: '3', fields: { left: 3 } },
  { name: 'box.set_lefttop', entry: 865, args: '3, 19', fields: { left: 3, top: 19 } },
  { name: 'box.set_right', entry: 866, args: '2', fields: { right: 2 } },
  { name: 'box.set_rightbottom', entry: 867, args: '2, -23', fields: { right: 2, bottom: -23 } },
  { name: 'box.set_top', entry: 868, args: '19', fields: { top: 19 } },
  { name: 'box.set_bottom', entry: 869, args: '-23', fields: { bottom: -23 } },
  { name: 'box.set_border_color', entry: 870, args: 'color.white', fields: { borderColor: '#FFFFFF' } },
  { name: 'box.set_bgcolor', entry: 871, args: 'color.red', fields: { bgcolor: '#F23645' } },
  { name: 'box.set_border_width', entry: 872, args: '5', fields: { borderWidth: 5 } },
  { name: 'box.set_border_style', entry: 873, args: 'line.style_dotted', fields: { borderStyle: 'dotted' } },
  { name: 'box.set_extend', entry: 874, args: 'extend.both', fields: { extend: 'both' } },
  {
    name: 'box.set_xloc',
    entry: 875,
    args: `${firstTime}, ${secondTime}, xloc.bar_time`,
    fields: { left: firstTime, right: secondTime, xloc: 'bar_time' },
  },
  {
    name: 'box.set_text_font_family',
    entry: 876,
    args: 'font.family_monospace',
    fields: { textFontFamily: 'monospace' },
  },
  { name: 'box.set_text_halign', entry: 877, args: 'text.align_right', fields: { textHalign: 'right' } },
  { name: 'box.set_text_valign', entry: 878, args: 'text.align_bottom', fields: { textValign: 'bottom' } },
  { name: 'box.set_text_size', entry: 879, args: 'size.small', fields: { textSize: 'small' } },
  { name: 'box.set_text', entry: 880, args: '"changed"', fields: { text: 'changed' } },
  { name: 'box.set_text_formatting', entry: 881, args: 'text.format_bold', fields: { textFormatting: 'bold' } },
  { name: 'box.set_text_color', entry: 882, args: 'color.red', fields: { textColor: '#F23645' } },
  { name: 'box.set_text_wrap', entry: 884, args: 'text.wrap_auto', fields: { textWrap: 'auto' } },
  {
    name: 'box.set_top_left_point',
    entry: 1154,
    args: `chart.point.new(${firstTime}, 3, 19)`,
    fields: { left: 3, top: 19 },
  },
  {
    name: 'box.set_bottom_right_point',
    entry: 1155,
    args: `chart.point.new(${secondTime}, 2, -23)`,
    fields: { right: 2, bottom: -23 },
  },
];

const table = {
  source:
    'id = table.new(position.top_left, 2, 3, bgcolor=#123456, frame_color=color.red, frame_width=2, border_color=color.white, border_width=3, force_overlay=true)',
  entry: 1022,
  fields: {
    type: 'table',
    position: 'top_left',
    columns: 2,
    rows: 3,
    bgcolor: '#123456',
    frameColor: '#F23645',
    frameWidth: 2,
    borderColor: '#FFFFFF',
    borderWidth: 3,
    forceOverlay: true,
  },
};

const tableSetters: SetterCase[] = [
  { name: 'table.set_position', entry: 1024, args: 'position.bottom_right', fields: { position: 'bottom_right' } },
  { name: 'table.set_bgcolor', entry: 1025, args: 'color.red', fields: { bgcolor: '#F23645' } },
  { name: 'table.set_frame_color', entry: 1026, args: '#123456', fields: { frameColor: '#123456' } },
  { name: 'table.set_border_color', entry: 1027, args: 'color.red', fields: { borderColor: '#F23645' } },
  { name: 'table.set_frame_width', entry: 1028, args: '5', fields: { frameWidth: 5 } },
  { name: 'table.set_border_width', entry: 1029, args: '7', fields: { borderWidth: 7 } },
];

const cellFields = {
  column: 1,
  row: 2,
  text: 'keep',
  width: 12,
  height: 9,
  textColor: '#F23645',
  textHalign: 'left',
  textValign: 'top',
  textSize: 'normal',
  bgcolor: '#123456',
  tooltip: 'keep tip',
  textFontFamily: 'default',
  textFormatting: 'none',
};

const cellSetters: SetterCase[] = [
  { name: 'table.cell_set_text', entry: 1031, args: '"changed"', fields: { text: 'changed' } },
  { name: 'table.cell_set_text_formatting', entry: 1032, args: 'text.format_bold', fields: { textFormatting: 'bold' } },
  {
    name: 'table.cell_set_text_font_family',
    entry: 1033,
    args: 'font.family_monospace',
    fields: { textFontFamily: 'monospace' },
  },
  { name: 'table.cell_set_tooltip', entry: 1034, args: '"new tip"', fields: { tooltip: 'new tip' } },
  { name: 'table.cell_set_width', entry: 1035, args: '17.5', fields: { width: 17.5 } },
  { name: 'table.cell_set_height', entry: 1036, args: '6.5', fields: { height: 6.5 } },
  { name: 'table.cell_set_text_color', entry: 1037, args: 'color.white', fields: { textColor: '#FFFFFF' } },
  { name: 'table.cell_set_text_halign', entry: 1038, args: 'text.align_right', fields: { textHalign: 'right' } },
  { name: 'table.cell_set_text_valign', entry: 1039, args: 'text.align_bottom', fields: { textValign: 'bottom' } },
  { name: 'table.cell_set_text_size', entry: 1040, args: 'size.small', fields: { textSize: 'small' } },
  { name: 'table.cell_set_bgcolor', entry: 1041, args: 'color.red', fields: { bgcolor: '#F23645' } },
];

for (const method of [false, true]) {
  const runDrawingScript = (source: string, options: Parameters<typeof runCompatScript>[1]) => {
    const body = method
      ? source.replace(
          /\b(?:line|label|box|table|linefill)\.(set_\w+|cell(?:_set_\w+)?|get_\w+)\((\w+)(?:,\s*)?/g,
          '$2.$1(',
        )
      : source;
    return runCompatScript(body, options);
  };
  describe(`Official Pine v6 drawing setters ${method ? 'method' : 'function'}`, () => {
    for (const [initial, setters] of [
      [line, lineSetters],
      [label, labelSetters],
      [box, boxSetters],
      [table, tableSetters],
    ] as const) {
      for (const setter of setters) {
        it(`${setter.name} changes only its documented fields [${setter.entry}, ${initial.entry}]`, () => {
          const result = runDrawingScript(
            `//@version=6
indicator("Drawing setters")
${initial.source}
${setter.name}(id, ${setter.args})`,
            { bars },
          );
          expect(result.errors).toEqual([]);
          expect(result.drawings).toHaveLength(1);
          expect(result.drawings?.[0]).toMatchObject({ ...initial.fields, ...setter.fields });
        });
      }
    }

    // [1030] cell constructor, [1031-1041] setters. A control cell in a different
    // column and row rejects index transpose, touching every cell, and dropping
    // cell attributes. Fractional sizes reject integer truncation.
    for (const setter of cellSetters) {
      it(`${setter.name} targets one cell and preserves other properties [${setter.entry}, 1030]`, () => {
        const result = runDrawingScript(
          `//@version=6
indicator("Cell setters")
${table.source}
table.cell(id, 0, 1, "control", bgcolor=color.white)
table.cell(id, 1, 2, "keep", width=12, height=9, text_color=color.red, text_halign=text.align_left, text_valign=text.align_top, text_size=size.normal, bgcolor=#123456, tooltip="keep tip", text_font_family=font.family_default, text_formatting=text.format_none)
${setter.name}(id, 1, 2, ${setter.args})`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.drawings).toHaveLength(1);
        const drawing = result.drawings?.[0];
        if (drawing?.type !== 'table') throw new Error('Expected table');
        expect(drawing).toMatchObject(table.fields);
        expect(drawing.cells).toHaveLength(2);
        expect(drawing.cells.find((cell) => cell.column === 1 && cell.row === 2)).toEqual({
          ...cellFields,
          ...setter.fields,
        });
        expect(drawing.cells.find((cell) => cell.column === 0 && cell.row === 1)).toMatchObject({
          text: 'control',
          bgcolor: '#FFFFFF',
        });
      });
    }

    // #fun_linefill.new [905], set_color [907], get_line1 [908], get_line2 [909].
    it('linefill.set_color preserves its parent handles [907, 905]', () => {
      const result = runDrawingScript(
        `//@version=6
indicator("Fill color")
a = line.new(4, -7, 1, 13)
b = line.new(3, 19, 2, -23)
id = linefill.new(a, b, color.red)
linefill.set_color(id, #123456)`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(result.drawings).toHaveLength(3);
      const [a, b, fill] = result.drawings ?? [];
      expect(fill).toMatchObject({ type: 'linefill', line1: a?.id, line2: b?.id, color: '#123456' });
    });

    for (const [getter, entry, parent] of [
      ['linefill.get_line1', 908, 'a'],
      ['linefill.get_line2', 909, 'b'],
    ] as const) {
      it(`${getter} returns the documented parent [${entry}]`, () => {
        const result = runDrawingScript(
          `//@version=6
indicator("Fill getters")
a = line.new(4, -7, 1, 13)
b = line.new(3, 19, 2, -23)
id = linefill.new(a, b, color.red)
plot(${getter}(id) == ${parent} ? 1 : 0, title="parent")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'parent').values).toEqual([1]);
      });
    }
  });

  describe(`Official Pine v6 drawing point constructors and getters ${method ? 'method' : 'function'}`, () => {
    // Constructors: line.new point [886], label.new point [911], box.new point
    // [857]; chart.point.new [1150]. Getters [899-902], [928-930], [860-863].
    // Time and index are deliberately unrelated. Distinct corner prices reject
    // selecting the wrong point/field or swapping endpoints. Both coordinate
    // modes reject always-time and always-index implementations.
    for (const xloc of ['bar_index', 'bar_time'] as const) {
      const firstX = xloc === 'bar_index' ? 4 : firstTime;
      const secondX = xloc === 'bar_index' ? 1 : secondTime;
      const points = `a = chart.point.new(${firstTime}, 4, 13)
b = chart.point.new(${secondTime}, 1, -7)`;
      for (const test of [
        {
          name: 'line',
          entry: 886,
          call: `id = line.new(a, b, xloc=xloc.${xloc})`,
          getters: ['line.get_x1', 'line.get_y1', 'line.get_x2', 'line.get_y2'],
          expected: [firstX, 13, secondX, -7],
          entries: '899-902',
        },
        {
          name: 'label',
          entry: 911,
          call: `id = label.new(a, "keep", xloc=xloc.${xloc})`,
          getters: ['label.get_x', 'label.get_y'],
          expected: [firstX, 13],
          entries: '928-929',
        },
        {
          name: 'box',
          entry: 857,
          call: `id = box.new(a, b, xloc=xloc.${xloc})`,
          getters: ['box.get_left', 'box.get_top', 'box.get_right', 'box.get_bottom'],
          expected: [firstX, 13, secondX, -7],
          entries: '860-863',
        },
      ]) {
        it(`${test.name}.new points select ${xloc} coordinates [${test.entry}, ${test.entries}, 1150]`, () => {
          const result = runDrawingScript(
            `//@version=6
indicator("Point overload")
${points}
${test.call}
${test.getters.map((getter, i) => `plot(${getter}(id), title="p${i}")`).join('\n')}`,
            { bars },
          );
          expect(result.errors).toEqual([]);
          expect(result.drawings).toHaveLength(1);
          test.expected.forEach((value, i) => expect(getPlot(result, `p${i}`).values).toEqual([value]));
        });
      }
    }

    // polyline.new [1175] parameters: explicit nondefault options. The default
    // constructor is covered separately; this rejects ignoring supplied options.
    if (!method)
      it('polyline.new preserves explicitly supplied drawing options [1175]', () => {
        const result = runDrawingScript(
          `//@version=6
indicator("Polyline options")
points = array.from(chart.point.new(${firstTime}, 4, -7), chart.point.new(${secondTime}, 1, 13), chart.point.new(${firstTime + 120000}, 3, -2))
id = polyline.new(points, curved=true, closed=true, xloc=xloc.bar_time, line_color=color.red, fill_color=#123456, line_style=line.style_dotted, line_width=5, force_overlay=true)`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.drawings).toHaveLength(1);
        expect(result.drawings?.[0]).toMatchObject({
          type: 'polyline',
          points: [
            { time: firstTime, index: 4, price: -7 },
            { time: secondTime, index: 1, price: 13 },
            { time: firstTime + 120000, index: 3, price: -2 },
          ],
          curved: true,
          closed: true,
          xloc: 'bar_time',
          lineColor: '#F23645',
          fillColor: '#123456',
          lineStyle: 'dotted',
          lineWidth: 5,
          forceOverlay: true,
        });
      });
  });
}
