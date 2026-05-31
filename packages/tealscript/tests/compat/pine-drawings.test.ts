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
        tooltip: 'last confirmed',
      },
    ]);
    expect(getPlot(result, 'Marker X').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 11]);
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
        color: null,
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
        color: null,
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
        textColor: null,
        textSize: 'normal',
      },
    ]);
    expect(getPlot(result, 'Upper Price').values).toEqual([103, 103, 103, 103, 103, 103, 103, 103, 103, 103, 103, 113]);
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
        frameWidth: 1,
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
});
