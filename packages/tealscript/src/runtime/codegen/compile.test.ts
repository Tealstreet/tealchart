import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../engine';
import { compile, ARRAY_HELPERS, MAP_HELPERS, UDT_HELPERS, MATRIX_HELPERS } from './compile';
import type { Bar } from '../context';
import { NumericSeries } from './runtime';
import * as ta from './ta-classes';

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

function getInterpreterPlots(pine: string, bars: Bar[]): Map<number, (number | null)[]> {
  const ast = parse(pine);
  const result = executeScript(ast, bars);
  const plots = new Map<number, (number | null)[]>();
  for (let i = 0; i < result.plots.length; i++) {
    plots.set(i, result.plots[i].values);
  }
  return plots;
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

// Simpler test runner that doesn't use require()
function runCompiledSimple(pine: string, bars: Bar[]): Map<number, (number | null)[]> {
  const ast = parse(pine);
  const compiled = compile(ast);
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }

  const deps = { NumericSeries, maxBarsBack: 500, _arr: ARRAY_HELPERS, _map: MAP_HELPERS, _udt: UDT_HELPERS, _mtx: MATRIX_HELPERS, ...ta };
  const inst = new compiled.ScriptClass(deps);
  const plots = new Map<number, (number | null)[]>();

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const ctx = {
      bar: { open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume, time: bar.time },
      barIndex: i,
      lastBarIndex: bars.length - 1,
      isFirstTick: true,
      barstate: {
        isfirst: i === 0, islast: i === bars.length - 1,
        ishistory: true, isrealtime: false, isnew: true, isconfirmed: true,
        islastconfirmedhistory: i === bars.length - 1,
      },
      syminfo: { ticker: 'TEST', mintick: 0.01, pricescale: 100 },
      timeframe: { period: '1', multiplier: 1, isintraday: true, isdaily: false, isweekly: false, ismonthly: false },
      plot(index: number, _funcName: string, value: unknown) {
        if (!plots.has(index)) plots.set(index, []);
        const v = typeof value === 'number' ? (value !== value ? null : value) : null;
        plots.get(index)!.push(v);
      },
      input(_id: string, _funcName: string, defval: unknown) { return defval; },
      strategyEntry() {}, strategyExit() {}, strategyClose() {},
      strategyCloseAll() {}, strategyCancel() {}, strategyCancelAll() {},
      strategyOrder() {}, strategyProp() { return 0; },
      alert() {}, alertCondition() {},
      logInfo() {}, logWarning() {}, logError() {},
      runtimeError(msg: unknown) { throw new Error(String(msg)); },
      callBuiltin() { return NaN; },
      colorNew() { return ''; }, colorRgb() { return ''; },
      colorR() { return 0; }, colorG() { return 0; },
      colorB() { return 0; }, colorT() { return 0; },
      mathSum() { return 0; },
      strFormat(...args: unknown[]) { return String(args[0]); },
      strFormatTime(...args: unknown[]) { return String(args[0]); },
      tickerNew(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerModify(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerStandard(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerHeikinashi(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerRenko(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerKagi(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerLinebreak(...args: unknown[]) { return String(args[0] ?? ''); },
      tickerPointfigure(...args: unknown[]) { return String(args[0] ?? ''); },
    };
    inst.onBar(ctx);
  }

  return plots;
}

describe('Compile end-to-end', () => {
  const closes = [10, 11, 12, 11.5, 13, 12, 14, 15, 13, 12, 11, 14, 16, 15, 13, 12, 14, 15, 16, 17];
  const bars = makeBars(closes);

  it('compiles a simple SMA indicator', () => {
    const pine = `//@version=6\nindicator("test")\nplot(ta.sma(close, 5))`;
    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(compiled.get(0)?.length).toBe(bars.length);
    expect(interpreted.get(0)?.length).toBe(bars.length);
    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles EMA + crossover', () => {
    const pine = `//@version=6
indicator("test")
fast = ta.ema(close, 3)
slow = ta.ema(close, 7)
plot(fast)
plot(slow)
plot(ta.crossover(fast, slow) ? 1 : 0)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, interpreted.get(idx)!)).toBe(true);
    }
  });

  it('compiles arithmetic expressions', () => {
    const pine = `//@version=6
indicator("test")
plot(close + open)
plot(close - open)
plot(high - low)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, interpreted.get(idx)!)).toBe(true);
    }
  });

  it('compiles if/else expressions', () => {
    const pine = `//@version=6
indicator("test")
plot(close > open ? 1 : -1)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles var persistence', () => {
    const pine = `//@version=6
indicator("test")
var count = 0
count := count + 1
plot(count)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles math functions', () => {
    const pine = `//@version=6
indicator("test")
plot(math.abs(close - open))
plot(math.max(high, close))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, interpreted.get(idx)!)).toBe(true);
    }
  });

  it('compiles nz/na functions', () => {
    const pine = `//@version=6
indicator("test")
x = ta.sma(close, 5)
plot(nz(x, 0))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles RSI', () => {
    const pine = `//@version=6
indicator("test")
plot(ta.rsi(close, 14))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles history access', () => {
    const pine = `//@version=6
indicator("test")
plot(close[1])`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles highest/lowest', () => {
    const pine = `//@version=6
indicator("test")
plot(ta.highest(close, 5))
plot(ta.lowest(close, 5))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    for (const [idx, values] of compiled) {
      expect(approxArrayEqual(values, interpreted.get(idx)!)).toBe(true);
    }
  });

  it('rejects unsupported features', () => {
    const pine = `//@version=6
indicator("test")
import TraderSamwise/someLib/1 as lib
plot(close)`;

    const ast = parse(pine);
    const compiled = compile(ast);
    expect(compiled.success).toBe(false);
    expect(compiled.unsupported.length).toBeGreaterThan(0);
  });

  it('compiles for loop', () => {
    const pine = `//@version=6
indicator("test")
sum = 0.0
for i = 0 to 4
    sum := sum + close
plot(sum)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles boolean logic', () => {
    const pine = `//@version=6
indicator("test")
plot(close > open and high > close[1] ? 1 : 0)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles array.new and array.push/size/get', () => {
    const pine = `//@version=6
indicator("test")
arr = array.new_float(0)
array.push(arr, close)
array.push(arr, open)
plot(array.size(arr))
plot(array.get(arr, 0))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles array.from', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(1, 2, 3, 4, 5)
plot(array.sum(arr))
plot(array.avg(arr))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles array.min/max', () => {
    const pine = `//@version=6
indicator("test")
var arr = array.new_float(0)
array.push(arr, close)
plot(array.min(arr))
plot(array.max(arr))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles for-in loop over array', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(1.0, 2.0, 3.0)
sum = 0.0
for val in arr
    sum := sum + val
plot(sum)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles for-in loop with index counter', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(10.0, 20.0, 30.0)
sum = 0.0
for [idx, val] in arr
    sum := sum + val + idx
plot(sum)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles array with sort', () => {
    const pine = `//@version=6
indicator("test")
arr = array.from(3.0, 1.0, 2.0)
array.sort(arr)
plot(array.get(arr, 0))
plot(array.get(arr, 2))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles map.new and map.put/get/size', () => {
    const pine = `//@version=6
indicator("test")
m = map.new<string, float>()
map.put(m, "a", close)
map.put(m, "b", open)
plot(map.size(m))
plot(map.get(m, "a"))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles user-defined types', () => {
    const pine = `//@version=6
indicator("test")
type MyPoint
    float x = 0.0
    float y = 0.0
p = MyPoint.new(x=close, y=open)
plot(p.x)
plot(p.y)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles UDT field assignment', () => {
    const pine = `//@version=6
indicator("test")
type Info
    float val = 0.0
i = Info.new()
i.val := close
plot(i.val)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });

  it('compiles map.contains and map.keys', () => {
    const pine = `//@version=6
indicator("test")
m = map.new<string, float>()
map.put(m, "x", 42.0)
plot(map.contains(m, "x") ? 1 : 0)
plot(map.contains(m, "y") ? 1 : 0)`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles matrix.new and matrix operations', () => {
    const pine = `//@version=6
indicator("test")
m = matrix.new<float>(2, 2, 0.0)
matrix.set(m, 0, 0, close)
matrix.set(m, 0, 1, open)
matrix.set(m, 1, 0, high)
matrix.set(m, 1, 1, low)
plot(matrix.get(m, 0, 0))
plot(matrix.rows(m))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
    expect(approxArrayEqual(compiled.get(1)!, interpreted.get(1)!)).toBe(true);
  });

  it('compiles matrix.det', () => {
    const pine = `//@version=6
indicator("test")
m = matrix.new<float>(2, 2, 0.0)
matrix.set(m, 0, 0, 1.0)
matrix.set(m, 0, 1, 2.0)
matrix.set(m, 1, 0, 3.0)
matrix.set(m, 1, 1, 4.0)
plot(matrix.det(m))`;

    const compiled = runCompiledSimple(pine, bars);
    const interpreted = getInterpreterPlots(pine, bars);

    expect(approxArrayEqual(compiled.get(0)!, interpreted.get(0)!)).toBe(true);
  });
});
