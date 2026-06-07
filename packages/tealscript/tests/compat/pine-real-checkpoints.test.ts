import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import {
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  InMemoryRequestDatafeed,
  InMemoryStrategyIntrabarDatafeed,
  seedRequestSymbol,
  TealscriptEngine,
  type Bar,
  type PlotOutput,
} from '../../src/runtime';
import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine real idiom checkpoints', () => {
  it('locks a reduced official built-ins namespace idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/language/built-ins/
    const result = runCompatScript(`
indicator("Official Built-ins Checkpoint")
average = ta.sma(close, 3)
plot(average, title="SMA")
plot(close > average ? 1 : 0, title="Above Average")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'SMA').values)).toEqual([
      null,
      null,
      104.666667,
      105,
      103,
      100.666667,
      101,
      104.333333,
      107,
      109.333333,
      109.666667,
      111,
    ]);
    expect(getPlot(result, 'Above Average').values).toEqual([0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks reduced official barstate and array growth idioms', () => {
    // Sources:
    // - https://www.tradingview.com/pine-script-docs/concepts/bar-states/
    // - https://www.tradingview.com/pine-script-docs/language/arrays/
    const result = runCompatScript(`
indicator("Official Array Checkpoint")
var array<float> values = array.new_float(0)
if barstate.isfirst
    array.push(values, close)
array.push(values, high)
plot(array.get(values, 0), title="First Close")
plot(array.size(values), title="Array Size")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'First Close').values).toEqual(Array(compatibilityBars.length).fill(102));
    expect(getPlot(result, 'Array Size').values).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('locks a reduced public input configuration idiom', () => {
    // Public idiom reference: configurable public indicators commonly expose
    // grouped inputs for mode selection, source, lengths, and levels before
    // deriving a visible signal.
    // Source search: https://www.tradingview.com/scripts/search/configurable%20indicator%20inputs/
    const result = runCompatScript(`
indicator("Public Input Configuration Checkpoint")
enum Mode
    sma = "SMA"
    ema = "EMA"
mode = input.enum(Mode.sma, "Mode", [Mode.sma, Mode.ema], "Mode tooltip")
length = input.int(3, "Length", minval=1, maxval=10, step=1, tooltip="Length tooltip", inline="ma", group="Inputs", confirm=true, display=display.data_window, active=true)
showSignals = input.bool(true, "Show Signals", tooltip="Toggle signals")
source = input.source(close, "Source", "Source tooltip", "src", "Inputs", true, display.data_window, true)
level = input.price(104.5, "Level", "Level tooltip")
basis = mode == Mode.sma ? ta.sma(source, length) : ta.ema(source, length)
signal = showSignals and close > basis and close > level
plot(basis, title="Basis")
plot(signal ? 1 : 0, title="Signal")
plot(level, title="Level")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs).toHaveLength(5);
    expect(result.inputs).toMatchObject([
      {
        id: 'input_Mode',
        type: 'enum',
        title: 'Mode',
        defval: 'Mode.sma',
        options: ['Mode.sma', 'Mode.ema'],
        tooltip: 'Mode tooltip',
      },
      {
        id: 'input_Length',
        type: 'int',
        title: 'Length',
        defval: 3,
        minval: 1,
        maxval: 10,
        step: 1,
        tooltip: 'Length tooltip',
        inline: 'ma',
        group: 'Inputs',
        confirm: true,
        display: 2,
        active: true,
      },
      {
        id: 'input_Show Signals',
        type: 'bool',
        title: 'Show Signals',
        defval: true,
        tooltip: 'Toggle signals',
      },
      {
        id: 'input_Source',
        type: 'source',
        title: 'Source',
        defval: 102,
        tooltip: 'Source tooltip',
        inline: 'src',
        group: 'Inputs',
        confirm: true,
        display: 2,
        active: true,
      },
      {
        id: 'input_Level',
        type: 'price',
        title: 'Level',
        defval: 104.5,
        tooltip: 'Level tooltip',
      },
    ]);
    expect(roundSeries(getPlot(result, 'Basis').values)).toEqual([
      null,
      null,
      104.666667,
      105,
      103,
      100.666667,
      101,
      104.333333,
      107,
      109.333333,
      109.666667,
      111,
    ]);
    expect(getPlot(result, 'Signal').values).toEqual([0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Level').values).toEqual(Array(compatibilityBars.length).fill(104.5));
  });

  it('locks a reduced public syminfo metadata idiom', () => {
    // Public idiom reference: symbol-aware public indicators commonly derive
    // labels, routing gates, and tick-normalized levels from `syminfo.*`
    // metadata supplied by the host chart.
    // Source search: https://www.tradingview.com/scripts/search/syminfo%20metadata/
    const result = runCompatScript(`
indicator("Public Syminfo Metadata Checkpoint")
symbolLabel = syminfo.prefix + ":" + syminfo.ticker
isStock = syminfo.type == "stock"
isRegular = syminfo.session == "regular"
tickValue = syminfo.mintick * syminfo.pointvalue
roundedClose = math.round_to_mintick(close)
metadataSignal = isStock and isRegular and syminfo.currency == "USD" and syminfo.root == "AAPL"
plot(str.length(symbolLabel), title="Symbol Label Length")
plot(tickValue, title="Tick Value")
plot(roundedClose, title="Rounded Close")
plot(metadataSignal ? 1 : 0, title="Metadata Signal")
`, {
      engineOptions: {
        runtime: {
          syminfo: {
            ticker: 'AAPL',
            tickerid: 'NASDAQ:AAPL',
            prefix: 'NASDAQ',
            root: 'AAPL',
            type: 'stock',
            session: 'regular',
            currency: 'USD',
            mintick: 0.25,
            pricescale: 4,
            pointvalue: 50,
          },
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Symbol Label Length').values).toEqual(Array(compatibilityBars.length).fill(11));
    expect(getPlot(result, 'Tick Value').values).toEqual(Array(compatibilityBars.length).fill(12.5));
    expect(getPlot(result, 'Rounded Close').values).toEqual(compatibilityBars.map((bar) => bar.close));
    expect(getPlot(result, 'Metadata Signal').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks a reduced public varip intrabar array idiom', () => {
    // Public idiom reference: realtime public scripts commonly use `varip`
    // arrays to collect values across same-bar tick executions, then clear the
    // buffer on the next bar.
    // Source search: https://www.tradingview.com/scripts/search/varip%20array/
    const script = `
indicator("Public Varip Array Checkpoint")
varip ticks = array.new<float>()
if barstate.isnew
    array.clear(ticks)
if barstate.isrealtime
    array.push(ticks, close)
plot(array.size(ticks), title="Tick Count")
plot(array.size(ticks) > 0 ? array.get(ticks, array.size(ticks) - 1) : na, title="Last Tick")
`;
    const ast = parse(script);
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100.25, volume: 100 },
      { time: 1_700_000_060_000, open: 101, high: 102, low: 100, close: 101.25, volume: 110 },
      { time: 1_700_000_120_000, open: 102, high: 103, low: 101, close: 102.25, volume: 120 },
    ];
    const engine = new TealscriptEngine();

    const historical = engine.execute(ast, bars);
    const historicalTickCount = [...getPlot(historical, 'Tick Count').values];
    const historicalLastTick = [...getPlot(historical, 'Last Tick').values];
    const realtimeBar: Bar = {
      time: 1_700_000_180_000,
      open: 103,
      high: 104,
      low: 102,
      close: 103.25,
      volume: 130,
    };
    const firstTick = engine.updateBar(ast, realtimeBar);
    const firstTickCount = [...getRealtimePlot(firstTick, 'Tick Count').values];
    const firstLastTick = [...getRealtimePlot(firstTick, 'Last Tick').values];
    const secondTick = engine.updateBar(ast, { ...realtimeBar, close: 103.75 });
    const secondTickCount = [...getRealtimePlot(secondTick, 'Tick Count').values];
    const secondLastTick = [...getRealtimePlot(secondTick, 'Last Tick').values];
    const nextBar = engine.updateBar(ast, {
      time: 1_700_000_240_000,
      open: 104,
      high: 105,
      low: 103,
      close: 104.25,
      volume: 140,
    });
    const nextBarTickCount = [...getRealtimePlot(nextBar, 'Tick Count').values];
    const nextBarLastTick = [...getRealtimePlot(nextBar, 'Last Tick').values];

    expect(historical.errors).toEqual([]);
    expect(historicalTickCount).toEqual([0, 0, 0]);
    expect(historicalLastTick).toEqual([null, null, null]);
    expect(firstTickCount).toEqual([0, 0, 0, 1]);
    expect(firstLastTick).toEqual([null, null, null, 103.25]);
    expect(secondTickCount).toEqual([0, 0, 0, 2]);
    expect(secondLastTick).toEqual([null, null, null, 103.75]);
    expect(nextBarTickCount).toEqual([0, 0, 0, 3, 1]);
    expect(nextBarLastTick).toEqual([null, null, null, 103.75, 104.25]);
  });

  it('locks a reduced official max bars back idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/error-messages/
    const result = runCompatScript(`
indicator("Official Max Bars Back Checkpoint", max_bars_back=2)
plot(close[2], title="Bounded Close")
`);

    expect(result.errors).toEqual([]);
    expect(result.indicatorMaxBarsBack).toBe(2);
    expect(getPlot(result, 'Bounded Close').values).toEqual([
      null,
      null,
      102,
      105,
      107,
      103,
      99,
      100,
      104,
      109,
      108,
      111,
    ]);
  });

  it('locks the official inside/outside barcolor idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/visuals/bar-coloring/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 1_700_000_060_000, open: 11, high: 13, low: 8, close: 12, volume: 100 },
      { time: 1_700_000_120_000, open: 12, high: 12.5, low: 8.5, close: 11, volume: 100 },
      { time: 1_700_000_180_000, open: 11, high: 14, low: 7, close: 10, volume: 100 },
    ];
    const result = runCompatScript(`
indicator("Official Barcolor Checkpoint", overlay=true)
isUp = close > open
isDown = close <= open
isOutsideUp = high > high[1] and low < low[1] and isUp
isOutsideDown = high > high[1] and low < low[1] and isDown
isInside = high < high[1] and low > low[1]
barcolor(isInside ? color.yellow : isOutsideUp ? color.aqua : isOutsideDown ? color.purple : na)
`, { bars });

    expect(result.errors).toEqual([]);
    expect(result.plots.find((plot) => plot.type === 'barcolor')?.color).toEqual([
      null,
      '#00BCD4',
      '#FDD835',
      '#9C27B0',
    ]);
  });

  it('locks reduced official marker output payload idioms', () => {
    // Source: https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/
    const result = runCompatScript(`
indicator("Official Marker Payload Checkpoint", overlay=true)
shapeVisible = bar_index == 0 ? true : bar_index == 1 ? false : bar_index == 2 ? na : true
charValue = bar_index == 0 ? 2 : bar_index == 1 ? 0 : bar_index == 2 ? na : -1
markerColor = bar_index == 0 ? color.green : color.red
markerText = bar_index == 0 ? color.white : color.yellow
plotshape(shapeVisible, title="Marker Shape", text="S", color=markerColor, textcolor=markerText)
plotchar(charValue, title="Marker Char", char="C", text="C", color=markerColor, textcolor=markerText)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Marker Shape').values).toEqual([
      1,
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill(1),
    ]);
    expect(getPlot(result, 'Marker Shape').color).toEqual([
      '#4CAF50',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#F23645'),
    ]);
    expect(getPlot(result, 'Marker Shape').textColor).toEqual([
      '#FFFFFF',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#FDD835'),
    ]);
    expect(getPlot(result, 'Marker Char').values).toEqual([
      2,
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill(-1),
    ]);
    expect(getPlot(result, 'Marker Char').color).toEqual([
      '#4CAF50',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#F23645'),
    ]);
    expect(getPlot(result, 'Marker Char').textColor).toEqual([
      '#FFFFFF',
      null,
      null,
      ...Array(compatibilityBars.length - 3).fill('#FDD835'),
    ]);
  });

  it('locks a reduced public marker signal payload idiom', () => {
    // Source context: https://www.tradingview.com/scripts/search/buy%20sell%20signal%20markers/
    const result = runCompatScript(`
indicator("Public Marker Signal Checkpoint", overlay=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 3)
longSignal = fast > slow
shortSignal = fast < slow
signalColor = longSignal ? color.lime : shortSignal ? color.red : color.gray
signalText = longSignal ? color.black : shortSignal ? color.white : color.gray
arrowStrength = longSignal ? high - low : shortSignal ? -(high - low) : 0
plotshape(longSignal, title="Buy Marker", style=shape.labelup, location=location.belowbar, text="BUY", color=signalColor, textcolor=signalText)
plotchar(shortSignal, title="Sell Marker", char="S", location=location.abovebar, text="SELL", color=signalColor, textcolor=signalText)
plotarrow(arrowStrength, title="Signal Arrow", colorup=color.lime, colordown=color.red, minheight=5, maxheight=20)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Buy Marker')).toMatchObject({
      type: 'plotshape',
      shape: 'labelup',
      location: 'belowbar',
      text: 'BUY',
    });
    expect(getPlot(result, 'Buy Marker').values).toEqual([null, null, 1, null, null, null, 1, 1, 1, 1, 1, null]);
    expect(getPlot(result, 'Buy Marker').color).toEqual([
      null,
      null,
      '#00E676',
      null,
      null,
      null,
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      null,
    ]);
    expect(getPlot(result, 'Buy Marker').textColor).toEqual([
      null,
      null,
      '#363A45',
      null,
      null,
      null,
      '#363A45',
      '#363A45',
      '#363A45',
      '#363A45',
      '#363A45',
      null,
    ]);
    expect(getPlot(result, 'Sell Marker')).toMatchObject({
      type: 'plotchar',
      char: 'S',
      location: 'abovebar',
      text: 'SELL',
    });
    expect(getPlot(result, 'Sell Marker').values).toEqual([null, null, null, null, 1, 1, null, null, null, null, null, null]);
    expect(getPlot(result, 'Sell Marker').color).toEqual([
      null,
      null,
      null,
      null,
      '#F23645',
      '#F23645',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(getPlot(result, 'Sell Marker').textColor).toEqual([
      null,
      null,
      null,
      null,
      '#FFFFFF',
      '#FFFFFF',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(getPlot(result, 'Signal Arrow')).toMatchObject({
      type: 'plotarrow',
      colorup: '#00E676',
      colordown: '#F23645',
      minHeight: 5,
      maxHeight: 20,
    });
    expect(getPlot(result, 'Signal Arrow').values).toEqual([null, null, 4, null, -6, -5, 6, 7, 5, 5, 5, null]);
    expect(getPlot(result, 'Signal Arrow').color).toEqual([
      null,
      null,
      '#00E676',
      null,
      '#F23645',
      '#F23645',
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      '#00E676',
      null,
    ]);
  });

  it('locks a reduced public label signal payload idiom', () => {
    // Source context: https://www.tradingview.com/scripts/search/signal%20label/
    const result = runCompatScript(`
indicator("Public Label Signal Checkpoint", overlay=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 4)
bull = fast > slow
signalText = bull ? "BUY" : "SELL"
signalColor = bull ? color.green : color.red
var signalLabel = label.new(na, na, text="", style=label.style_label_left, color=color.gray, textcolor=color.white)
if barstate.islast
    label.set_xy(signalLabel, bar_index, close)
    label.set_text(signalLabel, signalText + "\\n" + str.tostring(close, "#.00"))
    label.set_style(signalLabel, bull ? label.style_label_up : label.style_label_down)
    label.set_color(signalLabel, color.new(signalColor, 20))
    label.set_textcolor(signalLabel, bull ? color.black : color.white)
    label.set_size(signalLabel, size.large)
    label.set_textalign(signalLabel, text.align_center)
    label.set_text_font_family(signalLabel, font.family_monospace)
    label.set_text_formatting(signalLabel, text.format_bold)
    label.set_tooltip(signalLabel, "Latest signal")
plot(bull ? 1 : -1, title="Signal Score")
plot(label.get_x(signalLabel), title="Label X")
plot(label.get_y(signalLabel), title="Label Y")
plot(array.size(label.all), title="Label Count")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Signal Score').values).toEqual([-1, -1, -1, 1, -1, -1, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Label X').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 11]);
    expect(getPlot(result, 'Label Y').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 112]);
    expect(getPlot(result, 'Label Count').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(result.drawings).toEqual([
      {
        id: 'label_label.new_0_0',
        type: 'label',
        barIndex: 11,
        x: 11,
        y: 112,
        text: 'BUY\n112.00',
        xloc: 'bar_index',
        yloc: 'price',
        style: 'label_up',
        color: '#4CAF50CC',
        textColor: '#363A45',
        size: 'large',
        tooltip: 'Latest signal',
        persistent: true,
        textAlign: 'center',
        textFontFamily: 'monospace',
        textFormatting: 'bold',
      },
    ]);
  });

  it('locks a reduced public trendline signal payload idiom', () => {
    // Source context: https://www.tradingview.com/scripts/search/trendline%20breakout/
    const result = runCompatScript(`
indicator("Public Line Signal Checkpoint", overlay=true)
lookback = 5
trendStart = close[lookback]
trendEnd = close
var trend = line.new(na, na, na, na, extend=extend.none, color=color.gray, style=line.style_dotted, width=1)
if barstate.islast
    line.set_xy1(trend, bar_index - lookback, trendStart)
    line.set_xy2(trend, bar_index, trendEnd)
    line.set_extend(trend, extend.right)
    line.set_color(trend, close >= trendStart ? color.green : color.red)
    line.set_style(trend, line.style_dashed)
    line.set_width(trend, 3)
trendPrice = line.get_price(trend, bar_index)
breakout = close > trendPrice
plot(trendPrice, title="Trend Price")
plot(breakout ? 1 : 0, title="Breakout")
plot(line.get_x1(trend), title="Trend X1")
plot(line.get_y2(trend), title="Trend Y2")
plot(array.size(line.all), title="Line Count")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Trend Price').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 112]);
    expect(getPlot(result, 'Breakout').values).toEqual(Array(compatibilityBars.length).fill(0));
    expect(getPlot(result, 'Trend X1').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 6]);
    expect(getPlot(result, 'Trend Y2').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 112]);
    expect(getPlot(result, 'Line Count').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_0',
        type: 'line',
        barIndex: 11,
        x1: 6,
        y1: 104,
        x2: 11,
        y2: 112,
        xloc: 'bar_index',
        extend: 'right',
        color: '#4CAF50',
        style: 'dashed',
        width: 3,
        forceOverlay: false,
        persistent: true,
      },
    ]);
  });

  it('locks a reduced public volatility band overlay idiom', () => {
    // Public idiom reference: volatility and squeeze public indicators
    // commonly render Bollinger-style bands, filled channels, background
    // squeeze states, and breakout markers together.
    // Source search: https://www.tradingview.com/scripts/search/bollinger%20band%20squeeze/
    const result = runCompatScript(`
indicator("Public Volatility Band Checkpoint", overlay=true)
[basis, upper, lower] = ta.bb(close, 3, 2.0)
bandWidth = ta.bbw(close, 3, 2.0)
squeeze = bandWidth < 0.08
breakout = close > basis and bandWidth > 0.08
upperPlot = plot(upper, title="Upper Band", color=color.new(color.blue, 0))
lowerPlot = plot(lower, title="Lower Band", color=color.new(color.blue, 0))
plot(basis, title="Basis", color=color.gray)
fill(upperPlot, lowerPlot, color=color.new(color.blue, 85), title="Band Fill")
bgcolor(squeeze ? color.new(color.orange, 80) : na, title="Squeeze Background")
plotshape(breakout, title="Breakout Marker", style=shape.triangleup, location=location.abovebar, color=color.lime, text="BO")
plot(bandWidth, title="Band Width")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Upper Band').values)).toEqual([
      null,
      null,
      108.776276,
      108.265986,
      109.531973,
      104.066013,
      105.320494,
      111.696907,
      111.320494,
      111.827772,
      112.161105,
      112.632993,
    ]);
    expect(roundSeries(getPlot(result, 'Lower Band').values)).toEqual([
      null,
      null,
      100.557057,
      101.734014,
      96.468027,
      97.26732,
      96.679506,
      96.969759,
      102.679506,
      106.838895,
      107.172228,
      109.367007,
    ]);
    expect(roundSeries(getPlot(result, 'Basis').values)).toEqual([
      null,
      null,
      104.666667,
      105,
      103,
      100.666667,
      101,
      104.333333,
      107,
      109.333333,
      109.666667,
      111,
    ]);
    expect(roundSeries(getPlot(result, 'Band Width').values)).toEqual([
      null,
      null,
      0.078528,
      0.062209,
      0.126834,
      0.067537,
      0.085554,
      0.141155,
      0.080757,
      0.04563,
      0.045491,
      0.029423,
    ]);
    expect(getPlot(result, 'Band Fill')).toMatchObject({
      type: 'fill',
      plot1Id: 'plot_Upper Band',
      plot2Id: 'plot_Lower Band',
      color: Array(compatibilityBars.length).fill('#2196F326'),
    });
    expect(getPlot(result, 'Squeeze Background')).toMatchObject({
      type: 'bgcolor',
      color: [
        null,
        null,
        '#FF980033',
        '#FF980033',
        null,
        '#FF980033',
        null,
        null,
        null,
        '#FF980033',
        '#FF980033',
        '#FF980033',
      ],
      values: [
        null,
        null,
        1,
        1,
        null,
        1,
        null,
        null,
        null,
        1,
        1,
        1,
      ],
    });
    expect(getPlot(result, 'Breakout Marker')).toMatchObject({
      type: 'plotshape',
      shape: 'triangleup',
      location: 'abovebar',
      text: 'BO',
    });
    expect(getPlot(result, 'Breakout Marker').values).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      1,
      1,
      1,
      null,
      null,
      null,
    ]);
    expect(getPlot(result, 'Breakout Marker').color).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      '#00E676',
      '#00E676',
      '#00E676',
      null,
      null,
      null,
    ]);
  });

  it('locks reduced official plot-style payload idioms', () => {
    // Source: https://www.tradingview.com/pine-script-docs/visuals/plots/
    const result = runCompatScript(`
indicator("Official Plot Style Checkpoint", overlay=false)
areaBreak = bar_index == 1 ? na : low
plot(close, title="Line", style=plot.style_line)
plot(open, title="Step Line", style=plot.style_stepline)
plot(open, title="Step Break", style=plot.style_steplinebr)
plot(high - 100, title="Histogram", style=plot.style_histogram, histbase=0)
plot(high, title="Circles", style=plot.style_circles, join=true)
plot(low, title="Crosses", style=plot.style_cross, join=true)
plot(areaBreak, title="Area Break", style=plot.style_areabr, histbase=95)
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Line').style).toBe('line');
    expect(getPlot(result, 'Step Line').style).toBe('stepline');
    expect(getPlot(result, 'Step Break').style).toBe('steplinebr');
    expect(getPlot(result, 'Histogram')).toMatchObject({
      style: 'histogram',
      histbase: 0,
    });
    expect(getPlot(result, 'Circles')).toMatchObject({
      style: 'circles',
      join: true,
    });
    expect(getPlot(result, 'Crosses')).toMatchObject({
      style: 'cross',
      join: true,
    });
    expect(getPlot(result, 'Area Break')).toMatchObject({
      style: 'areabr',
      histbase: 95,
    });
    expect(getPlot(result, 'Area Break').values).toEqual([
      99,
      null,
      104,
      102,
      98,
      96,
      99,
      103,
      106,
      107,
      109,
      108,
    ]);
    expect(result.plots.map((plot) => [plot.title, plot.zOrder])).toEqual([
      ['Line', 0],
      ['Step Line', 1],
      ['Step Break', 2],
      ['Histogram', 3],
      ['Circles', 4],
      ['Crosses', 5],
      ['Area Break', 6],
    ]);
  });

  it('locks a reduced public custom Heikin-Ashi candle idiom', () => {
    // Public idiom reference: public overlay scripts commonly derive
    // Heikin-Ashi OHLC values and render them with plotcandle().
    // Source search: https://www.tradingview.com/scripts/search/heikin%20ashi%20candles/
    const result = runCompatScript(`
indicator("Public Custom Candle Checkpoint", overlay=true)
haClose = (open + high + low + close) / 4
var float haOpen = na
haOpen := na(haOpen[1]) ? (open + close) / 2 : (haOpen[1] + haClose[1]) / 2
haHigh = math.max(high, math.max(haOpen, haClose))
haLow = math.min(low, math.min(haOpen, haClose))
bodyColor = haClose >= haOpen ? color.green : color.red
plotcandle(haOpen, haHigh, haLow, haClose, title="HA Overlay", color=bodyColor, wickcolor=color.new(bodyColor, 20), bordercolor=bodyColor, force_overlay=true)
plot(haClose - haOpen, title="HA Body")
`);

    expect(result.errors).toEqual([]);
    const candles = getPlot(result, 'HA Overlay');
    expect(candles.type).toBe('plotcandle');
    expect(roundSeries(candles.openValues ?? [])).toEqual([
      101,
      101,
      102.25,
      104.125,
      104.6875,
      102.84375,
      100.921875,
      101.460938,
      103.980469,
      106.240234,
      107.870117,
      109.435059,
    ]);
    expect(roundSeries(candles.highValues ?? [])).toEqual([
      103,
      106,
      108,
      109,
      104.6875,
      102.84375,
      105,
      110,
      111,
      112,
      114,
      113,
    ]);
    expect(roundSeries(candles.lowValues ?? [])).toEqual([
      99,
      101,
      102.25,
      102,
      98,
      96,
      99,
      101.460938,
      103.980469,
      106.240234,
      107.870117,
      108,
    ]);
    expect(roundSeries(candles.closeValues ?? [])).toEqual([
      101,
      103.5,
      106,
      105.25,
      101,
      99,
      102,
      106.5,
      108.5,
      109.5,
      111,
      110.75,
    ]);
    expect(candles.color).toEqual([
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#F23645',
      '#F23645',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
      '#4CAF50',
    ]);
    expect(candles.wickColor).toEqual([
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#F23645CC',
      '#F23645CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
      '#4CAF50CC',
    ]);
    expect(candles.borderColor).toEqual(candles.color);
    expect(candles.forceOverlay).toBe(true);
    expect(roundSeries(getPlot(result, 'HA Body').values)).toEqual([
      0,
      2.5,
      3.75,
      1.125,
      -3.6875,
      -3.84375,
      1.078125,
      5.039063,
      4.519531,
      3.259766,
      3.129883,
      1.314941,
    ]);
  });

  it('locks a reduced public custom bar OHLC idiom', () => {
    // Public idiom reference: overlay public scripts commonly derive synthetic
    // OHLC ranges and render them with plotbar() for trend or range models.
    // Source search: https://www.tradingview.com/scripts/search/custom%20bars/
    const result = runCompatScript(`
indicator("Public Custom Bar Checkpoint", overlay=true)
rangePad = ta.sma(high - low, 2)
barOpen = close[1]
barClose = close
barHigh = math.max(high, math.max(barOpen, barClose)) + rangePad
barLow = math.min(low, math.min(barOpen, barClose)) - rangePad
barColor = barClose >= barOpen ? color.green : color.red
plotbar(barOpen, barHigh, barLow, barClose, title="Synthetic Bars", color=barColor, editable=false, show_last=8, display=display.price_scale, force_overlay=true)
plot(barClose - barOpen, title="Synthetic Change")
`);

    expect(result.errors).toEqual([]);
    const bars = getPlot(result, 'Synthetic Bars');
    expect(bars.type).toBe('plotbar');
    expect(roundSeries(bars.openValues ?? [])).toEqual([null, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
    expect(roundSeries(bars.highValues ?? [])).toEqual([
      null,
      110.5,
      112.5,
      114.5,
      110.5,
      106.5,
      110.5,
      116.5,
      117,
      117,
      119,
      118,
    ]);
    expect(roundSeries(bars.lowValues ?? [])).toEqual([
      null,
      96.5,
      99.5,
      96.5,
      91.5,
      90.5,
      93.5,
      96.5,
      100,
      102,
      104,
      103,
    ]);
    expect(roundSeries(bars.closeValues ?? [])).toEqual([null, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(bars.color).toEqual([
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
    expect(bars.editable).toBe(false);
    expect(bars.showLast).toBe(8);
    expect(bars.display).toBe(8);
    expect(bars.forceOverlay).toBe(true);
    expect(getPlot(result, 'Synthetic Change').values).toEqual([null, 3, 2, -4, -4, 1, 4, 5, -1, 3, -1, 2]);
  });

  it('locks a reduced public MTF trend-filter idiom', () => {
    // Public idiom reference: MTF trend filters commonly combine local price
    // with higher-timeframe moving averages from request.security().
    // Source search: https://www.tradingview.com/scripts/search/mtf%20trend%20filter/
    const chartBars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_000_060_000, open: 100, high: 102, low: 99, close: 101, volume: 110 },
      { time: 1_700_000_120_000, open: 101, high: 103, low: 100, close: 102, volume: 120 },
      { time: 1_700_000_180_000, open: 102, high: 104, low: 101, close: 103, volume: 130 },
      { time: 1_700_000_240_000, open: 103, high: 105, low: 102, close: 104, volume: 140 },
      { time: 1_700_000_300_000, open: 104, high: 106, low: 103, close: 105, volume: 150 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'BTCUSDT',
        timeframe: '2',
        bars: [
          { time: 1_700_000_000_000, open: 11, high: 15, low: 9, close: 10, volume: 1_000 },
          { time: 1_700_000_120_000, open: 21, high: 25, low: 19, close: 20, volume: 1_100 },
          { time: 1_700_000_240_000, open: 31, high: 35, low: 29, close: 30, volume: 1_200 },
        ],
        syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Public MTF Trend Checkpoint")
htfAverage = request.security(syminfo.tickerid, "2", ta.sma(close, 2), lookahead=barmerge.lookahead_on)
trendOk = close > htfAverage
plot(htfAverage, title="HTF Average")
plot(trendOk ? 1 : 0, title="Trend OK")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Average').values).toEqual([null, null, 15, 15, 25, 25]);
    expect(getPlot(result, 'Trend OK').values).toEqual([0, 0, 1, 1, 1, 1]);
  });

  it('locks a reduced official lower-timeframe array idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/
    const chartBars: Bar[] = [
      { time: 1_700_100_000_000, open: 100, high: 103, low: 99, close: 102, volume: 210 },
      { time: 1_700_100_120_000, open: 102, high: 105, low: 101, close: 104, volume: 250 },
      { time: 1_700_100_240_000, open: 104, high: 107, low: 103, close: 106, volume: 290 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'BTCUSDT',
        timeframe: '1',
        bars: [
          { time: 1_700_100_000_000, open: 10, high: 12, low: 9, close: 11, volume: 100 },
          { time: 1_700_100_060_000, open: 11, high: 14, low: 10, close: 13, volume: 110 },
          { time: 1_700_100_120_000, open: 20, high: 23, low: 18, close: 21, volume: 120 },
          { time: 1_700_100_180_000, open: 21, high: 25, low: 20, close: 24, volume: 130 },
          { time: 1_700_100_240_000, open: 30, high: 32, low: 29, close: 31, volume: 140 },
          { time: 1_700_100_300_000, open: 31, high: 35, low: 30, close: 34, volume: 150 },
        ],
        syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Official Lower TF Array Checkpoint", timeframe="2")
intrabars = request.security_lower_tf(syminfo.tickerid, "1", close)
firstIntrabar = array.size(intrabars) > 0 ? array.get(intrabars, 0) : na
lastIntrabar = array.size(intrabars) > 0 ? array.get(intrabars, array.size(intrabars) - 1) : na
plot(array.size(intrabars), title="Intrabar Count")
plot(firstIntrabar, title="First Intrabar")
plot(lastIntrabar, title="Last Intrabar")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Intrabar Count').values).toEqual([2, 2, 2]);
    expect(getPlot(result, 'First Intrabar').values).toEqual([11, 21, 31]);
    expect(getPlot(result, 'Last Intrabar').values).toEqual([13, 24, 34]);
  });

  it('locks a reduced official ticker request idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/
    const chartBars: Bar[] = [
      { time: 1_700_200_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_200_060_000, open: 101, high: 102, low: 100, close: 101, volume: 110 },
      { time: 1_700_200_120_000, open: 102, high: 103, low: 101, close: 102, volume: 120 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'NASDAQ:AAPL|session=extended',
        timeframe: '1',
        bars: [
          { time: 1_700_200_000_000, open: 200, high: 202, low: 199, close: 201, volume: 1_000 },
          { time: 1_700_200_060_000, open: 201, high: 203, low: 200, close: 202, volume: 1_100 },
          { time: 1_700_200_120_000, open: 202, high: 204, low: 201, close: 203, volume: 1_200 },
        ],
        syminfo: { ticker: 'NASDAQ:AAPL|session=extended', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Official Ticker Request Checkpoint")
extendedTicker = ticker.new("NASDAQ", "AAPL", session.extended)
haTicker = ticker.heikinashi(extendedTicker)
extendedClose = request.security(extendedTicker, "1", close, lookahead=barmerge.lookahead_on)
haClose = request.security(haTicker, "1", close, lookahead=barmerge.lookahead_on)
standardLength = str.length(ticker.standard(haTicker))
plot(extendedClose, title="Extended Close")
plot(haClose, title="HA Close")
plot(standardLength, title="Standard Length")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Extended Close').values).toEqual([201, 202, 203]);
    expect(getPlot(result, 'HA Close').values).toEqual([200.5, 201.5, 202.5]);
    expect(getPlot(result, 'Standard Length').values).toEqual([11, 11, 11]);
  });

  it('locks a reduced public synthetic ticker trend idiom', () => {
    // Public idiom reference: public trend indicators commonly request
    // Heikin-Ashi synthetic ticker data for smoothed direction signals.
    // Source search: https://www.tradingview.com/scripts/search/heikin%20ashi%20trend/
    const chartBars: Bar[] = [
      { time: 1_700_210_000_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_210_060_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_210_120_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_210_180_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'NASDAQ:AAPL',
        timeframe: '1',
        bars: [
          { time: 1_700_210_000_000, open: 100, high: 106, low: 99, close: 105, volume: 1_000 },
          { time: 1_700_210_060_000, open: 105, high: 108, low: 104, close: 107, volume: 1_100 },
          { time: 1_700_210_120_000, open: 107, high: 110, low: 106, close: 109, volume: 1_200 },
          { time: 1_700_210_180_000, open: 109, high: 110, low: 102, close: 103, volume: 1_300 },
        ],
        syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Public Synthetic Ticker Checkpoint")
haTicker = ticker.heikinashi("NASDAQ:AAPL")
haClose = request.security(haTicker, "1", close, lookahead=barmerge.lookahead_on)
haTrend = haClose > haClose[1]
plot(haClose, title="HA Close")
plot(haTrend ? 1 : 0, title="HA Trend")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HA Close').values).toEqual([102.5, 106, 108, 106]);
    expect(getPlot(result, 'HA Trend').values).toEqual([0, 1, 1, 0]);
  });

  it('locks a reduced public pivot-divergence idiom', () => {
    // Public idiom reference: divergence scripts compare sequential price
    // pivots against lower oscillator pivots.
    // Source search: https://www.tradingview.com/scripts/search/rsi%20divergence/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 9, high: 10, low: 8, close: 10, volume: 100 },
      { time: 1_700_000_060_000, open: 7, high: 15, low: 6, close: 15, volume: 110 },
      { time: 1_700_000_120_000, open: 10, high: 12, low: 9, close: 12, volume: 120 },
      { time: 1_700_000_180_000, open: 13, high: 18, low: 12, close: 18, volume: 130 },
      { time: 1_700_000_240_000, open: 13, high: 14, low: 12, close: 14, volume: 140 },
    ];
    const result = runCompatScript(`
indicator("Public Divergence Checkpoint")
oscillator = close - open
pricePivot = ta.pivothigh(high, 1, 1)
oscPivot = bar_index == 2 ? 8 : bar_index == 4 ? 5 : na
var lastPricePivot = na
var lastOscPivot = na
bearish = false
if not na(pricePivot) and not na(oscPivot)
    bearish := not na(lastPricePivot) and pricePivot > lastPricePivot and oscPivot < lastOscPivot
    lastPricePivot := pricePivot
    lastOscPivot := oscPivot
plot(pricePivot, title="Price Pivot")
plot(oscPivot, title="Osc Pivot")
plot(bearish ? 1 : 0, title="Bearish Divergence")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Price Pivot').values).toEqual([null, null, 15, null, 18]);
    expect(getPlot(result, 'Osc Pivot').values).toEqual([null, null, 8, null, 5]);
    expect(getPlot(result, 'Bearish Divergence').values).toEqual([0, 0, 0, 0, 1]);
  });

  it('locks a reduced public object-method state idiom', () => {
    // Public idiom reference: market-structure public indicators commonly keep
    // swing state in user-defined objects and update it through methods.
    // Source search: https://www.tradingview.com/scripts/search/market%20structure%20object/
    const result = runCompatScript(`
indicator("Public Object Method Checkpoint")
type SwingState
    int pivots = 0
    float lastHigh = na
    bool rising = false

method record(SwingState this, float candidate) =>
    if not na(candidate)
        this.rising := na(this.lastHigh) ? false : candidate > this.lastHigh
        this.lastHigh := candidate
        this.pivots += 1
    this

var state = SwingState.new()
pivotHigh = ta.pivothigh(high, 1, 1)
state := state.record(pivotHigh)
plot(state.pivots, title="Pivot Count")
plot(state.lastHigh, title="Last High")
plot(state.rising ? 1 : 0, title="Rising Pivot")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Pivot Count').values).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2]);
    expect(getPlot(result, 'Last High').values).toEqual([null, null, null, null, 109, 109, 109, 109, 109, 109, 109, 114]);
    expect(getPlot(result, 'Rising Pivot').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('locks a reduced public UDT state layout idiom', () => {
    // Public idiom reference: market-structure scripts often wrap UDT field
    // defaults and then mutate the persistent state object through methods.
    // Source search: https://www.tradingview.com/scripts/search/market%20structure%20object/
    const result = runCompatScript(`
indicator("Public UDT State Layout Checkpoint")
type PullbackState
    float base =
        close
    float highest =
        high
    int touches =
        0

method track(PullbackState this, bool signal) =>
    this.highest := math.max(this.highest, high)
    if signal
        this.touches += 1
        this.base := close
    this

var state = PullbackState.new()
signal = close > open
state := state.track(signal)
plot(state.touches, title="Touch Count")
plot(state.base, title="Base Close")
plot(state.highest, title="Highest High")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Touch Count').values).toEqual([1, 2, 3, 3, 3, 4, 5, 6, 6, 7, 7, 8]);
    expect(getPlot(result, 'Base Close').values).toEqual([102, 105, 107, 107, 107, 100, 104, 109, 109, 111, 111, 112]);
    expect(getPlot(result, 'Highest High').values).toEqual([103, 106, 108, 109, 109, 109, 109, 110, 111, 112, 114, 114]);
  });

  it('locks a reduced public UDT array state idiom', () => {
    // Public idiom reference: market-structure scripts commonly store UDT
    // pivot records in bounded arrays, read fields from the latest record, and
    // surface the latest state in dashboards.
    // Source search: https://www.tradingview.com/scripts/search/market%20structure%20object%20array/
    const result = runCompatScript(`
indicator("Public UDT Array Checkpoint", overlay=true)
type PivotMark
    int index = 0
    float price = na
    bool highPivot = false

method score(PivotMark this) =>
    this.highPivot ? this.price : -this.price

var array<PivotMark> pivots = array.new<PivotMark>()
pivotHigh = ta.pivothigh(high, 1, 1)
pivotLow = ta.pivotlow(low, 1, 1)
if not na(pivotHigh)
    pivots.push(PivotMark.new(bar_index - 1, pivotHigh, true))
if not na(pivotLow)
    pivots.push(PivotMark.new(bar_index - 1, pivotLow, false))
if pivots.size() > 4
    pivots.shift()
snapshot = pivots.copy()
lastPivot = pivots.size() > 0 ? pivots.last() : PivotMark.new()
snapshotLast = snapshot.size() > 0 ? snapshot.last() : PivotMark.new()
var board = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(board, 0, 0, "Pivot", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 0, 1, "Count", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 1, str.tostring(pivots.size()), text_color=color.white, bgcolor=color.green)
    table.cell(board, 0, 2, "Index", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 2, str.tostring(lastPivot.index), text_color=color.white, bgcolor=color.green)
    table.cell(board, 0, 3, "Score", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 3, str.tostring(lastPivot.score(), "#.00"), text_color=color.black, bgcolor=color.yellow)
plot(pivots.size(), title="Pivot Count")
plot(lastPivot.index, title="Last Pivot Index")
plot(lastPivot.price, title="Last Pivot Price")
plot(lastPivot.highPivot ? 1 : -1, title="Last Pivot Side")
plot(snapshotLast.price, title="Copied Pivot Price")
plot(lastPivot.score(), title="Pivot Score")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Pivot Count').values).toEqual([0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 3]);
    expect(getPlot(result, 'Last Pivot Index').values).toEqual([0, 0, 0, 0, 3, 3, 5, 5, 5, 5, 5, 10]);
    expect(getPlot(result, 'Last Pivot Price').values).toEqual([
      null,
      null,
      null,
      null,
      109,
      109,
      96,
      96,
      96,
      96,
      96,
      114,
    ]);
    expect(getPlot(result, 'Last Pivot Side').values).toEqual([-1, -1, -1, -1, 1, 1, -1, -1, -1, -1, -1, 1]);
    expect(getPlot(result, 'Copied Pivot Price').values).toEqual([
      null,
      null,
      null,
      null,
      109,
      109,
      96,
      96,
      96,
      96,
      96,
      114,
    ]);
    expect(getPlot(result, 'Pivot Score').values).toEqual([
      null,
      null,
      null,
      null,
      109,
      109,
      -96,
      -96,
      -96,
      -96,
      -96,
      114,
    ]);

    expect(result.drawings).toContainEqual(
      expect.objectContaining({
        type: 'table',
        position: 'top_right',
        columns: 2,
        rows: 4,
        cells: expect.arrayContaining([
          expect.objectContaining({ column: 0, row: 0, text: 'Pivot', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 1, row: 0, text: 'Value', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 0, row: 1, text: 'Count', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 1, text: '3', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 2, text: 'Index', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 2, text: '10', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 3, text: 'Score', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 3, text: '114.00', textColor: '#363A45', bgcolor: '#FDD835' }),
        ]),
      })
    );
  });

  it('locks a reduced public session-gated signal idiom', () => {
    // Public idiom reference: intraday scripts frequently gate signals with a
    // user/session time filter.
    // Source search: https://www.tradingview.com/scripts/search/session%20filter/
    const result = runCompatScript(`
indicator("Public Session Filter Checkpoint")
inSession = not na(time("1", "2218-2224"))
rawSignal = close > open
plot(inSession ? 1 : 0, title="In Session")
plot(inSession and rawSignal ? 1 : 0, title="Filtered Signal")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'In Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Filtered Signal').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0]);
  });

  it('locks a reduced public exchange-session state idiom', () => {
    // Public idiom reference: intraday public scripts commonly branch on
    // premarket, market, and postmarket session state helpers.
    // Source search: https://www.tradingview.com/scripts/search/session%20ismarket/
    const sessionBars: Bar[] = [
      { time: Date.UTC(2024, 0, 5, 13, 0), open: 1, high: 2, low: 1, close: 2, volume: 1 },
      { time: Date.UTC(2024, 0, 5, 15, 0), open: 2, high: 3, low: 2, close: 3, volume: 1 },
      { time: Date.UTC(2024, 0, 5, 21, 30), open: 3, high: 4, low: 3, close: 4, volume: 1 },
      { time: Date.UTC(2024, 0, 5, 23, 30), open: 4, high: 5, low: 4, close: 5, volume: 1 },
    ];
    const result = runCompatScript(`
indicator("Public Session State Checkpoint")
extendedState = session.ispremarket or session.ismarket or session.ispostmarket
plot(session.ispremarket ? 1 : 0, title="Premarket")
plot(session.ismarket ? 1 : 0, title="Market")
plot(session.ispostmarket ? 1 : 0, title="Postmarket")
plot(extendedState ? 1 : 0, title="Extended Active")
`, {
      bars: sessionBars,
      engineOptions: {
        runtime: {
          session: {
            timezone: 'UTC',
            premarket: '1200-1430:1234567',
            regular: '1430-2100:1234567',
            postmarket: '2100-2300:1234567',
          },
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Premarket').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Market').values).toEqual([0, 1, 0, 0]);
    expect(getPlot(result, 'Postmarket').values).toEqual([0, 0, 1, 0]);
    expect(getPlot(result, 'Extended Active').values).toEqual([1, 1, 1, 0]);
  });

  it('locks a reduced public drawing zone idiom', () => {
    // Public idiom reference: supply/demand public scripts commonly keep a
    // persistent box zone and a midline updated from recent swing ranges.
    // Source search: https://www.tradingview.com/scripts/search/supply%20demand%20zones/
    const result = runCompatScript(`
indicator("Public Drawing Zone Checkpoint", overlay=true)
var zone = box.new(left=na, top=na, right=na, bottom=na, bgcolor=color.new(color.green, 85), border_color=color.green, text="")
var midline = line.new(x1=na, y1=na, x2=na, y2=na, extend=extend.right, color=color.green, width=2)
zoneTop = ta.highest(high, 3)
zoneBottom = ta.lowest(low, 3)
zoneMid = (zoneTop + zoneBottom) / 2
if barstate.islast
    box.set_lefttop(zone, bar_index - 3, zoneTop)
    box.set_rightbottom(zone, bar_index, zoneBottom)
    box.set_text(zone, "Demand")
    box.set_bgcolor(zone, color.new(color.green, 85))
    box.set_border_color(zone, color.green)
    line.set_xy1(midline, bar_index - 3, zoneMid)
    line.set_xy2(midline, bar_index, zoneMid)
plot(zoneTop, title="Zone Top")
plot(zoneBottom, title="Zone Bottom")
plot(zoneMid, title="Zone Mid")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Zone Top').values.at(-1)).toBe(114);
    expect(getPlot(result, 'Zone Bottom').values.at(-1)).toBe(107);
    expect(getPlot(result, 'Zone Mid').values.at(-1)).toBe(110.5);
    expect(result.drawings).toEqual([
      {
        id: 'box_box.new_0_0',
        type: 'box',
        persistent: true,
        barIndex: 11,
        left: 8,
        top: 114,
        right: 11,
        bottom: 107,
        xloc: 'bar_index',
        extend: 'none',
        borderColor: '#4CAF50',
        borderWidth: 1,
        borderStyle: 'solid',
        bgcolor: '#4CAF5026',
        text: 'Demand',
        textColor: '#363A45',
        textSize: 'auto',
      },
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 110.5,
        x2: 11,
        y2: 110.5,
        xloc: 'bar_index',
        extend: 'right',
        color: '#4CAF50',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
    ]);
  });

  it('locks a reduced public box zone text-layout idiom', () => {
    // Source context: https://www.tradingview.com/scripts/search/supply%20demand%20box/
    const result = runCompatScript(`
indicator("Public Box Zone Checkpoint", overlay=true)
zoneTop = ta.highest(high, 4)
zoneBottom = ta.lowest(low, 4)
var zone = box.new(na, na, na, na, bgcolor=color.new(color.blue, 90), border_color=color.blue)
if barstate.islast
    box.set_lefttop(zone, bar_index - 3, zoneTop)
    box.set_rightbottom(zone, bar_index, zoneBottom)
    box.set_extend(zone, extend.right)
    box.set_bgcolor(zone, color.new(color.red, 85))
    box.set_border_color(zone, color.red)
    box.set_border_width(zone, 2)
    box.set_border_style(zone, line.style_dashed)
    box.set_text(zone, "Supply\\nZone")
    box.set_text_color(zone, color.white)
    box.set_text_size(zone, size.small)
    box.set_text_halign(zone, text.align_center)
    box.set_text_valign(zone, text.align_bottom)
    box.set_text_wrap(zone, text.wrap_auto)
    box.set_text_font_family(zone, font.family_monospace)
    box.set_text_formatting(zone, text.format_bold)
plot(zoneTop - zoneBottom, title="Zone Height")
plot(box.get_top(zone), title="Zone Top")
plot(box.get_bottom(zone), title="Zone Bottom")
plot(box.get_text_halign(zone) == "center" ? 1 : 0, title="Centered Text")
plot(array.size(box.all), title="Box Count")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Zone Height').values).toEqual([4, 7, 9, 10, 11, 13, 13, 14, 15, 13, 11, 8]);
    expect(getPlot(result, 'Zone Top').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 114]);
    expect(getPlot(result, 'Zone Bottom').values).toEqual([null, null, null, null, null, null, null, null, null, null, null, 106]);
    expect(getPlot(result, 'Centered Text').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Box Count').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(result.drawings).toEqual([
      {
        id: 'box_box.new_0_0',
        type: 'box',
        barIndex: 11,
        left: 8,
        top: 114,
        right: 11,
        bottom: 106,
        borderColor: '#F23645',
        borderWidth: 2,
        borderStyle: 'dashed',
        extend: 'right',
        xloc: 'bar_index',
        bgcolor: '#F2364526',
        text: 'Supply\nZone',
        textSize: 'small',
        textColor: '#FFFFFF',
        persistent: true,
        textHalign: 'center',
        textValign: 'bottom',
        textWrap: 'auto',
        textFontFamily: 'monospace',
        textFormatting: 'bold',
      },
    ]);
  });

  it('locks a reduced public drawing-copy idiom', () => {
    // Public idiom reference: drawing-heavy public scripts commonly clone
    // configured labels, lines, and boxes before moving the copies to the
    // latest signal or zone.
    // Source search: https://www.tradingview.com/scripts/search/drawing%20copy/
    const result = runCompatScript(`
indicator("Public Drawing Copy Checkpoint", overlay=true)
rangeHigh = ta.highest(high, 4)
rangeLow = ta.lowest(low, 4)
rangeMid = (rangeHigh + rangeLow) / 2
var seedLabel = label.new(na, na, text="Seed", style=label.style_label_left, color=color.gray, textcolor=color.white)
var seedLine = line.new(na, na, na, na, color=color.gray, style=line.style_dotted, width=1)
var seedBox = box.new(na, na, na, na, bgcolor=color.new(color.gray, 90), border_color=color.gray, text="Seed")
if barstate.islast
    label.set_xy(seedLabel, bar_index, rangeHigh)
    label.set_text(seedLabel, "Base")
    label.set_color(seedLabel, color.green)
    labelClone = label.copy(seedLabel)
    label.set_xy(labelClone, bar_index - 1, rangeLow)
    label.set_text(labelClone, "Clone")
    label.set_color(labelClone, color.red)
    line.set_xy1(seedLine, bar_index - 3, rangeMid)
    line.set_xy2(seedLine, bar_index, rangeMid)
    line.set_color(seedLine, color.green)
    lineClone = line.copy(seedLine)
    line.set_xy1(lineClone, bar_index - 3, rangeLow)
    line.set_xy2(lineClone, bar_index, rangeHigh)
    line.set_color(lineClone, color.red)
    box.set_lefttop(seedBox, bar_index - 3, rangeHigh)
    box.set_rightbottom(seedBox, bar_index, rangeLow)
    box.set_bgcolor(seedBox, color.new(color.green, 85))
    box.set_text(seedBox, "Base Zone")
    boxClone = box.copy(seedBox)
    box.set_lefttop(boxClone, bar_index - 4, rangeHigh + 1)
    box.set_rightbottom(boxClone, bar_index - 1, rangeLow + 1)
    box.set_bgcolor(boxClone, color.new(color.red, 85))
    box.set_text(boxClone, "Clone Zone")
plot(array.size(label.all), title="Label Count")
plot(array.size(line.all), title="Line Count")
plot(array.size(box.all), title="Box Count")
plot(rangeHigh - rangeLow, title="Range Width")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Label Count').values).toEqual([...Array(compatibilityBars.length - 1).fill(1), 2]);
    expect(getPlot(result, 'Line Count').values).toEqual([...Array(compatibilityBars.length - 1).fill(1), 2]);
    expect(getPlot(result, 'Box Count').values).toEqual([...Array(compatibilityBars.length - 1).fill(1), 2]);
    expect(getPlot(result, 'Range Width').values).toEqual([4, 7, 9, 10, 11, 13, 13, 14, 15, 13, 11, 8]);
    expect(result.drawings).toHaveLength(6);
    expect(result.drawings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'label',
        persistent: true,
        x: 11,
        y: 114,
        text: 'Base',
        color: '#4CAF50',
      }),
      expect.objectContaining({
        type: 'label',
        persistent: false,
        x: 10,
        y: 106,
        text: 'Clone',
        color: '#F23645',
      }),
      expect.objectContaining({
        type: 'line',
        persistent: true,
        x1: 8,
        y1: 110,
        x2: 11,
        y2: 110,
        color: '#4CAF50',
      }),
      expect.objectContaining({
        type: 'line',
        persistent: false,
        x1: 8,
        y1: 106,
        x2: 11,
        y2: 114,
        color: '#F23645',
      }),
      expect.objectContaining({
        type: 'box',
        persistent: true,
        left: 8,
        top: 114,
        right: 11,
        bottom: 106,
        bgcolor: '#4CAF5026',
        text: 'Base Zone',
      }),
      expect.objectContaining({
        type: 'box',
        persistent: false,
        left: 7,
        top: 115,
        right: 10,
        bottom: 107,
        bgcolor: '#F2364526',
        text: 'Clone Zone',
      }),
    ]));
  });

  it('locks a reduced public linefill channel idiom', () => {
    // Public idiom reference: public channel indicators commonly draw upper
    // and lower line handles and fill the area between them.
    // Source search: https://www.tradingview.com/scripts/search/channel%20linefill/
    const result = runCompatScript(`
indicator("Public Linefill Channel Checkpoint", overlay=true)
channelHigh = ta.highest(high, 4)
channelLow = ta.lowest(low, 4)
var upper = line.new(x1=na, y1=na, x2=na, y2=na, extend=extend.right, color=color.orange, width=2)
var lower = line.new(x1=na, y1=na, x2=na, y2=na, extend=extend.right, color=color.orange, width=2)
var channel = linefill.new(line1=upper, line2=lower, color=color.new(color.orange, 85))
if barstate.islast
    line.set_xy1(id=upper, x=bar_index - 3, y=channelHigh[3])
    line.set_xy2(id=upper, x=bar_index, y=channelHigh)
    line.set_xy1(id=lower, x=bar_index - 3, y=channelLow[3])
    line.set_xy2(id=lower, x=bar_index, y=channelLow)
    linefill.set_color(id=channel, color=color.new(color.orange, 85))
plot(channelHigh - channelLow, title="Channel Width")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Channel Width').values).toEqual([4, 7, 9, 10, 11, 13, 13, 14, 15, 13, 11, 8]);
    expect(result.drawings).toEqual([
      {
        id: 'line_line.new_0_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 111,
        x2: 11,
        y2: 114,
        xloc: 'bar_index',
        extend: 'right',
        color: '#FF9800',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
      {
        id: 'line_line.new_1_0',
        type: 'line',
        persistent: true,
        barIndex: 11,
        x1: 8,
        y1: 96,
        x2: 11,
        y2: 106,
        xloc: 'bar_index',
        extend: 'right',
        color: '#FF9800',
        style: 'solid',
        width: 2,
        forceOverlay: false,
      },
      {
        id: 'linefill_linefill.new_0_0',
        type: 'linefill',
        persistent: true,
        barIndex: 0,
        line1: 'line_line.new_0_0',
        line2: 'line_line.new_1_0',
        color: '#FF980026',
      },
    ]);
  });

  it('locks a reduced public zigzag polyline idiom', () => {
    // Public idiom reference: zigzag-style public overlays commonly collect
    // recent swing chart points and render them as a polyline path.
    // Source search: https://www.tradingview.com/scripts/search/zigzag%20polyline/
    const result = runCompatScript(`
indicator("Public Zigzag Polyline Checkpoint", overlay=true, max_polylines_count=1)
zigzagPoints = barstate.islast ? 4 : 0
if barstate.islast
    points = array.from(
         chart.point.from_index(bar_index - 6, low[6]),
         chart.point.from_index(bar_index - 4, high[4]),
         chart.point.from_index(bar_index - 2, low[2]),
         chart.point.now(close))
    polyline.new(points=points, curved=false, closed=false, line_color=color.purple, line_width=2)
plot(zigzagPoints, title="Zigzag Points")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Zigzag Points').values).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]);
    expect(result.drawings).toEqual([
      {
        id: 'polyline_polyline.new_0_11',
        type: 'polyline',
        barIndex: 11,
        points: [
          { type: 'chart.point', time: null, index: 5, price: 96 },
          { type: 'chart.point', time: null, index: 7, price: 110 },
          { type: 'chart.point', time: null, index: 9, price: 107 },
          { type: 'chart.point', time: compatibilityBars[11]!.time, index: 11, price: 112 },
        ],
        curved: false,
        closed: false,
        xloc: 'bar_index',
        lineColor: '#9C27B0',
        fillColor: null,
        lineStyle: 'solid',
        lineWidth: 2,
      },
    ]);
  });

  it('locks a reduced public dashboard table idiom', () => {
    // Public idiom reference: dashboard-style public indicators commonly
    // summarize trend and signal state in a last-bar table.
    // Source search: https://www.tradingview.com/scripts/search/dashboard%20table/
    const result = runCompatScript(`
indicator("Public Dashboard Table Checkpoint", overlay=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 4)
trendUp = fast > slow
signalText = trendUp ? "Bullish" : "Bearish"
signalColor = trendUp ? color.green : color.red
var dashboard = table.new(position.top_right, 2, 2, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(dashboard, 0, 0, "Trend", text_color=color.white, bgcolor=color.blue)
    table.cell(dashboard, 1, 0, signalText, text_color=color.white, bgcolor=signalColor)
    table.cell(dashboard, 0, 1, "Fast", text_color=color.white, bgcolor=color.gray)
    table.cell(dashboard, 1, 1, str.tostring(fast, "#.00"), text_color=color.black, bgcolor=color.yellow)
plot(trendUp ? 1 : 0, title="Trend Up")
plot(fast, title="Fast Average")
plot(slow, title="Slow Average")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Trend Up').values).toEqual([0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Fast Average').values)).toEqual([
      null,
      103.5,
      106,
      105,
      101,
      99.5,
      102,
      106.5,
      108.5,
      109.5,
      110.5,
      111,
    ]);
    expect(roundSeries(getPlot(result, 'Slow Average').values)).toEqual([
      null,
      null,
      null,
      104.25,
      103.5,
      102.25,
      101.5,
      103,
      105.25,
      108,
      109.5,
      110.25,
    ]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 2,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Trend',
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
            text: 'Bullish',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 1,
            text: 'Fast',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: '111.00',
            width: undefined,
            height: undefined,
            textColor: '#363A45',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#FDD835',
          },
        ],
      },
    ]);
  });

  it('locks a reduced public dashboard table setter idiom', () => {
    // Public idiom reference: dashboard-style public indicators often create a
    // persistent table and update its position, frame, cells, and tooltips only
    // on the last bar.
    // Source search: https://www.tradingview.com/scripts/search/dashboard%20table%20settings/
    const result = runCompatScript(`
indicator("Public Table Setter Checkpoint", overlay=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 4)
bull = fast > slow
score = bull ? 1 : -1
var board = table.new(position.top_right, 3, 3, bgcolor=color.new(color.black, 90), frame_color=color.gray, frame_width=1, border_color=color.white, border_width=1)
if barstate.islast
    table.set_position(board, position.bottom_right)
    table.set_bgcolor(board, color.new(color.blue, 85))
    table.set_frame_color(board, color.green)
    table.set_frame_width(board, 2)
    table.set_border_color(board, color.yellow)
    table.set_border_width(board, 2)
    table.cell(board, 0, 0, "Signal", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 2, 0, "State", text_color=color.white, bgcolor=color.blue)
    table.merge_cells(board, 0, 0, 2, 0)
    table.cell(board, 0, 1, "Trend", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 1, str.tostring(score), text_color=color.white, bgcolor=bull ? color.green : color.red)
    table.cell(board, 2, 1, bull ? "Bull" : "Bear", text_color=color.white, bgcolor=bull ? color.green : color.red)
    table.cell(board, 0, 2, "Fast", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 2, str.tostring(fast, "#.00"), text_color=color.black, bgcolor=color.yellow)
    table.cell(board, 2, 2, str.tostring(slow, "#.00"), text_color=color.black, bgcolor=color.yellow)
    table.cell_set_text(board, 0, 0, "Signal Summary")
    table.cell_set_text_color(board, 0, 0, color.black)
    table.cell_set_bgcolor(board, 0, 0, color.yellow)
    table.cell_set_text_halign(board, 0, 0, text.align_center)
    table.cell_set_text_valign(board, 0, 0, text.align_middle)
    table.cell_set_width(board, 1, 1, 64)
    table.cell_set_height(board, 1, 1, 24)
    table.cell_set_tooltip(board, 2, 1, "Last signal state")
plot(score, title="Dashboard Score")
plot(fast, title="Fast Average")
plot(slow, title="Slow Average")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dashboard Score').values).toEqual([-1, -1, -1, 1, -1, -1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Fast Average').values)).toEqual([
      null,
      103.5,
      106,
      105,
      101,
      99.5,
      102,
      106.5,
      108.5,
      109.5,
      110.5,
      111,
    ]);
    expect(roundSeries(getPlot(result, 'Slow Average').values)).toEqual([
      null,
      null,
      null,
      104.25,
      103.5,
      102.25,
      101.5,
      103,
      105.25,
      108,
      109.5,
      110.25,
    ]);
    expect(result.drawings).toContainEqual(
      expect.objectContaining({
        type: 'table',
        position: 'bottom_right',
        columns: 3,
        rows: 3,
        bgcolor: '#2196F326',
        frameColor: '#4CAF50',
        frameWidth: 2,
        borderColor: '#FDD835',
        borderWidth: 2,
        cells: expect.arrayContaining([
          expect.objectContaining({
            column: 0,
            row: 0,
            text: 'Signal Summary',
            textColor: '#363A45',
            textHalign: 'center',
            textValign: 'middle',
            bgcolor: '#FDD835',
          }),
          expect.objectContaining({ column: 1, row: 1, text: '1', width: 64, height: 24, bgcolor: '#4CAF50' }),
          expect.objectContaining({
            column: 2,
            row: 1,
            text: 'Bull',
            textColor: '#FFFFFF',
            bgcolor: '#4CAF50',
            tooltip: 'Last signal state',
          }),
          expect.objectContaining({ column: 1, row: 2, text: '111.00', textColor: '#363A45', bgcolor: '#FDD835' }),
          expect.objectContaining({ column: 2, row: 2, text: '110.25', textColor: '#363A45', bgcolor: '#FDD835' }),
        ]),
        mergedCells: [{ startColumn: 0, startRow: 0, endColumn: 2, endRow: 0 }],
      })
    );
  });

  it('locks a reduced public matrix scoreboard idiom', () => {
    // Public idiom reference: matrix-heavy public dashboards commonly turn
    // recent price factors into score matrices and summarize the last bar in a table.
    // Source search: https://www.tradingview.com/scripts/search/matrix%20dashboard/
    const result = runCompatScript(`
indicator("Public Matrix Scoreboard Checkpoint", overlay=true)
weights = matrix.new_float(2, 2, 0)
matrix.set(weights, 0, 0, 1.0)
matrix.set(weights, 0, 1, 0.5)
matrix.set(weights, 1, 0, -0.25)
matrix.set(weights, 1, 1, 1.5)
factors = matrix.new_float(2, 1, 0)
momentum = nz(close - close[1])
rangeScore = high - low
matrix.set(factors, 0, 0, momentum)
matrix.set(factors, 1, 0, rangeScore)
score = matrix.mult(weights, factors)
transposed = matrix.transpose(score)
topRow = matrix.row(score, 0)
bias = array.get(topRow, 0)
confirmation = matrix.get(transposed, 0, 1)
averageScore = matrix.avg(score)
shapeCode = matrix.rows(score) * 10 + matrix.columns(score)
var board = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(board, 0, 0, "Metric", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 1, 0, "Score", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 0, 1, "Bias", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 1, str.tostring(bias, "#.00"), text_color=color.white, bgcolor=bias > 0 ? color.green : color.red)
    table.cell(board, 0, 2, "Confirm", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 2, str.tostring(confirmation, "#.00"), text_color=color.white, bgcolor=confirmation > 0 ? color.green : color.red)
    table.cell(board, 0, 3, "Shape", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 3, str.tostring(shapeCode), text_color=color.black, bgcolor=color.yellow)
plot(bias, title="Matrix Bias")
plot(confirmation, title="Matrix Confirmation")
plot(averageScore, title="Matrix Average")
plot(shapeCode, title="Matrix Shape")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Matrix Bias').values)).toEqual([
      2,
      5.5,
      4,
      -0.5,
      -1,
      3.5,
      7,
      8.5,
      1.5,
      5.5,
      1.5,
      4.5,
    ]);
    expect(roundSeries(getPlot(result, 'Matrix Confirmation').values)).toEqual([
      6,
      6.75,
      5.5,
      11.5,
      10,
      7.25,
      8,
      9.25,
      7.75,
      6.75,
      7.75,
      7,
    ]);
    expect(roundSeries(getPlot(result, 'Matrix Average').values)).toEqual([
      4,
      6.125,
      4.75,
      5.5,
      4.5,
      5.375,
      7.5,
      8.875,
      4.625,
      6.125,
      4.625,
      5.75,
    ]);
    expect(getPlot(result, 'Matrix Shape').values).toEqual(Array(compatibilityBars.length).fill(21));
    expect(result.drawings).toEqual([
      expect.objectContaining({
        type: 'table',
        position: 'top_right',
        columns: 2,
        rows: 4,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          expect.objectContaining({ column: 0, row: 0, text: 'Metric', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 1, row: 0, text: 'Score', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 0, row: 1, text: 'Bias', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 1, text: '4.50', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 2, text: 'Confirm', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 2, text: '7.00', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 3, text: 'Shape', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 3, text: '21', textColor: '#363A45', bgcolor: '#FDD835' }),
        ],
      }),
    ]);
  });

  it('locks a reduced public map signal-state idiom', () => {
    // Public idiom reference: public dashboard scripts commonly keep named
    // signal state in maps before rendering compact last-bar summaries.
    // Source search: https://www.tradingview.com/scripts/search/map%20dashboard/
    const result = runCompatScript(`
indicator("Public Map Signal Checkpoint", overlay=true)
var map<string, float> scores = map.new<string, float>()
trend = close > ta.sma(close, 3) ? 1.0 : -1.0
rangeScore = high - low
scores.put("Trend", trend)
scores.put("Range", rangeScore)
previousClose = scores.put("Close", close)
snapshot = scores.copy()
keys = snapshot.keys()
composite = 0.0
for [key, value] in snapshot
    composite += key == "Close" ? value / 100.0 : value
hasTrend = snapshot.contains("Trend") ? 1 : 0
missingState = na(snapshot.remove("Missing")) ? 1 : 0
keyOrder = array.get(keys, 0) == "Trend" ? 1 : 0
var board = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(board, 0, 0, "Signal", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 0, 1, "Trend", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 1, str.tostring(snapshot.get("Trend"), "#.00"), text_color=color.white, bgcolor=snapshot.get("Trend") > 0 ? color.green : color.red)
    table.cell(board, 0, 2, "Range", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 2, str.tostring(snapshot.get("Range"), "#.00"), text_color=color.white, bgcolor=color.green)
    table.cell(board, 0, 3, "Close", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 3, str.tostring(snapshot.get("Close"), "#.00"), text_color=color.black, bgcolor=color.yellow)
plot(composite, title="Map Composite")
plot(previousClose, title="Prior Close")
plot(snapshot.size(), title="Map Size")
plot(hasTrend, title="Has Trend")
plot(missingState, title="Missing State")
plot(keyOrder, title="Key Order")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Map Composite').values)).toEqual([
      4.02,
      5.05,
      6.07,
      7.03,
      5.99,
      5,
      8.04,
      9.09,
      7.08,
      7.11,
      7.1,
      7.12,
    ]);
    expect(getPlot(result, 'Prior Close').values).toEqual([
      null,
      102,
      105,
      107,
      103,
      99,
      100,
      104,
      109,
      108,
      111,
      110,
    ]);
    expect(getPlot(result, 'Map Size').values).toEqual(Array(compatibilityBars.length).fill(3));
    expect(getPlot(result, 'Has Trend').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Missing State').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(getPlot(result, 'Key Order').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(result.drawings).toEqual([
      expect.objectContaining({
        type: 'table',
        position: 'top_right',
        columns: 2,
        rows: 4,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          expect.objectContaining({ column: 0, row: 0, text: 'Signal', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 1, row: 0, text: 'Value', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 0, row: 1, text: 'Trend', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 1, text: '1.00', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 2, text: 'Range', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 2, text: '5.00', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 3, text: 'Close', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 3, text: '112.00', textColor: '#363A45', bgcolor: '#FDD835' }),
        ],
      }),
    ]);
  });

  it('locks a reduced public array signal-queue idiom', () => {
    // Public idiom reference: public signal dashboards commonly keep bounded
    // recent-signal queues in arrays before summarizing the last bar.
    // Source search: https://www.tradingview.com/scripts/search/array%20signal%20dashboard/
    const result = runCompatScript(`
indicator("Public Array Signal Checkpoint", overlay=true)
var array<float> signals = array.new_float()
rawSignal = close > open ? 1.0 : -1.0
signals.push(rawSignal)
if signals.size() > 5
    signals.shift()
sorted = signals.copy()
sorted.sort(order.descending)
queueSum = signals.sum()
queueAverage = signals.avg()
firstSignal = signals.first()
lastSignal = signals.last()
topSignal = sorted.get(0)
var board = table.new(position.top_right, 2, 5, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(board, 0, 0, "Queue", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(board, 0, 1, "Count", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 1, str.tostring(signals.size()), text_color=color.white, bgcolor=color.green)
    table.cell(board, 0, 2, "Sum", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 2, str.tostring(queueSum, "#.00"), text_color=color.white, bgcolor=queueSum > 0 ? color.green : color.red)
    table.cell(board, 0, 3, "Average", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 3, str.tostring(queueAverage, "#.00"), text_color=color.white, bgcolor=queueAverage > 0 ? color.green : color.red)
    table.cell(board, 0, 4, "Last", text_color=color.white, bgcolor=color.gray)
    table.cell(board, 1, 4, str.tostring(lastSignal, "#.00"), text_color=color.black, bgcolor=color.yellow)
plot(signals.size(), title="Queue Size")
plot(queueSum, title="Queue Sum")
plot(queueAverage, title="Queue Average")
plot(firstSignal, title="First Signal")
plot(lastSignal, title="Last Signal")
plot(topSignal, title="Top Signal")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Queue Size').values).toEqual([1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(getPlot(result, 'Queue Sum').values).toEqual([1, 2, 3, 2, 1, 1, 1, 1, 1, 3, 1, 1]);
    expect(roundSeries(getPlot(result, 'Queue Average').values)).toEqual([
      1,
      1,
      1,
      0.5,
      0.2,
      0.2,
      0.2,
      0.2,
      0.2,
      0.6,
      0.2,
      0.2,
    ]);
    expect(getPlot(result, 'First Signal').values).toEqual([1, 1, 1, 1, 1, 1, 1, -1, -1, 1, 1, 1]);
    expect(getPlot(result, 'Last Signal').values).toEqual([1, 1, 1, -1, -1, 1, 1, 1, -1, 1, -1, 1]);
    expect(getPlot(result, 'Top Signal').values).toEqual(Array(compatibilityBars.length).fill(1));
    expect(result.drawings).toEqual([
      expect.objectContaining({
        type: 'table',
        position: 'top_right',
        columns: 2,
        rows: 5,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          expect.objectContaining({ column: 0, row: 0, text: 'Queue', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 1, row: 0, text: 'Value', textColor: '#FFFFFF', bgcolor: '#2196F3' }),
          expect.objectContaining({ column: 0, row: 1, text: 'Count', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 1, text: '5', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 2, text: 'Sum', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 2, text: '1.00', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 3, text: 'Average', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 3, text: '0.20', textColor: '#FFFFFF', bgcolor: '#4CAF50' }),
          expect.objectContaining({ column: 0, row: 4, text: 'Last', textColor: '#FFFFFF', bgcolor: '#787B86' }),
          expect.objectContaining({ column: 1, row: 4, text: '1.00', textColor: '#363A45', bgcolor: '#FDD835' }),
        ],
      }),
    ]);
  });

  it('locks a reduced public multi-symbol screener idiom', () => {
    // Public idiom reference: screener-style public indicators commonly use
    // request.security() for several symbols and summarize signals in a table.
    // Source search: https://www.tradingview.com/scripts/search/screener/
    const bars: Bar[] = [
      { time: 1_700_500_000_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_500_060_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_500_120_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: 1_700_500_180_000, open: 10, high: 11, low: 9, close: 10, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: 'NASDAQ:AAPL',
        timeframe: '1',
        bars: [
          { time: bars[0]!.time, open: 100, high: 102, low: 99, close: 101, volume: 1_000 },
          { time: bars[1]!.time, open: 101, high: 103, low: 100, close: 102, volume: 1_100 },
          { time: bars[2]!.time, open: 102, high: 103, low: 100, close: 101, volume: 1_200 },
          { time: bars[3]!.time, open: 102, high: 104, low: 101, close: 103, volume: 1_300 },
        ],
        syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
      },
      {
        symbol: 'NASDAQ:MSFT',
        timeframe: '1',
        bars: [
          { time: bars[0]!.time, open: 201, high: 202, low: 199, close: 200, volume: 2_000 },
          { time: bars[1]!.time, open: 200, high: 201, low: 198, close: 199, volume: 2_100 },
          { time: bars[2]!.time, open: 199, high: 202, low: 198, close: 201, volume: 2_200 },
          { time: bars[3]!.time, open: 203, high: 204, low: 201, close: 202, volume: 2_300 },
        ],
        syminfo: { ticker: 'NASDAQ:MSFT', timezone: 'Etc/UTC' },
      },
      {
        symbol: 'NASDAQ:NVDA',
        timeframe: '1',
        bars: [
          { time: bars[0]!.time, open: 299, high: 302, low: 298, close: 300, volume: 3_000 },
          { time: bars[1]!.time, open: 301, high: 303, low: 300, close: 302, volume: 3_100 },
          { time: bars[2]!.time, open: 303, high: 305, low: 302, close: 304, volume: 3_200 },
          { time: bars[3]!.time, open: 305, high: 307, low: 304, close: 306, volume: 3_300 },
        ],
        syminfo: { ticker: 'NASDAQ:NVDA', timezone: 'Etc/UTC' },
      },
    ]);
    const result = runCompatScript(`
indicator("Public Screener Checkpoint", overlay=true)
aaplUp = request.security("NASDAQ:AAPL", "1", close > open, lookahead=barmerge.lookahead_on)
msftUp = request.security("NASDAQ:MSFT", "1", close > open, lookahead=barmerge.lookahead_on)
nvdaUp = request.security("NASDAQ:NVDA", "1", close > open, lookahead=barmerge.lookahead_on)
var screener = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(screener, 0, 0, "Symbol", text_color=color.white, bgcolor=color.blue)
    table.cell(screener, 1, 0, "Signal", text_color=color.white, bgcolor=color.blue)
    table.cell(screener, 0, 1, "AAPL", text_color=color.white, bgcolor=color.gray)
    table.cell(screener, 1, 1, aaplUp ? "Bull" : "Bear", text_color=color.white, bgcolor=aaplUp ? color.green : color.red)
    table.cell(screener, 0, 2, "MSFT", text_color=color.white, bgcolor=color.gray)
    table.cell(screener, 1, 2, msftUp ? "Bull" : "Bear", text_color=color.white, bgcolor=msftUp ? color.green : color.red)
    table.cell(screener, 0, 3, "NVDA", text_color=color.white, bgcolor=color.gray)
    table.cell(screener, 1, 3, nvdaUp ? "Bull" : "Bear", text_color=color.white, bgcolor=nvdaUp ? color.green : color.red)
plot(aaplUp ? 1 : 0, title="AAPL Up")
plot(msftUp ? 1 : 0, title="MSFT Up")
plot(nvdaUp ? 1 : 0, title="NVDA Up")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'AAPL Up').values).toEqual([1, 1, 0, 1]);
    expect(getPlot(result, 'MSFT Up').values).toEqual([0, 0, 1, 0]);
    expect(getPlot(result, 'NVDA Up').values).toEqual([1, 1, 1, 1]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 4,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Symbol',
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
            text: 'Signal',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 0,
            row: 1,
            text: 'AAPL',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: 'Bull',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 2,
            text: 'MSFT',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 2,
            text: 'Bear',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#F23645',
          },
          {
            column: 0,
            row: 3,
            text: 'NVDA',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 3,
            text: 'Bull',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('locks a reduced public currency conversion idiom', () => {
    // Public idiom reference: public portfolio and multi-asset indicators
    // commonly normalize values with request.currency_rate().
    // Source search: https://www.tradingview.com/scripts/search/currency%20conversion/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 10, high: 10.5, low: 9.5, close: 10, volume: 100 },
      { time: 1_700_530_060_000, open: 11, high: 11.5, low: 10.5, close: 11, volume: 100 },
      { time: 1_700_530_120_000, open: 12, high: 12.5, low: 11.5, close: 12, volume: 100 },
      { time: 1_700_530_180_000, open: 13, high: 13.5, low: 12.5, close: 13, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'currency_rate',
        key: currencyRateRequestKey('USD', 'EUR'),
        points: [
          { time: bars[0]!.time, value: 0.9 },
          { time: bars[2]!.time, value: 0.92 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Currency Conversion Checkpoint")
usdValue = close * 100
eurRate = request.currency_rate("USD", "EUR")
eurValue = usdValue * eurRate
plot(eurRate, title="EUR Rate")
plot(eurValue, title="EUR Value")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'EUR Rate').values).toEqual([0.9, 0.9, 0.92, 0.92]);
    expect(roundSeries(getPlot(result, 'EUR Value').values)).toEqual([900, 990, 1104, 1196]);
  });

  it('locks a reduced public earnings event marker idiom', () => {
    // Public idiom reference: public earnings overlays commonly compare
    // reported EPS with estimates and mark event bars.
    // Source search: https://www.tradingview.com/scripts/search/earnings%20surprise/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_530_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_530_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
      { time: 1_700_530_180_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'earnings',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'earnings.actual', 'USD'),
        points: [
          { time: bars[1]!.time, value: 1.6 },
          { time: bars[3]!.time, value: 1.2 },
        ],
      },
      {
        family: 'earnings',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'earnings.estimate', 'USD'),
        points: [
          { time: bars[1]!.time, value: 1.4 },
          { time: bars[3]!.time, value: 1.3 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Earnings Event Checkpoint", overlay=true)
actual = request.earnings("NASDAQ:AAPL", earnings.actual, gaps=barmerge.gaps_on, currency=currency.USD)
estimate = request.earnings("NASDAQ:AAPL", earnings.estimate, gaps=barmerge.gaps_on, currency=currency.USD)
beat = actual > estimate
plot(actual, title="Actual EPS")
plot(estimate, title="Estimate EPS")
plot(beat ? 1 : 0, title="EPS Beat")
plotshape(beat, title="Beat Marker", text="EPS", color=color.green)
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Actual EPS').values).toEqual([null, 1.6, null, 1.2]);
    expect(getPlot(result, 'Estimate EPS').values).toEqual([null, 1.4, null, 1.3]);
    expect(getPlot(result, 'EPS Beat').values).toEqual([0, 1, 0, 0]);
    expect(getPlot(result, 'Beat Marker').values).toEqual([null, 1, null, null]);
  });

  it('locks a reduced public corporate action event idiom', () => {
    // Public idiom reference: public corporate-action overlays commonly combine
    // dividend and split event series into chart markers.
    // Source search: https://www.tradingview.com/scripts/search/dividends%20splits/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_530_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_530_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
      { time: 1_700_530_180_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'dividends',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'),
        points: [{ time: bars[1]!.time, value: 0.82 }],
      },
      {
        family: 'splits',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'splits.numerator'),
        points: [{ time: bars[3]!.time, value: 4 }],
      },
      {
        family: 'splits',
        key: corporateActionRequestKey('NASDAQ:AAPL', 'splits.denominator'),
        points: [{ time: bars[3]!.time, value: 1 }],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Corporate Actions Checkpoint", overlay=true)
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, gaps=barmerge.gaps_on, currency=currency.USD)
splitNumerator = request.splits("NASDAQ:AAPL", splits.numerator, gaps=barmerge.gaps_on)
splitDenominator = request.splits("NASDAQ:AAPL", splits.denominator, gaps=barmerge.gaps_on)
splitRatio = splitNumerator / splitDenominator
actionScore = (na(dividend) ? 0 : dividend) + (na(splitRatio) ? 0 : splitRatio)
plot(dividend, title="Dividend")
plot(splitRatio, title="Split Ratio")
plot(actionScore, title="Action Score")
plotshape(not na(dividend), title="Dividend Marker", text="DIV", color=color.blue)
plotshape(not na(splitRatio), title="Split Marker", text="SPLIT", color=color.orange)
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dividend').values).toEqual([null, 0.82, null, null]);
    expect(getPlot(result, 'Split Ratio').values).toEqual([null, null, null, 4]);
    expect(getPlot(result, 'Action Score').values).toEqual([0, 0.82, 0, 4]);
    expect(getPlot(result, 'Dividend Marker').values).toEqual([null, 1, null, null]);
    expect(getPlot(result, 'Split Marker').values).toEqual([null, null, null, 1]);
  });

  it('locks a reduced public financial dashboard idiom', () => {
    // Public idiom reference: public fundamental dashboards commonly derive
    // ratios from request.financial() metrics and summarize the latest value.
    // Source search: https://www.tradingview.com/scripts/search/fundamental%20dashboard/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_530_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_530_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
      { time: 1_700_530_180_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'financial',
        key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', 'USD'),
        points: [
          { time: bars[1]!.time, value: 1_000 },
          { time: bars[3]!.time, value: 1_200 },
        ],
      },
      {
        family: 'financial',
        key: financialRequestKey('NASDAQ:AAPL', 'NET_INCOME', 'FQ', 'USD'),
        points: [
          { time: bars[1]!.time, value: 100 },
          { time: bars[3]!.time, value: 180 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Financial Dashboard Checkpoint", overlay=true)
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency=currency.USD)
income = request.financial("NASDAQ:AAPL", "NET_INCOME", "FQ", currency=currency.USD)
margin = income / revenue * 100
var fundamentals = table.new(position.bottom_right, 2, 2, border_width=1, border_color=color.white)
if barstate.islast
    table.cell(fundamentals, 0, 0, "Metric", text_color=color.white, bgcolor=color.blue)
    table.cell(fundamentals, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(fundamentals, 0, 1, "Margin", text_color=color.white, bgcolor=color.gray)
    table.cell(fundamentals, 1, 1, str.tostring(margin, "#.00") + "%", text_color=color.white, bgcolor=color.green)
plot(revenue, title="Revenue")
plot(margin, title="Margin")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Revenue').values).toEqual([null, 1_000, 1_000, 1_200]);
    expect(roundSeries(getPlot(result, 'Margin').values, 2)).toEqual([null, 10, 10, 15]);
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'bottom_right',
        columns: 2,
        rows: 2,
        bgcolor: null,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        frameWidth: 0,
        frameColor: null,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Metric',
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
            text: 'Value',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 0,
            row: 1,
            text: 'Margin',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: '15.00%',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('locks a reduced public economic macro overlay idiom', () => {
    // Public idiom reference: public macro overlays commonly request economic
    // point series and gate regimes from the latest host-provided value.
    // Source search: https://www.tradingview.com/scripts/search/macro%20economic/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_530_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_530_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
      { time: 1_700_530_180_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([], [
      {
        family: 'economic',
        key: economicRequestKey('US', 'GDP'),
        points: [
          { time: bars[0]!.time, value: 2.8 },
          { time: bars[2]!.time, value: 3.1 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Economic Macro Checkpoint")
gdp = request.economic("US", "GDP")
expansion = gdp > 3
plot(gdp, title="GDP")
plot(expansion ? 1 : 0, title="Expansion")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'GDP').values).toEqual([2.8, 2.8, 3.1, 3.1]);
    expect(getPlot(result, 'Expansion').values).toEqual([0, 0, 1, 1]);
  });

  it('locks a reduced public seed dataset overlay idiom', () => {
    // Public idiom reference: public scripts can consume curated external
    // datasets through request.seed() and merge them onto the chart.
    // Source search: https://www.tradingview.com/scripts/search/pine%20seeds/
    const bars: Bar[] = [
      { time: 1_700_530_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_530_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_530_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
      { time: 1_700_530_180_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const requestDatafeed = new InMemoryRequestDatafeed([
      {
        symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'BTC_DEV'),
        timeframe: '60',
        bars: [
          { time: bars[0]!.time, open: 10, high: 10, low: 10, close: 10, volume: 1 },
          { time: bars[2]!.time, open: 20, high: 20, low: 20, close: 20, volume: 1 },
        ],
      },
    ]);
    const result = runCompatScript(`
indicator("Public Seed Dataset Checkpoint")
seedClose = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", close)
seedTrend = seedClose > seedClose[1]
plot(seedClose, title="Seed Close")
plot(seedTrend ? 1 : 0, title="Seed Trend")
`, {
      bars,
      engineOptions: { requestDatafeed },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Seed Close').values).toEqual([null, null, 10, 10]);
    expect(getPlot(result, 'Seed Trend').values).toEqual([0, 0, 0, 0]);
  });

  it('locks a reduced public library helper idiom', () => {
    // Public idiom reference: public indicators commonly import helper
    // libraries for reusable signal calculations.
    // Source search: https://www.tradingview.com/scripts/search/library%20helper/
    const library = parse(`
library("RangeTools", true)
calcRange(float source, int length) => source - ta.sma(source, length)
export range(float source, int length) => calcRange(source, length)
export signal(float source, int length) => calcRange(source, length) > 0
`);
    const result = runCompatScript(`
indicator("Public Library Helper Checkpoint")
import PublicUser/RangeTools/1 as rt
spread = rt.range(close, 3)
isUp = rt.signal(close, 3)
plot(spread, title="Imported Spread")
plot(isUp ? 1 : 0, title="Imported Signal")
`, {
      engineOptions: {
        libraries: new Map([['PublicUser/RangeTools/1', library]]),
      },
    });

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Imported Spread').values)).toEqual([
      null,
      null,
      2.333333,
      -2,
      -4,
      -0.666667,
      3,
      4.666667,
      1,
      1.666667,
      0.333333,
      1,
    ]);
    expect(getPlot(result, 'Imported Signal').values).toEqual([0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
  });

  it('locks a reduced official dynamic session idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/sessions/
    const result = runCompatScript(`
indicator("Official Dynamic Session Checkpoint")
weekdaySessionInput = input.session("2218-2224", "Weekday Session")
weekendSessionInput = input.session("0000-0001", "Weekend Session")
daysInput = input.string("23456", "Weekdays")
weekdaySession = weekdaySessionInput + ":" + daysInput
weekendSession = weekendSessionInput + ":17"
dynamicSession = dayofweek >= dayofweek.monday and dayofweek <= dayofweek.friday ? weekdaySession : weekendSession
inDynamicSession = not na(time(timeframe.period, dynamicSession))
plot(inDynamicSession ? 1 : 0, title="Dynamic Session")
plot(str.length(dynamicSession), title="Session Length")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Dynamic Session').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Session Length').values).toEqual(Array(compatibilityBars.length).fill(15));
  });

  it('locks a reduced public date and session input gate idiom', () => {
    // Public idiom reference: configurable public indicators commonly expose
    // start/end date, session, symbol, timeframe, color, and note inputs before
    // gating visible signals.
    // Source search: https://www.tradingview.com/scripts/search/date%20session%20filter/
    const result = runCompatScript(`
indicator("Public Date Session Input Checkpoint")
startTime = input.time(1700000300000, "Start Time", "Start tooltip", group="Filters")
endTime = input.time(1700000600000, "End Time", "End tooltip", group="Filters")
sessionInput = input.session("2218-2224", "Session", "Session tooltip", group="Filters")
tfInput = input.timeframe("60", "Signal Timeframe", ["60", "240"], "Timeframe tooltip", group="Filters")
symbolInput = input.symbol("BINANCE:BTCUSDT", "Symbol", "Symbol tooltip", group="Filters")
signalColor = input.color(color.green, "Signal Color", "Color tooltip", group="Style")
notes = input.text_area("watch breakout", "Notes", "Notes tooltip", group="Style")
inDateRange = time >= startTime and time <= endTime
inSession = not na(time(timeframe.period, sessionInput))
symbolMatches = symbolInput == "BINANCE:BTCUSDT"
tfMatches = timeframe.in_seconds(tfInput) == 3600
notesMatch = str.contains(notes, "breakout")
signal = inDateRange and inSession and symbolMatches and tfMatches and notesMatch
plot(signal ? 1 : 0, title="Filtered Signal", color=signalColor)
plot(inDateRange ? 1 : 0, title="Date Range")
plot(str.length(notes), title="Notes Length")
`);

    expect(result.errors).toEqual([]);
    expect(result.inputs).toHaveLength(7);
    expect(result.inputs).toMatchObject([
      { id: 'input_Start Time', type: 'time', title: 'Start Time', defval: 1_700_000_300_000, tooltip: 'Start tooltip', group: 'Filters' },
      { id: 'input_End Time', type: 'time', title: 'End Time', defval: 1_700_000_600_000, tooltip: 'End tooltip', group: 'Filters' },
      { id: 'input_Session', type: 'session', title: 'Session', defval: '2218-2224', tooltip: 'Session tooltip', group: 'Filters' },
      {
        id: 'input_Signal Timeframe',
        type: 'timeframe',
        title: 'Signal Timeframe',
        defval: '60',
        options: ['60', '240'],
        tooltip: 'Timeframe tooltip',
        group: 'Filters',
      },
      { id: 'input_Symbol', type: 'symbol', title: 'Symbol', defval: 'BINANCE:BTCUSDT', tooltip: 'Symbol tooltip', group: 'Filters' },
      { id: 'input_Signal Color', type: 'color', title: 'Signal Color', tooltip: 'Color tooltip', group: 'Style' },
      { id: 'input_Notes', type: 'text_area', title: 'Notes', defval: 'watch breakout', tooltip: 'Notes tooltip', group: 'Style' },
    ]);
    expect(getPlot(result, 'Filtered Signal').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Filtered Signal').color).toEqual(Array(compatibilityBars.length).fill('#4CAF50'));
    expect(getPlot(result, 'Date Range').values).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0]);
    expect(getPlot(result, 'Notes Length').values).toEqual(Array(compatibilityBars.length).fill(14));
  });

  it('locks a reduced official timeframe comparison idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/timeframes/
    const result = runCompatScript(`
indicator("Official Timeframe Comparison Checkpoint")
tfInput = input.timeframe(defval="240", title="Input TF")
chartTfInMinutes = timeframe.in_seconds() / 60
inputTfInMinutes = timeframe.in_seconds(tfInput) / 60
validTimeframe = chartTfInMinutes <= inputTfInMinutes
plot(chartTfInMinutes, title="Chart TF Minutes")
plot(inputTfInMinutes, title="Input TF Minutes")
plot(validTimeframe ? 1 : 0, title="Valid Timeframe")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Chart TF Minutes').values).toEqual(Array(compatibilityBars.length).fill(60));
    expect(getPlot(result, 'Input TF Minutes').values).toEqual(Array(compatibilityBars.length).fill(240));
    expect(getPlot(result, 'Valid Timeframe').values).toEqual(Array(compatibilityBars.length).fill(1));
  });

  it('locks the official alert trigger idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/alerts/
    const result = runCompatScript(`
indicator("Official Alert Checkpoint")
trigger = close > close[1]
alertcondition(trigger, title="Close Rising", message="Close rose above the previous close")
if trigger
    alert("Close rising", alert.freq_once_per_bar_close)
plot(trigger ? 1 : 0, title="Trigger")
`);

    const condition = result.alerts.find((alert) => alert.type === 'alertcondition');
    const directAlert = result.alerts.find((alert) => alert.type === 'alert');

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Trigger').values).toEqual([0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]);
    expect(condition?.values).toEqual([null, true, true, null, null, true, true, true, null, true, null, true]);
    expect(directAlert?.events.map((event) => ({
      barIndex: event.barIndex,
      frequency: event.frequency,
      message: event.message,
    }))).toEqual([
      { barIndex: 1, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 2, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 5, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 6, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 7, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 9, frequency: 'once_per_bar_close', message: 'Close rising' },
      { barIndex: 11, frequency: 'once_per_bar_close', message: 'Close rising' },
    ]);
  });

  it('locks a reduced public alert signal idiom', () => {
    // Public idiom reference: public signal indicators commonly expose both
    // alertcondition() metadata and direct alert() calls for trigger bars.
    // Source search: https://www.tradingview.com/scripts/search/alert%20signal/
    const result = runCompatScript(`
indicator("Public Alert Signal Checkpoint")
average = ta.sma(close, 3)
signal = close > average and close[1] <= average[1]
alertcondition(signal, title="Public Signal", message="Signal crossed above average")
if signal
    alert("Signal crossed above average", alert.freq_once_per_bar_close)
plot(signal ? 1 : 0, title="Signal")
plot(average, title="Average")
`);

    const condition = result.alerts.find((alert) => alert.type === 'alertcondition' && alert.title === 'Public Signal');
    const directAlert = result.alerts.find((alert) => alert.type === 'alert');

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Signal').values).toEqual([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    expect(roundSeries(getPlot(result, 'Average').values)).toEqual([
      null,
      null,
      104.666667,
      105,
      103,
      100.666667,
      101,
      104.333333,
      107,
      109.333333,
      109.666667,
      111,
    ]);
    expect(condition?.values).toEqual([null, null, null, null, null, null, true, null, null, null, null, null]);
    expect(directAlert?.events.map((event) => ({
      barIndex: event.barIndex,
      frequency: event.frequency,
      message: event.message,
    }))).toEqual([
      { barIndex: 6, frequency: 'once_per_bar_close', message: 'Signal crossed above average' },
    ]);
  });

  it('locks a reduced public log signal idiom', () => {
    // Public idiom reference: public signal/debug scripts commonly emit Pine
    // Logs entries around startup, signal transitions, and final summaries.
    // Source search: https://www.tradingview.com/scripts/search/log%20signal/
    const result = runCompatScript(`
indicator("Public Log Signal Checkpoint")
average = ta.sma(close, 3)
signal = close > average
var signalCount = 0
var previousSignal = false
if barstate.isfirst
    log.info("Public log checkpoint {0}", syminfo.ticker)
if signal
    signalCount += 1
if signal and not previousSignal
    log.warning("Signal {0} close {1:#.00}", bar_index, close)
previousSignal := signal
if barstate.islast
    log.error(message="Final signals {0}", signalCount)
plot(signal ? 1 : 0, title="Signal")
plot(signalCount, title="Signal Count")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Signal').values).toEqual([0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(getPlot(result, 'Signal Count').values).toEqual([0, 0, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7]);
    expect(result.logs.map(({ level, barIndex, message }) => ({ level, barIndex, message }))).toEqual([
      { level: 'info', barIndex: 0, message: 'Public log checkpoint BTCUSDT' },
      { level: 'warning', barIndex: 2, message: 'Signal 2 close 107.00' },
      { level: 'warning', barIndex: 6, message: 'Signal 6 close 104.00' },
      { level: 'error', barIndex: 11, message: 'Final signals 7' },
    ]);
  });

  it('locks a reduced public runtime error guard idiom', () => {
    // Public idiom reference: public indicators commonly halt with
    // `runtime.error()` when required configuration or chart context is invalid.
    // Source search: https://www.tradingview.com/scripts/search/runtime.error%20guard/
    const result = runCompatScript(`
indicator("Public Runtime Error Guard Checkpoint")
threshold = input.float(103.0, "Required Threshold")
plot(close, title="Before Guard")
if bar_index == 2 and close > threshold
    runtime.error("Required threshold guard tripped")
plot(close > threshold ? 1 : 0, title="After Guard")
`);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      code: 'runtime.error',
      message: 'Required threshold guard tripped',
    });
    expect(roundSeries(getPlot(result, 'Before Guard').values)).toEqual([102, 105, 107]);
    expect(getPlot(result, 'After Guard').values).toEqual([0, 1]);
  });

  it('locks the official strategy entry and bracket-exit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 100 },
      { time: 1_700_000_060_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
      { time: 1_700_000_120_000, open: 106, high: 110, low: 105, close: 108, volume: 100 },
      { time: 1_700_000_180_000, open: 108, high: 109, low: 103, close: 104, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Strategy Checkpoint", initial_capital=1000)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=108, stop=99)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 105,
      exitPrice: 108,
      profit: 3,
    });
  });

  it('locks a reduced public strategy bracket idiom', () => {
    // Public idiom reference: public strategy scripts commonly pair entry
    // signals with fixed stop/target brackets.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20bracket/
    const bars: Bar[] = [
      { time: 1_700_600_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_600_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_600_120_000, open: 102, high: 104, low: 101, close: 103, volume: 100 },
      { time: 1_700_600_180_000, open: 103, high: 106, low: 102, close: 105, volume: 100 },
      { time: 1_700_600_240_000, open: 105, high: 106, low: 104, close: 105, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Bracket Checkpoint", initial_capital=1000, process_orders_on_close=true)
fast = ta.sma(close, 2)
slow = ta.sma(close, 3)
longSignal = bar_index == 2 and fast > slow
if longSignal
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0
    target = strategy.position_avg_price + 3
    stop = strategy.position_avg_price - 2
    strategy.exit("Long Bracket", "Long", limit=target, stop=stop)
plot(longSignal ? 1 : 0, title="Long Signal")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Long Signal').values).toEqual([0, 0, 1, 0, 0]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 0, 3]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Long Bracket Limit',
      entryPrice: 103,
      exitPrice: 106,
      profit: 3,
    });
  });

  it('locks a reduced public strategy trailing stop idiom', () => {
    // Public idiom reference: public strategy scripts commonly use ATR-style
    // trailing exits after trend entries.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20trailing%20stop/
    const bars: Bar[] = [
      { time: 1_700_620_000_000, open: 100, high: 100.5, low: 99.5, close: 100, volume: 100 },
      { time: 1_700_620_060_000, open: 100.2, high: 100.6, low: 99.8, close: 100.4, volume: 100 },
      { time: 1_700_620_120_000, open: 101, high: 101.5, low: 100.8, close: 101.2, volume: 100 },
      { time: 1_700_620_180_000, open: 101, high: 101, low: 100.9, close: 101, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Trailing Stop Checkpoint", process_orders_on_close=true)
longSignal = bar_index == 0
if longSignal
    strategy.entry("Long", strategy.long, qty=1)
if strategy.position_size > 0
    strategy.exit("Trail", "Long", trail_points=5, trail_offset=4)
plot(longSignal ? 1 : 0, title="Long Signal")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { runtime: { syminfo: { mintick: 0.1 } } },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Long Signal').values).toEqual([1, 0, 0, 0]);
    expect(getPlot(result, 'Position').values).toEqual([1, 1, 0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 1, 1]);
    expect(roundSeries(getPlot(result, 'Net Profit').values)).toEqual([0, 0, 0.2, 0.2]);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      type: order.type,
      status: order.status,
      trailActivationPrice: order.trailActivationPrice,
      trailOffset: order.trailOffset,
      trailingActivated: order.trailingActivated,
      trailingStopPrice: order.trailingStopPrice == null ? order.trailingStopPrice : Math.round(order.trailingStopPrice * 10) / 10,
      avgFillPrice: order.avgFillPrice == null ? order.avgFillPrice : Math.round(order.avgFillPrice * 10) / 10,
      updatedBarIndex: order.updatedBarIndex,
    }))).toEqual([
      {
        id: 'Long',
        type: 'market',
        status: 'filled',
        trailActivationPrice: undefined,
        trailOffset: undefined,
        trailingActivated: false,
        trailingStopPrice: undefined,
        avgFillPrice: 100,
        updatedBarIndex: 0,
      },
      {
        id: 'Trail',
        type: 'trailing_stop',
        status: 'filled',
        trailActivationPrice: 100.5,
        trailOffset: 0.4,
        trailingActivated: true,
        trailingStopPrice: 100.2,
        avgFillPrice: 100.2,
        updatedBarIndex: 1,
      },
    ]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Trail',
      entryPrice: 100,
    });
    expect(result.strategy.closedTrades[0]?.exitPrice).toBeCloseTo(100.2);
    expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(0.2);
  });

  it('locks a reduced public strategy stats table idiom', () => {
    // Public idiom reference: strategy performance public scripts commonly
    // summarize closed trades, win count, and net profit in a last-bar table.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20performance%20table/
    const bars: Bar[] = [
      { time: 1_700_610_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_610_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
      { time: 1_700_610_120_000, open: 104, high: 106, low: 103, close: 105, volume: 100 },
      { time: 1_700_610_180_000, open: 105, high: 106, low: 104, close: 105, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Stats Checkpoint", overlay=true, process_orders_on_close=true)
var stats = table.new(position.top_right, 2, 4, border_width=1, border_color=color.white)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if bar_index == 1
    strategy.close("L", comment="take")
if barstate.islast
    table.cell(stats, 0, 0, "Metric", text_color=color.white, bgcolor=color.blue)
    table.cell(stats, 1, 0, "Value", text_color=color.white, bgcolor=color.blue)
    table.cell(stats, 0, 1, "Closed", text_color=color.white, bgcolor=color.gray)
    table.cell(stats, 1, 1, str.tostring(strategy.closedtrades), text_color=color.white, bgcolor=color.green)
    table.cell(stats, 0, 2, "Wins", text_color=color.white, bgcolor=color.gray)
    table.cell(stats, 1, 2, str.tostring(strategy.wintrades), text_color=color.white, bgcolor=color.green)
    table.cell(stats, 0, 3, "Net", text_color=color.white, bgcolor=color.gray)
    table.cell(stats, 1, 3, str.tostring(strategy.netprofit, "#.##"), text_color=color.white, bgcolor=color.green)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.wintrades, title="Win Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1, 1]);
    expect(getPlot(result, 'Win Trades').values).toEqual([0, 1, 1, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 4, 4, 4]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'L',
      exitOrderId: 'Close L',
      entryPrice: 100,
      exitPrice: 104,
      profit: 4,
    });
    expect(result.drawings).toEqual([
      {
        id: 'table_table.new_0_0',
        type: 'table',
        persistent: true,
        barIndex: 0,
        position: 'top_right',
        columns: 2,
        rows: 4,
        bgcolor: null,
        frameColor: null,
        frameWidth: 0,
        borderColor: '#FFFFFF',
        borderWidth: 1,
        cells: [
          {
            column: 0,
            row: 0,
            text: 'Metric',
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
            text: 'Value',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#2196F3',
          },
          {
            column: 0,
            row: 1,
            text: 'Closed',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 1,
            text: '1',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 2,
            text: 'Wins',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 2,
            text: '1',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
          {
            column: 0,
            row: 3,
            text: 'Net',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#787B86',
          },
          {
            column: 1,
            row: 3,
            text: '4.00',
            width: undefined,
            height: undefined,
            textColor: '#FFFFFF',
            textHalign: 'center',
            textValign: 'middle',
            textSize: 'normal',
            bgcolor: '#4CAF50',
          },
        ],
      },
    ]);
  });

  it('locks a reduced public strategy trade-list table idiom', () => {
    // Public idiom reference: strategy trade-list public scripts commonly
    // summarize the latest closed trade with `strategy.closedtrades.*()` accessors.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20trade%20list/
    const bars: Bar[] = [
      { time: 1_700_615_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_615_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
      { time: 1_700_615_120_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
      { time: 1_700_615_180_000, open: 106, high: 107, low: 105, close: 106, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Trade List Checkpoint", overlay=true, process_orders_on_close=true)
var trades = table.new(position.top_right, 2, 5, border_width=1, border_color=color.white)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2, comment="seed")
if bar_index == 2
    strategy.close("L", comment="manual exit")
hasClosed = strategy.closedtrades > 0
lastTrade = strategy.closedtrades - 1
lastEntry = hasClosed ? strategy.closedtrades.entry_price(lastTrade) : na
lastExit = hasClosed ? strategy.closedtrades.exit_price(lastTrade) : na
lastProfit = hasClosed ? strategy.closedtrades.profit(lastTrade) : na
lastReturn = hasClosed ? strategy.closedtrades.profit_percent(lastTrade) : na
lastExitId = hasClosed ? strategy.closedtrades.exit_id(lastTrade) : ""
if barstate.islast and hasClosed
    table.cell(trades, 0, 0, "Field", text_color=color.white, bgcolor=color.blue)
    table.cell(trades, 1, 0, "Latest", text_color=color.white, bgcolor=color.blue)
    table.cell(trades, 0, 1, "Entry", text_color=color.white, bgcolor=color.gray)
    table.cell(trades, 1, 1, str.tostring(lastEntry, "#.##"), text_color=color.white, bgcolor=color.green)
    table.cell(trades, 0, 2, "Exit", text_color=color.white, bgcolor=color.gray)
    table.cell(trades, 1, 2, str.tostring(lastExit, "#.##"), text_color=color.white, bgcolor=color.green)
    table.cell(trades, 0, 3, "Profit", text_color=color.white, bgcolor=color.gray)
    table.cell(trades, 1, 3, str.tostring(lastProfit, "#.##"), text_color=color.white, bgcolor=color.green)
    table.cell(trades, 0, 4, "Exit Id", text_color=color.white, bgcolor=color.gray)
    table.cell(trades, 1, 4, lastExitId, text_color=color.white, bgcolor=color.green)
plot(strategy.closedtrades, title="Closed Trades")
plot(lastEntry, title="Last Entry")
plot(lastExit, title="Last Exit")
plot(lastProfit, title="Last Profit")
plot(lastReturn, title="Last Return")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 1, 1]);
    expect(getPlot(result, 'Last Entry').values).toEqual([null, null, 100, 100]);
    expect(getPlot(result, 'Last Exit').values).toEqual([null, null, 106, 106]);
    expect(getPlot(result, 'Last Profit').values).toEqual([null, null, 12, 12]);
    expect(roundSeries(getPlot(result, 'Last Return').values)).toEqual([null, null, 6, 6]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'L',
      exitOrderId: 'Close L',
      entryPrice: 100,
      exitPrice: 106,
      profit: 12,
    });
    const table = result.drawings.find((drawing) => drawing.type === 'table');
    expect(table?.type === 'table' ? table.cells.map((cell) => cell.text) : []).toEqual([
      'Field',
      'Latest',
      'Entry',
      '100.00',
      'Exit',
      '106.00',
      'Profit',
      '12.00',
      'Exit Id',
      'Close L',
    ]);
  });

  it('locks a reduced public strategy open-trade dashboard idiom', () => {
    // Public idiom reference: strategy dashboard public scripts commonly
    // summarize the currently open trade with `strategy.opentrades.*()` accessors.
    // Source search: https://www.tradingview.com/scripts/search/strategy%20open%20trade%20dashboard/
    const bars: Bar[] = [
      { time: 1_700_616_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_616_060_000, open: 103, high: 105, low: 102, close: 104, volume: 100 },
      { time: 1_700_616_120_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
      { time: 1_700_616_180_000, open: 106, high: 108, low: 105, close: 106, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Public Strategy Open Trade Checkpoint", overlay=true, process_orders_on_close=true)
var openStats = table.new(position.top_right, 2, 6, border_width=1, border_color=color.white)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=2, comment="open seed")
hasOpen = strategy.opentrades > 0
lastOpen = strategy.opentrades - 1
openEntry = hasOpen ? strategy.opentrades.entry_price(lastOpen) : na
openSize = hasOpen ? strategy.opentrades.size(lastOpen) : na
openProfit = hasOpen ? strategy.opentrades.profit(lastOpen) : na
openReturn = hasOpen ? strategy.opentrades.profit_percent(lastOpen) : na
openId = hasOpen ? strategy.opentrades.entry_id(lastOpen) : ""
openComment = hasOpen ? strategy.opentrades.entry_comment(lastOpen) : ""
if barstate.islast and hasOpen
    table.cell(openStats, 0, 0, "Field", text_color=color.white, bgcolor=color.blue)
    table.cell(openStats, 1, 0, "Open", text_color=color.white, bgcolor=color.blue)
    table.cell(openStats, 0, 1, "Entry", text_color=color.white, bgcolor=color.gray)
    table.cell(openStats, 1, 1, str.tostring(openEntry, "#.##"), text_color=color.white, bgcolor=color.green)
    table.cell(openStats, 0, 2, "Size", text_color=color.white, bgcolor=color.gray)
    table.cell(openStats, 1, 2, str.tostring(openSize, "#.##"), text_color=color.white, bgcolor=color.green)
    table.cell(openStats, 0, 3, "Profit", text_color=color.white, bgcolor=color.gray)
    table.cell(openStats, 1, 3, str.tostring(openProfit, "#.##"), text_color=color.white, bgcolor=color.green)
    table.cell(openStats, 0, 4, "Entry Id", text_color=color.white, bgcolor=color.gray)
    table.cell(openStats, 1, 4, openId, text_color=color.white, bgcolor=color.green)
    table.cell(openStats, 0, 5, "Comment", text_color=color.white, bgcolor=color.gray)
    table.cell(openStats, 1, 5, openComment, text_color=color.white, bgcolor=color.green)
plot(strategy.opentrades, title="Open Trades")
plot(openEntry, title="Open Entry")
plot(openProfit, title="Open Profit")
plot(openReturn, title="Open Return")
plot(strategy.opentrades.capital_held, title="Capital Held")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Open Trades').values).toEqual([1, 1, 1, 1]);
    expect(getPlot(result, 'Open Entry').values).toEqual([100, 100, 100, 100]);
    expect(getPlot(result, 'Open Profit').values).toEqual([0, 8, 12, 12]);
    expect(roundSeries(getPlot(result, 'Open Return').values)).toEqual([0, 4, 6, 6]);
    expect(getPlot(result, 'Capital Held').values).toEqual([200, 200, 200, 200]);
    expect(result.strategy.openTrades[0]).toMatchObject({
      entryOrderId: 'L',
      entryPrice: 100,
      entryComment: 'open seed',
    });
    const table = result.drawings.find((drawing) => drawing.type === 'table');
    expect(table?.type === 'table' ? table.cells.map((cell) => cell.text) : []).toEqual([
      'Field',
      'Open',
      'Entry',
      '100.00',
      'Size',
      '2.00',
      'Profit',
      '12.00',
      'Entry Id',
      'L',
      'Comment',
      'open seed',
    ]);
  });

  it('locks the official strategy profit-loss exit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 100.4, low: 99.8, close: 100.2, volume: 100 },
      { time: 1_700_000_060_000, open: 100.2, high: 100.8, low: 99.9, close: 100.4, volume: 100 },
      { time: 1_700_000_120_000, open: 100.4, high: 101.5, low: 100, close: 101, volume: 100 },
      { time: 1_700_000_180_000, open: 101, high: 101.4, low: 100.6, close: 101.1, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Profit Loss Exit Checkpoint", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", profit=4, loss=2)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { runtime: { syminfo: { mintick: 0.25 } } },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 100.2,
      exitPrice: 101.2,
      profit: 1,
    });
  });

  it('locks the official strategy trailing exit tick idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 100.5, low: 99.5, close: 100, volume: 100 },
      { time: 1_700_000_060_000, open: 100.2, high: 100.6, low: 99.8, close: 100.4, volume: 100 },
      { time: 1_700_000_120_000, open: 101, high: 101.5, low: 100.8, close: 101.2, volume: 100 },
      { time: 1_700_000_180_000, open: 101, high: 101, low: 100.9, close: 101, volume: 100 },
      { time: 1_700_000_240_000, open: 101, high: 101.2, low: 100.7, close: 100.8, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Trailing Exit Checkpoint", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Trail", "Long", trail_points=5, trail_offset=4)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { runtime: { syminfo: { mintick: 0.1 } } },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 0, 1]);
    expect(roundSeries(getPlot(result, 'Net Profit').values)).toEqual([0, 0, 0, 0, 1.1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Trail',
      entryPrice: 100,
      exitPrice: 101.1,
    });
    expect(result.strategy.closedTrades[0]?.profit).toBeCloseTo(1.1);
  });

  it('locks official default broker path and opening-gap fill assumptions', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/#broker-emulator
    const script = `
strategy("Official Broker Path Checkpoint", initial_capital=1000, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=103, stop=97)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`;
    const baseBars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_000_060_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];

    const highFirst = runCompatScript(script, {
      bars: [
        ...baseBars,
        { time: 1_700_000_120_000, open: 100, high: 104, low: 94, close: 100, volume: 100 },
        { time: 1_700_000_180_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      ],
    });
    const lowFirst = runCompatScript(script, {
      bars: [
        ...baseBars,
        { time: 1_700_000_120_000, open: 100, high: 106, low: 96, close: 100, volume: 100 },
        { time: 1_700_000_180_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      ],
    });
    const openingGap = runCompatScript(script, {
      bars: [
        ...baseBars,
        { time: 1_700_000_120_000, open: 95, high: 99, low: 94, close: 98, volume: 100 },
        { time: 1_700_000_180_000, open: 98, high: 99, low: 97, close: 98, volume: 100 },
      ],
    });

    expect(highFirst.errors).toEqual([]);
    expect(lowFirst.errors).toEqual([]);
    expect(openingGap.errors).toEqual([]);
    expect(getPlot(highFirst, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(lowFirst, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(openingGap, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(highFirst, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(getPlot(lowFirst, 'Net Profit').values).toEqual([0, 0, 0, -3]);
    expect(getPlot(openingGap, 'Net Profit').values).toEqual([0, 0, 0, -5]);
    expect(highFirst.strategy.closedTrades[0]).toMatchObject({
      exitOrderId: 'Bracket Limit',
      entryPrice: 100,
      exitPrice: 103,
      profit: 3,
    });
    expect(lowFirst.strategy.closedTrades[0]).toMatchObject({
      exitOrderId: 'Bracket Stop',
      entryPrice: 100,
      exitPrice: 97,
      profit: -3,
    });
    expect(openingGap.strategy.closedTrades[0]).toMatchObject({
      exitOrderId: 'Bracket Stop',
      entryPrice: 100,
      exitPrice: 95,
      profit: -5,
    });
  });

  it('runs strategy order helpers with named-prefix positional tails', () => {
    const bars: Bar[] = [
      { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 100 },
      { time: 1_700_000_060_000, open: 105, high: 107, low: 104, close: 106, volume: 100 },
      { time: 1_700_000_120_000, open: 106, high: 110, low: 105, close: 108, volume: 100 },
      { time: 1_700_000_180_000, open: 108, high: 109, low: 103, close: 104, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Strategy Prefix Args", initial_capital=1000)
if bar_index == 0
    strategy.entry(id="Long", strategy.long, 1)
if bar_index == 1
    strategy.exit(id="Bracket", "Long", na, na, na, 108, na, 99)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 1, 1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 105,
      exitPrice: 108,
      profit: 3,
    });
  });

  it('runs strategy close helpers with named-prefix positional tails', () => {
    const bars: Bar[] = [
      { time: 1_700_300_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_300_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Strategy Close Prefix Args", process_orders_on_close=true)
if bar_index == 0
    strategy.entry(id="Long", strategy.long, 1)
if bar_index == 1
    strategy.close(id="Long", "close comment", 1, na, "close alert")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([1, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Close Long',
      exitBarIndex: 1,
    });
    expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => event.message)).toEqual([
      'close alert',
    ]);
  });

  it('locks a reduced official strategy immediate close idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/#strategyclose-and-strategyclose_all
    const bars: Bar[] = [
      { time: 1_700_350_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_350_060_000, open: 101, high: 103, low: 100, close: 102, volume: 100 },
      { time: 1_700_350_120_000, open: 103, high: 104, low: 102, close: 103, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Immediate Close Checkpoint", process_orders_on_close=false)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Long", immediately=true)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 1, 1]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Close Long',
      entryBarIndex: 1,
      exitBarIndex: 1,
      entryPrice: 101,
      exitPrice: 102,
      profit: 1,
    });
  });

  it('locks a reduced official strategy fill-alert suppression idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_360_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_360_060_000, open: 101, high: 103, low: 100, close: 102, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Disable Alert Checkpoint", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, alert_message="entry suppressed", disable_alert=true)
if bar_index == 1
    strategy.close("Long", alert_message="close emitted")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1]);
    expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => event.message)).toEqual([
      'close emitted',
    ]);
    expect(result.strategy.fills.map((fill) => ({
      orderId: fill.orderId,
      alertMessage: fill.alertMessage,
      disableAlert: fill.disableAlert,
    }))).toEqual([
      { orderId: 'Long', alertMessage: 'entry suppressed', disableAlert: true },
      { orderId: 'Close Long', alertMessage: 'close emitted', disableAlert: false },
    ]);
  });

  it('locks a reduced official strategy entry-direction risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_370_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_370_060_000, open: 100, high: 103, low: 99, close: 102, volume: 100 },
      { time: 1_700_370_120_000, open: 102, high: 103, low: 100, close: 101, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Allow Entry In Checkpoint", process_orders_on_close=true)
strategy.risk.allow_entry_in(strategy.direction.long)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("Blocked Short", strategy.short, qty=1)
if bar_index == 2
    strategy.order("Raw Short", strategy.short, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.opentrades, title="Open Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([2, 0, -1]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1]);
    expect(getPlot(result, 'Open Trades').values).toEqual([1, 0, 1]);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      qty: order.qty,
      requestedQty: order.requestedQty,
      filledQty: order.filledQty,
    }))).toEqual([
      { id: 'Long', qty: 2, requestedQty: 2, filledQty: 2 },
      { id: 'Blocked Short', qty: 2, requestedQty: 0, filledQty: 2 },
      { id: 'Raw Short', qty: 1, requestedQty: 1, filledQty: 1 },
    ]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Blocked Short',
      qty: 2,
    });
  });

  it('locks a reduced official strategy max position risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_375_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_375_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_375_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Max Position Risk Checkpoint", process_orders_on_close=true, pyramiding=2)
strategy.risk.max_position_size(3)
if bar_index == 0
    strategy.entry("A", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("B", strategy.long, qty=2)
if bar_index == 2
    strategy.entry("C", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.opentrades, title="Open Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([2, 3, 3]);
    expect(getPlot(result, 'Open Trades').values).toEqual([1, 2, 2]);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      qty: order.qty,
      requestedQty: order.requestedQty,
      filledQty: order.filledQty,
    }))).toEqual([
      { id: 'A', qty: 2, requestedQty: 2, filledQty: 2 },
      { id: 'B', qty: 1, requestedQty: 1, filledQty: 1 },
    ]);
    expect(result.strategy.position.size).toBe(3);
    expect(result.strategy.settings.maxPositionSize).toBe(3);
  });

  it('locks a reduced official strategy intraday filled-order risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_380_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_380_060_000, open: 101, high: 102, low: 100, close: 101, volume: 100 },
      { time: 1_700_380_120_000, open: 102, high: 103, low: 101, close: 102, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Intraday Filled Orders Risk Checkpoint", process_orders_on_close=true)
strategy.risk.max_intraday_filled_orders(count=1)
if bar_index == 0
    strategy.entry("Allowed", strategy.long, qty=1)
if bar_index == 1
    strategy.entry("Blocked Entry", strategy.long, qty=1)
if bar_index == 2
    strategy.order("Blocked Raw", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.opentrades, title="Open Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 0]);
    expect(getPlot(result, 'Open Trades').values).toEqual([0, 0, 0]);
    expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Allowed', 'Risk Close All']);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      status: order.status,
      qty: order.qty,
      requestedQty: order.requestedQty,
    }))).toEqual([
      { id: 'Allowed', status: 'filled', qty: 1, requestedQty: 1 },
      { id: 'Risk Close All', status: 'filled', qty: 1, requestedQty: 1 },
    ]);
    expect(result.strategy.settings.riskRules.maxIntradayFilledOrders).toEqual({ count: 1 });
  });

  it('locks a reduced official strategy consecutive loss-days risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: Date.UTC(2024, 0, 1, 10), open: 100, high: 101, low: 98, close: 99, volume: 100 },
      { time: Date.UTC(2024, 0, 2, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: Date.UTC(2024, 0, 2, 10), open: 100, high: 101, low: 97, close: 98, volume: 100 },
      { time: Date.UTC(2024, 0, 3, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Consecutive Loss Days Risk Checkpoint", process_orders_on_close=true)
strategy.risk.max_cons_loss_days(count=2)
if bar_index == 0
    strategy.entry("Day 1", strategy.long, qty=1)
if bar_index == 1
    strategy.close("Day 1")
if bar_index == 2
    strategy.entry("Day 2", strategy.long, qty=1)
if bar_index == 3
    strategy.close("Day 2")
if bar_index == 4
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([1, 0, 1, 0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1, 1, 2, 2]);
    expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Day 1', 'Close Day 1', 'Day 2', 'Close Day 2']);
    expect(result.strategy.closedTrades.map((trade) => ({
      entryOrderId: trade.entryOrderId,
      exitOrderId: trade.exitOrderId,
      profit: trade.profit,
    }))).toEqual([
      { entryOrderId: 'Day 1', exitOrderId: 'Close Day 1', profit: -1 },
      { entryOrderId: 'Day 2', exitOrderId: 'Close Day 2', profit: -2 },
    ]);
    expect(result.strategy.orders.map((order) => order.id)).toEqual(['Day 1', 'Close Day 1', 'Day 2', 'Close Day 2']);
    expect(result.strategy.settings.riskRules.maxConsLossDays).toEqual({ count: 2 });
  });

  it('locks a reduced official strategy intraday loss risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: Date.UTC(2024, 0, 1, 10), open: 100, high: 101, low: 89, close: 90, volume: 100 },
      { time: Date.UTC(2024, 0, 1, 11), open: 90, high: 92, low: 88, close: 91, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Intraday Loss Risk Checkpoint", process_orders_on_close=true)
strategy.risk.max_intraday_loss(value=5, type=strategy.cash)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 2
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.equity, title="Equity")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([1, 0, 0]);
    expect(getPlot(result, 'Equity').values).toEqual([100_000, 99_990, 99_990]);
    expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
    expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
    expect(result.strategy.equityCurve.map(({ equity, drawdown }) => ({ equity, drawdown }))).toEqual([
      { equity: 100_000, drawdown: 0 },
      { equity: 99_990, drawdown: 10 },
      { equity: 99_990, drawdown: 10 },
    ]);
    expect(result.strategy.settings.riskRules.maxIntradayLoss).toEqual({ value: 5, type: 'cash' });
  });

  it('locks a reduced official strategy max drawdown risk idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: Date.UTC(2024, 0, 1, 9), open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: Date.UTC(2024, 0, 2, 9), open: 100, high: 101, low: 89, close: 90, volume: 100 },
      { time: Date.UTC(2024, 0, 3, 9), open: 90, high: 92, low: 88, close: 91, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Max Drawdown Risk Checkpoint", process_orders_on_close=true)
strategy.risk.max_drawdown(value=5, type=strategy.cash)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 2
    strategy.entry("Blocked", strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.equity, title="Equity")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([1, 0, 0]);
    expect(getPlot(result, 'Equity').values).toEqual([100_000, 99_990, 99_990]);
    expect(result.strategy.fills.map((fill) => fill.orderId)).toEqual(['Long', 'Risk Close All']);
    expect(result.strategy.orders.map((order) => order.id)).toEqual(['Long', 'Risk Close All']);
    expect(result.strategy.equityCurve.map(({ equity, drawdown }) => ({ equity, drawdown }))).toEqual([
      { equity: 100_000, drawdown: 0 },
      { equity: 99_990, drawdown: 10 },
      { equity: 99_990, drawdown: 10 },
    ]);
    expect(result.strategy.settings.riskRules.maxDrawdown).toEqual({ value: 5, type: 'cash' });
  });

  it('locks a reduced official strategy bar-magnifier idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const baseTime = 1_700_100_000_000;
    const bars: Bar[] = [
      { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: baseTime + 60_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: baseTime + 120_000, open: 100, high: 105, low: 95, close: 100, volume: 100 },
      { time: baseTime + 180_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];
    const intrabars = new InMemoryStrategyIntrabarDatafeed([{
      symbol: 'BTCUSDT',
      timeframe: '60',
      chartBarTime: bars[2].time,
      chartBarIndex: 2,
      chartBar: bars[2],
      source: 'lower_timeframe',
      ticks: [
        { time: bars[2].time, price: 100, kind: 'intrabar_open', sequence: 0 },
        { time: bars[2].time + 15_000, price: 104, kind: 'intrabar_high', sequence: 1 },
        { time: bars[2].time + 30_000, price: 96, kind: 'intrabar_low', sequence: 2 },
        { time: bars[2].time + 45_000, price: 100, kind: 'intrabar_close', sequence: 3 },
      ],
    }]);
    const result = runCompatScript(`
strategy("Official Bar Magnifier Checkpoint", use_bar_magnifier=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1)
if bar_index == 1
    strategy.exit("Bracket", "Long", limit=103, stop=97)
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.netprofit, title="Net Profit")
`, {
      bars,
      engineOptions: { strategyIntrabarDatafeed: intrabars },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0, 1]);
    expect(getPlot(result, 'Net Profit').values).toEqual([0, 0, 0, 3]);
    expect(result.strategy.intrabarContexts.map((context) => context.source)).toEqual([
      'chart_ohlc',
      'chart_ohlc',
      'lower_timeframe',
      'chart_ohlc',
    ]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Bracket Limit',
      entryPrice: 100,
      exitPrice: 103,
      exitTime: bars[2].time + 15_000,
      profit: 3,
    });
  });

  it('locks a reduced official strategy stop-limit order idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/#order-types
    const bars: Bar[] = [
      { time: 1_700_150_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: 1_700_150_060_000, open: 100, high: 102.5, low: 97, close: 100, volume: 100 },
      { time: 1_700_150_120_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Stop Limit Checkpoint")
if bar_index == 0
    strategy.entry("Long stop-limit", strategy.long, qty=1, stop=102, limit=98)
plot(strategy.position_size, title="Position")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0, 1]);
    expect(result.strategy.fills.map(({ orderId, price, barIndex, time }) => ({ orderId, price, barIndex, time }))).toEqual([
      { orderId: 'Long stop-limit', price: 98, barIndex: 1, time: bars[1].time },
    ]);
    expect(result.strategy.orders[0]).toMatchObject({
      id: 'Long stop-limit',
      type: 'stop_limit',
      status: 'filled',
      stopLimitActivated: true,
      stopLimitActivatedBarIndex: 1,
      avgFillPrice: 98,
      updatedBarIndex: 1,
    });
  });

  it('locks a reduced official strategy calc-on-order-fills idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_200_000_000, open: 100, high: 100.5, low: 99.5, close: 100.2, volume: 100 },
      { time: 1_700_200_060_000, open: 100, high: 100.5, low: 99.6, close: 100.4, volume: 100 },
    ];
    const result = runCompatScript(`
strategy("Official Recalculate After Fill Checkpoint", calc_on_order_fills=true, process_orders_on_close=true)
var recalculations = 0
recalculations += 1
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=99.8, alert_message="entry filled")
if strategy.position_size > 0
    strategy.close("Long")
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
plot(recalculations, title="Recalculations")
`, { bars });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 0]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 1]);
    expect(getPlot(result, 'Recalculations').values).toEqual([1, 2]);
    expect(result.strategy.closedTrades[0]).toMatchObject({
      entryOrderId: 'Long',
      exitOrderId: 'Close Long',
      entryBarIndex: 1,
      exitBarIndex: 1,
    });
    expect(result.alerts.find((alert) => alert.id === 'strategy_order_fills')?.events.map((event) => event.message)).toEqual([
      'entry filled',
    ]);
  });

  it('locks a reduced official strategy bar-magnifier recalculation idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const baseTime = 1_700_250_000_000;
    const bars: Bar[] = [
      { time: baseTime, open: 100, high: 101, low: 99, close: 100, volume: 100 },
      { time: baseTime + 60_000, open: 100, high: 105, low: 96, close: 100, volume: 100 },
      { time: baseTime + 120_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
    ];
    const intrabars = new InMemoryStrategyIntrabarDatafeed([{
      symbol: 'BTCUSDT',
      timeframe: '60',
      chartBarTime: bars[1].time,
      chartBarIndex: 1,
      chartBar: bars[1],
      source: 'lower_timeframe',
      ticks: [
        { time: bars[1].time, price: 100, kind: 'intrabar_open', sequence: 0 },
        { time: bars[1].time + 15_000, price: 105, kind: 'intrabar_high', sequence: 1 },
        { time: bars[1].time + 30_000, price: 96, kind: 'intrabar_low', sequence: 2 },
        { time: bars[1].time + 45_000, price: 100, kind: 'intrabar_close', sequence: 3 },
      ],
    }]);
    const result = runCompatScript(`
strategy("Official Bar Magnifier Recalculate Checkpoint", calc_on_order_fills=true, use_bar_magnifier=true, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=1, limit=97)
if strategy.position_size > 0
    strategy.exit("Take", "Long", limit=104)
plot(strategy.position_size, title="Position")
plot(strategy.closedtrades, title="Closed Trades")
`, {
      bars,
      engineOptions: { strategyIntrabarDatafeed: intrabars },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Position').values).toEqual([0, 1, 1]);
    expect(getPlot(result, 'Closed Trades').values).toEqual([0, 0, 0]);
    expect(result.strategy.fills.map(({ orderId, price, barIndex, time }) => ({ orderId, price, barIndex, time }))).toEqual([
      { orderId: 'Long', price: 97, barIndex: 1, time: bars[1].time + 30_000 },
    ]);
    expect(result.strategy.orders.map((order) => ({
      id: order.id,
      status: order.status,
      avgFillPrice: order.avgFillPrice,
    }))).toEqual([
      { id: 'Long', status: 'filled', avgFillPrice: 97 },
      { id: 'Take', status: 'pending', avgFillPrice: null },
    ]);
  });

  it('locks a reduced official strategy calc-on-every-tick idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/concepts/strategies/
    const bars: Bar[] = [
      { time: 1_700_300_000_000, open: 100, high: 101, low: 99, close: 100.2, volume: 100 },
      { time: 1_700_300_060_000, open: 100.2, high: 101.2, low: 99.8, close: 100.8, volume: 100 },
      { time: 1_700_300_120_000, open: 100.8, high: 102, low: 100.4, close: 101.6, volume: 100 },
    ];
    const defaultAst = parse(`//@version=6
strategy("Official Default Realtime Strategy Checkpoint", calc_on_every_tick=false)
plot(close, title="Realtime Close")
`);
    const everyTickAst = parse(`//@version=6
strategy("Official Every Tick Strategy Checkpoint", calc_on_every_tick=true)
plot(close, title="Realtime Close")
`);
    const realtimeBar: Bar = {
      ...bars[2]!,
      time: bars[2]!.time + 60_000,
      open: 102,
      high: 103,
      low: 101.5,
      close: 102.5,
    };

    const defaultEngine = new TealscriptEngine();
    const defaultResult = defaultEngine.execute(defaultAst, bars);
    const defaultFirstTick = defaultEngine.updateBar(defaultAst, realtimeBar);
    const defaultFirstValues = [...defaultFirstTick.find((plot) => plot.title === 'Realtime Close')!.values];
    const defaultSecondTick = defaultEngine.updateBar(defaultAst, { ...realtimeBar, close: 102.75 });
    const defaultSecondValues = [...defaultSecondTick.find((plot) => plot.title === 'Realtime Close')!.values];

    const everyTickEngine = new TealscriptEngine();
    const everyTickResult = everyTickEngine.execute(everyTickAst, bars);
    const everyTickFirstTick = everyTickEngine.updateBar(everyTickAst, realtimeBar);
    const everyTickFirstValues = [...everyTickFirstTick.find((plot) => plot.title === 'Realtime Close')!.values];
    const everyTickSecondTick = everyTickEngine.updateBar(everyTickAst, { ...realtimeBar, close: 102.75 });
    const everyTickSecondValues = [...everyTickSecondTick.find((plot) => plot.title === 'Realtime Close')!.values];

    expect(defaultResult.errors).toEqual([]);
    expect(defaultFirstValues).toEqual([100.2, 100.8, 101.6]);
    expect(defaultSecondValues).toEqual([100.2, 100.8, 101.6]);
    expect(everyTickResult.errors).toEqual([]);
    expect(everyTickFirstValues).toEqual([100.2, 100.8, 101.6, 102.5]);
    expect(everyTickSecondValues).toEqual([100.2, 100.8, 101.6, 102.75]);
  });

  it('locks the official repeated request-call limit idiom', () => {
    // Source: https://www.tradingview.com/pine-script-docs/writing/limitations/
    const result = runCompatScript(`
indicator("Official Request Limit Checkpoint")
reqSum = 0.0
for i = 1 to 50
    reqSum := reqSum + nz(request.security("MISSING", "2", close, ignore_invalid_symbol=true), 0)
plot(reqSum, title="Request Sum")
`, {
      bars: [compatibilityBars[0]!],
      engineOptions: { requestDatafeed: new InMemoryRequestDatafeed([]) },
    });

    expect(result.errors).toEqual([]);
    expect(result.profile.requestContexts).toBe(1);
    expect(getPlot(result, 'Request Sum').values).toEqual([0]);
  });
});

function getRealtimePlot(plots: PlotOutput[], title: string): PlotOutput {
  const plot = plots.find((candidate) => candidate.title === title || candidate.id === `plot_${title}`);
  if (!plot) {
    throw new Error(`Expected realtime plot "${title}" to exist. Found: ${plots.map((candidate) => candidate.title).join(', ')}`);
  }
  return plot;
}
