import { describe, expect, it } from 'vitest';

import { PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX } from '../../src/compat/pineV6ReferenceManualIndex';
import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

const manualDrawingObjectNames = [...new Set(Object.values(PINE_V6_REFERENCE_MANUAL_BUILTIN_INDEX).flat())]
  .filter((name) => (
    name === 'box'
    || name === 'label'
    || name === 'line'
    || name === 'linefill'
    || name === 'table'
    || name.startsWith('box.')
    || name.startsWith('chart.point.')
    || name.startsWith('label.')
    || name.startsWith('line.')
    || name.startsWith('linefill.')
    || name.startsWith('polyline.')
    || name.startsWith('table.')
  ))
  .sort();

const drawingBehaviorCoveredNames = [
  'box',
  'box.all',
  'box.copy',
  'box.delete',
  'box.get_bottom',
  'box.get_left',
  'box.get_right',
  'box.get_top',
  'box.new',
  'box.set_bgcolor',
  'box.set_border_color',
  'box.set_border_style',
  'box.set_border_width',
  'box.set_bottom',
  'box.set_bottom_right_point',
  'box.set_extend',
  'box.set_left',
  'box.set_lefttop',
  'box.set_right',
  'box.set_rightbottom',
  'box.set_text',
  'box.set_text_color',
  'box.set_text_font_family',
  'box.set_text_formatting',
  'box.set_text_halign',
  'box.set_text_size',
  'box.set_text_valign',
  'box.set_text_wrap',
  'box.set_top',
  'box.set_top_left_point',
  'box.set_xloc',
  'chart.point.copy',
  'chart.point.from_index',
  'chart.point.from_time',
  'chart.point.new',
  'chart.point.now',
  'label',
  'label.all',
  'label.copy',
  'label.delete',
  'label.get_text',
  'label.get_x',
  'label.get_y',
  'label.new',
  'label.set_color',
  'label.set_point',
  'label.set_size',
  'label.set_style',
  'label.set_text',
  'label.set_text_font_family',
  'label.set_text_formatting',
  'label.set_textalign',
  'label.set_textcolor',
  'label.set_tooltip',
  'label.set_x',
  'label.set_xloc',
  'label.set_xy',
  'label.set_y',
  'label.set_yloc',
  'label.style_arrowdown',
  'label.style_arrowup',
  'label.style_circle',
  'label.style_cross',
  'label.style_diamond',
  'label.style_flag',
  'label.style_label_center',
  'label.style_label_down',
  'label.style_label_left',
  'label.style_label_lower_left',
  'label.style_label_lower_right',
  'label.style_label_right',
  'label.style_label_up',
  'label.style_label_upper_left',
  'label.style_label_upper_right',
  'label.style_none',
  'label.style_square',
  'label.style_text_outline',
  'label.style_triangledown',
  'label.style_triangleup',
  'label.style_xcross',
  'line',
  'line.all',
  'line.copy',
  'line.delete',
  'line.get_price',
  'line.get_x1',
  'line.get_x2',
  'line.get_y1',
  'line.get_y2',
  'line.new',
  'line.set_color',
  'line.set_extend',
  'line.set_first_point',
  'line.set_second_point',
  'line.set_style',
  'line.set_width',
  'line.set_x1',
  'line.set_x2',
  'line.set_xloc',
  'line.set_xy1',
  'line.set_xy2',
  'line.set_y1',
  'line.set_y2',
  'line.style_arrow_both',
  'line.style_arrow_left',
  'line.style_arrow_right',
  'line.style_dashed',
  'line.style_dotted',
  'line.style_solid',
  'linefill',
  'linefill.all',
  'linefill.delete',
  'linefill.get_line1',
  'linefill.get_line2',
  'linefill.new',
  'linefill.set_color',
  'polyline.all',
  'polyline.delete',
  'polyline.new',
  'table',
  'table.all',
  'table.cell',
  'table.cell_set_bgcolor',
  'table.cell_set_height',
  'table.cell_set_text',
  'table.cell_set_text_color',
  'table.cell_set_text_font_family',
  'table.cell_set_text_formatting',
  'table.cell_set_text_halign',
  'table.cell_set_text_size',
  'table.cell_set_text_valign',
  'table.cell_set_tooltip',
  'table.cell_set_width',
  'table.clear',
  'table.delete',
  'table.merge_cells',
  'table.new',
  'table.set_bgcolor',
  'table.set_border_color',
  'table.set_border_width',
  'table.set_frame_color',
  'table.set_frame_width',
  'table.set_position',
] as const;

const allCompatibilityBarsFalse = Array(compatibilityBars.length).fill(false);

describe('Pine compatibility golden harness', () => {
  it('pins behavior coverage for every implemented official drawing/object manual-index name', () => {
    expect(drawingBehaviorCoveredNames).toEqual(manualDrawingObjectNames);
    expect(drawingBehaviorCoveredNames).toHaveLength(143);
  });

  it('typechecks official drawing object type annotations', () => {
    const result = runCompatScript(`
indicator("Drawing object type annotations")
var box b = na
var label lb = na
var line ln = na
var linefill lf = na
var table t = na
plot(na(b) and na(lb) and na(ln) and na(lf) and na(t) ? 1 : 0, title="Typed Objects")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Typed Objects').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('casts na to nullable drawing object handles without creating drawings', () => {
    const result = runCompatScript(`
indicator("Drawing object casts")
var box b = box(na)
var label lb = label(na)
var line ln = line(na)
var linefill lf = linefill(na)
var table t = table(na)
plot(na(b) and na(lb) and na(ln) and na(lf) and na(t) ? 1 : 0, title="Casts")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Casts').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(result.drawings).toEqual([]);
  });

  it('emits label drawing outputs from common last-bar label idioms', () => {
    const result = runCompatScript(`
indicator("Label docs smoke", overlay=true)
if barstate.islast
    label.new(bar_index, close, text=str.tostring(close), style=label.style_label_down, color=color.red, textcolor=color.white, size=size.small)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_11',
        type: 'label',
        barIndex: 11,
        x: 11,
        y: 112,
        text: '112',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_down',
        color: '#F23645',
        textColor: '#FFFFFF',
        size: 'small',
        tooltip: undefined,
      },
    ]);
  });

  it('updates a persistent last-bar label with Pine setter idioms', () => {
    const result = runCompatScript(`
indicator("Persistent Label", overlay=true)
var marker = label.new(na, na, text="")
if barstate.islast
    label.set_xy(marker, bar_index, close)
    label.set_text(marker, str.format("Close {0}", close))
    label.set_style(marker, label.style_label_left)
    label.set_color(marker, color.new(color.blue, 20))
    label.set_textcolor(marker, color.white)
    label.set_textalign(marker, text.align_right)
    label.set_text_font_family(marker, font.family_monospace)
    label.set_text_formatting(marker, text.format_bold + text.format_italic)
    label.set_tooltip(marker, "last confirmed")
plot(label.get_x(marker), title="Marker X")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_0',
        type: 'label',
        persistent: true,
        barIndex: 11,
        x: 11,
        y: 112,
        text: 'Close 112',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_left',
        color: '#2196F3CC',
        textColor: '#FFFFFF',
        size: 'normal',
        textAlign: 'right',
        textFontFamily: 'monospace',
        textFormatting: 'bolditalic',
        tooltip: 'last confirmed',
      },
    ]);
    expect(getPlot(result, 'Marker X').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 11]);
  });

  it('updates and reads a persistent label with Pine named setter idioms', () => {
    const result = runCompatScript(`
indicator("Named Persistent Label", overlay=true)
var marker = label.new(x=na, y=na, text="")
if barstate.islast
    label.set_x(id=marker, x=bar_index)
    label.set_y(id=marker, y=close)
    label.set_text(id=marker, text=str.format("Named {0}", close))
    label.set_style(id=marker, style=label.style_label_right)
    label.set_color(id=marker, color=color.new(color.green, 30))
    label.set_textcolor(id=marker, textcolor=color.white)
    label.set_size(id=marker, size=size.large)
    label.set_tooltip(id=marker, tooltip="named setter")
plot(label.get_x(id=marker), title="Named Marker X")
plot(label.get_y(id=marker), title="Named Marker Y")
plot(label.get_text(id=marker) == "Named 112", title="Named Marker Text")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_0',
        type: 'label',
        persistent: true,
        barIndex: 11,
        x: 11,
        y: 112,
        text: 'Named 112',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_right',
        color: '#4CAF50B3',
        textColor: '#FFFFFF',
        size: 'large',
        tooltip: 'named setter',
      },
    ]);
    expect(getPlot(result, 'Named Marker X').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 11]);
    expect(getPlot(result, 'Named Marker Y').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 112]);
    expect(getPlot(result, 'Named Marker Text').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, true]);
  });

  it('creates labels from chart.point overloads', () => {
    const result = runCompatScript(`
indicator("Point Labels", overlay=true)
if barstate.islast
    lowPoint = chart.point.from_index(index=bar_index - 1, price=low)
    highPoint = chart.point.from_time(time=time, price=high)
    label.new(lowPoint, "low", style=label.style_label_up, textcolor=color.white)
    label.new(highPoint, "high", xloc=xloc.bar_time, style=label.style_label_down, textcolor=color.white)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_11',
        type: 'label',
        barIndex: 11,
        x: 10,
        y: 108,
        text: 'low',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_up',
        color: '#2196F3',
        textColor: '#FFFFFF',
        size: 'normal',
        tooltip: undefined,
      },
      {
        id: 'label_label.new_1_11',
        type: 'label',
        barIndex: 11,
        x: compatibilityBars[11]!.time,
        y: 113,
        text: 'high',
        xloc: 'bar_time',
        yloc: 'price',
        style: 'label_down',
        color: '#2196F3',
        textColor: '#FFFFFF',
        size: 'normal',
        tooltip: undefined,
      },
    ]);
  });

  it('updates labels from chart.point values and covers label lifecycle state', () => {
    const result = runCompatScript(`
indicator("Label point lifecycle", overlay=true)
var marker = label.new(na, na, "")
if barstate.islast
    label.set_xy(marker, bar_index - 4, low)
    label.set_text(marker, "seed")
    label.set_style(marker, label.style_label_center)
    label.set_xloc(id=marker, x=time[1], xloc=xloc.bar_time)
    point = chart.point.new(time=time, index=bar_index - 1, price=high)
    clone = label.copy(marker)
    label.set_point(id=marker, point=point)
    label.set_yloc(id=marker, yloc=yloc.abovebar)
    label.set_text(id=clone, text="copy")
    label.delete(id=clone)
plot(label.get_x(marker), title="Point Label X")
plot(label.get_y(marker), title="Point Label Y")
plot(label.get_text(marker) == "seed", title="Point Label Text")
plot(array.size(label.all), title="Label Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_0',
        type: 'label',
        persistent: true,
        barIndex: 11,
        x: compatibilityBars[11]!.time,
        y: 113,
        text: 'seed',
        xloc: 'bar_time',
        yloc: 'abovebar',
        style: 'label_center',
        color: '#2196F3',
        textColor: '#FFFFFF',
        size: 'normal',
        tooltip: undefined,
      },
    ]);
    expect(getPlot(result, 'Point Label X').values).toEqual([...Array(11).fill(null), compatibilityBars[11]!.time]);
    expect(getPlot(result, 'Point Label Y').values).toEqual([...Array(11).fill(null), 113]);
    expect(getPlot(result, 'Point Label Text').values).toEqual([...allCompatibilityBarsFalse.slice(0, 11), true]);
    expect(getPlot(result, 'Label Count').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('preserves explicit na label colors on constructors', () => {
    const result = runCompatScript(`
indicator("Explicit na label colors", overlay=true)
if barstate.islast
    label.new(bar_index, close, "ghost", color=na, textcolor=na)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_11',
        type: 'label',
        barIndex: 11,
        x: 11,
        y: 112,
        text: 'ghost',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_down',
        color: null,
        textColor: null,
        size: 'normal',
        tooltip: undefined,
      },
    ]);
  });

  it('updates channel lines, linefills, and boxes from common drawing idioms', () => {
    const result = runCompatScript(`
indicator("Channel and zone drawings", overlay=true)
var upper = line.new(0, high, 1, high)
var lower = line.new(0, low, 1, low)
var channel = linefill.new(upper, lower, color=color.new(color.green, 70))
var zone = box.new(0, high, 1, low, border_color=color.blue, bgcolor=color.new(color.blue, 80), text="zone")
if barstate.islast
    line.set_xy1(upper, bar_index - 1, high[1])
    line.set_xy2(upper, bar_index, high)
    line.set_xy1(lower, bar_index - 1, low[1])
    line.set_xy2(lower, bar_index, low)
    linefill.set_color(channel, color.new(color.green, 50))
    box.set_lefttop(zone, bar_index - 2, high)
    box.set_rightbottom(zone, bar_index, low)
    box.set_text(zone, "range")
plot(line.get_price(upper, bar_index), title="Upper Price")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 10,
        y1: 114,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_1_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 10,
        y1: 109,
        x2: 11,
        y2: 108,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'linefill_linefill.new_0_0',
        type: 'linefill',
        persistent: true,
        barIndex: 0,
        line1: 'line_line.new_0_0',
        line2: 'line_line.new_1_0',
        color: '#4CAF5080',
      },
      {
        id: 'box_box.new_0_0',
        type: 'box',
        persistent: true,
        barIndex: 11,
        left: 9,
        top: 113,
        right: 11,
        bottom: 108,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: '#2196F3',
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: '#2196F333',
        text: 'range',
        textColor: '#363A45',
        textSize: 'auto',
      },
    ]);
    expect(getPlot(result, 'Upper Price').values).toEqual([103, 103, 103, 103, 103, 103, 103, 103, 103, 103, 103, 113]);
  });

  it('preserves explicit na drawing colors on constructors', () => {
    const result = runCompatScript(`
indicator("Explicit na drawing colors", overlay=true)
if barstate.islast
    line.new(bar_index - 1, high[1], bar_index, high, color=na)
    box.new(bar_index - 1, high, bar_index, low, border_color=na, bgcolor=na, text="hidden", text_color=na)
    points = array.from(chart.point.from_index(bar_index - 1, low[1]), chart.point.now(close))
    polyline.new(points, line_color=na, fill_color=na)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_11',
        type: 'line',
        barIndex: 11,
        x1: 10,
        y1: 114,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'none',
        color: null,
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'box_box.new_0_11',
        type: 'box',
        barIndex: 11,
        left: 10,
        top: 113,
        right: 11,
        bottom: 108,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: null,
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: null,
        text: 'hidden',
        textColor: null,
        textSize: 'auto',
      },
      {
        id: 'polyline_polyline.new_0_11',
        type: 'polyline',
        barIndex: 11,
        points: [
          { type: 'chart.point', time: null, index: 10, price: 109 },
          { type: 'chart.point', time: compatibilityBars[11]!.time, index: 11, price: 112 },
        ],
        curved: false,
        closed: false,
        xloc: 'bar_index',
        lineColor: null,
        fillColor: null,
        lineStyle: 'solid',
        lineWidth: 1,
      },
    ]);
  });

  it('updates and reads a persistent line with Pine named setter idioms', () => {
    const result = runCompatScript(`
indicator("Named Persistent Line", overlay=true)
var trend = line.new(x1=na, y1=na, x2=na, y2=na)
if barstate.islast
    line.set_xloc(id=trend, x1=bar_index - 2, x2=bar_index, xloc=xloc.bar_index)
    firstPoint = chart.point.from_index(index=bar_index - 2, price=low[2])
    secondPoint = chart.point.now(price=high)
    line.set_first_point(id=trend, first_point=firstPoint)
    line.set_second_point(id=trend, second_point=secondPoint)
    line.set_extend(id=trend, extend=extend.right)
    line.set_color(id=trend, color=color.new(color.yellow, 40))
    line.set_style(id=trend, style=line.style_dashed)
    line.set_width(id=trend, width=3)
plot(line.get_x1(id=trend), title="Named Line X1")
plot(line.get_y2(id=trend), title="Named Line Y2")
plot(line.get_price(id=trend, x=bar_index - 1), title="Named Line Price")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 9,
        y1: 107,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'right',
        color: '#FDD83599',
        style: 'dashed',
        width: 3,
        forceOverlay: false,
      },
    ]);
    expect(getPlot(result, 'Named Line X1').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 9]);
    expect(getPlot(result, 'Named Line Y2').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 113]);
    expect(getPlot(result, 'Named Line Price').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 110]);
  });

  it('copies, deletes, mutates, and reads scalar line fields', () => {
    const result = runCompatScript(`
indicator("Line scalar lifecycle", overlay=true)
var trend = line.new(na, na, na, na)
if barstate.islast
    line.set_xy1(trend, bar_index - 4, low[1])
    line.set_xy2(trend, bar_index - 2, high[1])
    clone = line.copy(trend)
    line.delete(clone)
    line.set_x1(id=trend, x=bar_index - 3)
    line.set_y1(id=trend, y=low)
    line.set_x2(id=trend, x=bar_index)
    line.set_y2(id=trend, y=high)
    line.set_style(id=trend, style=line.style_arrow_right)
plot(line.get_x1(trend), title="Scalar Line X1")
plot(line.get_y1(trend), title="Scalar Line Y1")
plot(line.get_x2(trend), title="Scalar Line X2")
plot(line.get_y2(trend), title="Scalar Line Y2")
plot(array.size(line.all), title="Line Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 108,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'arrow_right',
        width: 1,
        forceOverlay: false,
      },
    ]);
    expect(getPlot(result, 'Scalar Line X1').values).toEqual([...Array(11).fill(null), 8]);
    expect(getPlot(result, 'Scalar Line Y1').values).toEqual([...Array(11).fill(null), 108]);
    expect(getPlot(result, 'Scalar Line X2').values).toEqual([...Array(11).fill(null), 11]);
    expect(getPlot(result, 'Scalar Line Y2').values).toEqual([...Array(11).fill(null), 113]);
    expect(getPlot(result, 'Line Count').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('updates, reads, and deletes linefills with Pine named setter idioms', () => {
    const result = runCompatScript(`
indicator("Named Linefill", overlay=true)
var upper = na
var lower = na
var mid = na
var channel = na
if barstate.islast
    upper := line.new(x1=bar_index - 1, y1=high[1], x2=bar_index, y2=high)
    lower := line.new(x1=bar_index - 1, y1=low[1], x2=bar_index, y2=low)
    mid := line.new(x1=bar_index - 1, y1=hl2[1], x2=bar_index, y2=hl2)
    channel := linefill.new(line1=upper, line2=lower, color=color.red)
    stale = linefill.new(line1=upper, line2=mid, color=color.blue)
    linefill.set_color(id=channel, color=color.new(color.orange, 60))
    linefill.delete(id=stale)
plot(linefill.get_line1(id=channel) == upper, title="Named Linefill Line1")
plot(linefill.get_line2(id=channel) == lower, title="Named Linefill Line2")
plot(array.size(linefill.all), title="Named Linefill Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_11',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 10,
        y1: 114,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_1_11',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 10,
        y1: 109,
        x2: 11,
        y2: 108,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_2_11',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 10,
        y1: 111.5,
        x2: 11,
        y2: 110.5,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'linefill_linefill.new_0_11',
        type: 'linefill',
        persistent: true,
        barIndex: 11,
        line1: 'line_line.new_0_11',
        line2: 'line_line.new_1_11',
        color: '#FF980066',
      },
    ]);
    expect(getPlot(result, 'Named Linefill Line1').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, true]);
    expect(getPlot(result, 'Named Linefill Line2').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, true]);
    expect(getPlot(result, 'Named Linefill Count').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('updates and reads a persistent box with Pine named setter idioms', () => {
    const result = runCompatScript(`
indicator("Named Persistent Box", overlay=true)
var zone = box.new(left=na, top=na, right=na, bottom=na, text="")
if barstate.islast
    box.set_xloc(id=zone, left=bar_index - 3, right=bar_index, xloc=xloc.bar_index)
    topLeft = chart.point.from_index(index=bar_index - 3, price=high)
    bottomRight = chart.point.now(price=low)
    box.set_top_left_point(id=zone, point=topLeft)
    box.set_bottom_right_point(id=zone, point=bottomRight)
    box.set_bgcolor(id=zone, color=color.new(color.aqua, 75))
    box.set_border_color(id=zone, color=color.purple)
    box.set_border_width(id=zone, width=2)
    box.set_border_style(id=zone, style=line.style_dotted)
    box.set_extend(id=zone, extend=extend.both)
    box.set_text(id=zone, text="Named zone")
    box.set_text_color(id=zone, text_color=color.black)
    box.set_text_size(id=zone, size=size.small)
    box.set_text_halign(id=zone, text_halign=text.align_center)
    box.set_text_valign(id=zone, text_valign=text.align_bottom)
    box.set_text_wrap(id=zone, text_wrap=text.wrap_auto)
    box.set_text_font_family(id=zone, text_font_family=font.family_monospace)
    box.set_text_formatting(id=zone, text_formatting=text.format_bold + text.format_italic)
plot(box.get_left(id=zone), title="Named Box Left")
plot(box.get_bottom(id=zone), title="Named Box Bottom")
plot(box.get_text(id=zone) == "Named zone", title="Named Box Text")
plot(box.get_text_halign(id=zone) == "center", title="Named Box HAlign")
plot(box.get_text_valign(id=zone) == "bottom", title="Named Box VAlign")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'box_box.new_0_0',
        type: 'box',
        persistent: true,
        barIndex: 11,
        left: 8,
        top: 113,
        right: 11,
        bottom: 108,
        xloc: 'bar_index',
        extend: 'both',
        borderColor: '#9C27B0',
        borderWidth: 2,
        borderStyle: 'dotted',
        bgcolor: '#00BCD440',
        text: 'Named zone',
        textColor: '#363A45',
        textSize: 'small',
        textHalign: 'center',
        textValign: 'bottom',
        textWrap: 'auto',
        textFontFamily: 'monospace',
        textFormatting: 'bolditalic',
      },
    ]);
    expect(getPlot(result, 'Named Box Left').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 8]);
    expect(getPlot(result, 'Named Box Bottom').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 108]);
    expect(getPlot(result, 'Named Box Text').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, true]);
    expect(getPlot(result, 'Named Box HAlign').values).toEqual([true, true, true, true, true, true, true, true, true, true, true, true]);
    expect(getPlot(result, 'Named Box VAlign').values).toEqual([false, false, false, false, false, false, false, false, false, false, false, true]);
  });

  it('copies, deletes, mutates, and reads scalar box fields', () => {
    const result = runCompatScript(`
indicator("Box scalar lifecycle", overlay=true)
var zone = box.new(na, na, na, na, text="seed")
if barstate.islast
    box.set_lefttop(zone, bar_index - 4, high[1])
    box.set_rightbottom(zone, bar_index - 1, low[1])
    clone = box.copy(zone)
    box.delete(clone)
    box.set_left(id=zone, left=bar_index - 3)
    box.set_top(id=zone, top=high)
    box.set_right(id=zone, right=bar_index)
    box.set_bottom(id=zone, bottom=low)
plot(box.get_left(zone), title="Scalar Box Left")
plot(box.get_top(zone), title="Scalar Box Top")
plot(box.get_right(zone), title="Scalar Box Right")
plot(box.get_bottom(zone), title="Scalar Box Bottom")
plot(array.size(box.all), title="Box Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'box_box.new_0_0',
        type: 'box',
        persistent: true,
        barIndex: 11,
        left: 8,
        top: 113,
        right: 11,
        bottom: 108,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: '#2196F3',
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: '#2196F3',
        text: 'seed',
        textColor: '#363A45',
        textSize: 'auto',
      },
    ]);
    expect(getPlot(result, 'Scalar Box Left').values).toEqual([...Array(11).fill(null), 8]);
    expect(getPlot(result, 'Scalar Box Top').values).toEqual([...Array(11).fill(null), 113]);
    expect(getPlot(result, 'Scalar Box Right').values).toEqual([...Array(11).fill(null), 11]);
    expect(getPlot(result, 'Scalar Box Bottom').values).toEqual([...Array(11).fill(null), 108]);
    expect(getPlot(result, 'Box Count').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('emits polylines from chart.point arrays', () => {
    const result = runCompatScript(`
indicator("Polyline docs smoke", overlay=true, max_polylines_count=1)
if barstate.islast
    points = array.from(chart.point.from_index(bar_index - 2, low[2]), chart.point.from_index(bar_index - 1, high[1]), chart.point.now(close))
    polyline.new(points, closed=false, line_color=color.red, line_style=line.style_dashed, line_width=2)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'polyline_polyline.new_0_11',
        type: 'polyline',
        barIndex: 11,
        points: [
          { type: 'chart.point', time: null, index: 9, price: 107 },
          { type: 'chart.point', time: null, index: 10, price: 114 },
          { type: 'chart.point', time: compatibilityBars[11]!.time, index: 11, price: 112 },
        ],
        curved: false,
        closed: false,
        xloc: 'bar_index',
        lineColor: '#F23645',
        fillColor: null,
        lineStyle: 'dashed',
        lineWidth: 2,
      },
    ]);
  });

  it('copies and deletes polylines with Pine named lifecycle idioms', () => {
    const result = runCompatScript(`
indicator("Named Polyline Lifecycle", overlay=true, max_polylines_count=2)
if barstate.islast
    points = array.from(chart.point.from_index(bar_index - 2, low[2]), chart.point.from_index(bar_index - 1, high[1]), chart.point.now(close))
    poly = polyline.new(points=points, closed=true, line_color=color.green, line_width=2)
    clone = polyline.copy(id=poly)
    polyline.delete(id=poly)
plot(array.size(polyline.all), title="Named Polyline Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'polyline_polyline.copy_0_11',
        type: 'polyline',
        persistent: false,
        barIndex: 11,
        points: [
          { type: 'chart.point', time: null, index: 9, price: 107 },
          { type: 'chart.point', time: null, index: 10, price: 114 },
          { type: 'chart.point', time: compatibilityBars[11]!.time, index: 11, price: 112 },
        ],
        curved: false,
        closed: true,
        xloc: 'bar_index',
        lineColor: '#4CAF50',
        fillColor: null,
        lineStyle: 'solid',
        lineWidth: 2,
      },
    ]);
    expect(getPlot(result, 'Named Polyline Count').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('emits table cells from common last-bar dashboard idioms', () => {
    const result = runCompatScript(`
indicator("Table docs smoke", overlay=true)
var dashboard = table.new(position.top_right, 2, 1, border_color=color.white, border_width=1)
if barstate.islast
    table.cell(dashboard, 0, 0, "Close", text_color=color.white, bgcolor=color.blue)
    table.cell(dashboard, 1, 0, str.tostring(close), text_color=color.black, bgcolor=color.green)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 1,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Close',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 1,
            row: 0,
            text: '112',
            width: undefined,
            height: undefined,
            textColor: '#363A45',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('updates table and cell state with Pine named setter idioms', () => {
    const result = runCompatScript(`
indicator("Named Table", overlay=true)
var dashboard = table.new(position=position.top_right, columns=2, rows=2, bgcolor=color.blue, border_width=1)
if barstate.islast
    table.set_position(table_id=dashboard, position=position.bottom_right)
    table.set_bgcolor(table_id=dashboard, bgcolor=color.new(color.gray, 80))
    table.set_frame_color(table_id=dashboard, frame_color=color.white)
    table.set_frame_width(table_id=dashboard, frame_width=2)
    table.set_border_color(table_id=dashboard, border_color=color.black)
    table.set_border_width(table_id=dashboard, border_width=3)
    table.cell(table_id=dashboard, column=0, row=0, text="Label", text_color=color.white, bgcolor=color.blue, tooltip="Label details")
    table.cell(table_id=dashboard, column=1, row=0, text="")
    table.cell_set_text(table_id=dashboard, column=1, row=0, text="Close")
    table.cell_set_bgcolor(table_id=dashboard, column=1, row=0, bgcolor=color.green)
    table.cell_set_text_color(table_id=dashboard, column=1, row=0, text_color=color.black)
    table.cell_set_text_size(table_id=dashboard, column=1, row=0, text_size=size.large)
    table.cell_set_width(table_id=dashboard, column=1, row=0, width=64)
    table.cell_set_height(table_id=dashboard, column=1, row=0, height=24)
    table.cell_set_text_halign(table_id=dashboard, column=1, row=0, text_halign=text.align_right)
    table.cell_set_text_valign(table_id=dashboard, column=1, row=0, text_valign=text.align_bottom)
    table.cell_set_text_font_family(table_id=dashboard, column=1, row=0, text_font_family=font.family_monospace)
    table.cell_set_text_formatting(table_id=dashboard, column=1, row=0, text_formatting=text.format_bold)
    table.cell_set_tooltip(table_id=dashboard, column=1, row=0, tooltip="Close details")
    table.merge_cells(table_id=dashboard, start_column=0, start_row=0, end_column=1, end_row=0)
    table.cell(table_id=dashboard, column=0, row=1, text="cleared")
    table.clear(table_id=dashboard, start_column=0, start_row=1, end_column=0, end_row=1)
plot(array.size(table.all), title="Named Table Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'bottom_right',
        columns: 2,
        rows: 2,
        bgcolor: '#787B8633',
        frameColor: '#FFFFFF',
        frameWidth: 2,
        borderColor: '#363A45',
        borderWidth: 3,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Label',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            tooltip: 'Label details',
            bgcolor: '#2196F3',
          },
          {
            column: 1,
            row: 0,
            text: 'Close',
            width: 64,
            height: 24,
            textColor: '#363A45',
            textHalign: 'right',
            textValign: 'bottom',
            textSize: 'large',
            bgcolor: '#4CAF50',
            textFontFamily: 'monospace',
            textFormatting: 'bold',
            tooltip: 'Close details',
          },
        ],
        mergedCells: [
          {
            startColumn: 0,
            startRow: 0,
            endColumn: 1,
            endRow: 0,
          },
        ],
      },
    ]);
    expect(getPlot(result, 'Named Table Count').values).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('deletes table objects and updates table.all lifecycle counts', () => {
    const result = runCompatScript(`
indicator("Table lifecycle", overlay=true)
if barstate.islast
    keep = table.new(position.top_right, 1, 1)
    drop = table.new(position.bottom_left, 1, 1)
    table.cell(keep, 0, 0, "keep")
    table.delete(drop)
plot(array.size(table.all), title="Table Lifecycle Count")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_11',
        type: 'table',
        barIndex: 11,
        position: 'top_right',
        columns: 1,
        rows: 1,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: null,
        borderWidth: 0,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'keep',
            width: undefined,
            height: undefined,
            textColor: null,
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: null,
          },
        ],
      },
    ]);
    expect(getPlot(result, 'Table Lifecycle Count').values).toEqual([...Array(11).fill(0), 1]);
  });

  it('resolves mixed named and positional drawing constructor arguments in Pine order', () => {
    const result = runCompatScript(`
indicator("Mixed Drawing Constructors", overlay=true)
if barstate.islast
    label.new(x=bar_index, close, "mixed label", color=color.red, style=label.style_label_down, textcolor=color.white)
    upper = line.new(x1=bar_index - 1, high[1], x2=bar_index, high, color=color.green, width=2)
    lower = line.new(x1=bar_index - 1, low[1], x2=bar_index, low, color=color.blue)
    linefill.new(line1=upper, lower, color.new(color.green, 70))
    box.new(left=bar_index - 2, high, right=bar_index, low, bgcolor=color.new(color.orange, 80), text="mixed box")
    points = array.from(chart.point.from_index(bar_index - 2, low[2]), chart.point.from_index(bar_index - 1, high[1]), chart.point.now(close))
    polyline.new(points=points, false, true, line_color=color.purple, line_width=3)
    dashboard = table.new(position=position.top_right, 2, rows=1, border_color=color.white, border_width=1)
    table.cell(table_id=dashboard, column=0, 0, "Mixed", text_color=color.white)
    table.cell(table_id=dashboard, column=1, 0, str.tostring(close), bgcolor=color.green)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_11',
        type: 'label',
        barIndex: 11,
        x: 11,
        y: 112,
        text: 'mixed label',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_down',
        color: '#F23645',
        textColor: '#FFFFFF',
        size: 'normal',
        tooltip: undefined,
      },
      {
        id: 'line_line.new_0_11',
        type: 'line',
        barIndex: 11,
        x1: 10,
        y1: 114,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'none',
        color: '#4CAF50',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_1_11',
        type: 'line',
        barIndex: 11,
        x1: 10,
        y1: 109,
        x2: 11,
        y2: 108,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'linefill_linefill.new_0_11',
        type: 'linefill',
        barIndex: 11,
        line1: 'line_line.new_0_11',
        line2: 'line_line.new_1_11',
        color: '#4CAF504D',
      },
      {
        id: 'box_box.new_0_11',
        type: 'box',
        barIndex: 11,
        left: 9,
        top: 113,
        right: 11,
        bottom: 108,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: '#2196F3',
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: '#FF980033',
        text: 'mixed box',
        textColor: '#363A45',
        textSize: 'auto',
      },
      {
        id: 'polyline_polyline.new_0_11',
        type: 'polyline',
        barIndex: 11,
        points: [
          { type: 'chart.point', time: null, index: 9, price: 107 },
          { type: 'chart.point', time: null, index: 10, price: 114 },
          { type: 'chart.point', time: compatibilityBars[11]!.time, index: 11, price: 112 },
        ],
        curved: false,
        closed: true,
        xloc: 'bar_index',
        lineColor: '#9C27B0',
        fillColor: null,
        lineStyle: 'solid',
        lineWidth: 3,
      },
      {
        id: 'table_table.new_0_11',
        type: 'table',
        barIndex: 11,
        position: 'top_right',
        columns: 2,
        rows: 1,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Mixed',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: null,
          },
          {
            column: 1,
            row: 0,
            text: '112',
            width: undefined,
            height: undefined,
            textColor: null,
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('resolves mixed named and positional drawing mutator arguments in Pine order', () => {
    const result = runCompatScript(`
indicator("Mixed Drawing Mutators", overlay=true)
var mixedPrice = na
if barstate.islast
    marker = label.new(na, na, "")
    label.set_xy(id=marker, bar_index, close)
    label.set_text(id=marker, "mixed label")
    label.set_color(id=marker, color.red)
    label.set_textcolor(id=marker, color.white)
    upper = line.new(bar_index - 1, high[1], bar_index, high)
    line.set_xy1(id=upper, bar_index - 2, low[2])
    line.set_xy2(id=upper, bar_index, high)
    line.set_color(id=upper, color.green)
    line.set_width(id=upper, 2)
    lower = line.new(bar_index - 1, low[1], bar_index, low)
    channel = linefill.new(upper, lower)
    linefill.set_color(id=channel, color.new(color.orange, 60))
    zone = box.new(na, na, na, na)
    box.set_lefttop(id=zone, bar_index - 2, high)
    box.set_rightbottom(id=zone, bar_index, low)
    box.set_text(id=zone, "mixed box")
    box.set_bgcolor(id=zone, color.new(color.blue, 80))
    dashboard = table.new(position.top_right, 2, 1)
    table.set_position(table_id=dashboard, position.bottom_right)
    table.set_bgcolor(table_id=dashboard, color.new(color.gray, 80))
    table.cell(table_id=dashboard, column=0, 0, "Seed")
    table.cell(table_id=dashboard, column=1, 0, "Clear me")
    table.cell_set_text(table_id=dashboard, column=0, 0, "Mixed")
    table.cell_set_bgcolor(table_id=dashboard, column=0, 0, color.green)
    table.cell_set_text_color(table_id=dashboard, column=0, 0, color.white)
    table.cell_set_width(table_id=dashboard, column=0, 0, 42)
    table.clear(table_id=dashboard, 1, 0, 1, 0)
    mixedPrice := line.get_price(id=upper, bar_index)
plot(mixedPrice, title="Mixed Line Price")
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_11',
        type: 'label',
        barIndex: 11,
        x: 11,
        y: 112,
        text: 'mixed label',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_down',
        color: '#F23645',
        textColor: '#FFFFFF',
        size: 'normal',
        tooltip: undefined,
      },
      {
        id: 'line_line.new_0_11',
        type: 'line',
        barIndex: 11,
        x1: 9,
        y1: 107,
        x2: 11,
        y2: 113,
        xloc: 'bar_index',
        extend: 'none',
        color: '#4CAF50',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_1_11',
        type: 'line',
        barIndex: 11,
        x1: 10,
        y1: 109,
        x2: 11,
        y2: 108,
        xloc: 'bar_index',
        extend: 'none',
        color: '#2196F3',
        style: 'solid',
        width: 1,
        forceOverlay: false,
      },
      {
        id: 'linefill_linefill.new_0_11',
        type: 'linefill',
        barIndex: 11,
        line1: 'line_line.new_0_11',
        line2: 'line_line.new_1_11',
        color: '#FF980066',
      },
      {
        id: 'box_box.new_0_11',
        type: 'box',
        barIndex: 11,
        left: 9,
        top: 113,
        right: 11,
        bottom: 108,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: '#2196F3',
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: '#2196F333',
        text: 'mixed box',
        textColor: '#363A45',
        textSize: 'auto',
      },
      {
        id: 'table_table.new_0_11',
        type: 'table',
        barIndex: 11,
        position: 'bottom_right',
        columns: 2,
        rows: 1,
        bgcolor: '#787B8633',
        frameColor: null,
        frameWidth: 0,
        borderColor: null,
        borderWidth: 0,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Mixed',
            width: 42,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
        mergedCells: undefined,
      },
    ]);
    expect(getPlot(result, 'Mixed Line Price').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 113]);
  });

  it('uses label.style_text_outline constant for label style', () => {
    const result = runCompatScript(`
indicator("Text Outline Label", overlay=true)
if barstate.islast
    label.new(bar_index, close, text="outline", style=label.style_text_outline)
`);
    expect(result.errors).toEqual([]);
    expect(result.drawings).toHaveLength(1);
    expect(result.drawings[0]).toMatchObject({ type: 'label', style: 'text_outline' });
  });

  it('maps every official label style constant into label drawing style output', () => {
    const result = runCompatScript(`
indicator("All Label Styles", overlay=true)
if barstate.islast
    label.new(bar_index, high, "0", style=label.style_none)
    label.new(bar_index, high, "1", style=label.style_xcross)
    label.new(bar_index, high, "2", style=label.style_cross)
    label.new(bar_index, high, "3", style=label.style_triangleup)
    label.new(bar_index, high, "4", style=label.style_triangledown)
    label.new(bar_index, high, "5", style=label.style_flag)
    label.new(bar_index, high, "6", style=label.style_circle)
    label.new(bar_index, high, "7", style=label.style_arrowup)
    label.new(bar_index, high, "8", style=label.style_arrowdown)
    label.new(bar_index, high, "9", style=label.style_label_up)
    label.new(bar_index, high, "10", style=label.style_label_down)
    label.new(bar_index, high, "11", style=label.style_label_left)
    label.new(bar_index, high, "12", style=label.style_label_right)
    label.new(bar_index, high, "13", style=label.style_label_lower_left)
    label.new(bar_index, high, "14", style=label.style_label_lower_right)
    label.new(bar_index, high, "15", style=label.style_label_upper_left)
    label.new(bar_index, high, "16", style=label.style_label_upper_right)
    label.new(bar_index, high, "17", style=label.style_label_center)
    label.new(bar_index, high, "18", style=label.style_square)
    label.new(bar_index, high, "19", style=label.style_diamond)
    label.new(bar_index, high, "20", style=label.style_text_outline)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.style)).toEqual([
      'none',
      'xcross',
      'cross',
      'triangleup',
      'triangledown',
      'flag',
      'circle',
      'arrowup',
      'arrowdown',
      'label_up',
      'label_down',
      'label_left',
      'label_right',
      'label_lower_left',
      'label_lower_right',
      'label_upper_left',
      'label_upper_right',
      'label_center',
      'square',
      'diamond',
      'text_outline',
    ]);
  });

  it('maps every official line style constant into line drawing style output', () => {
    const result = runCompatScript(`
indicator("All Line Styles", overlay=true)
if barstate.islast
    line.new(bar_index - 1, high, bar_index, high, style=line.style_solid)
    line.new(bar_index - 1, high, bar_index, high, style=line.style_dotted)
    line.new(bar_index - 1, high, bar_index, high, style=line.style_dashed)
    line.new(bar_index - 1, high, bar_index, high, style=line.style_arrow_left)
    line.new(bar_index - 1, high, bar_index, high, style=line.style_arrow_right)
    line.new(bar_index - 1, high, bar_index, high, style=line.style_arrow_both)
`);

    expect(result.errors).toEqual([]);
    expect(result.drawings.filter((drawing) => drawing.type === 'line').map((drawing) => drawing.style)).toEqual([
      'solid',
      'dotted',
      'dashed',
      'arrow_left',
      'arrow_right',
      'arrow_both',
    ]);
  });
});
