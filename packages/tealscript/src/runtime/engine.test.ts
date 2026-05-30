import { describe, it, expect } from 'vitest';
import { TealscriptEngine, executeScript } from './engine';
import { parse } from '../parser/parser';
import type { Bar } from './context';

// Helper to create test bars
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

describe('TealscriptEngine', () => {
  describe('basic execution', () => {
    it('executes a simple script', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(10);
      const result = executeScript(ast, bars);

      expect(result.indicatorTitle).toBe('Test');
      expect(result.errors).toHaveLength(0);
    });

    it('returns plot outputs', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close Price")`;

      const ast = parse(script);
      const bars = createBars(10);
      const result = executeScript(ast, bars);

      expect(result.plots.length).toBeGreaterThan(0);
      const closePlot = result.plots.find((p) => p.title === 'Close Price');
      expect(closePlot).toBeDefined();
      expect(closePlot!.values.length).toBe(10);
    });

    it('keeps multiple untitled plots as separate series', () => {
      const script = `//@version=6
indicator("Test")
plot(open, color=color.blue)
plot(high, color=color.green)
plot(low, color=color.red)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(3);
      expect(result.plots.map((plot) => plot.id)).toEqual([
        'plot_untitled_0',
        'plot_untitled_1',
        'plot_untitled_2',
      ]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [100, 100.5, 101],
        [100.5, 101, 101.5],
        [99.7, 100.2, 100.7],
      ]);
    });

    it('does not collide untitled plot ids with explicit numeric titles', () => {
      const script = `//@version=6
indicator("Test")
plot(open)
plot(high, title="0")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.map((plot) => plot.id)).toEqual(['plot_untitled_0', 'plot_0']);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [100, 100.5],
        [100.5, 101],
      ]);
    });

    it('collects alertcondition output values', () => {
      const script = `//@version=6
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green bar", message="Close is above open")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 'alertcondition_Green bar',
        type: 'alertcondition',
        title: 'Green bar',
        message: 'Close is above open',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events).toEqual([]);
    });

    it('aligns conditional alertcondition output to bar indexes', () => {
      const script = `//@version=6
indicator("Alerts")
if bar_index >= 2
    alertcondition(true, title="Late", message="late condition")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].values).toEqual([null, null, true, true, true]);
    });

    it('collects direct alert events with frequency constants', () => {
      const script = `//@version=6
indicator("Alerts")
if close > open
    alert("Green bar", alert.freq_once_per_bar_close)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 'alert_alert_0',
        type: 'alert',
        title: 'alert',
        message: 'Green bar',
        frequency: 'once_per_bar_close',
      });
      expect(result.alerts[0].values).toEqual([true, true, true]);
      expect(result.alerts[0].events.map((event) => ({
        barIndex: event.barIndex,
        message: event.message,
        frequency: event.frequency,
      }))).toEqual([
        { barIndex: 0, message: 'Green bar', frequency: 'once_per_bar_close' },
        { barIndex: 1, message: 'Green bar', frequency: 'once_per_bar_close' },
        { barIndex: 2, message: 'Green bar', frequency: 'once_per_bar_close' },
      ]);
    });

    it('dispatches array method calls to array builtins', () => {
      const script = `//@version=6
indicator("Array Methods")
var array<float> values = array.new_float()
values.push(close)
values.unshift(open)
first = values.shift()
lastIndex = values.size() - 1
last = values.get(lastIndex)
values.set(0, 42)
plot(first, title="First")
plot(last, title="Last")
plot(values.get(0), title="Head")
plot(values.size(), title="Size")
values.clear()`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([100, 100.5, 101]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([100.2, 100.7, 101.2]);
      expect(result.plots.find((plot) => plot.title === 'Head')?.values).toEqual([42, 42, 42]);
      expect(result.plots.find((plot) => plot.title === 'Size')?.values).toEqual([1, 1, 1]);
    });

    it('executes extended array helpers and methods', () => {
      const script = `//@version=6
indicator("Array Extras")
values = array.from(3, 5, 3)
copy = values.copy()
copy.insert(1, 4)
removed = copy.remove(2)
plot(values.first(), title="First")
plot(values.last(), title="Last")
plot(values.includes(5) ? 1 : 0, title="Includes")
plot(values.indexof(3), title="Index")
plot(values.lastindexof(3), title="Last Index")
plot(copy.sum(), title="Sum")
plot(copy.avg(), title="Avg")
plot(copy.min(), title="Min")
plot(copy.max(), title="Max")
plot(removed, title="Removed")`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'First')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Last')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Includes')?.values).toEqual([1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Index')?.values).toEqual([0, 0]);
      expect(result.plots.find((plot) => plot.title === 'Last Index')?.values).toEqual([2, 2]);
      expect(result.plots.find((plot) => plot.title === 'Sum')?.values).toEqual([10, 10]);
      expect(result.plots.find((plot) => plot.title === 'Avg')?.values).toEqual([10 / 3, 10 / 3]);
      expect(result.plots.find((plot) => plot.title === 'Min')?.values).toEqual([3, 3]);
      expect(result.plots.find((plot) => plot.title === 'Max')?.values).toEqual([4, 4]);
      expect(result.plots.find((plot) => plot.title === 'Removed')?.values).toEqual([5, 5]);
    });

    it('returns expression results from user function if branches', () => {
      const script = `//@version=6
indicator("Function If")
positive(value) =>
    if value > 0
        1
negative(value) =>
    if value < 0
        -1
plot(positive(close - open), title="Positive")
plot(negative(close - open), title="Negative")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Positive')?.values).toEqual([1, 1, 1]);
      expect(result.plots.find((plot) => plot.title === 'Negative')?.values).toEqual([null, null, null]);
    });

    it('returns expression results from user function else branches', () => {
      const script = `//@version=6
indicator("Function If Else")
classify(value) =>
    if value > 0
        1
    else if value < 0
        -1
    else
        0
plot(classify(bar_index - 1), title="Classified")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Classified')?.values).toEqual([-1, 0, 1]);
    });

    it('evaluates keyed switch expressions', () => {
      const script = `//@version=6
indicator("Switch Test")
mode = "EMA"
selected = switch mode
    "SMA" => open
    "EMA" => close
    => high
plot(selected, title="Selected")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Selected')?.values).toEqual([100.2, 100.7, 101.2]);
    });

    it('evaluates condition-only switch expressions', () => {
      const script = `//@version=6
indicator("Switch Conditions")
direction = switch
    close > open => 1
    close < open => -1
    => 0
plot(direction, title="Direction")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.find((plot) => plot.title === 'Direction')?.values).toEqual([1, 1, 1]);
    });

    it('returns plotcandle OHLC and color outputs with na gaps', () => {
      const script = `//@version=6
indicator("Synthetic candles", overlay=true)
o = bar_index == 1 ? na : open
h = bar_index == 1 ? na : high
l = bar_index == 1 ? na : low
c = bar_index == 1 ? na : close
body = c >= o ? color.green : color.red
plotcandle(o, h, l, c, title="Synthetic", color=body, wickcolor=color.blue, bordercolor=color.orange)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const candles = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(candles).toBeDefined();
      expect(candles?.openValues).toEqual([100, null, 101]);
      expect(candles?.highValues).toEqual([100.5, null, 101.5]);
      expect(candles?.lowValues).toEqual([99.7, null, 100.7]);
      expect(candles?.closeValues).toEqual([100.2, null, 101.2]);
      expect(candles?.values).toEqual([100.2, null, 101.2]);
      expect(candles?.color).toEqual(['#4CAF50', null, '#4CAF50']);
      expect(candles?.wickColor).toEqual(['#2196F3', null, '#2196F3']);
      expect(candles?.borderColor).toEqual(['#FF9800', null, '#FF9800']);
    });

    it('returns plotbar OHLC outputs with directional colors', () => {
      const script = `//@version=6
indicator("Synthetic bars", overlay=true)
barColor = close >= open ? color.green : color.red
plotbar(open, high, low, close, title="Bars", color=barColor)`;

      const ast = parse(script);
      const bars = createBars(2, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const plotBars = result.plots.find((plot) => plot.type === 'plotbar');
      expect(plotBars).toBeDefined();
      expect(plotBars?.openValues).toEqual([100, 100.5]);
      expect(plotBars?.highValues).toEqual([100.5, 101]);
      expect(plotBars?.lowValues).toEqual([99.7, 100.2]);
      expect(plotBars?.closeValues).toEqual([100.2, 100.7]);
      expect(plotBars?.values).toEqual([100.2, 100.7]);
      expect(plotBars?.color).toEqual(['#4CAF50', '#4CAF50']);
    });

    it('aligns conditionally executed plotcandle outputs to bar indexes', () => {
      const script = `//@version=6
indicator("Conditional candles", overlay=true)
if bar_index > 0
    plotcandle(open, high, low, close, title="Late", color=color.green)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      const candles = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(candles).toBeDefined();
      expect(candles?.openValues).toEqual([null, 100.5, 101]);
      expect(candles?.values).toEqual([null, 100.7, 101.2]);
      expect(candles?.color).toEqual([null, '#4CAF50', '#4CAF50']);
    });

    it('handles empty bar data', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const result = executeScript(ast, []);

      expect(result.errors).toHaveLength(0);
      expect(result.plots.length).toBe(0);
    });
  });

  describe('built-in series', () => {
    it('provides access to close prices', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values.length).toBe(5);
      expect(plot.values[0]).toBeCloseTo(100.2, 1);
    });

    it('provides access to OHLCV', () => {
      const script = `//@version=6
indicator("Test")
plot(open, title="O")
plot(high, title="H")
plot(low, title="L")
plot(close, title="C")
plot(volume, title="V")`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const result = executeScript(ast, bars);

      expect(result.plots).toHaveLength(5);
    });

    it('provides bar_index', () => {
      const script = `//@version=6
indicator("Test")
plot(bar_index)`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('variable declarations', () => {
    it('handles simple variable declaration', () => {
      const script = `//@version=6
indicator("Test")
x = 42
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([42, 42, 42]);
    });

    it('handles var keyword for persistence', () => {
      const script = `//@version=6
indicator("Test")
var counter = 0
counter := counter + 1
plot(counter)`;

      const ast = parse(script);
      const bars = createBars(5);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('arithmetic expressions', () => {
    it('evaluates addition', () => {
      const script = `//@version=6
indicator("Test")
x = 1 + 2
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(3);
    });

    it('evaluates complex expressions', () => {
      const script = `//@version=6
indicator("Test")
x = (1 + 2) * 3 - 1
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(8);
    });

    it('respects operator precedence', () => {
      const script = `//@version=6
indicator("Test")
x = 2 + 3 * 4
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(14);
    });
  });

  describe('comparison and logical operations', () => {
    it('evaluates comparisons', () => {
      const script = `//@version=6
indicator("Test")
x = close > open ? 1 : 0
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(1);
    });

    it('evaluates logical operators', () => {
      const script = `//@version=6
indicator("Test")
a = true
b = false
x = a and b ? 1 : 0
y = a or b ? 1 : 0
plot(x, title="And")
plot(y, title="Or")`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      const andPlot = result.plots.find((p) => p.title === 'And');
      const orPlot = result.plots.find((p) => p.title === 'Or');

      expect(andPlot!.values[0]).toBe(0);
      expect(orPlot!.values[0]).toBe(1);
    });
  });

  describe('conditional expressions', () => {
    it('evaluates ternary expression', () => {
      const script = `//@version=6
indicator("Test")
x = bar_index == 0 ? 100 : 200
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([100, 200, 200]);
    });
  });

  describe('if statements', () => {
    it('executes if branch', () => {
      const script = `//@version=6
indicator("Test")
var x = 0
if bar_index == 0
    x := 100
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([100, 100, 100]);
    });
  });

  describe('for loops', () => {
    it('executes for loop', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 1 to 5
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(15);
    });

    it('executes for loop with step', () => {
      const script = `//@version=6
indicator("Test")
sum = 0
for i = 0 to 10 by 2
    sum := sum + i
plot(sum)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(30);
    });
  });

  describe('math functions', () => {
    it('evaluates math.abs', () => {
      const script = `//@version=6
indicator("Test")
x = math.abs(-5)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(5);
    });

    it('evaluates math.max', () => {
      const script = `//@version=6
indicator("Test")
x = math.max(1, 5, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(5);
    });

    it('evaluates math.sqrt', () => {
      const script = `//@version=6
indicator("Test")
x = math.sqrt(16)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[0]).toBe(4);
    });
  });

  describe('TA functions', () => {
    it('calculates ta.sma', () => {
      const script = `//@version=6
indicator("Test")
x = ta.sma(close, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values.length).toBe(5);
      expect(plot.values[2]).not.toBeNull();
      expect(plot.values[3]).not.toBeNull();
      expect(plot.values[4]).not.toBeNull();
    });

    it('calculates ta.highest', () => {
      const script = `//@version=6
indicator("Test")
x = ta.highest(high, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[4]).not.toBeNaN();
    });

    it('calculates ta.lowest', () => {
      const script = `//@version=6
indicator("Test")
x = ta.lowest(low, 3)
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values[4]).not.toBeNaN();
    });
  });

  describe('history access', () => {
    it('accesses previous bar values', () => {
      const script = `//@version=6
indicator("Test")
x = close[1]
plot(x)`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const result = executeScript(ast, bars);

      const plot = result.plots[0];
      expect(plot.values[1]).toBeCloseTo(bars[0].close, 1);
    });
  });

  describe('inputs', () => {
    it('registers input definitions', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.inputs.length).toBe(1);
      expect(result.inputs[0].title).toBe('Length');
      expect(result.inputs[0].defval).toBe(14);
    });

    it('uses default input value', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.plots[0].values).toEqual([14, 14, 14]);
    });

    it('accepts custom input values', () => {
      const script = `//@version=6
indicator("Test")
length = input.int(14, title="Length")
plot(length)`;

      const ast = parse(script);
      const bars = createBars(3);
      const inputs = new Map([['input_Length', 20]]);
      const result = executeScript(ast, bars, inputs);

      expect(result.plots[0].values).toEqual([20, 20, 20]);
    });
  });

  describe('color functions', () => {
    it('provides color constants', () => {
      const script = `//@version=6
indicator("Test")
plot(close, color=color.red)`;

      const ast = parse(script);
      const bars = createBars(1);
      const result = executeScript(ast, bars);

      // Color can be a string or an array of colors per bar
      const color = result.plots[0].color;
      const firstColor = Array.isArray(color) ? color[0] : color;
      expect(firstColor).toBe('#F44336');
    });
  });

  describe('error handling', () => {
    it('records errors without crashing', () => {
      const script = `//@version=6
indicator("Test")
x = undefined_var
plot(x)`;

      const ast = parse(script);
      const bars = createBars(3);
      const result = executeScript(ast, bars);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('updateBar (incremental execution)', () => {
    it('updates plot values on same-timestamp bar', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      // Full execute
      const result = engine.execute(ast, bars);
      const lastPlotValue = result.plots[0].values[4];
      expect(lastPlotValue).toBeCloseTo(bars[4].close, 5);

      // Update last bar with a different close price
      const updatedBar = { ...bars[4], close: 999 };
      const plots = engine.updateBar(ast, updatedBar);

      const closePlot = plots.find((p) => p.title === 'Close');
      expect(closePlot).toBeDefined();
      // Plot array length must match bar count (no duplicates from re-execution)
      expect(closePlot!.values.length).toBe(bars.length);
      // The last value should reflect the updated close
      expect(closePlot!.values[closePlot!.values.length - 1]).toBe(999);
    });

    it('rollback works correctly between updateBar calls', () => {
      const script = `//@version=6
indicator("Test")
plot(close, title="Close")`;

      const ast = parse(script);
      const bars = createBars(5, 100);
      const engine = new TealscriptEngine();

      // Full execute
      const result = engine.execute(ast, bars);
      const closePlot = result.plots.find((p) => p.title === 'Close')!;
      const originalLastValue = closePlot.values[4];
      expect(originalLastValue).toBeCloseTo(bars[4].close, 5);

      // First updateBar with new close
      const updatedBar1 = { ...bars[4], close: 200 };
      const plots1 = engine.updateBar(ast, updatedBar1);
      const close1 = plots1.find((p) => p.title === 'Close')!;
      expect(close1.values.length).toBe(bars.length);
      expect(close1.values[close1.values.length - 1]).toBe(200);

      // Second updateBar — rollback should restore to committed state,
      // so the new close value replaces the previous updateBar's value
      const updatedBar2 = { ...bars[4], close: 300 };
      const plots2 = engine.updateBar(ast, updatedBar2);
      const close2 = plots2.find((p) => p.title === 'Close')!;
      expect(close2.values.length).toBe(bars.length);
      expect(close2.values[close2.values.length - 1]).toBe(300);
    });

    it('snapshot is only taken on the last bar', () => {
      const script = `//@version=6
indicator("Test")
plot(close)`;

      const ast = parse(script);
      const bars = createBars(10, 100);
      const engine = new TealscriptEngine();

      // Full execute
      engine.execute(ast, bars);

      // Verify updateBar works (which requires a snapshot from the last bar)
      const updatedBar = { ...bars[9], close: 555 };
      const plots = engine.updateBar(ast, updatedBar);

      // If snapshot wasn't taken on last bar, rollback would fail
      // and values would be wrong. The fact that we get correct plots
      // means the snapshot was taken on the last bar.
      expect(plots.length).toBeGreaterThan(0);
      expect(plots[0].values.length).toBe(bars.length);
      expect(plots[0].values[plots[0].values.length - 1]).toBe(555);
    });

    it('truncates OHLC plot arrays before same-timestamp re-execution', () => {
      const script = `//@version=6
indicator("Conditional OHLC", overlay=true)
if close > open
    plotcandle(open, high, low, close, title="Conditional", color=color.green)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      const initialPlot = result.plots.find((plot) => plot.type === 'plotcandle');
      expect(initialPlot?.closeValues?.[2]).toBe(101.2);

      const updatedBar = { ...bars[2], close: bars[2].open - 1 };
      const plots = engine.updateBar(ast, updatedBar);
      const updatedPlot = plots.find((plot) => plot.type === 'plotcandle');

      expect(updatedPlot?.values).toEqual([100.2, 100.7]);
      expect(updatedPlot?.openValues).toEqual([100, 100.5]);
      expect(updatedPlot?.closeValues).toEqual([100.2, 100.7]);
      expect(updatedPlot?.color).toEqual(['#4CAF50', '#4CAF50']);
    });

    it('truncates alerts before same-timestamp re-execution', () => {
      const script = `//@version=6
indicator("Alerts")
isUp = close > open
alertcondition(isUp, title="Green", message="green condition")
if isUp
    alert("Green event", alert.freq_once_per_bar)`;

      const ast = parse(script);
      const bars = createBars(3, 100);
      const engine = new TealscriptEngine();

      const result = engine.execute(ast, bars);
      expect(result.alerts.find((alert) => alert.type === 'alertcondition')?.values).toEqual([true, true, true]);
      expect(result.alerts.find((alert) => alert.type === 'alert')?.events).toHaveLength(3);

      const updatedBar = { ...bars[2], close: bars[2].open - 1 };
      engine.updateBar(ast, updatedBar);
      const alerts = engine.getAlerts();

      expect(alerts.find((alert) => alert.type === 'alertcondition')?.values).toEqual([true, true, null]);
      expect(alerts.find((alert) => alert.type === 'alert')?.values).toEqual([true, true]);
      expect(alerts.find((alert) => alert.type === 'alert')?.events.map((event) => event.barIndex)).toEqual([0, 1]);
    });
  });
});
