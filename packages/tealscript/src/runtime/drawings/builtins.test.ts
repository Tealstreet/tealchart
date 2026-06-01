import { describe, it, expect } from 'vitest';
import { TealscriptEngine, executeScript } from '../engine';
import { parse } from '../../parser/parser';
import type { Bar } from '../context';

function createBars(count: number, startPrice = 100): Bar[] {
  const bars: Bar[] = [];
  const baseTime = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const price = startPrice + i * 0.5;
    bars.push({
      time: baseTime + i * 60000,
      open: price,
      high: price + 0.5,
      low: price - 0.3,
      close: price + 0.2,
      volume: 1000 + i * 10,
    });
  }

  return bars;
}

  describe('Pine drawing object outputs', () => {
    it('records basic drawing outputs', () => {
      const script = `//@version=6
indicator("Drawing calls")
label.new(bar_index, close, text="x", xloc=xloc.bar_index, yloc=yloc.price, style=label.style_label_down, color=color.red, textcolor=color.white, size=size.small)
line.new(bar_index - 1, close[1], bar_index, close)
table.new(position.top_right, 1, 1)
box.new(bar_index - 1, high, bar_index, low)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'label_label.new_0_0',
          type: 'label',
          barIndex: 0,
          x: 0,
          y: 100.2,
          text: 'x',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_down',
          color: '#F44336',
          textColor: '#FFFFFF',
          size: 'small',
        },
        {
          id: 'line_line.new_0_0',
          type: 'line',
          barIndex: 0,
          x1: -1,
          y1: null,
          x2: 0,
          y2: 100.2,
          xloc: 'bar_index',
          extend: 'none',
          color: null,
          style: 'solid',
          width: 1,
          forceOverlay: false,
        },
        {
          id: 'table_table.new_0_0',
          type: 'table',
          barIndex: 0,
          position: 'top_right',
          columns: 1,
          rows: 1,
          bgcolor: null,
          frameColor: null,
          frameWidth: 1,
          borderColor: null,
          borderWidth: 1,
          cells: [],
        },
        {
          id: 'box_box.new_0_0',
          type: 'box',
          barIndex: 0,
          left: -1,
          top: 100.5,
          right: 0,
          bottom: 99.7,
          xloc: 'bar_index',
          extend: 'none',
          borderColor: null,
          borderWidth: 1,
          borderStyle: 'solid',
          bgcolor: null,
          text: '',
          textColor: null,
          textSize: 'normal',
        },
      ]);
    });

    it('mutates, reads, copies, and deletes label drawings by handle', () => {
      const script = `//@version=6
indicator("Label mutators")
var anchor = label.new(0, close, text="seed")
if barstate.islast
    label.set_xy(anchor, bar_index, high)
    label.set_text(anchor, "last")
    label.set_style(anchor, label.style_label_up)
    label.set_color(anchor, color.green)
    label.set_textcolor(anchor, color.black)
    label.set_size(anchor, size.large)
    label.set_tooltip(anchor, "updated")
    clone = label.copy(anchor)
    label.set_text(clone, "copy")
    label.delete(clone)
plot(label.get_x(anchor), title="Label X")
plot(label.get_y(anchor), title="Label Y")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'label_label.new_0_0',
          type: 'label',
          persistent: true,
          barIndex: 2,
          x: 2,
          y: 101.5,
          text: 'last',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_up',
          color: '#4CAF50',
          textColor: '#000000',
          size: 'large',
          tooltip: 'updated',
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Label X')?.values).toEqual([0, 0, 2]);
      expect(result.plots.find((plot) => plot.title === 'Label Y')?.values).toEqual([100.2, 100.2, 101.5]);
    });

    it('preserves persistent label handles during realtime rollback', () => {
      const script = `//@version=6
indicator("Realtime label")
var marker = label.new(0, close, text="")
if barstate.islast
    label.set_xy(marker, bar_index, close)
    label.set_text(marker, str.tostring(close))
plot(label.get_x(marker), title="Label X")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();
      engine.execute(ast, bars);

      engine.updateBar(ast, {
        ...bars[2],
        high: 201,
        close: 200,
      });

      expect(engine.getDrawings()).toEqual([
        {
          id: 'label_label.new_0_0',
          type: 'label',
          persistent: true,
          barIndex: 2,
          x: 2,
          y: 200,
          text: '200',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: null,
          textColor: null,
          size: 'normal',
          tooltip: undefined,
        },
      ]);
    });

    it('covers label coordinate setters and scalar getters', () => {
      const script = `//@version=6
indicator("Label getter coverage")
var marker = label.new(0, close, text="seed")
var yonly = label.new(1, close, text="y")
if barstate.islast
    label.set_x(marker, bar_index + 3)
    label.set_y(marker, high)
    label.set_xloc(marker, bar_index + 5, xloc.bar_time)
    label.set_yloc(marker, yloc.abovebar)
    label.set_text(marker, "updated")
    label.set_style(marker, label.style_label_down)
    label.set_color(marker, color.blue)
    label.set_textcolor(marker, color.white)
    label.set_size(marker, size.tiny)
    label.set_tooltip(marker, "tip")
    label.set_yloc(yonly, yloc.belowbar)
    label.new(na, na, text=str.format("{0}|{1}|{2}|{3}|{4}|{5}|{6}|{7}", label.get_text(marker), label.get_xloc(marker), label.get_yloc(marker), label.get_style(marker), label.get_color(marker), label.get_textcolor(marker), label.get_size(marker), label.get_tooltip(marker)))
plot(label.get_x(marker), title="Label X")
plot(label.get_y(marker), title="Label Y")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'label_label.new_0_0',
          type: 'label',
          persistent: true,
          barIndex: 2,
          x: 7,
          y: 101.5,
          text: 'updated',
          xloc: 'bar_time',
          yloc: 'abovebar',
          style: 'label_down',
          color: '#2196F3',
          textColor: '#FFFFFF',
          size: 'tiny',
          tooltip: 'tip',
        },
        {
          id: 'label_label.new_1_0',
          type: 'label',
          persistent: true,
          barIndex: 0,
          x: 1,
          y: 100.2,
          text: 'y',
          xloc: 'bar_index',
          yloc: 'belowbar',
          style: 'label_left',
          color: null,
          textColor: null,
          size: 'normal',
          tooltip: undefined,
        },
        {
          id: 'label_label.new_0_2',
          type: 'label',
          barIndex: 2,
          x: null,
          y: null,
          text: 'updated|bar_time|abovebar|label_down|#2196F3|#FFFFFF|tiny|tip',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: null,
          textColor: null,
          size: 'normal',
          tooltip: undefined,
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Label X')?.values).toEqual([0, 0, 7]);
      expect(result.plots.find((plot) => plot.title === 'Label Y')?.values).toEqual([100.2, 100.2, 101.5]);
    });

    it('mutates, reads, copies, and deletes line drawings by handle', () => {
      const script = `//@version=6
indicator("Line mutators")
var trend = line.new(0, close, 1, close + 1, color=color.red, style=line.style_dotted, width=2)
if barstate.islast
    line.set_xy1(trend, bar_index - 2, low)
    line.set_xy2(trend, bar_index, high)
    line.set_extend(trend, extend.right)
    line.set_color(trend, color.green)
    line.set_style(trend, line.style_dashed)
    line.set_width(trend, 3)
    clone = line.copy(trend)
    line.set_color(clone, color.blue)
    line.delete(clone)
plot(line.get_x1(trend), title="Line X1")
plot(line.get_y2(trend), title="Line Y2")
plot(line.get_price(trend, bar_index - 1), title="Line Mid")`;

      const ast = parse(script);
      const bars = createBars(4);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'line_line.new_0_0',
          type: 'line',
          persistent: true,
          barIndex: 3,
          x1: 1,
          y1: 101.2,
          x2: 3,
          y2: 102,
          xloc: 'bar_index',
          extend: 'right',
          color: '#4CAF50',
          style: 'dashed',
          width: 3,
          forceOverlay: false,
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Line X1')?.values).toEqual([0, 0, 0, 1]);
      expect(result.plots.find((plot) => plot.title === 'Line Y2')?.values).toEqual([101.2, 101.2, 101.2, 102]);
      expect(result.plots.find((plot) => plot.title === 'Line Mid')?.values).toEqual([99.2, 100.2, 101.2, 101.6]);
    });

    it('covers line coordinate setters and xloc updates', () => {
      const script = `//@version=6
indicator("Line coordinate coverage")
var trend = line.new(0, close, 1, close)
if barstate.islast
    line.set_x1(trend, time[1])
    line.set_y1(trend, low)
    line.set_x2(trend, time)
    line.set_y2(trend, high)
    line.set_xloc(trend, time[1], time, xloc.bar_time)
plot(line.get_x1(trend), title="Line X1")
plot(line.get_x2(trend), title="Line X2")
plot(line.get_y1(trend), title="Line Y1")
plot(line.get_y2(trend), title="Line Y2")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'line_line.new_0_0',
          type: 'line',
          persistent: true,
          barIndex: 2,
          x1: bars[1]!.time,
          y1: 100.7,
          x2: bars[2]!.time,
          y2: 101.5,
          xloc: 'bar_time',
          extend: 'none',
          color: null,
          style: 'solid',
          width: 1,
          forceOverlay: false,
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Line X1')?.values).toEqual([0, 0, bars[1]!.time]);
      expect(result.plots.find((plot) => plot.title === 'Line X2')?.values).toEqual([1, 1, bars[2]!.time]);
      expect(result.plots.find((plot) => plot.title === 'Line Y1')?.values).toEqual([100.2, 100.2, 100.7]);
      expect(result.plots.find((plot) => plot.title === 'Line Y2')?.values).toEqual([100.2, 100.2, 101.5]);
    });

    it('preserves persistent line handles during realtime rollback', () => {
      const script = `//@version=6
indicator("Realtime line")
var trend = line.new(0, close, 1, close)
if barstate.islast
    line.set_xy1(trend, bar_index - 1, low)
    line.set_xy2(trend, bar_index, high)
plot(line.get_y2(trend), title="Line Y2")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();
      engine.execute(ast, bars);

      engine.updateBar(ast, {
        ...bars[2],
        high: 250,
        low: 190,
        close: 220,
      });

      expect(engine.getDrawings()).toEqual([
        {
          id: 'line_line.new_0_0',
          type: 'line',
          persistent: true,
          barIndex: 2,
          x1: 1,
          y1: 190,
          x2: 2,
          y2: 250,
          xloc: 'bar_index',
          extend: 'none',
          color: null,
          style: 'solid',
          width: 1,
          forceOverlay: false,
        },
      ]);
    });

    it('creates, reads, mutates, and deletes linefill drawings by handle', () => {
      const script = `//@version=6
indicator("Linefill objects")
var upper = line.new(0, high, 1, high)
var lower = line.new(0, low, 1, low)
var channel = linefill.new(upper, lower, color=color.red)
var deleted = linefill.new(upper, lower, color=color.blue)
if barstate.islast
    line.set_xy1(upper, bar_index - 1, high[1])
    line.set_xy2(upper, bar_index, high)
    line.set_xy1(lower, bar_index - 1, low[1])
    line.set_xy2(lower, bar_index, low)
    linefill.set_color(channel, color.green)
    linefill.delete(deleted)
    label.new(na, na, text=str.format("{0}|{1}", linefill.get_line1(channel), linefill.get_line2(channel)))
plot(close)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'line_line.new_0_0',
          type: 'line',
          persistent: true,
          barIndex: 2,
          x1: 1,
          y1: 101,
          x2: 2,
          y2: 101.5,
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
          barIndex: 2,
          x1: 1,
          y1: 100.2,
          x2: 2,
          y2: 100.7,
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
          color: '#4CAF50',
        },
        {
          id: 'label_label.new_0_2',
          type: 'label',
          barIndex: 2,
          x: null,
          y: null,
          text: 'line_line.new_0_0|line_line.new_1_0',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: null,
          textColor: null,
          size: 'normal',
          tooltip: undefined,
        },
      ]);
    });

    it('rejects linefill drawings created with non-line handles', () => {
      const script = `//@version=6
indicator("Linefill handle validation")
var marker = label.new(0, close, text="not-line")
var upper = line.new(0, high, 1, high)
linefill.new(marker, upper, color=color.red)
linefill.new("missing", upper, color=color.blue)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings.map((drawing) => drawing.type)).toEqual(['label', 'line']);
    });

    it('mutates, reads, copies, and deletes box drawings by handle', () => {
      const script = `//@version=6
indicator("Box objects")
var zone = box.new(0, high, 1, low, border_color=color.red, border_width=2, border_style=line.style_dotted, bgcolor=color.blue, text="seed")
if barstate.islast
    box.set_lefttop(zone, bar_index - 2, high)
    box.set_rightbottom(zone, bar_index, low)
    box.set_bgcolor(zone, color.green)
    box.set_border_color(zone, color.white)
    box.set_border_width(zone, 3)
    box.set_border_style(zone, line.style_dashed)
    box.set_extend(zone, extend.right)
    box.set_text(zone, "last")
    box.set_text_color(zone, color.black)
    box.set_text_size(zone, size.large)
    clone = box.copy(zone)
    box.set_text(clone, "copy")
    box.delete(clone)
plot(box.get_left(zone), title="Box Left")
plot(box.get_top(zone), title="Box Top")
if barstate.islast
    label.new(na, na, text=str.format("{0}|{1}|{2}", box.get_text(zone), box.get_bgcolor(zone), box.get_border_color(zone)))`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'box_box.new_0_0',
          type: 'box',
          persistent: true,
          barIndex: 2,
          left: 0,
          top: 101.5,
          right: 2,
          bottom: 100.7,
          xloc: 'bar_index',
          extend: 'right',
          borderColor: '#FFFFFF',
          borderWidth: 3,
          borderStyle: 'dashed',
          bgcolor: '#4CAF50',
          text: 'last',
          textColor: '#000000',
          textSize: 'large',
        },
        {
          id: 'label_label.new_0_2',
          type: 'label',
          barIndex: 2,
          x: null,
          y: null,
          text: 'last|#4CAF50|#FFFFFF',
          xloc: 'bar_index',
          yloc: 'price',
          style: 'label_left',
          color: null,
          textColor: null,
          size: 'normal',
          tooltip: undefined,
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Box Left')?.values).toEqual([0, 0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Box Top')?.values).toEqual([100.5, 100.5, 101.5]);
    });

    it('preserves persistent box handles during realtime rollback', () => {
      const script = `//@version=6
indicator("Realtime box")
var zone = box.new(0, high, 1, low)
if barstate.islast
    box.set_lefttop(zone, bar_index - 1, high)
    box.set_rightbottom(zone, bar_index, low)
plot(box.get_bottom(zone), title="Box Bottom")`;

      const ast = parse(script);
      const bars = createBars(3);
      const engine = new TealscriptEngine();
      engine.execute(ast, bars);

      engine.updateBar(ast, {
        ...bars[2],
        high: 250,
        low: 190,
        close: 220,
      });

      expect(engine.getDrawings()).toEqual([
        {
          id: 'box_box.new_0_0',
          type: 'box',
          persistent: true,
          barIndex: 2,
          left: 1,
          top: 250,
          right: 2,
          bottom: 190,
          xloc: 'bar_index',
          extend: 'none',
          borderColor: null,
          borderWidth: 1,
          borderStyle: 'solid',
          bgcolor: null,
          text: '',
          textColor: null,
          textSize: 'normal',
        },
      ]);
    });

    it('maps positional box text_size before text_color', () => {
      const script = `//@version=6
indicator("Box positional args")
box.new(0, high, 1, low, color.red, 1, line.style_solid, extend.none, xloc.bar_index, color.green, "txt", size.large, color.black)
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings[0]).toMatchObject({
        type: 'box',
        text: 'txt',
        textSize: 'large',
        textColor: '#000000',
      });
    });

    it('records force-overlay labels and box text layout metadata', () => {
      const script = `//@version=6
indicator("Drawing layout", overlay=false)
label.new(bar_index, close, text="forced", force_overlay=true)
zone = box.new(0, high, 1, low, text="seed", text_halign=text.align_center, text_valign=text.align_middle, text_wrap=text.wrap_auto, text_font_family=font.family_monospace, force_overlay=true)
box.set_text_halign(zone, text.align_right)
box.set_text_valign(zone, text.align_bottom)
box.set_text_wrap(zone, text.wrap_none)
box.set_text_font_family(zone, font.family_default)
label.new(na, na, text=str.format("{0}|{1}", box.get_text_halign(zone), box.get_text_valign(zone)))
plot(close)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings[0]).toMatchObject({
        type: 'label',
        text: 'forced',
        forceOverlay: true,
      });
      expect(result.drawings[1]).toMatchObject({
        type: 'box',
        text: 'seed',
        textHalign: 'right',
        textValign: 'bottom',
        textWrap: 'none',
        textFontFamily: 'default',
        forceOverlay: true,
      });
      expect(result.drawings[2]).toMatchObject({
        type: 'label',
        text: 'right|bottom',
      });
    });

    it('applies declaration object limits and exposes all-id arrays', () => {
      const script = `//@version=6
indicator("Drawing limits", overlay=true, max_labels_count=2, max_lines_count=1, max_boxes_count=1)
label.new(bar_index, close, text="old")
line.new(bar_index - 1, low, bar_index, high)
box.new(bar_index - 1, high, bar_index, low)
if barstate.islast
    label.new(bar_index, high, text="mid")
    label.new(bar_index, low, text="new")
    line.new(bar_index - 1, close, bar_index, close)
    box.new(bar_index - 1, high + 1, bar_index, low - 1)
plot(array.size(label.all), title="Labels")
plot(array.size(line.all), title="Lines")
plot(array.size(box.all), title="Boxes")`;

      const ast = parse(script);
      const bars = createBars(2);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings.map((drawing) => drawing.type)).toEqual(['label', 'label', 'line', 'box']);
      expect(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual(['mid', 'new']);
      expect(result.plots.find((plot) => plot.title === 'Labels')?.values).toEqual([1, 2]);
      expect(result.plots.find((plot) => plot.title === 'Lines')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Boxes')?.values).toEqual([1, 1]);
    });

    it('supports chart.point constructors and line/box point overloads', () => {
      const script = `//@version=6
indicator("Chart points", overlay=true)
current = chart.point.now(high)
if barstate.islast
    left = chart.point.from_index(0, close[2])
    right = chart.point.now(high)
    timedLeft = chart.point.from_time(time[1], low[1])
    timedRight = chart.point.new(time, bar_index, high)
    copied = chart.point.copy(right)
    line.new(left, copied, color=color.green, width=2)
    line.new(timedLeft, timedRight, xloc.bar_time, extend.none, color.red)
    box.new(left, copied, color.blue, 1, line.style_solid, extend.none, xloc.bar_index, color.new(color.blue, 80), "zone")
plot(current.index, title="Point Index")
plot(current.price, title="Point Price")`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'line_line.new_0_2',
          type: 'line',
          barIndex: 2,
          x1: 0,
          y1: 100.2,
          x2: 2,
          y2: 101.5,
          xloc: 'bar_index',
          extend: 'none',
          color: '#4CAF50',
          style: 'solid',
          width: 2,
          forceOverlay: false,
        },
        {
          id: 'line_line.new_1_2',
          type: 'line',
          barIndex: 2,
          x1: bars[1]!.time,
          y1: 100.2,
          x2: bars[2]!.time,
          y2: 101.5,
          xloc: 'bar_time',
          extend: 'none',
          color: '#F44336',
          style: 'solid',
          width: 1,
          forceOverlay: false,
        },
        {
          id: 'box_box.new_0_2',
          type: 'box',
          barIndex: 2,
          left: 0,
          top: 100.2,
          right: 2,
          bottom: 101.5,
          xloc: 'bar_index',
          extend: 'none',
          borderColor: '#2196F3',
          borderWidth: 1,
          borderStyle: 'solid',
          bgcolor: '#2196F333',
          text: 'zone',
          textColor: null,
          textSize: 'normal',
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Point Index')?.values).toEqual([0, 1, 2]);
      expect(result.plots.find((plot) => plot.title === 'Point Price')?.values).toEqual([100.5, 101, 101.5]);
    });

    it('records, copies, deletes, limits, and exposes polyline drawings', () => {
      const script = `//@version=6
indicator("Polylines", overlay=true, max_polylines_count=1)
points = array.from(chart.point.from_index(0, low), chart.point.from_index(1, high), chart.point.from_index(2, close))
poly = polyline.new(points, curved=false, closed=true, line_color=color.red, fill_color=color.new(color.blue, 80), line_style=line.style_dotted, line_width=2, force_overlay=true)
clone = polyline.copy(poly)
polyline.delete(poly)
plot(array.size(polyline.all), title="Polylines")`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'polyline_polyline.copy_0_0',
          type: 'polyline',
          barIndex: 0,
          points: [
            { type: 'chart.point', time: null, index: 0, price: 99.7 },
            { type: 'chart.point', time: null, index: 1, price: 100.5 },
            { type: 'chart.point', time: null, index: 2, price: 100.2 },
          ],
          curved: false,
          closed: true,
          xloc: 'bar_index',
          lineColor: '#F44336',
          fillColor: '#2196F333',
          lineStyle: 'dotted',
          lineWidth: 2,
          forceOverlay: true,
          persistent: false,
        },
      ]);
      expect(result.plots.find((plot) => plot.title === 'Polylines')?.values).toEqual([1]);
    });

    it('records table cells and common cell setters', () => {
      const script = `//@version=6
indicator("Tables", overlay=true)
var stats = table.new(position.bottom_right, 2, 2, bgcolor=color.new(color.black, 80), frame_color=color.white, frame_width=2, border_color=color.blue, border_width=1)
if barstate.islast
    table.set_position(stats, position.top_left)
    table.set_bgcolor(stats, color.new(color.red, 70))
    table.set_frame_color(stats, color.green)
    table.set_frame_width(stats, 3)
    table.set_border_color(stats, color.white)
    table.set_border_width(stats, 2)
    table.cell(stats, 0, 0, "ATR", text_color=color.white, bgcolor=color.blue)
    table.cell(stats, 1, 0, str.tostring(close), text_halign=text.align_right, text_size=size.large)
    table.cell_set_text(stats, 1, 0, "last")
    table.cell_set_bgcolor(stats, 1, 0, color.green)
    table.cell_set_text_color(stats, 1, 0, color.black)
    table.cell_set_width(stats, 1, 0, 72)
    table.cell_set_height(stats, 1, 0, 28)
    table.cell_set_text_halign(stats, 1, 0, text.align_center)
    table.cell_set_text_valign(stats, 1, 0, text.align_bottom)
    table.cell_set_text_font_family(stats, 1, 0, font.family_monospace)
    table.cell_set_text(stats, 0, 1, "created")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(2);
      const result = executeScript(ast, bars);

      expect(result.errors).toEqual([]);
      expect(result.drawings).toEqual([
        {
          id: 'table_table.new_0_0',
          type: 'table',
          persistent: true,
          barIndex: 0,
          position: 'top_left',
          columns: 2,
          rows: 2,
          bgcolor: '#F443364D',
          frameColor: '#4CAF50',
          frameWidth: 3,
          borderColor: '#FFFFFF',
          borderWidth: 2,
          cells: [
            {
              column: 0,
              row: 0,
              text: 'ATR',
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
              text: 'last',
              width: 72,
              height: 28,
              textColor: '#000000',
              textHalign: 'center',
              textValign: 'bottom',
              textFontFamily: 'monospace',
              textSize: 'large',
              bgcolor: '#4CAF50',
            },
            {
              column: 0,
              row: 1,
              text: 'created',
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
    });

    it('reports table cell coordinates outside the declared grid', () => {
      const script = `//@version=6
indicator("Tables", overlay=true)
var stats = table.new(position.bottom_right, 1, 1)
if barstate.islast
    table.cell(stats, 1, 0, "outside")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(2);
      const result = executeScript(ast, bars);

      expect(result.errors[0]?.message).toBe('Table cell coordinates out of bounds: column 1, row 0');
    });

    it('caps declared table cell capacity across live tables', () => {
      const script = `//@version=6
indicator("Table cell limit", overlay=true)
first = table.new(position.top_left, 100, 100)
second = table.new(position.top_right, 1, 1)
plot(close)`;

      const ast = parse(script);
      const result = executeScript(ast, createBars(1));

      expect(result.errors.map((error) => error.message)).toEqual(['Too many table cells: maximum is 10000']);
      expect(result.drawings.filter((drawing) => drawing.type === 'table')).toHaveLength(1);
    });
  });
