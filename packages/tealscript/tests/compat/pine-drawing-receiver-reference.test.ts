import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
// All 95 implicit drawing receivers in the official v6 reference snapshot.
const cases = [
  [
    "box",
    "copy",
    ""
  ],
  [
    "box",
    "delete",
    ""
  ],
  [
    "box",
    "get_left",
    ""
  ],
  [
    "box",
    "get_right",
    ""
  ],
  [
    "box",
    "get_top",
    ""
  ],
  [
    "box",
    "get_bottom",
    ""
  ],
  [
    "box",
    "set_left",
    "left=1"
  ],
  [
    "box",
    "set_lefttop",
    "left=1, top=1"
  ],
  [
    "box",
    "set_right",
    "right=1"
  ],
  [
    "box",
    "set_rightbottom",
    "right=1, bottom=1"
  ],
  [
    "box",
    "set_top",
    "top=1"
  ],
  [
    "box",
    "set_bottom",
    "bottom=1"
  ],
  [
    "box",
    "set_border_color",
    "color=#445566"
  ],
  [
    "box",
    "set_bgcolor",
    "color=#445566"
  ],
  [
    "box",
    "set_border_width",
    "width=1"
  ],
  [
    "box",
    "set_border_style",
    "style=line.style_solid"
  ],
  [
    "box",
    "set_extend",
    "extend=extend.none"
  ],
  [
    "box",
    "set_xloc",
    "left=1, right=1, xloc=xloc.bar_index"
  ],
  [
    "box",
    "set_text_font_family",
    "text_font_family=font.family_default"
  ],
  [
    "box",
    "set_text_halign",
    "text_halign=text.align_center"
  ],
  [
    "box",
    "set_text_valign",
    "text_valign=text.align_center"
  ],
  [
    "box",
    "set_text_size",
    "text_size=size.normal"
  ],
  [
    "box",
    "set_text",
    "text=\"sample\""
  ],
  [
    "box",
    "set_text_formatting",
    "text_formatting=text.format_none"
  ],
  [
    "box",
    "set_text_color",
    "text_color=#445566"
  ],
  [
    "line",
    "copy",
    ""
  ],
  [
    "box",
    "set_text_wrap",
    "text_wrap=text.wrap_none"
  ],
  [
    "line",
    "set_x1",
    "x=1"
  ],
  [
    "line",
    "set_y1",
    "y=1"
  ],
  [
    "line",
    "set_xy1",
    "x=1, y=1"
  ],
  [
    "line",
    "set_x2",
    "x=1"
  ],
  [
    "line",
    "set_y2",
    "y=1"
  ],
  [
    "line",
    "set_xy2",
    "x=1, y=1"
  ],
  [
    "line",
    "set_xloc",
    "x1=1, x2=1, xloc=xloc.bar_index"
  ],
  [
    "line",
    "set_extend",
    "extend=extend.none"
  ],
  [
    "line",
    "set_color",
    "color=#445566"
  ],
  [
    "line",
    "set_style",
    "style=line.style_solid"
  ],
  [
    "line",
    "set_width",
    "width=1"
  ],
  [
    "line",
    "delete",
    ""
  ],
  [
    "line",
    "get_x1",
    ""
  ],
  [
    "line",
    "get_y1",
    ""
  ],
  [
    "line",
    "get_x2",
    ""
  ],
  [
    "line",
    "get_y2",
    ""
  ],
  [
    "line",
    "get_price",
    "x=1"
  ],
  [
    "label",
    "copy",
    ""
  ],
  [
    "linefill",
    "delete",
    ""
  ],
  [
    "linefill",
    "set_color",
    "color=#445566"
  ],
  [
    "linefill",
    "get_line1",
    ""
  ],
  [
    "linefill",
    "get_line2",
    ""
  ],
  [
    "label",
    "set_x",
    "x=1"
  ],
  [
    "label",
    "set_y",
    "y=1"
  ],
  [
    "label",
    "set_xy",
    "x=1, y=1"
  ],
  [
    "label",
    "set_xloc",
    "x=1, xloc=xloc.bar_index"
  ],
  [
    "label",
    "set_yloc",
    "yloc=yloc.price"
  ],
  [
    "label",
    "set_text",
    "text=\"sample\""
  ],
  [
    "label",
    "set_text_formatting",
    "text_formatting=text.format_none"
  ],
  [
    "label",
    "set_text_font_family",
    "text_font_family=font.family_default"
  ],
  [
    "label",
    "set_color",
    "color=#445566"
  ],
  [
    "label",
    "set_style",
    "style=label.style_label_up"
  ],
  [
    "label",
    "set_textcolor",
    "textcolor=#445566"
  ],
  [
    "label",
    "set_size",
    "size=size.normal"
  ],
  [
    "label",
    "set_textalign",
    "textalign=text.align_center"
  ],
  [
    "label",
    "set_tooltip",
    "tooltip=\"sample\""
  ],
  [
    "label",
    "delete",
    ""
  ],
  [
    "label",
    "get_x",
    ""
  ],
  [
    "label",
    "get_y",
    ""
  ],
  [
    "label",
    "get_text",
    ""
  ],
  [
    "table",
    "delete",
    ""
  ],
  [
    "table",
    "set_position",
    "position=position.top_right"
  ],
  [
    "table",
    "set_bgcolor",
    "bgcolor=#445566"
  ],
  [
    "table",
    "set_frame_color",
    "frame_color=#445566"
  ],
  [
    "table",
    "set_border_color",
    "border_color=#445566"
  ],
  [
    "table",
    "set_frame_width",
    "frame_width=1"
  ],
  [
    "table",
    "set_border_width",
    "border_width=1"
  ],
  [
    "table",
    "cell",
    "column=1, row=1, text=\"sample\", width=1, height=1, text_color=#445566, text_halign=text.align_center, text_valign=text.align_center, text_size=size.normal, bgcolor=#445566, tooltip=\"sample\", text_font_family=font.family_default, text_formatting=text.format_none"
  ],
  [
    "table",
    "cell_set_text",
    "column=1, row=1, text=\"sample\""
  ],
  [
    "table",
    "cell_set_text_formatting",
    "column=1, row=1, text_formatting=text.format_none"
  ],
  [
    "table",
    "cell_set_text_font_family",
    "column=1, row=1, text_font_family=font.family_default"
  ],
  [
    "table",
    "cell_set_tooltip",
    "column=1, row=1, tooltip=\"sample\""
  ],
  [
    "table",
    "cell_set_width",
    "column=1, row=1, width=1"
  ],
  [
    "table",
    "cell_set_height",
    "column=1, row=1, height=1"
  ],
  [
    "table",
    "cell_set_text_color",
    "column=1, row=1, text_color=#445566"
  ],
  [
    "table",
    "cell_set_text_halign",
    "column=1, row=1, text_halign=text.align_center"
  ],
  [
    "table",
    "cell_set_text_valign",
    "column=1, row=1, text_valign=text.align_center"
  ],
  [
    "table",
    "cell_set_text_size",
    "column=1, row=1, text_size=size.normal"
  ],
  [
    "table",
    "cell_set_bgcolor",
    "column=1, row=1, bgcolor=#445566"
  ],
  [
    "table",
    "clear",
    "start_column=1, start_row=1, end_column=1, end_row=1"
  ],
  [
    "table",
    "merge_cells",
    "start_column=1, start_row=1, end_column=1, end_row=1"
  ],
  [
    "chart.point",
    "copy",
    ""
  ],
  [
    "line",
    "set_first_point",
    "point=chart.point.from_index(0, 1)"
  ],
  [
    "line",
    "set_second_point",
    "point=chart.point.from_index(0, 1)"
  ],
  [
    "label",
    "set_point",
    "point=chart.point.from_index(0, 1)"
  ],
  [
    "box",
    "set_top_left_point",
    "point=chart.point.from_index(0, 1)"
  ],
  [
    "box",
    "set_bottom_right_point",
    "point=chart.point.from_index(0, 1)"
  ],
  [
    "polyline",
    "delete",
    ""
  ]
] as const;
const declarations: Record<string, string> = {
box: 'box target = box.new(0, 2, 1, 0)',
line: 'line target = line.new(0, 1, 1, 2)',
label: 'label target = label.new(0, 1)',
table: 'table target = table.new(position.top_right, 3, 3)',
linefill: 'linefill target = linefill.new(line.new(0, 1, 1, 2), line.new(0, 2, 1, 3), #445566)',
'chart.point': 'chart.point target = chart.point.from_index(0, 1)',
polyline: 'polyline target = polyline.new(array.from(chart.point.from_index(0, 1), chart.point.from_index(1, 2)))',
};
const diagnostics = (declaration: string, method: string, args: string) => checkProgram(parse(`//@version=6\nindicator("receiver contract")\n${declaration}\ntarget.${method}(${args})\nplot(close)`)).diagnostics.filter(d => d.severity === 'error');
describe('official drawing receiver inventory', () => {
for (const [family, method, args] of cases) {
it(`${family}.${method} accepts its documented receiver`, () => expect(diagnostics(declarations[family], method, args)).toEqual([]));
it(`${family}.${method} refuses an integer receiver`, () => expect(diagnostics('target = 1', method, args)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('drawing receiver') })])));
}
for (const [decl, method, args] of [
['box target = box.new(0, 2, 1, 0)', 'set_x', 'x=1'],
['label target = label.new(0, 1)', 'set_top', 'top=1'],
['target = array.from(1, 2)', 'get_line1', ''],
]) it(`refuses an incompatible family for ${method}`, () => expect(diagnostics(decl, method, args)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('drawing receiver') })])));
it('preserves implicit UDT and collection copy', () => expect(checkProgram(parse(`//@version=6
indicator("copy controls")
type Record
    int value
r = Record.new(1)
r2 = r.copy()
a = array.from(1, 2)
b = a.copy()
a.clear()
plot(b.size())`)).diagnostics.filter(d => d.severity === 'error')).toEqual([]));
});
