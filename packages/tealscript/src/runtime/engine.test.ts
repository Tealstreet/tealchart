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
      const closePlot = result.plots.find(p => p.title === 'Close Price');
      expect(closePlot).toBeDefined();
      expect(closePlot!.values.length).toBe(10);
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

      const andPlot = result.plots.find(p => p.title === 'And');
      const orPlot = result.plots.find(p => p.title === 'Or');

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
});
