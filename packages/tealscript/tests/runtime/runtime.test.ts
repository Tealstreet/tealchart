/**
 * Tealscript Runtime Tests
 */

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import {
  Series,
  seriesFrom,
  ExecutionContext,
  Scope,
  TealscriptEngine,
  executeScript,
  type Bar,
} from '../../src/runtime';

// Helper to create test bars
function createBars(count: number, startPrice: number = 100): Bar[] {
  const bars: Bar[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.5) * 2; // Random change between -1 and 1
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();

    bars.push({
      time: Date.now() - (count - i) * 60000,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000) + 100,
    });

    price = close;
  }

  return bars;
}

// Helper to create predictable bars
function createPredictableBars(): Bar[] {
  return [
    { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    { time: 2000, open: 102, high: 108, low: 100, close: 106, volume: 1200 },
    { time: 3000, open: 106, high: 110, low: 104, close: 108, volume: 800 },
    { time: 4000, open: 108, high: 112, low: 106, close: 104, volume: 1500 },
    { time: 5000, open: 104, high: 107, low: 101, close: 103, volume: 900 },
  ];
}

describe('Series', () => {
  describe('basic operations', () => {
    it('starts empty', () => {
      const series = new Series<number>();
      expect(series.isEmpty).toBe(true);
      expect(series.length).toBe(0);
    });

    it('stores and retrieves values', () => {
      const series = new Series<number>();
      series.advance();
      series.set(10);

      expect(series.get(0)).toBe(10);
      expect(series.isEmpty).toBe(false);
    });

    it('supports history access', () => {
      const series = new Series<number>();

      series.advance();
      series.set(10);
      series.commit();

      series.advance();
      series.set(20);
      series.commit();

      series.advance();
      series.set(30);

      expect(series.get(0)).toBe(30); // Current
      expect(series.get(1)).toBe(20); // Previous
      expect(series.get(2)).toBe(10); // 2 bars ago
      expect(series.get(3)).toBeUndefined(); // Beyond history
    });

    it('handles rollback', () => {
      const series = new Series<number>();

      series.advance();
      series.set(10);
      series.commit();

      series.advance();
      series.set(20);
      // Don't commit - simulate realtime

      expect(series.get(0)).toBe(20);

      series.rollback();

      // After rollback, uncommitted value is discarded
      expect(series.getCommitted()).toBe(undefined);
    });

    it('converts to array', () => {
      const series = new Series<number>();

      series.advance();
      series.set(1);
      series.commit();

      series.advance();
      series.set(2);
      series.commit();

      series.advance();
      series.set(3);
      series.commit();

      const arr = series.toArray();
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe('seriesFrom helper', () => {
    it('creates series from array', () => {
      const series = seriesFrom([10, 20, 30, 40, 50]);

      expect(series.get(0)).toBe(50);
      expect(series.get(1)).toBe(40);
      expect(series.get(2)).toBe(30);
      expect(series.get(3)).toBe(20);
      expect(series.get(4)).toBe(10);
    });
  });
});

describe('ExecutionContext', () => {
  it('loads bars correctly', () => {
    const bars = createPredictableBars();
    const ctx = new ExecutionContext();
    ctx.loadBars(bars);

    expect(ctx.last_bar_index).toBe(4);
    expect(ctx.bar_index).toBe(-1);
  });

  it('advances through bars', () => {
    const bars = createPredictableBars();
    const ctx = new ExecutionContext();
    ctx.loadBars(bars);

    ctx.advanceBar();
    expect(ctx.bar_index).toBe(0);
    expect(ctx.close.get(0)).toBe(102);

    ctx.advanceBar();
    expect(ctx.bar_index).toBe(1);
    expect(ctx.close.get(0)).toBe(106);
    expect(ctx.close.get(1)).toBe(102); // History access
  });

  it('computes hl2, hlc3, ohlc4', () => {
    const bars = createPredictableBars();
    const ctx = new ExecutionContext();
    ctx.loadBars(bars);

    ctx.advanceBar();

    // First bar: open=100, high=105, low=95, close=102
    expect(ctx.hl2).toBe((105 + 95) / 2); // 100
    expect(ctx.hlc3).toBe((105 + 95 + 102) / 3); // 100.67
    expect(ctx.ohlc4).toBe((100 + 105 + 95 + 102) / 4); // 100.5
  });

  it('tracks barstate correctly', () => {
    const bars = createPredictableBars();
    const ctx = new ExecutionContext();
    ctx.loadBars(bars);

    ctx.advanceBar();
    expect(ctx.barstate.isfirst).toBe(true);
    expect(ctx.barstate.islast).toBe(false);

    while (ctx.advanceBar()) {
      // Continue
    }

    // At last bar
    expect(ctx.barstate.islast).toBe(true);
    expect(ctx.barstate.isfirst).toBe(false);
  });
});

describe('Scope', () => {
  it('declares and gets variables', () => {
    const scope = new Scope();
    scope.declare('x', 'none', 42);

    expect(scope.get('x')).toBe(42);
    expect(scope.has('x')).toBe(true);
    expect(scope.has('y')).toBe(false);
  });

  it('handles child scopes', () => {
    const parent = new Scope();
    parent.declare('x', 'none', 10);

    const child = parent.createChild();
    child.declare('y', 'none', 20);

    // Child can access parent
    expect(child.get('x')).toBe(10);
    expect(child.get('y')).toBe(20);

    // Parent cannot access child
    expect(parent.get('y')).toBeUndefined();
  });

  it('var persists across advanceBar', () => {
    const scope = new Scope();

    // First bar
    scope.declare('counter', 'var', 0);
    scope.commit();

    // Second bar
    scope.advanceBar();

    // var should persist
    expect(scope.getEntry('counter')?.initialized).toBe(true);
  });

  it('regular var resets on advanceBar', () => {
    const scope = new Scope();

    scope.declare('temp', 'none', 100);
    expect(scope.get('temp')).toBe(100);

    scope.commit();
    scope.advanceBar();

    // Regular var is reset
    const entry = scope.getEntry('temp');
    expect(entry?.initialized).toBe(false);
  });
});

describe('TealscriptEngine', () => {
  const bars = createPredictableBars();

  describe('basic execution', () => {
    it('executes empty program', () => {
      const ast = parse('//@version=6\n');
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(0);
    });

    it('executes indicator declaration', () => {
      const code = `//@version=6
indicator("My Test Indicator", overlay=true)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.indicatorTitle).toBe('My Test Indicator');
      expect(result.errors).toHaveLength(0);
    });

    it('executes variable declarations', () => {
      const code = `//@version=6
indicator("Test")
x = 42
y = x + 8
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
    });

    it('accesses built-in series', () => {
      const code = `//@version=6
indicator("Test")
x = close
y = open + high
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('expressions', () => {
    it('evaluates arithmetic', () => {
      const code = `//@version=6
indicator("Test")
a = 10 + 5
b = 10 - 5
c = 10 * 5
d = 10 / 5
e = 10 % 3
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });

    it('evaluates comparisons', () => {
      const code = `//@version=6
indicator("Test")
a = 10 > 5
b = 10 < 5
c = 10 == 10
d = 10 != 5
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });

    it('evaluates ternary', () => {
      const code = `//@version=6
indicator("Test")
x = close > open ? 1 : 0
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });

    it('evaluates logical operators', () => {
      const code = `//@version=6
indicator("Test")
a = true and false
b = true or false
c = not true
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('history access', () => {
    it('accesses previous bar values', () => {
      const code = `//@version=6
indicator("Test")
prev = close[1]
change = close - close[1]
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('control flow', () => {
    it('executes if statements', () => {
      const code = `//@version=6
indicator("Test")
var x = 0
if close > open
    x := 1
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });

    it('executes for loops', () => {
      const code = `//@version=6
indicator("Test")
var sum = 0
for i = 0 to 5
    sum := sum + i
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('built-in functions', () => {
    it('executes math functions', () => {
      const code = `//@version=6
indicator("Test")
a = math.abs(-10)
b = math.max(5, 10)
c = math.min(5, 10)
d = math.sqrt(16)
e = math.round(3.7)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });

    it('executes Pine math constants and scalar helpers', () => {
      const code = `//@version=6
indicator("Test")
plot(math.pi, "Pi")
plot(math.e, "Euler")
plot(math.phi, "Phi")
plot(math.avg(1, 2, 3, 4), "Average")
plot(math.round(1.2345, 2), "Rounded")
plot(math.trunc(-1.9), "Truncated")
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual(Array(bars.length).fill(Math.PI));
      expect(result.plots[1].values).toEqual(Array(bars.length).fill(Math.E));
      expect(result.plots[2].values).toEqual(Array(bars.length).fill((1 + Math.sqrt(5)) / 2));
      expect(result.plots[3].values).toEqual(Array(bars.length).fill(2.5));
      expect(result.plots[4].values).toEqual(Array(bars.length).fill(1.23));
      expect(result.plots[5].values).toEqual(Array(bars.length).fill(-1));
    });

    it('executes nz function', () => {
      const code = `//@version=6
indicator("Test")
x = nz(na, 0)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('plotting', () => {
    it('creates plot output', () => {
      const code = `//@version=6
indicator("Test")
plot(close)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].type).toBe('plot');
      expect(result.plots[0].values).toHaveLength(bars.length);
    });

    it('creates plot with options', () => {
      const code = `//@version=6
indicator("Test")
plot(close, "Close Price", color=color.blue, linewidth=2)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].title).toBe('Close Price');
      // color is per-bar array, every bar should be color.blue
      const colors = result.plots[0].color;
      expect(Array.isArray(colors)).toBe(true);
      expect((colors as string[]).every((c) => c === '#2196F3')).toBe(true);
      expect(result.plots[0].linewidth).toBe(2);
    });

    it('creates colors from RGB channels and transparency', () => {
      const code = `//@version=6
indicator("Test")
base = color.rgb(10, 20, 30)
transparent = color.rgb(255, 128, 0, 50)
updated = color.new(color.blue, 25)
plot(close, "Base", color=base)
plot(open, "Transparent", color=transparent)
plot(high, "Updated", color=updated)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].color).toEqual(Array(bars.length).fill('#0A141EFF'));
      expect(result.plots[1].color).toEqual(Array(bars.length).fill('#FF800080'));
      expect(result.plots[2].color).toEqual(Array(bars.length).fill('#2196F3BF'));
    });

    it('extracts color channels and transparency', () => {
      const code = `//@version=6
indicator("Test")
sample = color.rgb(10, 20, 30, 40)
plot(color.r(sample), "Red")
plot(color.g(sample), "Green")
plot(color.b(sample), "Blue")
plot(color.t(sample), "Transparency")
plot(color.r(color.blue), "Named Red")
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values).toEqual(Array(bars.length).fill(10));
      expect(result.plots[1].values).toEqual(Array(bars.length).fill(20));
      expect(result.plots[2].values).toEqual(Array(bars.length).fill(30));
      expect(result.plots[3].values).toEqual(Array(bars.length).fill(40));
      expect(result.plots[4].values).toEqual(Array(bars.length).fill(33));
    });

    it('creates colors from gradients', () => {
      const code = `//@version=6
indicator("Test")
lowColor = color.from_gradient(-10, 0, 100, color.red, color.green)
midColor = color.from_gradient(50, 0, 100, color.rgb(255, 0, 0), color.rgb(0, 255, 0, 50))
highColor = color.from_gradient(120, 0, 100, color.red, color.green)
plot(close, "Low", color=lowColor)
plot(open, "Mid", color=midColor)
plot(high, "High", color=highColor)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].color).toEqual(Array(bars.length).fill('#F44336FF'));
      expect(result.plots[1].color).toEqual(Array(bars.length).fill('#808000BF'));
      expect(result.plots[2].color).toEqual(Array(bars.length).fill('#4CAF50FF'));
    });

    it('creates hline', () => {
      const code = `//@version=6
indicator("Test")
hline(100, "Level", color=color.red)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.plots).toHaveLength(1);
      expect(result.plots[0].type).toBe('hline');
      expect(result.plots[0].price).toBe(100);
    });

    it('creates multiple plots', () => {
      const code = `//@version=6
indicator("Test")
plot(high, "High")
plot(low, "Low")
plot(close, "Close")
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.plots).toHaveLength(3);
    });
  });

  describe('inputs', () => {
    it('registers inputs', () => {
      const code = `//@version=6
indicator("Test")
length = input.int(14, "Length", minval=1)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.inputs).toHaveLength(1);
      expect(result.inputs[0].type).toBe('int');
      expect(result.inputs[0].defval).toBe(14);
    });

    it('uses input values', () => {
      const code = `//@version=6
indicator("Test")
length = input.int(14, "Length")
plot(length)
`;
      const ast = parse(code);
      const inputs = new Map([['input_Length', 20]]);
      const result = executeScript(ast, bars, inputs);

      // All plot values should be 20 (the overridden input)
      expect(result.plots[0].values.every((v) => v === 20)).toBe(true);
    });
  });

  describe('technical indicators', () => {
    it('calculates SMA', () => {
      const code = `//@version=6
indicator("Test")
sma = ta.sma(close, 3)
plot(sma)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(1);

      // First 2 bars should be NaN (not enough data)
      expect(result.plots[0].values[0]).toBeNull();
      expect(result.plots[0].values[1]).toBeNull();

      // Third bar and beyond should have values
      expect(result.plots[0].values[2]).not.toBeNull();
    });

    it('calculates EMA', () => {
      const code = `//@version=6
indicator("Test")
ema = ta.ema(close, 3)
plot(ema)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots[0].values.length).toBe(bars.length);
    });

    it('calculates RSI', () => {
      const code = `//@version=6
indicator("Test")
rsi = ta.rsi(close, 14)
plot(rsi)
`;
      const ast = parse(code);
      // Use more bars for RSI
      const moreBars = createBars(20);
      const result = executeScript(ast, moreBars);

      expect(result.errors).toHaveLength(0);
    });

    it('calculates ta.change', () => {
      const code = `//@version=6
indicator("Test")
change = ta.change(close, 1)
plot(change)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
      // First bar should be NaN
      expect(result.plots[0].values[0]).toBeNull();
    });

    it('calculates ta.highest', () => {
      const code = `//@version=6
indicator("Test")
highest = ta.highest(high, 3)
plot(highest)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
    });

    it('calculates ta.lowest', () => {
      const code = `//@version=6
indicator("Test")
lowest = ta.lowest(low, 3)
plot(lowest)
`;
      const ast = parse(code);
      const result = executeScript(ast, bars);

      expect(result.errors).toHaveLength(0);
    });

    it('calculates MACD', () => {
      const code = `//@version=6
indicator("Test")
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
plot(macdLine)
plot(signalLine)
plot(hist)
`;
      const ast = parse(code);
      const moreBars = createBars(30);
      const result = executeScript(ast, moreBars);

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(3);
    });
  });

  describe('complete indicators', () => {
    it('runs basic SMA indicator', () => {
      const code = `//@version=6
indicator("Simple SMA", overlay=true)
length = input.int(14, "Length")
sma = ta.sma(close, length)
plot(sma, "SMA", color=color.blue)
`;
      const ast = parse(code);
      const result = executeScript(ast, createBars(20));

      expect(result.errors).toHaveLength(0);
      expect(result.indicatorTitle).toBe('Simple SMA');
      expect(result.plots).toHaveLength(1);
      expect(result.inputs).toHaveLength(1);
    });

    it('runs RSI indicator with levels', () => {
      const code = `//@version=6
indicator("RSI")
length = input.int(14, "Length")
rsi = ta.rsi(close, length)
plot(rsi, "RSI", color=color.purple)
hline(70, "Overbought", color=color.red)
hline(30, "Oversold", color=color.green)
`;
      const ast = parse(code);
      const result = executeScript(ast, createBars(30));

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(3); // RSI + 2 hlines
    });

    it('runs EMA crossover indicator', () => {
      const code = `//@version=6
indicator("EMA Cross", overlay=true)
fast = input.int(9, "Fast EMA")
slow = input.int(21, "Slow EMA")
fastEMA = ta.ema(close, fast)
slowEMA = ta.ema(close, slow)
plot(fastEMA, "Fast", color=color.green)
plot(slowEMA, "Slow", color=color.red)
`;
      const ast = parse(code);
      const result = executeScript(ast, createBars(30));

      expect(result.errors).toHaveLength(0);
      expect(result.plots).toHaveLength(2);
      expect(result.inputs).toHaveLength(2);
    });
  });
});
