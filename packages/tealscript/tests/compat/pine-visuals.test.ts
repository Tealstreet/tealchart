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
      '#F44336',
      '#F44336',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#F44336',
      '#4CAF50',
      '#F44336',
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
plotcandle(o, h, l, c, title="Custom candles", color=bodyColor, wickcolor=wickColor, bordercolor=bodyColor)
plotbar(o, h + 1, l - 1, c, title="Custom bars", color=bodyColor)
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

    const bars = getPlot(result, 'Custom bars');
    expect(bars.type).toBe('plotbar');
    expect(bars.highValues).toEqual([null, 107, 109, 110, 105, 102, 106, 111, 112, 113, 115, 114]);
    expect(bars.lowValues).toEqual([null, 100, 103, 101, 97, 95, 98, 102, 105, 106, 108, 107]);
    expect(bars.color).toEqual(candles.color);
  });

  it('accepts common Pine visual declaration and plot constants', () => {
    const result = runCompatScript(`
indicator("Visual constants smoke", overlay=true, format=format.price, scale=scale.right)
displayTarget = display.all - display.status_line
formatMatches = format.price == "price" and format.volume == "volume" and format.percent == "percent" and format.inherit == "inherit"
scaleMatches = scale.right == "right" and scale.left == "left" and scale.none == "none"
plot(close, title="Break Line", style=plot.style_linebr, display=displayTarget)
plot(open, title="Step Diamonds", style=plot.style_stepline_diamond, display=display.none)
plot(high, title="Columns", style=plot.style_columns, histbase=100, trackprice=true, show_last=5)
plot(formatMatches ? 1 : 0, title="Format Constants")
plot(scaleMatches ? 1 : 0, title="Scale Constants")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Break Line').style).toBe('linebr');
    expect(getPlot(result, 'Step Diamonds').style).toBe('stepline_diamond');
    expect(getPlot(result, 'Columns').style).toBe('columns');
    expect(getPlot(result, 'Break Line').values).toHaveLength(compatibilityBars.length);
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
fill(upperPlot, lowerPlot, color=color.new(color.green, 80), title="Band Fill")
fill(topLine, bottomLine, color=color.new(color.blue, 90), title="Range Fill")
`);

    expect(result.errors).toEqual([]);
    const bandFill = getPlot(result, 'Band Fill');
    const rangeFill = getPlot(result, 'Range Fill');

    expect(bandFill.type).toBe('fill');
    expect(bandFill.plot1Id).toBe('plot_Upper');
    expect(bandFill.plot2Id).toBe('plot_Lower');
    expect(bandFill.color).toEqual(Array(compatibilityBars.length).fill('#4CAF5033'));

    expect(rangeFill.type).toBe('fill');
    expect(rangeFill.plot1Id).toBe('hline_Top');
    expect(rangeFill.plot2Id).toBe('hline_Bottom');
    expect(rangeFill.color).toEqual(Array(compatibilityBars.length).fill('#2196F31A'));
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
    expect(fillPlot.color).toEqual(Array(compatibilityBars.length).fill('#F4433626'));
  });
});
