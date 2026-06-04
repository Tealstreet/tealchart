import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
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
        color: '#F44336',
        textColor: '#FFFFFF',
        size: 'small',
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
        textSize: 'normal',
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
        textSize: 'normal',
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
        color: '#FFEB3B99',
        style: 'dashed',
        width: 3,
        forceOverlay: false,
      },
    ]);
    expect(getPlot(result, 'Named Line X1').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 9]);
    expect(getPlot(result, 'Named Line Y2').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 113]);
    expect(getPlot(result, 'Named Line Price').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 110]);
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
        textColor: '#000000',
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
        lineColor: '#F44336',
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
            textColor: '#000000',
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
        bgcolor: '#9E9E9E33',
        frameColor: '#FFFFFF',
        frameWidth: 2,
        borderColor: '#000000',
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
            textColor: '#000000',
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
        color: '#F44336',
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
        textSize: 'normal',
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
        color: '#F44336',
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
        textSize: 'normal',
      },
      {
        id: 'table_table.new_0_11',
        type: 'table',
        barIndex: 11,
        position: 'bottom_right',
        columns: 2,
        rows: 1,
        bgcolor: '#9E9E9E33',
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
});
