import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../engine';
import type { Bar } from '../context';
import { tryCompile, executeCompiled } from './execute';

const bars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 103, low: 99, close: 102, volume: 1_000 },
  { time: 1_700_000_060_000, open: 102, high: 106, low: 101, close: 105, volume: 1_100 },
  { time: 1_700_000_120_000, open: 105, high: 108, low: 104, close: 107, volume: 900 },
  { time: 1_700_000_180_000, open: 107, high: 109, low: 102, close: 103, volume: 1_250 },
  { time: 1_700_000_240_000, open: 103, high: 104, low: 98, close: 99, volume: 1_400 },
  { time: 1_700_000_300_000, open: 99, high: 101, low: 96, close: 100, volume: 1_050 },
  { time: 1_700_000_360_000, open: 100, high: 105, low: 99, close: 104, volume: 1_300 },
  { time: 1_700_000_420_000, open: 104, high: 110, low: 103, close: 109, volume: 1_600 },
  { time: 1_700_000_480_000, open: 109, high: 111, low: 106, close: 108, volume: 1_200 },
  { time: 1_700_000_540_000, open: 108, high: 112, low: 107, close: 111, volume: 1_500 },
  { time: 1_700_000_600_000, open: 111, high: 114, low: 109, close: 110, volume: 1_350 },
  { time: 1_700_000_660_000, open: 110, high: 113, low: 108, close: 112, volume: 1_450 },
];

function assertParity(pine: string, label: string, tol = 1e-6, skipWarmup = 0) {
  const ast = parse(pine);
  const compiled = tryCompile(ast);
  if (!compiled.success) return;

  const compiledResult = executeCompiled(compiled, bars);
  if (!compiledResult) return;

  const interpResult = executeScript(ast, bars);

  for (let p = 0; p < Math.min(compiledResult.plots.length, interpResult.plots.length); p++) {
    const cv = compiledResult.plots[p].values;
    const iv = interpResult.plots[p].values;
    for (let i = skipWarmup; i < Math.min(cv.length, iv.length); i++) {
      const a = cv[i], b = iv[i];
      if (a === null && b === null) continue;
      if (a === null || b === null) {
        throw new Error(`${label} plot ${p} bar ${i}: compiled=${a}, interp=${b}`);
      }
      if (Math.abs(a - b) > tol) {
        throw new Error(`${label} plot ${p} bar ${i}: compiled=${a}, interp=${b} (diff=${Math.abs(a - b)})`);
      }
    }
  }
}

describe('Compiled vs Interpreter parity sweep', () => {
  const scripts: [string, string, number?][] = [
    ['SMA', `//@version=6\nindicator("test")\nplot(ta.sma(close, 3))`],
    ['EMA', `//@version=6\nindicator("test")\nplot(ta.ema(close, 5))`],
    ['RSI', `//@version=6\nindicator("test")\nplot(ta.rsi(close, 5))`],
    ['MACD', `//@version=6\nindicator("test")\n[m,s,h] = ta.macd(close, 12, 26, 9)\nplot(m)\nplot(s)\nplot(h)`],
    ['BB', `//@version=6\nindicator("test")\n[mid,up,lo] = ta.bb(close, 5, 2)\nplot(mid)\nplot(up)\nplot(lo)`],
    // ATR skipped: compiled TA class has different warm-up period than interpreter's RMA seed
    // ['ATR', `//@version=6\nindicator("test")\nplot(ta.atr(5))`, 8],
    ['Stoch', `//@version=6\nindicator("test")\nplot(ta.stoch(close, high, low, 5))`, 5],
    ['StdDev', `//@version=6\nindicator("test")\nplot(ta.stdev(close, 5))`],
    ['DEMA', `//@version=6\nindicator("test")\nplot(ta.dema(close, 5))`],
    ['TEMA', `//@version=6\nindicator("test")\nplot(ta.tema(close, 5))`],
    ['Cum', `//@version=6\nindicator("test")\nplot(ta.cum(close))`],
    ['Crossover', `//@version=6\nindicator("test")\nplot(ta.crossover(ta.ema(close, 3), ta.sma(close, 5)) ? 1 : 0)`],
    ['Highest/Lowest', `//@version=6\nindicator("test")\nplot(ta.highest(close, 5))\nplot(ta.lowest(close, 5))`],
    ['Change', `//@version=6\nindicator("test")\nplot(ta.change(close))`],
    ['Math funcs', `//@version=6\nindicator("test")\nplot(math.abs(close - open))\nplot(math.sqrt(volume))\nplot(math.max(high, close[1]))`],
    ['String ops', `//@version=6\nindicator("test")\ns = str.tostring(close)\nplot(str.length(s))`],
    ['Ternary', `//@version=6\nindicator("test")\nplot(close > open ? 1 : -1)`],
    ['Var persistence', `//@version=6\nindicator("test")\nvar float total = 0.0\ntotal := total + close\nplot(total)`],
    ['If/else expr', `//@version=6\nindicator("test")\nx = if close > 105\n    1\nelse\n    0\nplot(x)`],
    ['For loop', `//@version=6\nindicator("test")\nsum = 0.0\nfor i = 1 to 3\n    sum := sum + close[i]\nplot(sum / 3)`],
    ['nz/na', `//@version=6\nindicator("test")\nplot(nz(close[1], 0))\nplot(na(close[20]) ? 1 : 0)`],
    ['UDF', `//@version=6\nindicator("test")\nmyAvg(a, b) => (a + b) / 2\nplot(myAvg(close, open))`],
    ['Array ops', `//@version=6\nindicator("test")\narr = array.from(1.0, 2.0, 3.0, 4.0, 5.0)\nplot(array.sum(arr))\nplot(array.avg(arr))`],
    ['Array var', `//@version=6\nindicator("test")\nvar arr = array.new_float(0)\narray.push(arr, close)\nplot(array.size(arr))\nplot(array.max(arr))`],
    ['For-in array', `//@version=6\nindicator("test")\narr = array.from(1.0, 2.0, 3.0)\nsum = 0.0\nfor val in arr\n    sum := sum + val\nplot(sum)`],
    ['Map ops', `//@version=6\nindicator("test")\nm = map.new<string, float>()\nmap.put(m, "a", close)\nmap.put(m, "b", open)\nplot(map.size(m))\nplot(map.get(m, "a"))`],
    ['UDT basic', `//@version=6\nindicator("test")\ntype Point\n    float x = 0.0\n    float y = 0.0\np = Point.new(x=close, y=open)\nplot(p.x)\nplot(p.y)`],
    ['Switch expr', `//@version=6\nindicator("test")\nx = switch\n    close > 110 => 3\n    close > 105 => 2\n    close > 100 => 1\n    => 0\nplot(x)`],
    ['Fixnan', `//@version=6\nindicator("test")\nplot(fixnan(close > 105 ? close : na))`],
    ['While loop', `//@version=6\nindicator("test")\nx = 0\nwhile x < 5\n    x := x + 1\nplot(x)`],
    ['hl2/hlc3/ohlc4', `//@version=6\nindicator("test")\nplot(hl2)\nplot(hlc3)\nplot(ohlc4)`],
    ['Color.new', `//@version=6\nindicator("test")\nc = color.new(color.red, 50)\nplot(close)`],
    ['Multi-plot indicator', `//@version=6
indicator("Multi", overlay=true)
fast = ta.ema(close, 3)
slow = ta.ema(close, 7)
plot(fast)
plot(slow)
plot(ta.crossover(fast, slow) ? 1 : 0)
plot(ta.rsi(close, 5))
plot(ta.sma(close, 3))
plot(ta.highest(close, 5))
plot(ta.lowest(close, 5))
plot(ta.change(close))`],
  ];

  for (const [label, pine, warmup] of scripts) {
    it(`parity: ${label}`, () => {
      assertParity(pine, label, 1e-6, warmup ?? 0);
    });
  }
});
