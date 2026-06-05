import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
  it('runs conditional barcolor helper idioms', () => {
    const result = runCompatScript(`
indicator("Barcolor smoke", overlay=true)
candleColor = bar_index == 0 ? na : close > open ? color.green : close < open ? color.red : na
barcolor(candleColor)
`);

    expect(result.errors).toEqual([]);
    const barColors = result.plots.find((plot) => plot.type === 'barcolor');
    expect(barColors?.color).toEqual([
      null,
      '#4CAF50',
      '#4CAF50',
      '#F23645',
      '#F23645',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#F23645',
      '#4CAF50',
      '#F23645',
      '#4CAF50',
    ]);
  });

  it('runs documented alert helper idioms', () => {
    const result = runCompatScript(`
indicator("Alert smoke", overlay=true)
triggerCondition = close > close[1]
alertcondition(triggerCondition, "Close crossed up", "Close crossed above previous close")
if triggerCondition
    alert("Close " + str.tostring(close, "#") + " crossed previous close", alert.freq_once_per_bar_close)
`);

    expect(result.errors).toEqual([]);
    const condition = result.alerts.find((alert) => alert.type === 'alertcondition');
    const directAlert = result.alerts.find((alert) => alert.type === 'alert');

    expect(condition).toMatchObject({
      title: 'Close crossed up',
      message: 'Close crossed above previous close',
    });
    expect(condition?.values).toEqual([null, true, true, null, null, true, true, true, null, true, null, true]);

    expect(directAlert?.frequency).toBe('once_per_bar_close');
    expect(directAlert?.events.map((event) => event.barIndex)).toEqual([1, 2, 5, 6, 7, 9, 11]);
    expect(directAlert?.events.map((event) => event.message)).toEqual([
      'Close 105 crossed previous close',
      'Close 107 crossed previous close',
      'Close 100 crossed previous close',
      'Close 104 crossed previous close',
      'Close 109 crossed previous close',
      'Close 111 crossed previous close',
      'Close 112 crossed previous close',
    ]);
  });

  it('runs documented custom candle and bar plotting idioms', () => {
    const result = runCompatScript(`
indicator("Custom OHLC smoke", overlay=true)
o = bar_index == 0 ? na : open
h = bar_index == 0 ? na : high
l = bar_index == 0 ? na : low
c = bar_index == 0 ? na : close
upColor = color.silver
downColor = color.blue
bodyColor = c >= o ? upColor : downColor
wickColor = color.new(bodyColor, 70)
plotcandle(o, h, l, c, title="Custom candles", color=bodyColor, wickcolor=wickColor, bordercolor=bodyColor, editable=true, show_last=5, display=display.price_scale, format=format.price, precision=2, force_overlay=true)
plotbar(o, h + 1, l - 1, c, "Custom bars", bodyColor, false, 6, display.none, format.volume, 0, true)
`);

    expect(result.errors).toEqual([]);
    const candles = getPlot(result, 'Custom candles');
    expect(candles.type).toBe('plotcandle');
    expect(candles.openValues).toEqual([null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
    expect(candles.highValues).toEqual([null, 106, 108, 109, 104, 101, 105, 110, 111, 112, 114, 113]);
    expect(candles.lowValues).toEqual([null, 101, 104, 102, 98, 96, 99, 103, 106, 107, 109, 108]);
    expect(candles.closeValues).toEqual([null, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(candles.color).toEqual([
      null,
      '#B2B5BE',
      '#B2B5BE',
      '#2196F3',
      '#2196F3',
      '#B2B5BE',
      '#B2B5BE',
      '#B2B5BE',
      '#2196F3',
      '#B2B5BE',
      '#2196F3',
      '#B2B5BE',
    ]);
    expect(candles.wickColor).toEqual([
      null,
      '#B2B5BE4D',
      '#B2B5BE4D',
      '#2196F34D',
      '#2196F34D',
      '#B2B5BE4D',
      '#B2B5BE4D',
      '#B2B5BE4D',
      '#2196F34D',
      '#B2B5BE4D',
      '#2196F34D',
      '#B2B5BE4D',
    ]);
    expect(candles.editable).toBe(true);
    expect(candles.showLast).toBe(5);
    expect(candles.display).toBe(8);
    expect(candles.format).toBe('price');
    expect(candles.precision).toBe(2);
    expect(candles.forceOverlay).toBe(true);

    const bars = getPlot(result, 'Custom bars');
    expect(bars.type).toBe('plotbar');
    expect(bars.highValues).toEqual([null, 107, 109, 110, 105, 102, 106, 111, 112, 113, 115, 114]);
    expect(bars.lowValues).toEqual([null, 100, 103, 101, 97, 95, 98, 102, 105, 106, 108, 107]);
    expect(bars.color).toEqual(candles.color);
    expect(bars.editable).toBe(false);
    expect(bars.showLast).toBe(6);
    expect(bars.display).toBe(0);
    expect(bars.format).toBe('volume');
    expect(bars.precision).toBe(0);
    expect(bars.forceOverlay).toBe(true);
  });

  it('captures background and bar color visual parameters', () => {
    const result = runCompatScript(`
indicator("Bar background smoke", overlay=true)
bgcolor(bar_index == 0 ? color.blue : na, 1, false, 4, "Session", display.price_scale, force_overlay=true)
barcolor(bar_index == 0 ? color.red : na, 1, true, 5, "Bar Tint", display.none)
`);

    expect(result.errors).toEqual([]);
    const background = getPlot(result, 'Session');
    expect(background.type).toBe('bgcolor');
    expect(background.color).toEqual([null, '#2196F3', ...Array(compatibilityBars.length - 1).fill(null)]);
    expect(background.values).toEqual([null, 1, ...Array(compatibilityBars.length - 1).fill(null)]);
    expect(background.offset).toBe(1);
    expect(background.editable).toBe(false);
    expect(background.showLast).toBe(4);
    expect(background.display).toBe(8);
    expect(background.forceOverlay).toBe(true);

    const barTint = getPlot(result, 'Bar Tint');
    expect(barTint.type).toBe('barcolor');
    expect(barTint.color).toEqual([null, '#F23645', ...Array(compatibilityBars.length - 1).fill(null)]);
    expect(barTint.offset).toBe(1);
    expect(barTint.editable).toBe(true);
    expect(barTint.showLast).toBe(5);
    expect(barTint.display).toBe(0);
  });

  it('accepts common Pine visual declaration and plot constants', () => {
    const result = runCompatScript(`
indicator("Visual constants smoke", overlay=true, format=format.price, scale=scale.right, explicit_plot_zorder=true)
displayTarget = display.all - display.status_line
formatMatches = format.price == "price" and format.volume == "volume" and format.percent == "percent" and format.inherit == "inherit"
scaleMatches = scale.right == "right" and scale.left == "left" and scale.none == "none"
plot(close, title="Break Line", style=plot.style_linebr, display=displayTarget, linestyle=plot.linestyle_dashed)
plot(open, title="Step Diamonds", style=plot.style_stepline_diamond, display=display.none)
plot(high, title="Columns", style=plot.style_columns, histbase=100, trackprice=true, show_last=5)
plot(low, "Positional Area", color.red, 3, plot.style_area, true, 90, -1, true, false, 4, display.price_scale, format.volume, 0, true)
hline(50, "Midline", color=color.blue, linestyle=hline.style_dotted, linewidth=2, editable=false, display=display.price_scale)
hline(75, "Solid Positional", color.red, hline.style_solid, 3, true, display.none)
plot(formatMatches ? 1 : 0, title="Format Constants")
plot(scaleMatches ? 1 : 0, title="Scale Constants")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorFormat).toBe('price');
    expect(result.indicatorScale).toBe('right');
    expect(result.indicatorExplicitPlotZOrder).toBe(true);
    const breakLine = getPlot(result, 'Break Line');
    const stepDiamonds = getPlot(result, 'Step Diamonds');
    const columns = getPlot(result, 'Columns');
    const positionalArea = getPlot(result, 'Positional Area');
    const midline = getPlot(result, 'Midline');
    const solidPositional = getPlot(result, 'Solid Positional');

    expect(breakLine.style).toBe('linebr');
    expect(breakLine.lineStyle).toBe('dashed');
    expect(breakLine.display).toBe(11);
    expect(stepDiamonds.style).toBe('stepline_diamond');
    expect(stepDiamonds.display).toBe(0);
    expect(columns.style).toBe('columns');
    expect(columns.histbase).toBe(100);
    expect(columns.trackprice).toBe(true);
    expect(columns.showLast).toBe(5);
    expect(positionalArea).toMatchObject({
      linewidth: 3,
      style: 'area',
      trackprice: true,
      histbase: 90,
      offset: -1,
      join: true,
      editable: false,
      showLast: 4,
      display: 8,
      format: 'volume',
      precision: 0,
      forceOverlay: true,
    });
    expect(midline).toMatchObject({
      type: 'hline',
      price: 50,
      color: '#2196F3',
      lineStyle: 'dotted',
      linewidth: 2,
      editable: false,
      display: 8,
    });
    expect(solidPositional).toMatchObject({
      type: 'hline',
      price: 75,
      color: '#F23645',
      lineStyle: 'solid',
      linewidth: 3,
      editable: true,
      display: 0,
    });
    expect(result.plots.map((plot) => [plot.title, plot.zOrder])).toEqual([
      ['Break Line', 0],
      ['Step Diamonds', 1],
      ['Columns', 2],
      ['Positional Area', 3],
      ['Midline', 4],
      ['Solid Positional', 5],
      ['Format Constants', 6],
      ['Scale Constants', 7],
    ]);
    expect(breakLine.values).toHaveLength(compatibilityBars.length);
    expect(getPlot(result, 'Format Constants').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Scale Constants').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('fills between Pine plot and hline handles', () => {
    const result = runCompatScript(`
indicator("Fill handles smoke", overlay=true)
basis = ta.sma(close, 3)
upper = basis + 2
lower = basis - 2
upperPlot = plot(upper, title="Upper", color=color.green)
lowerPlot = plot(lower, title="Lower", color=color.red)
topLine = hline(110, title="Top")
bottomLine = hline(100, title="Bottom")
fillColor = bar_index == 1 ? na : color.new(color.green, 80)
fill(upperPlot, lowerPlot, color=fillColor, title="Band Fill", editable=false, show_last=6, fillgaps=false, display=display.price_scale)
fill(topLine, bottomLine, color.new(color.blue, 90), "Range Fill", true, 4, true, display.none)
`);

    expect(result.errors).toEqual([]);
    const bandFill = getPlot(result, 'Band Fill');
    const rangeFill = getPlot(result, 'Range Fill');

    expect(bandFill.type).toBe('fill');
    expect(bandFill.plot1Id).toBe('plot_Upper');
    expect(bandFill.plot2Id).toBe('plot_Lower');
    expect(bandFill.color).toEqual([
      '#4CAF5033',
      null,
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
      '#4CAF5033',
    ]);
    expect(bandFill.editable).toBe(false);
    expect(bandFill.showLast).toBe(6);
    expect(bandFill.fillgaps).toBe(false);
    expect(bandFill.display).toBe(8);

    expect(rangeFill.type).toBe('fill');
    expect(rangeFill.plot1Id).toBe('hline_Top');
    expect(rangeFill.plot2Id).toBe('hline_Bottom');
    expect(rangeFill.color).toEqual(Array(compatibilityBars.length).fill('#2196F31A'));
    expect(rangeFill.editable).toBe(true);
    expect(rangeFill.showLast).toBe(4);
    expect(rangeFill.fillgaps).toBe(true);
    expect(rangeFill.display).toBe(0);
  });

  it('captures Pine marker visual parameters', () => {
    const result = runCompatScript(`
indicator("Marker visuals smoke", overlay=true)
plotshape(close > open, "Long", shape.triangleup, location.belowbar, color.green, 1, "L", color.white, false, size.large, 5, display.price_scale, format.price, 2, true)
plotchar(close < open, "Down Char", "D", location.abovebar, color.red, -1, "Down", color.yellow, true, size.small, 6, display.none, format.volume, 0, true)
plotarrow(close - open, "Move Arrow", color.new(color.green, 50), color.new(color.red, 50), 0, 5, 20, false, 7, display.all, format.price, 2, true)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Long')).toMatchObject({
      type: 'plotshape',
      shape: 'triangleup',
      location: 'belowbar',
      size: 'large',
      text: 'L',
      textColor: '#FFFFFF',
      offset: 1,
      editable: false,
      showLast: 5,
      display: 8,
      format: 'price',
      precision: 2,
      forceOverlay: true,
    });
    expect(getPlot(result, 'Down Char')).toMatchObject({
      type: 'plotchar',
      char: 'D',
      location: 'abovebar',
      size: 'small',
      text: 'Down',
      textColor: '#FDD835',
      offset: -1,
      editable: true,
      showLast: 6,
      display: 0,
      format: 'volume',
      precision: 0,
      forceOverlay: true,
    });
    expect(getPlot(result, 'Move Arrow')).toMatchObject({
      type: 'plotarrow',
      colorup: '#4CAF5080',
      colordown: '#F2364580',
      offset: 0,
      minHeight: 5,
      maxHeight: 20,
      editable: false,
      showLast: 7,
      display: 15,
      format: 'price',
      precision: 2,
      forceOverlay: true,
    });
  });

  it('preserves legacy fill title references before plot registration', () => {
    const result = runCompatScript(`
indicator("Legacy fill smoke", overlay=true)
fill("Upper", "Lower", color=color.new(color.red, 85), title="Legacy Fill")
plot(high, title="Upper")
plot(low, title="Lower")
`);

    expect(result.errors).toEqual([]);
    const fillPlot = getPlot(result, 'Legacy Fill');

    expect(fillPlot.type).toBe('fill');
    expect(fillPlot.plot1Id).toBe('plot_Upper');
    expect(fillPlot.plot2Id).toBe('plot_Lower');
    expect(fillPlot.color).toEqual(Array(compatibilityBars.length).fill('#F2364526'));
  });

  it('keeps unnamed fill calls distinct', () => {
    const result = runCompatScript(`
indicator("Unnamed fill smoke", overlay=true)
upper = plot(high)
middle = plot(close)
lower = plot(low)
fill(upper, middle, color=color.new(color.green, 80))
fill(middle, lower, color=color.new(color.red, 80))
`);

    expect(result.errors).toEqual([]);
    const fills = result.plots.filter((plot) => plot.type === 'fill');
    expect(fills).toHaveLength(2);
    expect(fills[0]?.id).not.toBe(fills[1]?.id);
    expect(fills.map((plot) => plot.plot1Id)).toEqual(['plot_untitled_0', 'plot_untitled_1']);
    expect(fills.map((plot) => plot.plot2Id)).toEqual(['plot_untitled_1', 'plot_untitled_2']);
  });

  it('resolves mixed named and positional visual output arguments in Pine order', () => {
    const result = runCompatScript(`
indicator("Mixed Visual Outputs", overlay=true)
o = bar_index == 0 ? na : open
h = bar_index == 0 ? na : high
l = bar_index == 0 ? na : low
c = bar_index == 0 ? na : close
upper = plot(series=high, "Fill Upper", color.green)
lower = plot(series=low, "Fill Lower", color.red)
plot(series=close, "Mixed Plot", color.blue, 2, plot.style_columns)
hline(price=100, "Mixed HLine", color.orange, hline.style_dashed, 2)
bgcolor(color=bar_index == 0 ? color.blue : na, 1, false, 3, "Mixed Bg")
barcolor(color=bar_index == 0 ? color.red : na, 1, true, 4, "Mixed Bar")
plotbar(open=o, h, l, c, "Mixed Bars", color.purple, false, 5, display.none)
plotcandle(open=o, h, l, c, "Mixed Candles", color.silver, color.yellow, false, 6, color.black)
plotshape(series=close > open, "Mixed Shape", shape.triangleup, location.belowbar, color.green, 0, "S")
plotchar(series=close < open, "Mixed Char", "C", location.abovebar, color.red, 0, "C")
plotarrow(series=close - open, "Mixed Arrow", color.green, color.red, 0, 5, 15)
fill(plot1=upper, lower, color.new(color.orange, 80), "Mixed Fill", false, 6)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Mixed Plot')).toMatchObject({
      type: 'plot',
      linewidth: 2,
      style: 'columns',
    });
    expect(getPlot(result, 'Mixed Plot').color).toEqual(Array(compatibilityBars.length).fill('#2196F3'));

    expect(getPlot(result, 'Mixed HLine')).toMatchObject({
      type: 'hline',
      price: 100,
      color: '#FF9800',
      lineStyle: 'dashed',
      linewidth: 2,
    });

    const mixedBg = getPlot(result, 'Mixed Bg');
    expect(mixedBg.type).toBe('bgcolor');
    expect(mixedBg.color).toEqual([null, '#2196F3', ...Array(compatibilityBars.length - 1).fill(null)]);
    expect(mixedBg.offset).toBe(1);
    expect(mixedBg.editable).toBe(false);
    expect(mixedBg.showLast).toBe(3);

    const mixedBar = getPlot(result, 'Mixed Bar');
    expect(mixedBar.type).toBe('barcolor');
    expect(mixedBar.color).toEqual([null, '#F23645', ...Array(compatibilityBars.length - 1).fill(null)]);
    expect(mixedBar.offset).toBe(1);
    expect(mixedBar.editable).toBe(true);
    expect(mixedBar.showLast).toBe(4);

    expect(getPlot(result, 'Mixed Bars')).toMatchObject({
      type: 'plotbar',
      color: [null, ...Array(compatibilityBars.length - 1).fill('#9C27B0')],
      editable: false,
      showLast: 5,
      display: 0,
    });
    expect(getPlot(result, 'Mixed Candles')).toMatchObject({
      type: 'plotcandle',
      color: [null, ...Array(compatibilityBars.length - 1).fill('#B2B5BE')],
      wickColor: [null, ...Array(compatibilityBars.length - 1).fill('#FDD835')],
      borderColor: [null, ...Array(compatibilityBars.length - 1).fill('#363A45')],
      editable: false,
      showLast: 6,
    });
    expect(getPlot(result, 'Mixed Shape')).toMatchObject({
      type: 'plotshape',
      shape: 'triangleup',
      location: 'belowbar',
      text: 'S',
    });
    expect(getPlot(result, 'Mixed Char')).toMatchObject({
      type: 'plotchar',
      char: 'C',
      location: 'abovebar',
      text: 'C',
    });
    expect(getPlot(result, 'Mixed Arrow')).toMatchObject({
      type: 'plotarrow',
      colorup: '#4CAF50',
      colordown: '#F23645',
      minHeight: 5,
      maxHeight: 15,
    });
    expect(getPlot(result, 'Mixed Fill')).toMatchObject({
      type: 'fill',
      plot1Id: 'plot_Fill Upper',
      plot2Id: 'plot_Fill Lower',
      editable: false,
      showLast: 6,
    });
    expect(getPlot(result, 'Mixed Fill').color).toEqual(Array(compatibilityBars.length).fill('#FF980033'));
  });
});
