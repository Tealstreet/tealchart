import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../engine';
import { tryCompile, executeCompiled } from './execute';
import type { Bar } from '../context';

function makeBars(closes: number[]): Bar[] {
  return closes.map((close, i) => ({
    time: (i + 1) * 60000,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100 + i,
  }));
}

function approxArrayEqual(a: (number | null)[], b: (number | null)[], tol = 1e-10): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const va = a[i], vb = b[i];
    if (va === null && vb === null) continue;
    if (va === null || vb === null) return false;
    if (Math.abs(va - vb) > tol) return false;
  }
  return true;
}

function assertPlotParity(pine: string, bars: Bar[]) {
  const ast = parse(pine);
  const compiled = tryCompile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }

  const compiledResult = executeCompiled(compiled, bars);
  if (!compiledResult) {
    throw new Error('executeCompiled returned null');
  }

  const interpResult = executeScript(ast, bars);

  expect(compiledResult.plots.length).toBe(interpResult.plots.length);

  for (let i = 0; i < compiledResult.plots.length; i++) {
    const cPlot = compiledResult.plots[i];
    const iPlot = interpResult.plots[i];

    if (!approxArrayEqual(cPlot.values, iPlot.values)) {
      const firstDiff = cPlot.values.findIndex((v, j) => {
        const iv = iPlot.values[j];
        if (v === null && iv === null) return false;
        if (v === null || iv === null) return true;
        return Math.abs(v - iv) > 1e-10;
      });
      throw new Error(
        `Plot ${i} mismatch at bar ${firstDiff}: compiled=${cPlot.values[firstDiff]}, interp=${iPlot.values[firstDiff]}`
      );
    }
  }

  return { compiledResult, interpResult };
}

describe('executeCompiled — full integration parity', () => {
  const closes = [10, 11, 12, 11.5, 13, 12, 14, 15, 13, 12, 11, 14, 16, 15, 13, 12, 14, 15, 16, 17];
  const bars = makeBars(closes);

  it('simple plot(close)', () => {
    assertPlotParity(`//@version=6\nindicator("test")\nplot(close)`, bars);
  });

  it('SMA indicator', () => {
    assertPlotParity(`//@version=6\nindicator("test")\nplot(ta.sma(close, 5))`, bars);
  });

  it('EMA with crossover', () => {
    assertPlotParity(`//@version=6
indicator("test")
fast = ta.ema(close, 3)
slow = ta.ema(close, 7)
plot(fast)
plot(slow)
plot(ta.crossover(fast, slow) ? 1 : 0)`, bars);
  });

  it('RSI', () => {
    assertPlotParity(`//@version=6\nindicator("test")\nplot(ta.rsi(close, 14))`, bars);
  });

  it('arithmetic and math', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(math.abs(close - open))
plot(math.max(high, close))
plot(math.sqrt(volume))`, bars);
  });

  it('var persistence', () => {
    assertPlotParity(`//@version=6
indicator("test")
var count = 0
count := count + 1
plot(count)`, bars);
  });

  it('history access', () => {
    assertPlotParity(`//@version=6\nindicator("test")\nplot(close[1])`, bars);
  });

  it('if/else', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(close > open ? 1 : -1)`, bars);
  });

  it('for loop', () => {
    assertPlotParity(`//@version=6
indicator("test")
sum = 0.0
for i = 0 to 4
    sum := sum + close
plot(sum)`, bars);
  });

  it('nz function', () => {
    assertPlotParity(`//@version=6
indicator("test")
x = ta.sma(close, 5)
plot(nz(x, 0))`, bars);
  });

  it('highest/lowest', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.highest(close, 5))
plot(ta.lowest(close, 5))`, bars);
  });

  it('MACD', () => {
    assertPlotParity(`//@version=6
indicator("test")
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
plot(macdLine)`, bars);
  });

  it('boolean logic with TA', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(close > open and high > close[1] ? 1 : 0)`, bars);
  });

  it('change indicator', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.change(close))`, bars);
  });

  it('returns ExecutionResult shape', () => {
    const pine = `//@version=6\nindicator("My Test")\nplot(close)`;
    const { compiledResult } = assertPlotParity(pine, bars);

    expect(compiledResult.declaration).toBeDefined();
    expect(compiledResult.declaration.title).toBe('My Test');
    expect(compiledResult.errors).toEqual([]);
    expect(compiledResult.profile.bars).toBe(bars.length);
    expect(compiledResult.profile.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(compiledResult.strategy).toBeDefined();
    expect(compiledResult.drawings).toBeDefined();
    expect(compiledResult.alerts).toBeDefined();
    expect(compiledResult.inputs).toBeDefined();
  });

  it('returns null for unsupported features', () => {
    const pine = `//@version=6
indicator("test")
import TraderSamwise/someLib/1 as lib
plot(close)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(false);

    const result = executeCompiled(compiled, bars);
    expect(result).toBeNull();
  });

  it('dema/tema', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.dema(close, 10))
plot(ta.tema(close, 10))`, bars);
  });
});

describe('executeCompiled — strategy integration', () => {
  const closes = [10, 11, 12, 11.5, 13, 12, 14, 15, 13, 12, 11, 14, 16, 15, 13, 12, 14, 15, 16, 17];
  const bars = closes.map((close, i) => ({
    time: (i + 1) * 60000,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 100 + i,
  }));

  it('strategy.entry creates fills', () => {
    const pine = `//@version=6
strategy("test", overlay=true)
if bar_index == 2
    strategy.entry("Long", strategy.long)
plot(strategy.position_size)`;

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const result = executeCompiled(compiled, bars);
    expect(result).not.toBeNull();
    expect(result!.strategy.fills.length).toBeGreaterThan(0);

    const posValues = result!.plots[0]?.values ?? [];
    const firstNonZero = posValues.findIndex((v) => v !== null && v !== 0);
    expect(firstNonZero).toBeGreaterThan(2);
  });

  it('strategy.entry + strategy.close round trip', () => {
    const pine = `//@version=6
strategy("test", overlay=true)
if bar_index == 2
    strategy.entry("Long", strategy.long)
if bar_index == 5
    strategy.close("Long")
plot(strategy.position_size)`;

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const result = executeCompiled(compiled, bars);
    expect(result).not.toBeNull();

    const posValues = result!.plots[0]?.values ?? [];
    const lastVal = posValues[posValues.length - 1];
    expect(lastVal).toBe(0);
    expect(result!.strategy.closedTrades.length).toBeGreaterThan(0);
  });

  it('strategy.equity tracks capital', () => {
    const pine = `//@version=6
strategy("test", overlay=true, initial_capital=10000)
if bar_index == 1
    strategy.entry("Long", strategy.long, qty=1)
plot(strategy.equity)`;

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const result = executeCompiled(compiled, bars);
    expect(result).not.toBeNull();

    const eqValues = result!.plots[0]?.values ?? [];
    expect(eqValues[0]).toBe(10000);
    const lastEq = eqValues[eqValues.length - 1];
    expect(lastEq).not.toBe(0);
    expect(lastEq).not.toBeNull();
  });
});
