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
  if (!compiled.success) {
    throw new Error(`${label} compile unsupported: ${compiled.unsupported.join(', ')}`);
  }

  const compiledResult = executeCompiled(compiled, bars);
  if (!compiledResult) {
    throw new Error(`${label} compiled execution returned null`);
  }

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
    ['Mixed source-length helpers', `//@version=6\nindicator("test")\nplot(ta.sma(source=close, 3))\nplot(ta.ema(source=close, 3))\nplot(ta.rma(source=close, 3))\nplot(ta.smma(source=close, 3))\nplot(ta.rsi(source=close, 5))\nplot(ta.wma(source=close, 5))\nplot(ta.hma(source=close, 7))\nplot(ta.stdev(source=close, 5))\nplot(ta.dev(source=close, 5))\nplot(ta.range(source=close, 4))\nplot(ta.rising(source=close, 2) ? 1 : 0)\nplot(ta.falling(source=close, 2) ? 1 : 0)`],
    ['EMA', `//@version=6\nindicator("test")\nplot(ta.ema(close, 5))`],
    ['RSI', `//@version=6\nindicator("test")\nplot(ta.rsi(close, 5))`],
    ['MACD', `//@version=6\nindicator("test")\n[m,s,h] = ta.macd(close, 12, 26, 9)\nplot(m)\nplot(s)\nplot(h)`],
    ['BB', `//@version=6\nindicator("test")\n[mid,up,lo] = ta.bb(close, 5, 2)\nplot(mid)\nplot(up)\nplot(lo)`],
    ['ATR', `//@version=6\nindicator("test")\nplot(ta.atr(5))`],
    ['Stoch', `//@version=6\nindicator("test")\nplot(ta.stoch(close, high, low, 5))`],
    ['StdDev', `//@version=6\nindicator("test")\nplot(ta.stdev(close, 5))`],
    ['SMMA/VWMA', `//@version=6\nindicator("test")\nplot(ta.smma(close, 5))\nplot(ta.vwma(close, 5))`],
    ['SWMA/ALMA', `//@version=6\nindicator("test")\nplot(ta.swma(close))\nplot(ta.alma(close, 5, 0.85, 6))`],
    ['CCI/CMO/WPR', `//@version=6\nindicator("test")\nplot(ta.cci(close, 5))\nplot(ta.cci(close))\nplot(ta.cci(source=close, 7))\nplot(ta.cmo(close, 5))\nplot(ta.cmo(close))\nplot(ta.cmo(source=close, 7))\nplot(ta.wpr(5))\nplot(ta.wpr())`],
    ['DEMA', `//@version=6\nindicator("test")\nplot(ta.dema(close, 5))`],
    ['TEMA', `//@version=6\nindicator("test")\nplot(ta.tema(close, 5))`],
    ['Cum', `//@version=6\nindicator("test")\nplot(ta.cum(close))`],
    ['Cross', `//@version=6\nindicator("test")\nplot(ta.cross(close, 104) ? 1 : 0)`],
    ['Crossover', `//@version=6\nindicator("test")\nplot(ta.crossover(ta.ema(close, 3), ta.sma(close, 5)) ? 1 : 0)`],
    ['Highest/Lowest', `//@version=6\nindicator("test")\nplot(ta.highest(close, 5))\nplot(ta.lowest(close, 5))\nplot(ta.highest(5))\nplot(ta.lowest(length=5))\nplot(ta.highest(source=high, 4))\nplot(ta.lowest(source=low, 4))`],
    ['Max/Min', `//@version=6\nindicator("test")\nplot(ta.max(close, open))\nplot(ta.min(close, open))\nplot(ta.max(source1=close, source2=open))\nplot(ta.min(source1=close, source2=open))\nplot(ta.max(source1=close, open))\nplot(ta.min(source1=close, open))`],
    ['HighestBars/LowestBars', `//@version=6\nindicator("test")\nplot(ta.highestbars(4))\nplot(ta.lowestbars(4))\nplot(ta.highestbars(high, 4))\nplot(ta.lowestbars(low, 4))`],
    ['Range/Rising/Falling', `//@version=6\nindicator("test")\nplot(ta.range(close, 4))\nplot(ta.rising(close, 2) ? 1 : 0)\nplot(ta.falling(close, 2) ? 1 : 0)`],
    ['Variance/Dev', `//@version=6\nindicator("test")\nplot(ta.variance(close, 4))\nplot(ta.variance(close, 4, false))\nplot(ta.dev(close, 4))`],
    ['Covariance/Correlation', `//@version=6\nindicator("test")\nplot(ta.covariance(close, open, 4))\nplot(ta.correlation(close, open, 4))\nplot(ta.correlation(close, 1, 4))`],
    ['COG', `//@version=6\nindicator("test")\nplot(ta.cog(close, 4))\nplot(ta.cog(close - open, 4))`],
    ['Median/Mode', `//@version=6\nindicator("test")\nplot(ta.median(close, 3))\nplot(ta.median(close - open, 3))\nplot(ta.mode(close, 4))`],
    ['Percentiles', `//@version=6\nindicator("test")\nplot(ta.percentile_nearest_rank(close, 4, 75))\nplot(ta.percentile_linear_interpolation(close, 4, 75))\nplot(ta.percentrank(close, 4))`],
    ['LinReg', `//@version=6\nindicator("test")\nplot(ta.linreg(close, 3, 0))\nplot(ta.linreg(close, 3, 1))\nplot(ta.linreg(close - open, 3, 0))`],
    ['True Range', `//@version=6\nindicator("test")\nplot(ta.tr(true))\nplot(ta.tr(false))\nplot(ta.tr())`],
    ['MFI', `//@version=6\nindicator("test")\nplot(ta.mfi(hlc3, 3))\nplot(ta.mfi(source=hlc3, length=3))\nplot(ta.mfi(source=hlc3, 3))\nplot(ta.mfi(close - open, 3))`],
    ['TSI', `//@version=6\nindicator("test")\nplot(ta.tsi(close, 2, 3))\nplot(ta.tsi(close - open, 2, 3))\nplot(ta.tsi(source=close, short_length=2, long_length=3))\nplot(ta.tsi(source=close, 2, 3))`],
    ['Event memory', `//@version=6\nindicator("test")\ncondition = close > open\nplot(ta.barssince(condition))\nplot(ta.barssince(condition=condition))\nplot(ta.valuewhen(condition, close, 0))\nplot(ta.valuewhen(condition=condition, source=close, occurrence=0))\nplot(ta.valuewhen(condition=condition, close, 1))\nplot(ta.valuewhen(condition, close, 1))`],
    ['BBW', `//@version=6\nindicator("test")\nplot(ta.bbw(close, 3, 2))\nplot(ta.bbw(series=close, length=3, mult=2))\nplot(ta.bbw(series=close, 3, 2))`],
    ['KC/KCW', `//@version=6\nindicator("test")\n[basis, upper, lower] = ta.kc(close, 3, 1.25)\n[hlBasis, hlUpper, hlLower] = ta.kc(close, 3, 1.25, false)\n[namedBasis, namedUpper, namedLower] = ta.kc(series=close, length=3, mult=1.25)\n[mixedBasis, mixedUpper, mixedLower] = ta.kc(series=close, 3, 1.25)\nplot(basis)\nplot(upper)\nplot(lower)\nplot(hlUpper)\nplot(namedBasis)\nplot(mixedUpper)\nplot(ta.kcw(close, 3, 1.25))\nplot(ta.kcw(close, 3, 1.25, false))\nplot(ta.kcw(series=close, length=3, mult=1.25))\nplot(ta.kcw(series=close, 3, 1.25))`],
    ['DMI/ADX', `//@version=6\nindicator("test")\n[plus, minus, adx] = ta.dmi(5, 4)\n[namedPlus, namedMinus, namedAdx] = ta.dmi(diLength=5, adxSmoothing=4)\n[mixedPlus, mixedMinus, mixedAdx] = ta.dmi(diLength=5, 4)\nplot(plus)\nplot(minus)\nplot(adx)\nplot(namedPlus)\nplot(mixedMinus)\nplot(ta.adx(5))\nplot(ta.adx(5, 4))\nplot(ta.adx(diLength=5, adxSmoothing=4))\nplot(ta.adx(diLength=5, 4))`],
    ['Supertrend', `//@version=6\nindicator("test")\n[trend, direction] = ta.supertrend(2, 3)\n[namedTrend, namedDirection] = ta.supertrend(factor=2, atrPeriod=3)\n[mixedTrend, mixedDirection] = ta.supertrend(factor=2, 3)\nplot(trend)\nplot(direction)\nplot(namedTrend)\nplot(namedDirection)\nplot(mixedTrend)\nplot(mixedDirection)`],
    ['SAR', `//@version=6\nindicator("test")\nplot(ta.sar(0.02, 0.02, 0.2))\nplot(ta.sar(start=0.02, inc=0.02, max=0.2))\nplot(ta.sar(start=0.02, 0.02, 0.2))`],
    ['KST', `//@version=6\nindicator("test")\n[kst, signal] = ta.kst(close, 2, 3, 4, 5, 2, 2, 2, 3, 2)\n[namedKst, namedSignal] = ta.kst(source=close, roclength1=2, roclength2=3, roclength3=4, roclength4=5, smalen1=2, smalen2=2, smalen3=2, smalen4=3, signalLength=2)\n[mixedKst, mixedSignal] = ta.kst(source=close, 2, 3, 4, 5, 2, 2, 2, 3, 2)\n[defaultKst, defaultSignal] = ta.kst(close)\nplot(kst)\nplot(signal)\nplot(namedKst)\nplot(namedSignal)\nplot(mixedKst)\nplot(mixedSignal)\nplot(defaultKst)\nplot(defaultSignal)`],
    ['VWAP', `//@version=6\nindicator("test")\nanchor = bar_index == 0 or bar_index == 6\nplot(ta.vwap())\nplot(ta.vwap(close))\nplot(ta.vwap(close, anchor))\nplot(ta.vwap(source=close, anchor))\nplot(ta.vwap(source=close, anchor=anchor))\n[middle, upper, lower] = ta.vwap(close, anchor, 1.5)\n[namedMiddle, namedUpper, namedLower] = ta.vwap(source=close, anchor=anchor, stdev_mult=1.5)\n[mixedMiddle, mixedUpper, mixedLower] = ta.vwap(source=close, anchor, 1.5)\nplot(middle)\nplot(upper)\nplot(lower)\nplot(namedMiddle)\nplot(mixedUpper)`],
    ['TA variables', `//@version=6\nindicator("test")\nplot(ta.iii)\nplot(ta.nvi)\nplot(ta.pvi)\nplot(ta.pvt)\nplot(ta.wad)\nplot(ta.wvad)\nplot(ta.pvt[1])`],
    ['BarIndex', `//@version=6\nindicator("test")\nsource = bar_index % 4 == 0 ? na : close\nplot(ta.bar_index(source))`],
    ['Pivot Point Levels', `//@version=6\nindicator("test")\nlevels = ta.pivot_point_levels("Traditional", "Daily")\ndeveloping = ta.pivot_point_levels(type="Traditional", anchor="Daily", developing=true)\nplot(array.get(levels, 0))\nplot(array.get(levels, 1))\nplot(array.get(levels, 2))\nplot(array.size(levels))\nplot(array.get(developing, 0))`],
    ['RCI', `//@version=6\nindicator("test")\nplot(ta.rci(close, 5))\nplot(ta.rci(source=close, length=5))\nplot(ta.rci(source=close, 5))\nplot(ta.rci(close - open, 5))`],
    ['Pivots', `//@version=6\nindicator("test")\nspread = close - open\nplot(ta.pivothigh(high, 2, 2))\nplot(ta.pivotlow(low, 1, 1))\nplot(ta.pivothigh(2, 2))\nplot(ta.pivotlow(1, 1))\nplot(ta.pivothigh(source=spread, leftbars=2, rightbars=2))\nplot(ta.pivotlow(source=spread, 1, 1))`],
    ['Momentum/ROC', `//@version=6\nindicator("test")\nplot(ta.mom(close, 3))\nplot(ta.mom(close))\nplot(ta.mom(source=close, 8))\nplot(ta.roc(close, 4))\nplot(ta.roc(close))\nplot(ta.roc(source=close, 6))`],
    ['Change', `//@version=6\nindicator("test")\nplot(ta.change(close))\nplot(ta.change(close, 4))`],
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
