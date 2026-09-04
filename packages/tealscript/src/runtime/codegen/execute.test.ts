import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { tryCompile, tryExecuteScript, executeCompiled } from './execute';
import type { Bar, DrawingOutput, PlotOutput } from '../context';
import {
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  InMemoryRequestDatafeed,
  seedCorporateAction,
  seedCurrencyRate,
  seedEconomicSeries,
  seedFinancialMetric,
  seedFootprints,
  seedQuandlSeries,
  seedRequestSymbol,
} from '../requestDatafeed';
import type { RequestDatafeed } from '../requestDatafeed';

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

function assertPlotParity(pine: string, bars: Bar[], options?: Parameters<typeof executeCompiled>[3]) {
  const ast = parse(pine);
  const compiled = tryCompile(ast, undefined, { libraries: options?.libraries });
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }

  const compiledResult = executeCompiled(compiled, bars, undefined, options);
  if (!compiledResult) {
    throw new Error('executeCompiled returned null');
  }

  const interpResult = executeScript(ast, bars, undefined, options);

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

function findPlot(result: { plots: PlotOutput[] }, title: string): PlotOutput {
  const plot = result.plots.find((candidate) => candidate.title === title);
  if (!plot) throw new Error(`Plot not found: ${title}`);
  return plot;
}

function firstFiniteBar(values: (number | null)[]): number | null {
  const index = values.findIndex((value) => value !== null && Number.isFinite(value));
  return index === -1 ? null : index;
}

function drawingKey(drawing: DrawingOutput): string {
  switch (drawing.type) {
    case 'label':
      return `${drawing.type}:${drawing.text}:${drawing.xloc}:${drawing.yloc}:${drawing.x}`;
    case 'line':
      return `${drawing.type}:${drawing.x1}:${drawing.x2}:${drawing.xloc}:${drawing.extend}:${drawing.color}`;
    case 'box':
      return `${drawing.type}:${drawing.text}:${drawing.left}:${drawing.right}:${drawing.xloc}:${drawing.extend}`;
    case 'polyline':
      return `${drawing.type}:${drawing.points.length}:${drawing.points[0]?.index ?? drawing.points[0]?.time}:${drawing.xloc}`;
    case 'table':
      return `${drawing.type}:${drawing.position}:${drawing.columns}:${drawing.rows}`;
    case 'linefill':
      return `${drawing.type}:${drawing.line1}:${drawing.line2}`;
  }
}

describe('executeCompiled — full integration parity', () => {
  const closes = [10, 11, 12, 11.5, 13, 12, 14, 15, 13, 12, 11, 14, 16, 15, 13, 12, 14, 15, 16, 17];
  const bars = makeBars(closes);

  it('escapes Pine identifiers that collide with JavaScript reserved words', () => {
    const ast = parse(`//@version=6
indicator("reserved identifiers", overlay=false)
var float delete = 1
class = 2
mix(delete, class) =>
    var float typeof = 0
    typeof := delete + class
    typeof
plot(delete + class + mix(3, 4))
`);

    const result = executeScript(ast, bars);

    expect(result.plots[0]?.values.at(-1)).toBe(10);
  });

  it('keeps same-named regular UDF locals separate from persistent locals', () => {
    const ast = parse(`//@version=6
indicator("local persistent collision", overlay=false)
calc(src, period) =>
    var float scale = na
    if na(scale)
        sum = 0.0
        count = 0
        for i = 1 to period
            sum += math.abs(src - src[1])
            count += 1
        scale := count > 0 ? sum / count : 1.0
    var float sum = 0.0
    sum := sum + scale
    sum
plot(calc(close, 2))
`);

    const result = executeScript(ast, bars);

    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors).toBeUndefined();
    expect(result.plots).toHaveLength(1);
  });

  it('selects user function overloads by argument shape at runtime', () => {
    const ast = parse(`//@version=6
indicator("udf overload runtime", overlay=false)
hl() => [high, low]
hl(int bar) => [high[bar], low[bar]]
[nowHigh, nowLow] = hl()
[prevHigh, prevLow] = hl(1)
plot(nowHigh + nowLow + nz(prevHigh) + nz(prevLow))
`);

    const result = executeScript(ast, bars);

    expect(result.errors).toEqual([]);
    expect(result.plots[0]?.values.at(-1)).toBe(66);
  });

  it('maps receiver collection method aliases reached through UDT fields', () => {
    const ast = parse(`//@version=6
indicator("collection receiver aliases", overlay=false)
type Store
    array<int> values
var Store store = Store.new(array.from(1, 2, 3))
plot(store.values.indexof(2) + store.values.lastindexof(2))
`);

    const result = executeScript(ast, bars);

    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors).toBeUndefined();
    expect(result.plots[0]?.values.at(-1)).toBe(2);
  });

  it('matches v6 warmup/na first-valid bars across compiled TA state machines', () => {
    const warmupBars: Bar[] = Array.from({ length: 40 }, (_, index) => {
      const close = 20 + index * 0.8 + Math.sin(index / 2) * 2;
      return {
        time: index + 1,
        open: close - 0.7 + (index % 3) * 0.2,
        high: close + 1.4 + (index % 4) * 0.3,
        low: close - 1.6 - (index % 5) * 0.2,
        close,
        volume: 100 + ((index * 17) % 90),
      };
    });
    const cases: Array<{ name: string; setup?: string; expression: string; expectedFirstValidBar: number }> = [
      { name: 'ta.sma', expression: 'ta.sma(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.ema', expression: 'ta.ema(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.rma', expression: 'ta.rma(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.smma', expression: 'ta.smma(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.rsi', expression: 'ta.rsi(close, 5)', expectedFirstValidBar: 5 },
      { name: 'ta.change', expression: 'ta.change(close, 3)', expectedFirstValidBar: 3 },
      { name: 'ta.wma', expression: 'ta.wma(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.vwma', expression: 'ta.vwma(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.swma', expression: 'ta.swma(close)', expectedFirstValidBar: 3 },
      { name: 'ta.alma', expression: 'ta.alma(close, 5, 0.85, 6)', expectedFirstValidBar: 4 },
      { name: 'ta.hma', expression: 'ta.hma(close, 9)', expectedFirstValidBar: 10 },
      { name: 'ta.mom', expression: 'ta.mom(close, 5)', expectedFirstValidBar: 5 },
      { name: 'ta.roc', expression: 'ta.roc(close, 5)', expectedFirstValidBar: 5 },
      { name: 'ta.highest', expression: 'ta.highest(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.lowest', expression: 'ta.lowest(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.highestbars', expression: 'ta.highestbars(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.lowestbars', expression: 'ta.lowestbars(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.range', expression: 'ta.range(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.rising', expression: 'ta.rising(close, 5) ? 1 : 0', expectedFirstValidBar: 0 },
      { name: 'ta.falling', expression: 'ta.falling(close, 5) ? 1 : 0', expectedFirstValidBar: 0 },
      { name: 'ta.max', expression: 'ta.max(close, open)', expectedFirstValidBar: 0 },
      { name: 'ta.min', expression: 'ta.min(close, open)', expectedFirstValidBar: 0 },
      { name: 'ta.variance', expression: 'ta.variance(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.dev', expression: 'ta.dev(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.stdev', expression: 'ta.stdev(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.covariance', expression: 'ta.covariance(close, open, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.correlation', expression: 'ta.correlation(close, open, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.cog', expression: 'ta.cog(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.median', expression: 'ta.median(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.mode', expression: 'ta.mode(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.percentile_nearest_rank', expression: 'ta.percentile_nearest_rank(close, 5, 50)', expectedFirstValidBar: 4 },
      { name: 'ta.percentile_linear_interpolation', expression: 'ta.percentile_linear_interpolation(close, 5, 50)', expectedFirstValidBar: 4 },
      { name: 'ta.percentrank', expression: 'ta.percentrank(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.linreg', expression: 'ta.linreg(close, 5, 0)', expectedFirstValidBar: 4 },
      { name: 'ta.atr', expression: 'ta.atr(5)', expectedFirstValidBar: 4 },
      { name: 'ta.tr', expression: 'ta.tr(true)', expectedFirstValidBar: 0 },
      { name: 'ta.stoch', expression: 'ta.stoch(close, high, low, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.cci', expression: 'ta.cci(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.cmo', expression: 'ta.cmo(close, 5)', expectedFirstValidBar: 5 },
      { name: 'ta.mfi', expression: 'ta.mfi(close, 5)', expectedFirstValidBar: 5 },
      { name: 'ta.tsi', expression: 'ta.tsi(close, 3, 5)', expectedFirstValidBar: 1 },
      { name: 'ta.rci', expression: 'ta.rci(close, 5)', expectedFirstValidBar: 4 },
      { name: 'ta.wpr', expression: 'ta.wpr(5)', expectedFirstValidBar: 4 },
      { name: 'ta.obv', expression: 'ta.obv(close, volume)', expectedFirstValidBar: 0 },
      { name: 'ta.bar_index', expression: 'ta.bar_index(close)', expectedFirstValidBar: 0 },
      { name: 'ta.bb', setup: '[basis, upper, lower] = ta.bb(close, 5, 2)', expression: 'basis', expectedFirstValidBar: 4 },
      { name: 'ta.bbw', expression: 'ta.bbw(close, 5, 2)', expectedFirstValidBar: 4 },
      { name: 'ta.kc', setup: '[basis, upper, lower] = ta.kc(close, 5, 1.5)', expression: 'basis', expectedFirstValidBar: 0 },
      { name: 'ta.kcw', expression: 'ta.kcw(close, 5, 1.5)', expectedFirstValidBar: 0 },
      { name: 'ta.dmi', setup: '[plus, minus, adx] = ta.dmi(5, 5)', expression: 'plus', expectedFirstValidBar: 5 },
      { name: 'ta.adx', expression: 'ta.adx(5)', expectedFirstValidBar: 18 },
      { name: 'ta.supertrend', setup: '[trend, direction] = ta.supertrend(2.0, 5)', expression: 'trend', expectedFirstValidBar: 4 },
      { name: 'ta.sar', expression: 'ta.sar(0.02, 0.02, 0.2)', expectedFirstValidBar: 0 },
      { name: 'ta.kst', setup: '[kst, signal] = ta.kst(close, 2, 3, 4, 5, 2, 2, 2, 2, 3)', expression: 'kst', expectedFirstValidBar: 6 },
      { name: 'ta.vwap', expression: 'ta.vwap(close)', expectedFirstValidBar: 0 },
      { name: 'ta.dema', expression: 'ta.dema(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.tema', expression: 'ta.tema(close, 5)', expectedFirstValidBar: 0 },
      { name: 'ta.cum', expression: 'ta.cum(close)', expectedFirstValidBar: 0 },
      { name: 'ta.accdist', expression: 'ta.accdist', expectedFirstValidBar: 0 },
      { name: 'ta.iii', expression: 'ta.iii', expectedFirstValidBar: 0 },
      { name: 'ta.nvi', expression: 'ta.nvi', expectedFirstValidBar: 0 },
      { name: 'ta.pvi', expression: 'ta.pvi', expectedFirstValidBar: 0 },
      { name: 'ta.pvt', expression: 'ta.pvt', expectedFirstValidBar: 0 },
      { name: 'ta.wad', expression: 'ta.wad', expectedFirstValidBar: 0 },
      { name: 'ta.wvad', expression: 'ta.wvad', expectedFirstValidBar: 0 },
    ];

    const wrongWarmups: string[] = [];
    for (const entry of cases) {
      const script = `//@version=6
indicator("${entry.name} warmup")
${entry.setup ?? ''}
plot(${entry.expression}, "${entry.name}")`;
      const { compiledResult, interpResult } = assertPlotParity(script, warmupBars);
      const compiledFirst = firstFiniteBar(findPlot(compiledResult, entry.name).values);
      const interpretedFirst = firstFiniteBar(findPlot(interpResult, entry.name).values);
      if (compiledFirst !== entry.expectedFirstValidBar || interpretedFirst !== entry.expectedFirstValidBar) {
        wrongWarmups.push(`${entry.name}: expected ${entry.expectedFirstValidBar}, compiled ${compiledFirst}, reference ${interpretedFirst}`);
      }
    }

    expect(wrongWarmups).toEqual([]);
  });

  it('simple plot(close)', () => {
    assertPlotParity(`//@version=6\nindicator("test")\nplot(close)`, bars);
  });

  it('treats comparisons with na as false', () => {
    assertPlotParity(`//@version=6
indicator("compiled na comparison")
missing = close[1]
plot(missing == 0 ? 1 : 0, "Eq")
plot(missing != 0 ? 1 : 0, "Neq")
plot(missing != 0 ? missing : 0, "Branch")`, bars.slice(0, 4));
  });

  it('SMA indicator', () => {
    assertPlotParity(`//@version=6\nindicator("test")\nplot(ta.sma(close, 5))`, bars);
  });

  it('compiles legacy TA global aliases with reference parity', () => {
    assertPlotParity(`//@version=4
study("compiled legacy TA aliases")
fast = ema(close, 3)
slow = sma(close, 5)
upper = highest(2)
lower = lowest(2)
crossed = cross(fast, slow) ? 1 : 0
up = crossover(fast, slow) ? 1 : 0
down = crossunder(fast, slow) ? 1 : 0
momentum = rsi(close, 5)
plot(fast, title="Fast EMA")
plot(slow, title="Slow SMA")
plot(upper, title="Highest")
plot(lower, title="Lowest")
plot(crossed + up + down, title="Cross Flags")
plot(momentum, title="RSI")`, bars);
  });

  it('compiles legacy iff helper with reference parity', () => {
    assertPlotParity(`//@version=4
study("compiled legacy iff")
source = iff(close > open, close, open)
named = iff(condition=close > open, high, low)
prefix = iff(condition=close > open, high, low)
signal = iff(close > open, high, na)
plot(source, title="Source")
plot(named, title="Named")
plot(prefix, title="Prefix")
plot(signal, title="Signal")`, bars);
  });

  it('compiles named root helper arguments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled named root helpers")
source = bar_index % 3 == 0 ? na : close
plot(nz(source=source, replacement=open), title="Named NZ")
plot(nz(source=source, open), title="Prefix NZ")
plot(fixnan(source=source), title="Named Fix")
plot(float(x="4.5"), title="Named Float")
plot(int(x=4.9), title="Named Int")
plot(bool(x=na) ? 1 : 0, title="Named Bool NA")
plot(string(x=12.5) == "12.5" ? 1 : 0, title="Named String")
plot(na(x=source) ? 1 : 0, title="Named NA")
plot(str.tointeger(string="42.9"), title="String To Integer")
plot(na(str.tointeger("bad")) ? 1 : 0, title="Bad String To Integer")`, bars);
  });

  it('compiles max_bars_back hints with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled max bars back")
max_bars_back(close, 2)
max_bars_back(open, num=3)
plot(close[1], title="Previous Close")`, bars);
  });

  it('compiles mixed source-length helper calls with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.sma(source=close, 3), "SMA")
plot(ta.ema(source=close, 3), "EMA")
plot(ta.rma(source=close, 3), "RMA")
plot(ta.smma(source=close, 3), "SMMA")
plot(ta.rsi(source=close, 5), "RSI")
plot(ta.wma(source=close, 5), "WMA")
plot(ta.hma(source=close, 7), "HMA")
plot(ta.stdev(source=close, 5), "StdDev")
plot(ta.dev(source=close, 5), "Dev")
plot(ta.range(source=close, 4), "Range")
plot(ta.rising(source=close, 2) ? 1 : 0, "Rising")
plot(ta.falling(source=close, 2) ? 1 : 0, "Falling")`, bars);
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

  it('cross detects either direction', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.cross(close, 104) ? 1 : 0)`, bars);
  });

  it('compiles range, rising, and falling with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.range(close, 4), "Range")
plot(ta.rising(close, 2) ? 1 : 0, "Rising")
plot(ta.falling(close, 2) ? 1 : 0, "Falling")`, bars);
  });

  it('compiles max and min with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.max(close, open), "Max")
plot(ta.min(close, open), "Min")
plot(ta.max(source1=close, source2=open), "Named Max")
plot(ta.min(source1=close, source2=open), "Named Min")
plot(ta.max(source1=close, open), "Mixed Max")
plot(ta.min(source1=close, open), "Mixed Min")`, bars);
  });

  it('compiles highestbars and lowestbars with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.highestbars(4), "Default Highest Offset")
plot(ta.lowestbars(4), "Default Lowest Offset")
plot(ta.highestbars(high, 4), "Highest Offset")
plot(ta.lowestbars(low, 4), "Lowest Offset")`, bars);
  });

  it('compiles variance and dev with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.variance(close, 4), "Variance")
plot(ta.variance(close, 4, false), "Unbiased Variance")
plot(ta.dev(close, 4), "Mean Deviation")`, bars);
  });

  it('compiles covariance and correlation with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.covariance(close, open, 4), "Covariance")
plot(ta.correlation(close, open, 4), "Correlation")
plot(ta.correlation(close, 1, 4), "Flat Correlation")`, bars);
  });

  it('compiles COG with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.cog(close, 4), "COG")
plot(ta.cog(close - open, 4), "Derived COG")`, bars);
  });

  it('compiles median and mode with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.median(close, 3), "Median")
plot(ta.median(close - open, 3), "Derived Median")
plot(ta.mode(close, 4), "Mode")`, bars);
  });

  it('compiles percentile helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.percentile_nearest_rank(close, 4, 75), "Nearest")
plot(ta.percentile_linear_interpolation(close, 4, 75), "Linear")
plot(ta.percentrank(close, 4), "Percent Rank")`, bars);
  });

  it('compiles linreg with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.linreg(close, 3, 0), "LinReg")
plot(ta.linreg(close, 3, 1), "LinReg Offset")
plot(ta.linreg(close - open, 3, 0), "Derived LinReg")`, bars);
  });

  it('compiles true range with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.tr(true), "TR Handle")
plot(ta.tr(false), "TR Strict")
plot(ta.tr(), "TR Default")`, bars);
  });

  it('compiles true range member access inside TA chains', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled ta.tr member")
trCci(src, length) =>
    ma = ta.sma(src, length)
    (src - ma) / (0.015 * ta.dev(src, length))
plot(trCci(ta.tr, 5), "TR CCI")`, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(findPlot(compiledResult, 'TR CCI').values.some((value) => value !== null)).toBe(true);
  });

  it('compiles ATR length overloads with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled ATR lengths")
plot(ta.atr(5), "ATR")
plot(ta.atr(length=5), "Named ATR")`, bars);
  });

  it('compiles mfi with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.mfi(hlc3, 3), "MFI")
plot(ta.mfi(source=hlc3, length=3), "Named MFI")
plot(ta.mfi(source=hlc3, 3), "Mixed MFI")
plot(ta.mfi(close - open, 3), "Derived MFI")`, bars);
  });

  it('compiles tsi with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.tsi(close, 2, 3), "TSI")
plot(ta.tsi(close - open, 2, 3), "Derived TSI")
plot(ta.tsi(source=close, short_length=2, long_length=3), "Named TSI")
plot(ta.tsi(source=close, 2, 3), "Mixed TSI")`, bars);
  });

  it('compiles event-memory helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
condition = close > open
plot(ta.barssince(condition), "Bars Since")
plot(ta.barssince(condition=condition), "Named Bars Since")
plot(ta.valuewhen(condition, close, 0), "Value When")
plot(ta.valuewhen(condition=condition, source=close, occurrence=0), "Named Value When")
plot(ta.valuewhen(condition=condition, close, 1), "Mixed Previous Value When")
plot(ta.valuewhen(condition, close, 1), "Previous Value When")`, bars);
  });

  it('compiles bbw with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.bbw(close, 3, 2), "BBW")
plot(ta.bbw(series=close, length=3, mult=2), "Named BBW")
plot(ta.bbw(series=close, 3, 2), "Mixed BBW")`, bars);
  });

  it('compiles keltner channels with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
[basis, upper, lower] = ta.kc(close, 3, 1.25)
[hlBasis, hlUpper, hlLower] = ta.kc(close, 3, 1.25, false)
[namedBasis, namedUpper, namedLower] = ta.kc(series=close, length=3, mult=1.25)
[mixedBasis, mixedUpper, mixedLower] = ta.kc(series=close, 3, 1.25)
plot(basis, "KC Basis")
plot(upper, "KC Upper")
plot(lower, "KC Lower")
plot(hlUpper, "HL Upper")
plot(namedBasis, "Named KC Basis")
plot(mixedUpper, "Mixed KC Upper")
plot(ta.kcw(close, 3, 1.25), "KC Width")
plot(ta.kcw(close, 3, 1.25, false), "HL Width")
plot(ta.kcw(series=close, length=3, mult=1.25), "Named KC Width")
plot(ta.kcw(series=close, 3, 1.25), "Mixed KC Width")`, bars);
  });

  it('compiles dmi and adx with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
[plus, minus, adx] = ta.dmi(5, 4)
[namedPlus, namedMinus, namedAdx] = ta.dmi(diLength=5, adxSmoothing=4)
[mixedPlus, mixedMinus, mixedAdx] = ta.dmi(diLength=5, 4)
plot(plus, "DI Plus")
plot(minus, "DI Minus")
plot(adx, "DMI ADX")
plot(namedPlus, "Named DI Plus")
plot(mixedMinus, "Mixed DI Minus")
plot(ta.adx(5), "ADX Default")
plot(ta.adx(5, 4), "ADX")
plot(ta.adx(diLength=5, adxSmoothing=4), "Named ADX")
plot(ta.adx(diLength=5, 4), "Mixed ADX")`, bars);
  });

  it('compiles supertrend with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
[trend, direction] = ta.supertrend(2, 3)
[namedTrend, namedDirection] = ta.supertrend(factor=2, atrPeriod=3)
[mixedTrend, mixedDirection] = ta.supertrend(factor=2, 3)
plot(trend, "Supertrend")
plot(direction, "Direction")
plot(namedTrend, "Named Supertrend")
plot(namedDirection, "Named Direction")
plot(mixedTrend, "Mixed Supertrend")
plot(mixedDirection, "Mixed Direction")`, bars);
  });

  it('compiles sar with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.sar(0.02, 0.02, 0.2), "SAR")
plot(ta.sar(start=0.02, inc=0.02, max=0.2), "Named SAR")
plot(ta.sar(start=0.02, 0.02, 0.2), "Mixed SAR")`, bars);
  });

  it('compiles kst with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
[kst, signal] = ta.kst(close, 2, 3, 4, 5, 2, 2, 2, 3, 2)
[namedKst, namedSignal] = ta.kst(source=close, roclength1=2, roclength2=3, roclength3=4, roclength4=5, smalen1=2, smalen2=2, smalen3=2, smalen4=3, signalLength=2)
[mixedKst, mixedSignal] = ta.kst(source=close, 2, 3, 4, 5, 2, 2, 2, 3, 2)
[defaultKst, defaultSignal] = ta.kst(close)
plot(kst, "KST")
plot(signal, "Signal")
plot(namedKst, "Named KST")
plot(namedSignal, "Named Signal")
plot(mixedKst, "Mixed KST")
plot(mixedSignal, "Mixed Signal")
plot(defaultKst, "Default KST")
plot(defaultSignal, "Default Signal")`, bars);
  });

  it('compiles vwap scalar and band overloads with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
anchor = bar_index == 0 or bar_index == 6
plot(ta.vwap(), "Default VWAP")
plot(ta.vwap(close), "Close VWAP")
plot(ta.vwap(close, anchor), "Anchored VWAP")
plot(ta.vwap(source=close, anchor), "Mixed Anchored VWAP")
plot(ta.vwap(source=close, anchor=anchor), "Named Anchored VWAP")
[middle, upper, lower] = ta.vwap(close, anchor, 1.5)
[namedMiddle, namedUpper, namedLower] = ta.vwap(source=close, anchor=anchor, stdev_mult=1.5)
[mixedMiddle, mixedUpper, mixedLower] = ta.vwap(source=close, anchor, 1.5)
plot(middle, "VWAP Middle")
plot(upper, "VWAP Upper")
plot(lower, "VWAP Lower")
plot(namedMiddle, "Named VWAP Middle")
plot(mixedUpper, "Mixed VWAP Upper")`, bars);
  });

  it('compiles rci with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.rci(close, 5), "RCI")
plot(ta.rci(source=close, length=5), "Named RCI")
plot(ta.rci(source=close, 5), "Mixed RCI")
plot(ta.rci(close - open, 5), "Derived RCI")`, bars);
  });

  it('compiles pivot helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
spread = close - open
plot(ta.pivothigh(high, 2, 2), "Pivot High")
plot(ta.pivotlow(low, 1, 1), "Pivot Low")
plot(ta.pivothigh(2, 2), "Default Pivot High")
plot(ta.pivotlow(1, 1), "Default Pivot Low")
plot(ta.pivothigh(source=spread, leftbars=2, rightbars=2), "Named Spread Pivot High")
plot(ta.pivotlow(source=spread, 1, 1), "Mixed Spread Pivot Low")`, bars);
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

  it('preserves boolean history values without numeric coercion', () => {
    assertPlotParity(`//@version=6
indicator("Boolean History")
flag = close > open
wasFalse = flag[1] == false
plot(wasFalse ? 1 : 0)`, [
      { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 99, volume: 100 },
      { time: 1_700_000_060_000, open: 99, high: 102, low: 98, close: 101, volume: 100 },
    ]);
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
plot(ta.lowest(close, 5))
plot(ta.highest(5))
plot(ta.lowest(length=5))
plot(ta.highest(source=high, 4))
plot(ta.lowest(source=low, 4))`, bars);
  });

  it('MACD', () => {
    assertPlotParity(`//@version=6
indicator("test")
[macdLine, signalLine, hist] = ta.macd(close, 12, 26, 9)
plot(macdLine)`, bars);
  });

  it('compiles named and mixed MACD arguments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled MACD argument forms")
[posMacd, posSignal, posHist] = ta.macd(close, 3, 6, 2)
[namedMacd, namedSignal, namedHist] = ta.macd(source=close, fastlen=3, slowlen=6, siglen=2)
[mixedMacd, mixedSignal, mixedHist] = ta.macd(source=close, 3, 6, 2)
plot(posMacd, "Pos MACD")
plot(posSignal, "Pos Signal")
plot(posHist, "Pos Hist")
plot(namedMacd, "Named MACD")
plot(namedSignal, "Named Signal")
plot(namedHist, "Named Hist")
plot(mixedMacd, "Mixed MACD")
plot(mixedSignal, "Mixed Signal")
plot(mixedHist, "Mixed Hist")`, bars);
  });

  it('compiles tail TA mixed argument idioms with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled tail TA mixed helpers")
[supertrend, direction] = ta.supertrend(factor=2.0, 3)
[diPlus, diMinus, adx] = ta.dmi(diLength=3, 3)
sar = ta.sar(start=0.02, 0.02, 0.2)
pivotHigh = ta.pivothigh(source=high, 2, 2)
pivotLow = ta.pivotlow(source=low, 2, 2)
defaultPivotHigh = ta.pivothigh(leftbars=2, 2)
defaultPivotLow = ta.pivotlow(leftbars=2, 2)
linreg = ta.linreg(source=close, 3, 1)
[macdLine, signalLine, histLine] = ta.macd(source=close, 3, 6, 2)
plot(supertrend, "Supertrend")
plot(direction, "Supertrend Direction")
plot(diPlus, "DI Plus")
plot(diMinus, "DI Minus")
plot(adx, "ADX")
plot(sar, "SAR")
plot(pivotHigh, "Pivot High")
plot(pivotLow, "Pivot Low")
plot(defaultPivotHigh, "Default Pivot High")
plot(defaultPivotLow, "Default Pivot Low")
plot(linreg, "LinReg")
plot(macdLine, "MACD")
plot(signalLine, "Signal")
plot(histLine, "Hist")`, bars);
  });

  it('compiles input-derived tuple TA constructor parameters with reference parity', () => {
    const macdPine = `//@version=6
indicator("test")
fastLen = input.int(12, "Fast Length")
slowLen = input.int(26, "Slow Length")
signalLen = input.int(9, "Signal Length")
[macdLine, signalLine, hist] = ta.macd(close, fastLen, slowLen, signalLen)
plot(macdLine, "MACD")
plot(signalLine, "Signal")
plot(hist, "Hist")`;
    assertPlotParity(macdPine, bars);
    {
      const ast = parse(macdPine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['Fast Length', 5],
        ['Slow Length', 8],
        ['Signal Length', 3],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
    }

    const bbPine = `//@version=6
indicator("test")
length = input.int(20, "Length")
mult = input.float(2.0, "StdDev")
[basis, upper, lower] = ta.bb(close, length, mult)
plot(basis, "Basis")
plot(upper, "Upper")
plot(lower, "Lower")`;
    assertPlotParity(bbPine, bars);
    {
      const ast = parse(bbPine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['Length', 5],
        ['StdDev', 1.5],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles input-derived channel/trend TA constructors with reference parity', () => {
    const kcPine = `//@version=6
indicator("compiled input KC")
length = input.int(5, "KC Length")
mult = input.float(1.5, "KC Mult")
[middle, upper, lower] = ta.kc(close, length, mult)
width = ta.kcw(close, length, mult)
plot(middle, "KC Middle")
plot(upper, "KC Upper")
plot(lower, "KC Lower")
plot(width, "KC Width")`;
    assertPlotParity(kcPine, bars);
    {
      const ast = parse(kcPine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['KC Length', 4],
        ['KC Mult', 2.0],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
    }

    const supertrendPine = `//@version=6
indicator("compiled input supertrend")
factor = input.float(2.0, "Factor")
atrPeriod = input.int(4, "ATR Period")
[trend, direction] = ta.supertrend(factor, atrPeriod)
plot(trend, "Trend")
plot(direction, "Direction")`;
    assertPlotParity(supertrendPine, bars);
    {
      const ast = parse(supertrendPine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['Factor', 3.0],
        ['ATR Period', 3],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles input-derived DMI/ADX constructors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input dmi")
diLength = input.int(5, "DI Length")
adxSmoothing = input.int(4, "ADX Smoothing")
[plus, minus, dmiAdx] = ta.dmi(diLength, adxSmoothing)
adxDefault = ta.adx(diLength)
adxSmoothed = ta.adx(diLength, adxSmoothing)
plot(plus, "DI Plus")
plot(minus, "DI Minus")
plot(dmiAdx, "DMI ADX")
plot(adxDefault, "ADX Default")
plot(adxSmoothed, "ADX Smoothed")`;
    assertPlotParity(pine, bars);
    {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['DI Length', 4],
        ['ADX Smoothing', 3],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles input-derived SAR constructors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input sar")
start = input.float(0.02, "SAR Start")
inc = input.float(0.02, "SAR Increment")
max = input.float(0.2, "SAR Maximum")
plot(ta.sar(start, inc, max), "SAR")
plot(ta.sar(start=start, inc=inc, max=max), "Named SAR")`;
    assertPlotParity(pine, bars);
    {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['SAR Start', 0.03],
        ['SAR Increment', 0.04],
        ['SAR Maximum', 0.3],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles input-derived KST constructors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input kst")
roc1 = input.int(2, "ROC 1")
roc2 = input.int(3, "ROC 2")
roc3 = input.int(4, "ROC 3")
roc4 = input.int(5, "ROC 4")
sma1 = input.int(2, "SMA 1")
sma2 = input.int(2, "SMA 2")
sma3 = input.int(2, "SMA 3")
sma4 = input.int(3, "SMA 4")
signalLen = input.int(2, "Signal Length")
[kst, signal] = ta.kst(close, roc1, roc2, roc3, roc4, sma1, sma2, sma3, sma4, signalLen)
plot(kst, "KST")
plot(signal, "Signal")`;
    assertPlotParity(pine, bars);
    {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['ROC 1', 1],
        ['ROC 2', 2],
        ['ROC 3', 3],
        ['ROC 4', 4],
        ['SMA 1', 1],
        ['SMA 2', 2],
        ['SMA 3', 2],
        ['SMA 4', 2],
        ['Signal Length', 3],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles input-derived extrema and pivot constructors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input extrema")
length = input.int(4, "Length")
left = input.int(2, "Left")
right = input.int(2, "Right")
plot(ta.highest(close, length), "Highest")
plot(ta.lowest(low, length), "Lowest")
plot(ta.highestbars(high, length), "Highest Bars")
plot(ta.lowestbars(low, length), "Lowest Bars")
plot(ta.pivothigh(high, left, right), "Pivot High")
plot(ta.pivotlow(low, left, right), "Pivot Low")
plot(ta.pivothigh(leftbars=left, rightbars=right), "Default Pivot High")`;
    assertPlotParity(pine, bars);
    {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['Length', 3],
        ['Left', 1],
        ['Right', 1],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles input-derived statistical TA constructors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input stats")
length = input.int(4, "Length")
shortLength = input.int(2, "Short Length")
longLength = input.int(3, "Long Length")
percentage = input.float(75, "Percentage")
offset = input.int(1, "Offset")
mult = input.float(2, "Mult")
almaOffset = input.float(0.85, "ALMA Offset")
sigma = input.float(6, "Sigma")
biased = input.bool(false, "Biased")
plot(ta.variance(close, length, biased), "Variance")
plot(ta.covariance(close, open, length), "Covariance")
plot(ta.correlation(close, open, length), "Correlation")
plot(ta.percentile_nearest_rank(close, length, percentage), "Nearest")
plot(ta.percentile_linear_interpolation(close, length, percentage), "Linear")
plot(ta.percentrank(close, length), "Percent Rank")
plot(ta.linreg(close, length, offset), "LinReg")
plot(ta.alma(close, length, almaOffset, sigma), "ALMA")
plot(ta.bbw(close, length, mult), "BBW")
plot(ta.cci(close, length), "CCI")
plot(ta.cmo(close, length), "CMO")
plot(ta.mom(close, length), "Momentum")
plot(ta.roc(close, length), "ROC")
plot(ta.rci(close, length), "RCI")
plot(ta.mfi(hlc3, length), "MFI")
plot(ta.tsi(close, shortLength, longLength), "TSI")`;
    assertPlotParity(pine, bars);
    {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['Length', 3],
        ['Short Length', 3],
        ['Long Length', 4],
        ['Percentage', 50],
        ['Offset', 0],
        ['Mult', 1.5],
        ['ALMA Offset', 0.5],
        ['Sigma', 4],
        ['Biased', true],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles remaining input-derived TA constructors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input remaining ta")
length = input.int(4, "Length")
occurrence = input.int(1, "Occurrence")
handleNa = input.bool(true, "Handle NA")
stdevMult = input.float(1.5, "StdDev Mult")
condition = close > open
anchor = bar_index == 0 or bar_index == 6
[middle, upper, lower] = ta.vwap(close, anchor, stdevMult)
plot(ta.valuewhen(condition, close, occurrence), "Value When")
plot(ta.change(close, length), "Change")
plot(ta.stoch(close, high, low, length), "Stoch")
plot(ta.wpr(length), "WPR")
plot(ta.tr(handleNa), "TR")
plot(middle, "VWAP Middle")
plot(upper, "VWAP Upper")
plot(lower, "VWAP Lower")`;
    assertPlotParity(pine, bars);
    {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      const inputOverrides = new Map<string, unknown>([
        ['Length', 3],
        ['Occurrence', 0],
        ['Handle NA', false],
        ['StdDev Mult', 2],
      ]);
      const compiledResult = compiled.success ? executeCompiled(compiled, bars, inputOverrides) : null;
      const interpResult = executeScript(ast, bars, inputOverrides);
      expect(compiled.success).toBe(true);
      expect(compiledResult?.plots.length).toBe(interpResult.plots.length);
      for (let i = 0; i < interpResult.plots.length; i += 1) {
        expect(approxArrayEqual(compiledResult?.plots[i]?.values ?? [], interpResult.plots[i]?.values ?? [])).toBe(true);
      }
    }
  });

  it('compiles additional scalar TA helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.wma(close, 7), "WMA")
plot(ta.mom(close, 3), "Momentum")
plot(ta.mom(close), "Default Momentum")
plot(ta.mom(source=close, 8), "Mixed Momentum")
plot(ta.roc(close, 4), "ROC")
plot(ta.roc(close), "Default ROC")
plot(ta.roc(source=close, 6), "Mixed ROC")
plot(ta.obv(close, volume), "OBV")
plot(ta.obv(), "Default OBV")`, bars);
  });

  it('compiles TA volume variables with history parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.iii, "III")
plot(ta.accdist, "AD")
plot(ta.nvi, "NVI")
plot(ta.pvi, "PVI")
plot(ta.pvt, "PVT")
plot(ta.wad, "WAD")
plot(ta.wvad, "WVAD")
plot(ta.pvt[1], "PVT History")`, bars);
  });

  it('compiles ta.bar_index with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
source = bar_index % 4 == 0 ? na : close
plot(ta.bar_index(source), "Last Source Bar")`, bars);
  });

  it('compiles pivot point levels array output with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
levels = ta.pivot_point_levels("Traditional", "Daily")
developing = ta.pivot_point_levels(type="Traditional", anchor="Daily", developing=true)
plot(array.get(levels, 0), "P")
plot(array.get(levels, 1), "S1")
plot(array.get(levels, 2), "R1")
plot(array.size(levels), "Count")
plot(array.get(developing, 0), "Developing P")`, bars);
  });

  it('compiles HMA with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.hma(close, 7), "HMA")`, bars);
  });

  it('compiles SMMA and VWMA with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.smma(close, 5), "SMMA")
plot(ta.vwma(close, 5), "VWMA")`, bars);
  });

  it('compiles SWMA and ALMA with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.swma(close), "SWMA")
plot(ta.alma(close, 5, 0.85, 6), "ALMA")`, bars);
  });

  it('compiles CCI, CMO, and WPR with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("test")
plot(ta.cci(close, 5), "CCI")
plot(ta.cci(close), "Default CCI")
plot(ta.cci(source=close, 7), "Mixed CCI")
plot(ta.cmo(close, 5), "CMO")
plot(ta.cmo(close), "Default CMO")
plot(ta.cmo(source=close, 7), "Mixed CMO")
plot(ta.wpr(5), "WPR")
plot(ta.wpr(), "Default WPR")`, bars);
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

  it('keeps independent once statement state per compiled call site', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("Once call sites")
var unconditional = 0
var conditional = 0
once
    unconditional += 1
once close > 12
    conditional += 10
plot(unconditional, title="Unconditional")
plot(conditional, title="Conditional")
`, bars);

    expect(compiledResult.profile.executionMode).toBe('compiled');
    expect(findPlot(compiledResult, 'Unconditional').values).toEqual(Array(bars.length).fill(1));
    expect(findPlot(compiledResult, 'Conditional').values).toEqual([
      0,
      0,
      0,
      0,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
      10,
    ]);
    expect(findPlot(compiledResult, 'Unconditional').values).toEqual(findPlot(interpResult, 'Unconditional').values);
    expect(findPlot(compiledResult, 'Conditional').values).toEqual(findPlot(interpResult, 'Conditional').values);
  });

  it('returns ExecutionResult shape', () => {
    const pine = `//@version=6\nindicator("My Test")\nplot(close)`;
    const { compiledResult } = assertPlotParity(pine, bars);

    expect(compiledResult.declaration).toBeDefined();
    expect(compiledResult.declaration.title).toBe('My Test');
    expect(compiledResult.errors).toEqual([]);
    expect(compiledResult.profile.bars).toBe(bars.length);
    expect(compiledResult.profile.executionMode).toBe('compiled');
    expect(compiledResult.profile.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(compiledResult.strategy).toBeDefined();
    expect(compiledResult.drawings).toBeDefined();
    expect(compiledResult.alerts).toBeDefined();
    expect(compiledResult.inputs).toBeDefined();
    expect(compiledResult.indicatorDrawingLimits).toEqual({ label: 50, line: 50, box: 50, polyline: 50 });
  });

  it('compiles static declaration metadata with reference parity', () => {
    const pine = `//@version=6
indicator("Compiled Metadata", shorttitle="CM", overlay=true, format=format.price, precision=3, scale=scale.right, timeframe="60", timeframe_gaps=false, explicit_plot_zorder=true, behind_chart=false, max_bars_back=50, max_labels_count=2, max_lines_count=3, max_boxes_count=4, max_polylines_count=5, calc_bars_count=250, dynamic_requests=false)
plot(close)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 3));
    const interpResult = executeScript(ast, bars.slice(0, 3));

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.declaration).toMatchObject(interpResult.declaration);
    expect(compiledResult?.indicatorShortTitle).toBe(interpResult.indicatorShortTitle);
    expect(compiledResult?.indicatorOverlay).toBe(interpResult.indicatorOverlay);
    expect(compiledResult?.indicatorPrecision).toBe(interpResult.indicatorPrecision);
    expect(compiledResult?.indicatorFormat).toBe(interpResult.indicatorFormat);
    expect(compiledResult?.indicatorScale).toBe(interpResult.indicatorScale);
    expect(compiledResult?.indicatorTimeframe).toBe(interpResult.indicatorTimeframe);
    expect(compiledResult?.indicatorTimeframeGaps).toBe(interpResult.indicatorTimeframeGaps);
    expect(compiledResult?.indicatorExplicitPlotZOrder).toBe(interpResult.indicatorExplicitPlotZOrder);
    expect(compiledResult?.indicatorBehindChart).toBe(interpResult.indicatorBehindChart);
    expect(compiledResult?.indicatorCalcBarsCount).toBe(interpResult.indicatorCalcBarsCount);
    expect(compiledResult?.indicatorMaxBarsBack).toBe(interpResult.indicatorMaxBarsBack);
    expect(compiledResult?.indicatorDynamicRequests).toBe(interpResult.indicatorDynamicRequests);
    expect(compiledResult?.indicatorDrawingLimits).toEqual(interpResult.indicatorDrawingLimits);
  });

  it('preserves omitted declaration precision as unspecified', () => {
    const pine = `//@version=6
indicator("Compiled Default Precision", overlay=true)
plot(close)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 3));
    const interpResult = executeScript(ast, bars.slice(0, 3));

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.indicatorPrecision).toBeUndefined();
    expect(compiledResult?.declaration.precision).toBeUndefined();
    expect(compiledResult?.plots[0]?.precision).toBeUndefined();
    expect(compiledResult?.indicatorPrecision).toBe(interpResult.indicatorPrecision);
  });

  it('compiles typed input metadata with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input metadata")
mode = input.string("EMA", "Mode", options=["SMA", "EMA"], tooltip="Average type", group="Calculation", inline="ma", confirm=true)
mixedMode = input.string(defval="EMA", "Mixed Mode", ["SMA", "EMA"], "Average type", "ma", "Calculation", true)
fast = input.int(10, "Fast", 1, 20, 1, "Fast length", "len", "Calculation", false, display.data_window, true)
mixedFast = input.int(defval=10, "Mixed Fast", 1, 20, 1, "Fast length", "len", "Calculation", false, display.data_window, true)
mult = input.float(2.5, "Multiplier", [1.5, 2.5, 3.5], "Band multiplier", "band", "Bands", true, display.status_line, false)
tf = input.timeframe("60", "Timeframe", ["15", "60"], "Higher timeframe", "tf", "Calculation", true, display.none, true)
level = input.price(101.5, "Level", active=true, tooltip="Drag level")
plot(mode == "EMA" and mixedMode == mode and fast == mixedFast and mult == 2.5 and tf == "60" and level == 101.5 ? 1 : 0, "Values")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.inputs).toEqual(interpResult.inputs);
    expect(compiledResult?.plots[0]?.values).toEqual(interpResult.plots[0]?.values);
  });

  it('compiles legacy input metadata and source inputs with reference parity', () => {
    const pine = `//@version=4
study("compiled legacy inputs")
length = input(3, "Length", type=input.integer, minval=1, maxval=5, step=1)
multiplier = input(2.0, "Multiplier", input.float, minval=1.0, maxval=4.0, confirm=true, step=0.5)
enabled = input(true, "Enabled", type=input.bool)
mode = input("EMA", "Mode", type=input.string, options=["SMA", "EMA"])
source = input(close, "Source", type=input.source)
tf = input("60", "Timeframe", type=input.resolution)
symbol = input("BINANCE:BTCUSDT", "Symbol", type=input.symbol)
session = input("0930-1600", "Session", type=input.session)
tint = input(color.red, "Tint", type=input.color)
typedSource = input.source(close, "Typed Source", "Select source", "src", "Data", true, display.data_window, true)
plot(source * multiplier, "Scaled Source")
plot(length == 3 ? 1 : 0, "Length")
plot(enabled and mode == "EMA" and tf == "60" and symbol == "BINANCE:BTCUSDT" and session == "0930-1600" and tint == color.red ? 1 : 0, "Metadata")
plot(typedSource, "Typed Source")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.inputs).toEqual(interpResult.inputs);
    expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('keeps untyped generic input UI metadata out of numeric range metadata', () => {
    const pine = `//@version=6
indicator("generic input metadata")
origin = input(0, "Start index", "first chart bar has index 0")
lambda = input(1., "Power transform", "no transform if 1", inline="1", group="Data")
steps = input(16, "Interval", inline="1", group="Data")
plot(origin + lambda + steps)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(compiledResult?.inputs.map((input) => ({
      title: input.title,
      minval: input.minval,
      maxval: input.maxval,
      step: input.step,
    }))).toEqual([
      { title: 'Start index', minval: undefined, maxval: undefined, step: undefined },
      { title: 'Power transform', minval: undefined, maxval: undefined, step: undefined },
      { title: 'Interval', minval: undefined, maxval: undefined, step: undefined },
    ]);
    expect(compiledResult?.plots[0]?.values.at(-1)).toBe(17);
  });

  it('keeps duplicate-titled legacy inputs isolated by call site', () => {
    const pine = `//@version=4
study("duplicate legacy input titles")
src = input(title="Source", type=input.source, defval=close)
fastLen = input(3, minval=1, title="Periods", group="Fast")
slowLen = input(5, minval=1, title="Periods", group="Slow")
fast = ema(src, fastLen)
slow = ema(src, slowLen)
plot(fast, title="Fast")
plot(slow, title="Slow")
plot(fast == slow ? 1 : 0, title="Collapsed")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 8));
    const interpResult = executeScript(ast, bars.slice(0, 8));

    expect(compiledResult?.inputs.map((input) => input.title)).toEqual(['Source', 'Periods', 'Periods']);
    expect(interpResult.inputs.map((input) => input.title)).toEqual(['Source', 'Periods', 'Periods']);
    expect(compiledResult?.inputs.map((input) => input.id)).toEqual(interpResult.inputs.map((input) => input.id));
    expect(findPlot(compiledResult!, 'Collapsed').values.at(-1)).toBe(0);
    expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('compiles legacy v2/v3 tickerid and n globals with reference parity', () => {
    const pine = `//@version=3
study("compiled legacy globals")
tf = input(defval="60", title="Timeframe", type=string)
remote = str.length(tickerid)
limited = n <= 2 ? sma(close, 2) : close
plot(remote + limited, "Combined")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 6));

    expect(findPlot(compiledResult, 'Combined').values).toEqual(findPlot(interpResult, 'Combined').values);
  });

  it('compiles legacy v4 boolean strategy directions with reference parity', () => {
    const pine = `//@version=4
strategy("compiled legacy strategy direction", process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", true, qty=1)
if bar_index == 1
    strategy.entry("Short", false, qty=1)
plot(strategy.position_size, "Size")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 4));

    expect(findPlot(compiledResult, 'Size').values).toEqual(findPlot(interpResult, 'Size').values);
  });

  it('compiles v4 positional visual arguments with reference parity', () => {
    const pine = `//@version=4
study("compiled v4 visuals")
fast = plot(close, "Fast", color.green, 2, plot.style_line, false, 40)
slow = plot(open, "Slow", color.red, 1, plot.style_line, false, 20)
fill(fast, slow, color.blue, 60, "Band")
bgcolor(color.yellow, 70)
plotshape(close > open, "Long", shape.triangleup, location.abovebar, color.green, 30)
plotchar(close < 13, "Low", "L", location.belowbar, color.red, 50)
plotarrow(close - 12, "Move", color.green, color.red, 10)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 4));

    for (const title of ['Fast', 'Slow', 'Band', 'bgcolor', 'Long', 'Low', 'Move']) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        color: interpPlot.color,
        values: interpPlot.values,
      });
      if (interpPlot.colorup !== undefined) expect(compiledPlot.colorup).toEqual(interpPlot.colorup);
      if (interpPlot.colordown !== undefined) expect(compiledPlot.colordown).toEqual(interpPlot.colordown);
    }
  });

  it('compiles input.source overrides with reference parity', () => {
    const pine = `//@version=6
indicator("compiled source overrides")
source = input.source(close, "Source")
derived = input.source(hl2, "Derived")
plot(source, "Source")
plot(derived, "Derived")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    const inputOverrides = new Map<string, unknown>([
      ['input_Source', 'open'],
      ['input_Derived', 'ohlc4'],
    ]);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars, inputOverrides);
    const interpResult = executeScript(ast, bars, inputOverrides);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.inputs).toEqual(interpResult.inputs);
    expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('compiles v6 input surface values and plot-source overrides with reference parity', () => {
    const pine = `//@version=6
indicator("compiled complete input surface")
enum Mode
    fast = "Fast"
    slow = "Slow"
basePlot = plot(hlc3, "Selectable Plot")
any = input(close, "Bare", "Bare tooltip", "bare", "Inputs", display.all, true)
length = input.int(3, "Length", minval=1, maxval=20, step=1, group="Inputs", inline="len", tooltip="Length", confirm=true, display=display.data_window, active=true)
ratio = input.float(1.5, "Ratio", options=[1.0, 1.5, 2.0], group="Inputs", inline="len")
enabled = input.bool(true, "Enabled", group="Inputs")
mode = input.string("EMA", "Mode", options=["SMA", "EMA"], tooltip="Mode")
tint = input.color(color.green, "Tint", active=enabled)
src = input.source(ohlc4, "Source", "Source tooltip")
derived = input.source(hlc3, "Derived")
tf = input.timeframe("60", "Timeframe", options=["15", "60"])
sym = input.symbol("NASDAQ:AAPL", "Symbol")
sess = input.session("0930-1600", "Session")
level = input.price(101.25, "Level")
notes = input.text_area("note", "Notes")
start = input.time(1700000000000, "Start")
choice = input.enum(Mode.fast, "Choice", options=[Mode.fast, Mode.slow])
score = enabled and mode == "EMA" and tf == "60" and sym == "NASDAQ:AAPL" and sess == "0930-1600" and notes == "note" and choice == Mode.fast and tint == color.green and start == 1700000000000 ? 1 : 0
plot(any + src + ta.sma(derived, length) + ratio + level + score, "Output")
plot(src, "Selected Source")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    const inputOverrides = new Map<string, unknown>([
      ['input_Source', 'Selectable Plot'],
      ['input_Derived', 'ohlc4'],
    ]);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars, inputOverrides);
    const interpResult = executeScript(ast, bars, inputOverrides);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.inputs).toEqual(interpResult.inputs);
    expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('compiles visual plot handles with reference output parity', () => {
    const pine = `//@version=6
indicator("visual")
linePlot = plot(close, title="Close", color=color.green)
midLine = hline(12, title="Mid", color=color.blue, linestyle=hline.style_dotted, linewidth=2)
fill(linePlot, midLine, color=color.new(color.blue, 80), title="Band Fill")
bgcolor(close > open ? color.new(color.blue, 80) : na, title="Background")
barcolor(close > open ? color.green : na, title="Bar Tint")
plotshape(close > open, title="Long", style=shape.triangleup, location=location.belowbar, color=color.green, text="L", textcolor=color.white)
plotchar(close < 13, title="Low Char", char="L", location=location.top, color=color.yellow)
plotarrow(close - 13, title="Move Arrow", color.green, color.red)
plotbar(open, high, low, close, title="Bars", color=color.green)
plotcandle(open, high, low, close, title="Candles", color=color.green, wickcolor=color.blue, bordercolor=color.red)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    const compiledClose = findPlot(compiledResult, 'Close');
    const interpClose = findPlot(interpResult, 'Close');
    expect(compiledClose).toMatchObject({
      id: interpClose.id,
      type: interpClose.type,
      color: interpClose.color,
      values: interpClose.values,
    });

    const compiledMid = findPlot(compiledResult, 'Mid');
    const interpMid = findPlot(interpResult, 'Mid');
    expect(compiledMid).toMatchObject({
      id: interpMid.id,
      type: interpMid.type,
      price: interpMid.price,
      color: interpMid.color,
      lineStyle: interpMid.lineStyle,
      linewidth: interpMid.linewidth,
    });

    const compiledFill = findPlot(compiledResult, 'Band Fill');
    const interpFill = findPlot(interpResult, 'Band Fill');
    expect(compiledFill).toMatchObject({
      type: interpFill.type,
      plot1Id: interpFill.plot1Id,
      plot2Id: interpFill.plot2Id,
      color: interpFill.color,
    });

    const compiledLong = findPlot(compiledResult, 'Long');
    const interpLong = findPlot(interpResult, 'Long');
    expect(compiledLong).toMatchObject({
      type: interpLong.type,
      shape: interpLong.shape,
      location: interpLong.location,
      text: interpLong.text,
      textColor: interpLong.textColor,
      color: interpLong.color,
      values: interpLong.values,
    });

    for (const title of ['Background', 'Bar Tint', 'Low Char', 'Move Arrow']) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        type: interpPlot.type,
        color: interpPlot.color,
        values: interpPlot.values,
      });
    }

    for (const title of ['Bars', 'Candles']) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        type: interpPlot.type,
        color: interpPlot.color,
        openValues: interpPlot.openValues,
        highValues: interpPlot.highValues,
        lowValues: interpPlot.lowValues,
        closeValues: interpPlot.closeValues,
        wickColor: interpPlot.wickColor,
        borderColor: interpPlot.borderColor,
        values: interpPlot.values,
      });
    }
  });

  it('compiles custom OHLC visual metadata with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled custom ohlc", overlay=true)
o = bar_index == 0 ? na : open
h = bar_index == 0 ? na : high
l = bar_index == 0 ? na : low
c = bar_index == 0 ? na : close
bodyColor = c >= o ? color.silver : color.blue
wickColor = color.new(bodyColor, 70)
plotcandle(o, h, l, c, title="Custom candles", color=bodyColor, wickcolor=wickColor, bordercolor=bodyColor, editable=true, show_last=5, display=display.price_scale, format=format.price, precision=2, force_overlay=true)
plotbar(o, h + 1, l - 1, c, "Custom bars", bodyColor, false, 6, display.none, format.volume, 0, true)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    for (const title of ['Custom candles', 'Custom bars']) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        type: interpPlot.type,
        openValues: interpPlot.openValues,
        highValues: interpPlot.highValues,
        lowValues: interpPlot.lowValues,
        closeValues: interpPlot.closeValues,
        color: interpPlot.color,
        wickColor: interpPlot.wickColor,
        borderColor: interpPlot.borderColor,
        editable: interpPlot.editable,
        showLast: interpPlot.showLast,
        display: interpPlot.display,
        format: interpPlot.format,
        precision: interpPlot.precision,
        forceOverlay: interpPlot.forceOverlay,
        values: interpPlot.values,
      });
    }
  });

  it('compiles conditionally executed OHLC visuals with reference alignment parity', () => {
    const pine = `//@version=6
indicator("compiled conditional ohlc", overlay=true)
if bar_index > 0
    plotcandle(open, high, low, close, title="Late Candles", color=color.green, wickcolor=color.blue, bordercolor=color.orange)
    plotbar(open, high, low, close, title="Late Bars", color=color.red)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 4));

    for (const title of ['Late Candles', 'Late Bars']) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        openValues: interpPlot.openValues,
        highValues: interpPlot.highValues,
        lowValues: interpPlot.lowValues,
        closeValues: interpPlot.closeValues,
        color: interpPlot.color,
        wickColor: interpPlot.wickColor,
        borderColor: interpPlot.borderColor,
        values: interpPlot.values,
      });
    }
  });

  it('compiles custom Heikin-Ashi candle state with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled HA candles", overlay=true)
haClose = (open + high + low + close) / 4
var float haOpen = na
haOpen := na(haOpen[1]) ? (open + close) / 2 : (haOpen[1] + haClose[1]) / 2
haHigh = math.max(high, math.max(haOpen, haClose))
haLow = math.min(low, math.min(haOpen, haClose))
bodyColor = haClose >= haOpen ? color.green : color.red
plotcandle(haOpen, haHigh, haLow, haClose, title="HA Overlay", color=bodyColor, wickcolor=color.new(bodyColor, 20), bordercolor=bodyColor, force_overlay=true)
plot(haClose - haOpen, title="HA Body")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    const compiledCandles = findPlot(compiledResult, 'HA Overlay');
    const interpCandles = findPlot(interpResult, 'HA Overlay');
    expect(compiledCandles).toMatchObject({
      openValues: interpCandles.openValues,
      highValues: interpCandles.highValues,
      lowValues: interpCandles.lowValues,
      closeValues: interpCandles.closeValues,
      color: interpCandles.color,
      wickColor: interpCandles.wickColor,
      borderColor: interpCandles.borderColor,
      forceOverlay: interpCandles.forceOverlay,
    });
    expect(findPlot(compiledResult, 'HA Body').values).toEqual(findPlot(interpResult, 'HA Body').values);
  });

  it('compiles plotshape style aliases with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled plotshape aliases")
plotshape(close > open, style=plotshape.style_triangleup, location=location.abovebar, title="Up")
plotshape(close < open, style=plotshape.style_triangledown, location=location.belowbar, title="Down")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, [
      { time: 1, open: 10, high: 11, low: 9, close: 11, volume: 100 },
      { time: 2, open: 20, high: 21, low: 19, close: 19, volume: 100 },
    ]);

    expect(findPlot(compiledResult, 'Up')).toMatchObject({
      type: 'plotshape',
      shape: findPlot(interpResult, 'Up').shape,
      location: findPlot(interpResult, 'Up').location,
      values: findPlot(interpResult, 'Up').values,
    });
    expect(findPlot(compiledResult, 'Down')).toMatchObject({
      type: 'plotshape',
      shape: findPlot(interpResult, 'Down').shape,
      location: findPlot(interpResult, 'Down').location,
      values: findPlot(interpResult, 'Down').values,
    });
  });

  it('compiles plot style aliases with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled plot style aliases")
plot(close, title="Step", style=plot.style_step)
plot(open, title="Columns", style=plot.style_columns)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 3));

    expect(findPlot(compiledResult, 'Step').style).toBe(findPlot(interpResult, 'Step').style);
    expect(findPlot(compiledResult, 'Columns').style).toBe(findPlot(interpResult, 'Columns').style);
  });

  it('compiles named-primary visual calls with positional metadata parity', () => {
    const pine = `//@version=6
indicator("compiled named-primary visuals")
upper = plot(series=high, "Fill Upper", color.green)
lower = plot(series=low, "Fill Lower", color.red)
plot(series=close, "Mixed Plot", color.blue, 2, plot.style_columns)
fill(plot1=upper, lower, color.new(color.blue, 80), "Mixed Fill")
plotshape(series=close > open, "Mixed Shape", shape.triangleup, location.belowbar, color.green, 0, "S")
plotchar(series=close < open, "Mixed Char", "C", location.abovebar, color.red, 0, "C")
plotarrow(series=close - open, "Mixed Arrow", color.green, color.red, 0, 5, 15)
plotbar(open=open, high, low, close, "Mixed Bars", color.green)
plotcandle(open=open, high, low, close, "Mixed Candles", color.green, color.blue)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 4));

    for (const title of [
      'Fill Upper',
      'Fill Lower',
      'Mixed Plot',
      'Mixed Fill',
      'Mixed Shape',
      'Mixed Char',
      'Mixed Arrow',
      'Mixed Bars',
      'Mixed Candles',
    ]) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        id: interpPlot.id,
        type: interpPlot.type,
        title: interpPlot.title,
        color: interpPlot.color,
        values: interpPlot.values,
      });
    }

    expect(findPlot(compiledResult, 'Mixed Plot').style).toBe(findPlot(interpResult, 'Mixed Plot').style);
    expect(findPlot(compiledResult, 'Mixed Shape').shape).toBe(findPlot(interpResult, 'Mixed Shape').shape);
    expect(findPlot(compiledResult, 'Mixed Char').char).toBe(findPlot(interpResult, 'Mixed Char').char);
    expect(findPlot(compiledResult, 'Mixed Fill').plot1Id).toBe(findPlot(interpResult, 'Mixed Fill').plot1Id);
    expect(findPlot(compiledResult, 'Mixed Fill').plot2Id).toBe(findPlot(interpResult, 'Mixed Fill').plot2Id);
    expect(findPlot(compiledResult, 'Mixed Bars').openValues).toEqual(findPlot(interpResult, 'Mixed Bars').openValues);
    expect(findPlot(compiledResult, 'Mixed Candles').wickColor).toEqual(findPlot(interpResult, 'Mixed Candles').wickColor);
  });

  it('compiles plot visual metadata with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled plot metadata")
plot(close)
plot(open)
plot(close, "Metadata", color.red, linewidth=3, style=plot.style_linebr, trackprice=true, histbase=10, offset=1, join=true, editable=false, show_last=2, display=display.data_window, format=format.price, precision=4, force_overlay=true, linestyle=plot.linestyle_dashed)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 4));

    expect(compiledResult.plots.slice(0, 2).map((plot) => ({ id: plot.id, title: plot.title }))).toEqual(
      interpResult.plots.slice(0, 2).map((plot) => ({ id: plot.id, title: plot.title })),
    );

    const compiledPlot = findPlot(compiledResult, 'Metadata');
    const interpPlot = findPlot(interpResult, 'Metadata');
    expect(compiledPlot).toMatchObject({
      color: interpPlot.color,
      linewidth: interpPlot.linewidth,
      style: interpPlot.style,
      trackprice: interpPlot.trackprice,
      histbase: interpPlot.histbase,
      offset: interpPlot.offset,
      join: interpPlot.join,
      editable: interpPlot.editable,
      showLast: interpPlot.showLast,
      display: interpPlot.display,
      format: interpPlot.format,
      precision: interpPlot.precision,
      forceOverlay: interpPlot.forceOverlay,
      lineStyle: interpPlot.lineStyle,
    });
  });

  it('compiles display flag arithmetic with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled display arithmetic")
displayTarget = display.all - display.status_line
screenOnly = display.pine_screener
plot(close, "Display Target", display=displayTarget)
hline(100, "Scale Line", display=display.price_scale)
hline(200, "Screener Line", display=screenOnly)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 3));

    expect(findPlot(compiledResult, 'Display Target').display).toBe(findPlot(interpResult, 'Display Target').display);
    expect(findPlot(compiledResult, 'Scale Line').display).toBe(findPlot(interpResult, 'Scale Line').display);
    expect(findPlot(compiledResult, 'Screener Line').display).toBe(findPlot(interpResult, 'Screener Line').display);
    expect(findPlot(compiledResult, 'Display Target').display).toBe(27);
    expect(findPlot(compiledResult, 'Screener Line').display).toBe(16);
  });

  it('compiles untitled visual ids with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled untitled visuals")
fast = plot(close)
slow = plot(open)
fill(fast, slow)
barcolor(color.green)
plotbar(open, high, low, close)
plotcandle(open, high, low, close)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 3));

    expect(compiledResult.plots.map((plot) => ({ id: plot.id, title: plot.title, type: plot.type }))).toEqual(
      interpResult.plots.map((plot) => ({ id: plot.id, title: plot.title, type: plot.type })),
    );
  });

  it('names untitled plots by plot-call order when other visuals are interleaved', () => {
    const pine = `//@version=6
indicator("compiled interleaved untitled plots")
plotshape(close > open, title="Signal")
first = plot(close)
barcolor(color.green, title="Bars")
plotshape(close < open, title="Other Signal")
second = plot(open)
fill(first, second)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 3));

    expect(compiledResult.plots.map((plot) => ({ id: plot.id, title: plot.title, type: plot.type }))).toEqual(
      interpResult.plots.map((plot) => ({ id: plot.id, title: plot.title, type: plot.type })),
    );
    expect(compiledResult.plots.filter((plot) => plot.type === 'plot').map((plot) => plot.title)).toEqual([
      'Plot 1',
      'Plot 2',
    ]);
  });

  it('compiles transparent visual payloads with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled transparent visuals")
topLine = hline(14, title="Top")
bottomLine = hline(10, title="Bottom")
fill(hline1=topLine, hline2=bottomLine, color=color.blue, transp=50, title="Range Fill")
plot(close, title="Transparent Close", color=color.green, transp=25)
bgcolor(close > open ? color.blue : na, title="Transparent Background", transp=60)
barcolor(close > open ? color.green : na, title="Transparent Bars", transp=40)
plotshape(close > open, title="Transparent Shape", style=shape.triangleup, color=color.green, textcolor=close > 12 ? color.white : color.yellow, transp=20)
plotchar(close < 13, title="Transparent Char", char="L", color=color.yellow, textcolor=close < 11 ? color.white : color.green, transp=30)
plotarrow(close - 13, title="Transparent Arrow", colorup=color.green, colordown=color.red, transp=10)
plotbar(open, high, low, close, title="Transparent Plotbar", color=color.green, transp=15)
plotcandle(open, high, low, close, title="Transparent Plotcandle", color=color.green, wickcolor=color.blue, bordercolor=color.red, transp=35)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 5));

    for (const title of [
      'Range Fill',
      'Transparent Close',
      'Transparent Background',
      'Transparent Bars',
      'Transparent Shape',
      'Transparent Char',
      'Transparent Arrow',
      'Transparent Plotbar',
      'Transparent Plotcandle',
    ]) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot.color).toEqual(interpPlot.color);
      if (interpPlot.textColor !== undefined) expect(compiledPlot.textColor).toEqual(interpPlot.textColor);
      if (interpPlot.wickColor !== undefined) expect(compiledPlot.wickColor).toEqual(interpPlot.wickColor);
      if (interpPlot.borderColor !== undefined) expect(compiledPlot.borderColor).toEqual(interpPlot.borderColor);
      if (interpPlot.colorup !== undefined) expect(compiledPlot.colorup).toEqual(interpPlot.colorup);
      if (interpPlot.colordown !== undefined) expect(compiledPlot.colordown).toEqual(interpPlot.colordown);
    }

    expect(findPlot(compiledResult, 'Range Fill')).toMatchObject({
      plot1Id: findPlot(interpResult, 'Range Fill').plot1Id,
      plot2Id: findPlot(interpResult, 'Range Fill').plot2Id,
    });
  });

  it('compiles dynamic marker text with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled dynamic marker text")
shapeText = "S" + str.tostring(bar_index)
charText = close > open ? "UP" : "DN"
plotshape(close > open, title="Dynamic Shape", style=shape.labelup, location=location.belowbar, text=shapeText, textcolor=color.white)
plotchar(close < open, title="Dynamic Char", char="C", location=location.abovebar, text=charText, textcolor=color.yellow)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 5));

    for (const title of ['Dynamic Shape', 'Dynamic Char']) {
      const compiledPlot = findPlot(compiledResult, title);
      const interpPlot = findPlot(interpResult, title);
      expect(compiledPlot).toMatchObject({
        text: interpPlot.text,
        textValues: interpPlot.textValues,
        textColor: interpPlot.textColor,
        values: interpPlot.values,
      });
    }
  });

  it('compiles label, line, and table drawings with reference output parity', () => {
    const pine = `//@version=6
indicator("drawings", overlay=true)
if barstate.islast
    label.new(bar_index, close, text="L", color=color.green, textcolor=color.white, style=label.style_label_up)
    line.new(bar_index - 1, close[1], bar_index, close, color=color.blue, width=2)
    t = table.new(position.top_right, 2, 1, bgcolor=color.new(color.blue, 80))
    table.cell(t, 0, 0, "A", text_color=color.white)
    table.cell(t, 1, 0, str.tostring(close), bgcolor=color.green)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
  });

  it('compiles block-local persistent drawings initialized after the first bar', () => {
    const pine = `//@version=6
indicator("late block var drawings", overlay=true)
if barstate.islast
    var table dash = table.new(position.top_right, 1, 1)
    var label tag = label.new(bar_index, close, "last")
    table.cell(dash, 0, 0, "ok")
    label.set_text(tag, "last " + str.tostring(bar_index))`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 6));
    const interpResult = executeScript(ast, bars.slice(0, 6));

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
    expect(compiledResult?.drawings.some((drawing) => drawing.type === 'table')).toBe(true);
    expect(compiledResult?.drawings.some((drawing) => drawing.type === 'label')).toBe(true);
  });

  it('compiles repeated drawing constructors with runtime invocation identity', () => {
    const pine = `//@version=6
indicator("drawing constructor identity", overlay=true)
makeLabel(offset, labelText) =>
    label.new(bar_index + offset, close, text=labelText)

if barstate.islast
    for i = 0 to 2
        label.new(bar_index + i, high, text="loop " + str.tostring(i))
    makeLabel(10, "udf a")
    makeLabel(11, "udf b")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 6));
    const interpResult = executeScript(ast, bars.slice(0, 6));

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
    expect(new Set(compiledResult?.drawings.map((drawing) => drawing.id))).toHaveProperty('size', 5);
  });

  it('compiles historical bar_index drawing coordinates with reference parity', () => {
    const pine = `//@version=6
indicator("historical bar_index drawings", overlay=true)
if bar_index > 1
    line.new(x1=bar_index[1], y1=close[1], x2=bar_index, y2=close, color=color.green)
    label.new(x=bar_index[2], y=high, text=str.tostring(bar_index[2]), color=color.blue)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
    expect(compiledResult?.drawings.filter((drawing) => drawing.type === 'line').map(drawingKey)).toEqual(
      interpResult.drawings.filter((drawing) => drawing.type === 'line').map(drawingKey),
    );
    expect(compiledResult?.drawings.filter((drawing) => drawing.type === 'label').map(drawingKey)).toEqual(
      interpResult.drawings.filter((drawing) => drawing.type === 'label').map(drawingKey),
    );
  });

  it('compiles formatted strings in drawing payloads with reference parity', () => {
    const pine = `//@version=6
indicator("formatted drawing text", overlay=true)
rsi = ta.rsi(close, 5)
if barstate.islast
    label.new(bar_index, close, text=str.format("O:{0} H:{1} L:{2} C:{3}", open, high, low, close))
    table dash = table.new(position.top_right, 2, 2)
    table.cell(dash, 0, 0, "RSI")
    table.cell(dash, 1, 0, str.tostring(nz(rsi), "#.####"))
    table.cell(dash, 0, 1, "Close")
    table.cell(dash, 1, 1, str.format("{0,number,#.##}", close))
plot(nz(rsi), "RSI")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
  });

  it('compiles box, polyline, linefill, and chart point drawings with reference output parity', () => {
    const pine = `//@version=6
indicator("more drawings", overlay=true)
if barstate.islast
    top = line.new(bar_index - 1, high[1], bar_index, high, color=color.green)
    bottom = line.new(bar_index - 1, low[1], bar_index, low, color=color.red)
    linefill.new(top, bottom, color=color.new(color.blue, 80))
    box.new(bar_index - 1, high, bar_index, low, bgcolor=color.new(color.green, 75), border_color=color.blue, text="B")
    p1 = chart.point.from_index(bar_index - 1, close[1])
    p2 = chart.point.now(close)
    polyline.new(array.from(p1, p2), line_color=color.yellow, line_style=line.style_dashed, line_width=2)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
  });

  it('compiles label chart-point overloads with reference drawing parity', () => {
    const pine = `//@version=6
indicator("point labels", overlay=true)
if barstate.islast
    lowPoint = chart.point.from_index(index=bar_index - 1, price=low)
    highPoint = chart.point.from_time(time=time, price=high)
    copiedPoint = chart.point.copy(id=lowPoint)
    label.new(copiedPoint, "low", style=label.style_label_up, textcolor=color.white)
    label.new(highPoint, "high", xloc=xloc.bar_time, style=label.style_label_down, textcolor=color.white)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.drawings).toEqual(interpResult.drawings);
  });

  it('compiles persistent drawing handle mutators and getters with reference parity', () => {
    const pine = `//@version=6
indicator("drawing handles", overlay=true)
var marker = label.new(0, close, text="seed")
var trend = line.new(0, close, 1, close + 1, color=color.red, style=line.style_dotted, width=2)
if barstate.islast
    label.set_xy(marker, bar_index, high)
    label.set_point(marker, chart.point.from_index(bar_index - 1, low))
    label.set_text(marker, "last")
    label.set_style(marker, label.style_label_up)
    label.set_color(marker, color.green)
    line.set_xy1(trend, bar_index - 1, low[1])
    line.set_xy2(trend, bar_index, high)
    line.set_color(trend, color.blue)
    line.set_width(trend, 3)
plot(label.get_x(marker), title="Label X")
plot(label.get_y(marker), title="Label Y")
plot(line.get_price(trend, bar_index - 1), title="Line Price")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles persistent table mutators with reference drawing parity', () => {
    const pine = `//@version=6
indicator("table handles", overlay=true)
var dashboard = table.new(position=position.bottom_right, columns=2, rows=2, bgcolor=color.black, frame_color=color.blue, frame_width=1)
if barstate.islast
    table.set_position(table_id=dashboard, position=position.top_left)
    table.set_bgcolor(table_id=dashboard, bgcolor=color.new(color.blue, 80))
    table.set_frame_color(table_id=dashboard, frame_color=color.white)
    table.set_frame_width(table_id=dashboard, frame_width=2)
    table.set_border_color(table_id=dashboard, border_color=color.green)
    table.set_border_width(table_id=dashboard, border_width=3)
    table.cell(table_id=dashboard, column=0, row=0, text="A", text_color=color.white, tooltip="A tip")
    table.cell(table_id=dashboard, column=1, row=0, text="B")
    table.cell_set_text(table_id=dashboard, column=1, row=0, text="C")
    table.cell_set_bgcolor(table_id=dashboard, column=1, row=0, bgcolor=color.green)
    table.cell_set_text_color(table_id=dashboard, column=1, row=0, text_color=color.black)
    table.cell_set_text_size(table_id=dashboard, column=1, row=0, text_size=size.large)
    table.cell_set_width(table_id=dashboard, column=1, row=0, width=64)
    table.cell_set_height(table_id=dashboard, column=1, row=0, height=24)
    table.cell_set_text_halign(table_id=dashboard, column=1, row=0, text_halign=text.align_right)
    table.cell_set_text_valign(table_id=dashboard, column=1, row=0, text_valign=text.align_bottom)
    table.cell_set_text_font_family(table_id=dashboard, column=1, row=0, text_font_family=font.family_monospace)
    table.cell_set_text_formatting(table_id=dashboard, column=1, row=0, text_formatting=text.format_bold)
    table.cell_set_tooltip(table_id=dashboard, column=1, row=0, tooltip="C tip")
    table.merge_cells(table_id=dashboard, start_column=0, start_row=0, end_column=1, end_row=0)
    table.cell(table_id=dashboard, column=0, row=1, text="cleared")
    table.clear(table_id=dashboard, start_column=0, start_row=1, end_column=0, end_row=1)
plot(array.size(table.all), title="Table Count")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles drawing delete and all handles with reference parity', () => {
    const pine = `//@version=6
indicator("drawing all lifecycle", overlay=true)
if barstate.islast
    keepLabel = label.new(bar_index, close, text="keep label")
    dropLabel = label.new(bar_index, high, text="drop label")
    dropLabel.delete()
    keepLine = line.new(bar_index - 1, close[1], bar_index, close)
    dropLine = line.new(bar_index - 1, high[1], bar_index, high)
    dropLine.delete()
    keepBox = box.new(bar_index - 1, high, bar_index, low, text="keep box")
    dropBox = box.new(bar_index - 1, high + 1, bar_index, low - 1, text="drop box")
    dropBox.delete()
    keepTable = table.new(position.top_right, 1, 1)
    dropTable = table.new(position.bottom_right, 1, 1)
    dropTable.delete()
plot(array.size(label.all), title="Labels")
plot(array.size(line.all), title="Lines")
plot(array.size(box.all), title="Boxes")
plot(array.size(table.all), title="Tables")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles high-churn drawing eviction with declaration limits and reference parity', () => {
    const churnBars = makeBars(Array.from({ length: 210 }, (_, index) => 100 + index));
    const pine = `//@version=6
indicator("drawing churn", overlay=true, max_labels_count=7, max_lines_count=5, max_boxes_count=4, max_polylines_count=3)
if bar_index % 2 == 0
    label.new(bar_index, high, text=str.format("L{0}", bar_index), yloc=yloc.abovebar)
if bar_index % 5 == 0
    for i = 0 to 1
        line.new(bar_index - i, low, bar_index + i, high, xloc=xloc.bar_index, extend=i == 0 ? extend.left : extend.right, color=i == 0 ? color.red : color.green)
if bar_index % 7 == 0
    box.new(bar_index - 1, high, bar_index, low, text=str.format("B{0}", bar_index), extend=extend.both)
if bar_index % 11 == 0
    points = array.from(chart.point.from_index(bar_index - 1, low), chart.point.from_index(bar_index, close), chart.point.from_index(bar_index + 1, high))
    polyline.new(points, xloc=xloc.bar_index, line_color=color.blue)
plot(array.size(label.all), title="Labels")
plot(array.size(line.all), title="Lines")
plot(array.size(box.all), title="Boxes")
plot(array.size(polyline.all), title="Polylines")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, churnBars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.indicatorDrawingLimits).toEqual({ label: 7, line: 5, box: 4, polyline: 3 });
    expect(compiledResult.drawings.map(drawingKey)).toEqual(interpResult.drawings.map(drawingKey));
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'label')).toHaveLength(7);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'line')).toHaveLength(5);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'box')).toHaveLength(4);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'polyline')).toHaveLength(3);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.type === 'label' ? drawing.text : '')).toEqual([
      'L196',
      'L198',
      'L200',
      'L202',
      'L204',
      'L206',
      'L208',
    ]);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'box').map((drawing) => drawing.type === 'box' ? drawing.text : '')).toEqual([
      'B182',
      'B189',
      'B196',
      'B203',
    ]);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'line').map(drawingKey)).toEqual([
      'line:194:196:bar_index:right:#4CAF50',
      'line:200:200:bar_index:left:#F23645',
      'line:199:201:bar_index:right:#4CAF50',
      'line:205:205:bar_index:left:#F23645',
      'line:204:206:bar_index:right:#4CAF50',
    ]);
    expect(compiledResult.drawings.filter((drawing) => drawing.type === 'polyline').map(drawingKey)).toEqual([
      'polyline:3:186:bar_index',
      'polyline:3:197:bar_index',
      'polyline:3:208:bar_index',
    ]);
  });

  it('compiles drawing mutators, delete, xloc, yloc, and extend lifecycle with reference parity', () => {
    const pine = `//@version=6
indicator("drawing mutator lifecycle", overlay=true, max_labels_count=3, max_lines_count=3, max_boxes_count=3)
if barstate.islast
    keepLabel = label.new(time, high, text="time", xloc=xloc.bar_time, yloc=yloc.abovebar)
    dropLabel = label.new(bar_index, low, text="drop", yloc=yloc.belowbar)
    label.set_xloc(keepLabel, time[1], xloc.bar_time)
    label.set_yloc(keepLabel, yloc.price)
    label.set_xy(dropLabel, bar_index, low)
    label.delete(dropLabel)
    leftLine = line.new(bar_index - 2, low, bar_index, high, extend=extend.none)
    rightLine = line.new(time[2], low[2], time, high, xloc=xloc.bar_time, extend=extend.right)
    line.set_extend(leftLine, extend.left)
    line.set_xloc(rightLine, time[1], time, xloc.bar_time)
    dropLine = line.new(bar_index - 1, close, bar_index, close)
    line.delete(dropLine)
    zone = box.new(time[2], high, time, low, xloc=xloc.bar_time, extend=extend.right, text="zone")
    box.set_extend(zone, extend.both)
    box.set_xloc(zone, time[1], time, xloc.bar_time)
    dropBox = box.new(bar_index - 1, high, bar_index, low, text="drop")
    box.delete(dropBox)
plot(array.size(label.all), title="Labels")
plot(array.size(line.all), title="Lines")
plot(array.size(box.all), title="Boxes")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
    expect(compiledResult.drawings.map(drawingKey)).toEqual([
      'label:time:bar_time:price:1140000',
      'line:17:19:bar_index:left:#2196F3',
      'line:1140000:1200000:bar_time:right:#2196F3',
      'box:zone:1140000:1200000:bar_time:both',
    ]);
  });

  it('compiles persistent linefill mutators and getters with reference parity', () => {
    const pine = `//@version=6
indicator("linefill handles", overlay=true)
var upper = line.new(0, high, 1, high)
var lower = line.new(0, low, 1, low)
var mid = line.new(0, hl2, 1, hl2)
var channel = linefill.new(upper, lower, color=color.red)
var deleted = linefill.new(upper, mid, color=color.blue)
if barstate.islast
    line.set_xy1(upper, bar_index - 1, high[1])
    line.set_xy2(upper, bar_index, high)
    line.set_xy1(lower, bar_index - 1, low[1])
    line.set_xy2(lower, bar_index, low)
    line.set_xy1(mid, bar_index - 1, hl2[1])
    line.set_xy2(mid, bar_index, hl2)
    linefill.set_color(channel, color.green)
    linefill.delete(deleted)
    label.new(na, na, text=str.format("{0}|{1}", linefill.get_line1(channel), linefill.get_line2(channel)))
plot(array.size(linefill.all), title="Linefills")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles persistent box mutators and getters with reference parity', () => {
    const pine = `//@version=6
indicator("box handles", overlay=true)
var zone = box.new(0, high, 1, low, border_color=color.red, border_width=2, border_style=line.style_dotted, bgcolor=color.blue, text="seed")
if barstate.islast
    box.set_lefttop(zone, bar_index - 2, high)
    box.set_rightbottom(zone, bar_index, low)
    box.set_bgcolor(zone, color.green)
    box.set_border_color(zone, color.white)
    box.set_border_width(zone, 3)
    box.set_border_style(zone, line.style_dashed)
    box.set_extend(zone, extend.right)
    box.set_text(zone, "last")
    box.set_text_color(zone, color.black)
    box.set_text_size(zone, size.large)
    box.set_text_formatting(zone, text.format_bold + text.format_italic)
    clone = box.copy(zone)
    box.set_text(clone, "copy")
    box.delete(clone)
plot(box.get_left(zone), title="Box Left")
plot(box.get_top(zone), title="Box Top")
if barstate.islast
    label.new(na, na, text=str.format("{0}|{1}|{2}", box.get_text(zone), box.get_bgcolor(zone), box.get_border_color(zone)))`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles box time coordinates with reference parity', () => {
    const pine = `//@version=6
indicator("box xloc", overlay=true)
var zone = box.new(na, na, na, na)
if barstate.islast
    box.set_xloc(id=zone, left=time[1], right=time, xloc=xloc.bar_time)
    box.set_top(zone, high)
    box.set_bottom(zone, low)
plot(box.get_left(zone), title="Box Time Left")
plot(box.get_right(zone), title="Box Time Right")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles box chart-point setters with reference parity', () => {
    const pine = `//@version=6
indicator("box point setters", overlay=true)
var zone = box.new(na, na, na, na)
if barstate.islast
    topLeft = chart.point.from_index(bar_index - 1, high)
    bottomRight = chart.point.now(low)
    box.set_top_left_point(id=zone, point=topLeft)
    box.set_bottom_right_point(zone, point=bottomRight)
plot(box.get_left(zone), title="Box Point Left")
plot(box.get_top(zone), title="Box Point Top")
plot(box.get_right(zone), title="Box Point Right")
plot(box.get_bottom(zone), title="Box Point Bottom")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles box text layout getters with reference parity', () => {
    const pine = `//@version=6
indicator("box text layout", overlay=false)
label.new(bar_index, close, text="forced", force_overlay=true)
zone = box.new(0, high, 1, low, text="seed", text_halign=text.align_center, text_valign=text.align_middle, text_wrap=text.wrap_auto, text_font_family=font.family_monospace, force_overlay=true, text_formatting=text.format_bold)
box.set_text_halign(zone, text.align_right)
box.set_text_valign(zone, text.align_bottom)
box.set_text_wrap(zone, text.wrap_none)
box.set_text_font_family(zone, font.family_default)
box.set_text_formatting(zone, text.format_italic)
label.new(na, na, text=str.format("{0}|{1}", box.get_text_halign(zone), box.get_text_valign(zone)))
plot(close)`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 1));

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles polyline copy, delete, and all access with reference parity', () => {
    const pine = `//@version=6
indicator("polyline handles", overlay=true, max_polylines_count=1)
points = array.from(chart.point.from_index(0, low), chart.point.from_index(1, high), chart.point.from_index(2, close))
poly = polyline.new(points, curved=false, closed=true, line_color=color.red, fill_color=color.new(color.blue, 80), line_style=line.style_dotted, line_width=2, force_overlay=true)
clone = polyline.copy(poly)
polyline.delete(poly)
plot(array.size(polyline.all), title="Polylines")`;
    const { compiledResult, interpResult } = assertPlotParity(pine, bars.slice(0, 1));

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.drawings).toEqual(interpResult.drawings);
  });

  it('compiles color channel builtins with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled color channels")
positional = color.rgb(12, 34, 56, 40)
named = color.rgb(red=78, green=90, blue=123, transp=25)
transparent = color.new(color.blue, 80)
transparentNamed = color.new(color=color.red, transparency=50)
plot(color.r(positional), "R")
plot(color.g(positional), "G")
plot(color.b(positional), "B")
plot(color.t(positional), "T")
plot(color.r(named), "Named R")
plot(color.t(named), "Named T")
plot(color.t(transparent), "New T")
plot(color.t(transparentNamed), "New Named T")`, bars);
  });

  it('compiles legacy color global alias with reference parity', () => {
    assertPlotParity(`//@version=4
study("compiled legacy color global")
cSolid = color(255, 0, 0, 0)
cHalf = color(0, 255, 0, 50)
cTrans = color(0, 0, 255, 100)
plot(color.r(cSolid), "Solid R")
plot(color.t(cSolid), "Solid T")
plot(color.g(cHalf), "Half G")
plot(color.t(cHalf), "Half T")
plot(color.b(cTrans), "Trans B")
plot(color.t(cTrans), "Trans T")`, bars);
  });

  it('compiles color.from_gradient with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled color gradient")
positional = color.from_gradient(close, 10, 20, color.rgb(255, 0, 0), color.rgb(0, 255, 0, 50))
mixed = color.from_gradient(value=close, 10, 20, color.red, color.green)
plot(color.r(positional), "R")
plot(color.g(positional), "G")
plot(color.b(positional), "B")
plot(color.t(positional), "T")
plot(color.r(mixed), "Mixed R")
plot(color.g(mixed), "Mixed G")`, bars);
  });

  it('compiles named math builtins with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled named math")
plot(math.max(number0=1, close, 8), "Max")
plot(math.min(number0=1, close, 8), "Min")
plot(math.avg(number0=1, close, 8), "Avg")
plot(math.round(number=math.pi, precision=3), "Round")
plot(math.pow(base=2, exponent=3), "Pow")
plot(math.sqrt(number=36), "Sqrt")
plot(math.clamp(val=close, min=11, max=14), "Clamp")
plot(math.round_to_mintick(number=1.005), "Mintick")
plot(math.sum(source=close, length=3), "Named Sum")
plot(math.sum(open, 2), "Positional Sum")`, bars);
  });

  it('compiles legacy math global aliases with reference parity', () => {
    assertPlotParity(`//@version=4
study("compiled legacy math globals")
plot(abs(close - open), "Abs")
plot(max(1, close, 8), "Max")
plot(min(1, close, 8), "Min")
plot(avg(1, close, 8), "Avg")
plot(round(3.14159, 3), "Round")
plot(pow(2, 3), "Pow")
plot(sqrt(36), "Sqrt")
plot(sum(close, 3), "Sum")`, bars);
  });

  it('compiles legacy string global aliases with reference parity', () => {
    assertPlotParity(`//@version=4
study("compiled legacy string globals")
formatted = tostring(close, "#.0")
parsed = tonumber("42.5")
invalid = tonumber("not a number")
plot(formatted == str.tostring(close, "#.0") ? 1 : 0, "Formatted")
plot(parsed, "Parsed")
plot(na(invalid) ? 1 : 0, "Invalid")`, bars.slice(0, 3));
  });

  it('compiles math.random with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled random")
plot(math.random(), "Default")
plot(math.random(10, 20), "Bounded")
plot(math.random(min=5, max=6, seed=3), "Named Seeded")
plot(math.random(1, 1), "Invalid")`, bars.slice(0, 6));
  });

  it('keeps compiled unseeded math.random stable across conditional call order', () => {
    const conditionalLead = `//@version=6
indicator("compiled conditional random")
if bar_index == 0
    lead = math.random()
main = math.random()
plot(main, "Main")`;
    const skippedLead = `//@version=6
indicator("compiled conditional random")
if false
    lead = math.random()
main = math.random()
plot(main, "Main")`;

    const conditional = assertPlotParity(conditionalLead, bars.slice(0, 6));
    const skipped = assertPlotParity(skippedLead, bars.slice(0, 6));

    expect(conditional.compiledResult.plots[0]?.values).toEqual(skipped.compiledResult.plots[0]?.values);
  });

  it('compiles str.format with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled string format")
plot(str.format("{0,number,#.#}", 1.34) == "1.3" ? 1 : 0, "Decimal Mask")
plot(str.format("{0, number, integer}", 1.34) == "1" ? 1 : 0, "Integer Style")
plot(str.format("{0,number,currency}", 1340000) == "$1,340,000.00" ? 1 : 0, "Currency Style")
plot(str.format("{0,number,currency}", -12.5) == "-$12.50" ? 1 : 0, "Negative Currency")
plot(str.format("{0, number, percent} - {1, number, percent}", 0.1, 0.2) == "10% - 20%" ? 1 : 0, "Percent Style")
plot(str.format("{0} != {0, number, #.#}", 1.34) == "1.34 != 1.3" ? 1 : 0, "Repeated")
plot(str.format("{0,number,#.#}", na) == "NaN" ? 1 : 0, "NA Number")
plot(str.format(format="value={0:#.0}", 100.2) == "value=100.2" ? 1 : 0, "Named Format")`, bars);
  });

  it('compiles str.format_time with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled time format")
stamp = timestamp("GMT+2", 2024, 1, 5, 9, 30, 15)
pmStamp = timestamp("UTC", 2024, 1, 5, 15, 5, 0)
midnight = timestamp("UTC", 2024, 1, 5, 0, 0, 0)
millis = timestamp("UTC", 2024, 1, 5, 7, 30, 15) + 123
august = timestamp("UTC", 2024, 8, 20, 0, 0, 0)
plot(str.format_time(stamp, "yyyy-MM-dd HH:mm:ss", "GMT+2") == "2024-01-05 09:30:15" ? 1 : 0, "Offset")
plot(str.format_time(stamp, "yy/MM/dd HH:mm", "UTC") == "24/01/05 07:30" ? 1 : 0, "UTC")
plot(str.format_time(time=stamp, timezone="GMT+2") == "2024-01-05T09:30:15+0200" ? 1 : 0, "Named Default")
plot(str.format_time(timestamp(timezone="UTC", year=2024, month=1, day=5), "yyyy-MM-dd", "UTC") == "2024-01-05" ? 1 : 0, "Named Timestamp")
plot(str.format_time(stamp, "h:mm a", "UTC") == "7:30 AM" ? 1 : 0, "AM Tokens")
plot(str.format_time(pmStamp, "hh:mm a", "UTC") == "03:05 PM" ? 1 : 0, "PM Tokens")
plot(str.format_time(midnight, "h a", "UTC") == "12 AM" ? 1 : 0, "Midnight")
plot(str.format_time(millis, "S SS SSS", "UTC") == "1 12 123" ? 1 : 0, "Fraction")
plot(str.format_time(august, "MMM MMMM E EEEE", "UTC") == "Aug August Tue Tuesday" ? 1 : 0, "Names")
plot(str.format_time(stamp, "D DD DDD w ww", "UTC") == "5 05 005 1 01" ? 1 : 0, "Calendar")
plot(str.format_time(august, "MMM-d-y W", "UTC") == "Aug-20-2024 4" ? 1 : 0, "Single Tokens")
plot(str.format_time(stamp, "z zzzz", "UTC") == "UTC Coordinated Universal Time" ? 1 : 0, "Timezone")
plot(str.format_time(stamp, "yyyy'T''Z'HH", "UTC") == "2024T'Z07" ? 1 : 0, "Escaped Quote")
plot(str.format_time(na, "yyyy-MM-dd", "UTC") == "NaN" ? 1 : 0, "Missing")`, bars);
  });

  it('compiles timeframe utility conversions with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled timeframe utilities")
plot(timeframe.in_seconds(), "Current Seconds")
plot(timeframe.in_seconds(timeframe="45S"), "Seconds")
plot(timeframe.in_seconds("2W"), "Weeks")
plot(timeframe.in_seconds("3M"), "Months")
plot(timeframe.in_seconds("1T"), "Ticks")
plot(timeframe.to_seconds("1D"), "Daily Alias")
plot(timeframe.to_seconds(timeframe="45S"), "Named Alias")
plot(timeframe.from_seconds(seconds=44) == "45S" ? 1 : 0, "From Seconds")
plot(timeframe.from_seconds(3601) == "61" ? 1 : 0, "From Minutes")
plot(timeframe.in_seconds("15") < timeframe.in_seconds("1D") ? 1 : 0, "Comparison")`, bars.slice(0, 4));
  });

  it('compiles positional input.timeframe declaration defaults with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled input timeframe", timeframe=input.timeframe("2", "Indicator Timeframe"))
plot(timeframe.multiplier, "Multiplier")
plot(timeframe.in_seconds(), "Seconds")`, bars.slice(0, 3));
  });

  it('compiles named input.timeframe declaration defaults with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled named input timeframe", timeframe=input.timeframe(defval="30S", title="Indicator Timeframe"))
plot(timeframe.isseconds ? 1 : 0, "Seconds Timeframe")
plot(timeframe.multiplier, "Multiplier")`, bars.slice(0, 3));
  });

  it('compiles input.timeframe declaration overrides with reference parity', () => {
    const pine = `//@version=6
indicator("compiled input timeframe override", timeframe=input.timeframe("2", "Indicator Timeframe", options=["2", "1D"]))
plot(timeframe.isdaily ? 1 : 0, "Daily")
plot(timeframe.multiplier, "Multiplier")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    const inputOverrides = new Map<string, unknown>([['input_Indicator Timeframe', '1D']]);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 3), inputOverrides);
    const interpResult = executeScript(ast, bars.slice(0, 3), inputOverrides);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.indicatorTimeframe).toBe(interpResult.indicatorTimeframe);
    expect(compiledResult?.inputs).toEqual(interpResult.inputs);
    expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('compiles extended timeframe fields with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled daily timeframe fields", timeframe="1D")
plot(str.length(timeframe.main_period), "Main Period Length")
plot(timeframe.isdwm ? 1 : 0, "DWM")
plot(timeframe.isticks ? 1 : 0, "Ticks")
plot(timeframe.isintraday ? 1 : 0, "Intraday")`, bars.slice(0, 3));

    assertPlotParity(`//@version=6
indicator("compiled tick timeframe fields", timeframe="10T")
plot(str.length(timeframe.main_period), "Main Period Length")
plot(timeframe.isdwm ? 1 : 0, "DWM")
plot(timeframe.isticks ? 1 : 0, "Ticks")
plot(timeframe.isintraday ? 1 : 0, "Intraday")`, bars.slice(0, 3));
  });

  it('compiles chart context fields with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled chart fields")
plot(color.r(chart.bg_color), "Bg R")
plot(color.g(chart.bg_color), "Bg G")
plot(color.b(chart.fg_color), "Fg B")
plot(chart.left_visible_bar_time, "Left Visible")
plot(chart.right_visible_bar_time, "Right Visible")
plot(chart.right_visible_bar_time - chart.left_visible_bar_time, "Visible Span")
plot(chart.is_standard ? 1 : 0, "Standard")
plot(chart.is_renko ? 1 : 0, "Renko")
plot(chart.is_heikinashi ? 1 : 0, "Heikin Ashi")
plot(chart.is_linebreak ? 1 : 0, "Line Break")
plot(chart.is_kagi ? 1 : 0, "Kagi")
plot(chart.is_pnf ? 1 : 0, "Point Figure")
plot(chart.is_range ? 1 : 0, "Range")`, bars, {
      runtime: {
        chart: {
          bgColor: '#102030',
          fgColor: '#ABCDEF',
          type: 'renko',
          leftVisibleBarTime: bars[2]!.time,
          rightVisibleBarTime: bars[8]!.time,
        },
      },
    });

    assertPlotParity(`//@version=6
indicator("compiled chart default fields")
plot(chart.left_visible_bar_time, "Default Left")
plot(chart.right_visible_bar_time, "Default Right")
plot(chart.is_standard ? 1 : 0, "Default Standard")`, bars.slice(0, 4));
  });

  it('compiles extended syminfo fields with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled extended syminfo")
plot(str.length(syminfo.exchange), "Exchange Length")
plot(str.length(syminfo.country), "Country Length")
plot(str.length(syminfo.sector), "Sector Length")
plot(str.length(syminfo.industry), "Industry Length")
plot(str.length(syminfo.isin), "ISIN Length")
plot(str.length(syminfo.current_contract), "Contract Length")
plot(syminfo.mincontract, "Min Contract")
plot(syminfo.minmove, "Min Move")
plot(syminfo.employees, "Employees")
plot(syminfo.shareholders, "Shareholders")
plot(syminfo.shares_outstanding_float, "Float Shares")
plot(syminfo.shares_outstanding_total, "Total Shares")
plot(syminfo.expiration_date, "Expiration Date")
plot(syminfo.recommendations_date, "Recommendations Date")
plot(syminfo.target_price_date, "Target Date")
plot(syminfo.target_price_average, "Target Average")
plot(syminfo.target_price_estimates, "Target Estimates")
plot(syminfo.target_price_high, "Target High")
plot(syminfo.target_price_low, "Target Low")
plot(syminfo.target_price_median, "Target Median")`, bars.slice(0, 4), {
      runtime: {
        syminfo: {
          ticker: 'NASDAQ:AAPL',
          mintick: 0.25,
          pricescale: 4,
          country: 'US',
          sector: 'Tech',
          industry: 'Software',
          isin: 'US0378331005',
          current_contract: 'AAPL1!',
          mincontract: 0.1,
          employees: 164000,
          shareholders: 1000,
          shares_outstanding_float: 1.5,
          shares_outstanding_total: 2.5,
          expiration_date: 1780272000000,
          recommendations_date: 1777852800000,
          target_price_date: 1777852800000,
          target_price_average: 210.5,
          target_price_estimates: 42,
          target_price_high: 250,
          target_price_low: 180,
          target_price_median: 205,
        },
      },
    });
  });

  it('compiles collection method calls with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled collection methods")
var window = array.new<float>()
window.push(close)
if window.size() > 4
    window.shift()
copy = window.copy()
copy.sort()
first = window.size() > 0 ? window.get(0) : na
last = window.size() > 0 ? window.get(window.size() - 1) : na
sliced = window.size() >= 2 ? window.slice(1, window.size()) : array.new<float>()
var stats = map.new<string, float>()
stats.put("count", nz(stats.get("count")) + 1)
stats.put("sum", nz(stats.get("sum")) + close)
keys = stats.keys()
m = matrix.new<float>(2, 2, 0.0)
m.set(0, 0, close)
m.set(0, 1, high)
row = m.row(0)
plot(window.size(), "Window Size")
plot(first, "First")
plot(last, "Last")
plot(sliced.size(), "Slice Size")
plot(stats.get("count"), "Count")
plot(keys.size(), "Key Count")
plot(m.get(0, 1), "Matrix High")
plot(row.get(0), "Row Close")`, bars.slice(0, 6));
  });

  it('compiles named global array calls with isolated call-site state', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled named array calls")
var left = array.new_float(size=0)
var right = array.new_float(size=0)
track(array<float> id, float value) =>
    array.push(id=id, value=value)
    if array.size(id=id) > 3
        array.shift(id=id)
    array.get(id=id, index=array.size(id=id) - 1)
leftLast = track(left, close)
rightLast = track(right, open)
copy = array.copy(id=left)
array.sort(id=copy, order=order.ascending)
head = array.size(id=copy) > 0 ? array.get(id=copy, index=0) : na
plot(leftLast, "Left Last")
plot(rightLast, "Right Last")
plot(array.size(id=left), "Left Size")
plot(array.size(id=right), "Right Size")
plot(head, "Sorted Head")`, bars.slice(0, 6));

    expect(findPlot(compiledResult, 'Left Size').values.at(-1)).toBe(3);
    expect(findPlot(compiledResult, 'Right Size').values.at(-1)).toBe(3);
  });

  it('compiles named array.clear calls without dropping the receiver', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled named array clear")
var fast = array.new_float(size=0)
var slow = array.new_float(size=0)
array.push(id=fast, value=close)
array.push(id=slow, value=open)
if bar_index == 2
    array.clear(id=fast)
if bar_index == 4
    array.clear(id=slow)
plot(array.size(id=fast), "Fast Size")
plot(array.size(id=slow), "Slow Size")`, bars.slice(0, 6));

    expect(findPlot(compiledResult, 'Fast Size').values).toEqual([1, 2, 0, 1, 2, 3]);
    expect(findPlot(compiledResult, 'Slow Size').values).toEqual([1, 2, 3, 4, 0, 1]);
  });

  it('records swallowed compiled per-bar errors in the runtime profile', () => {
    const ast = parse(`//@version=6
indicator("compiled swallowed bar errors")
array.clear()
plot(close, "Close")`);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 4));

    expect(compiledResult?.errors).toEqual([]);
    expect(compiledResult?.plots).toEqual([]);
    expect(compiledResult?.profile.compiledBarErrors).toEqual({
      count: 4,
      firstBarIndex: 0,
      firstMessage: expect.stringContaining('Cannot read'),
    });
    expect(compiledResult?.profile.swallowedErrors).toEqual([
      {
        site: 'compiled-bar',
        count: 4,
        firstBarIndex: 0,
        firstMessage: expect.stringContaining('Cannot read'),
      },
    ]);
  });

  it('records swallowed compiled request expression errors in the runtime profile', () => {
    const ast = parse(`//@version=6
indicator("compiled swallowed request errors")
broken = request.security("TEST", "D", array.get(array.new_float(0), 0))
plot(broken, "Broken Request")`);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const requestDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'TEST', timeframe: 'D', bars: bars.slice(0, 4) },
    ]);
    const compiledResult = executeCompiled(compiled, bars.slice(0, 4), undefined, { requestDatafeed });

    expect(compiledResult?.errors).toEqual([]);
    expect(findPlot(compiledResult!, 'Broken Request').values).toEqual([null, null, null, null]);
    expect(compiledResult?.profile.swallowedErrors).toEqual([
      {
        site: 'compiled-request-expression:request.security:0',
        count: 4,
        firstBarIndex: 0,
        firstMessage: 'Array index 0 is out of bounds. Array size is 0',
      },
    ]);
  });

  it('compiles map for-in accumulation with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled map for-in")
priceLevel = math.round(close)
var map<float, float> volMap = map.new<float, float>()
map.put(volMap, priceLevel, nz(map.get(volMap, priceLevel)) + volume)
topLevel = 0.0
topVol = 0.0
for [lvl, vol] in volMap
    if vol > topVol
        topVol := vol
        topLevel := lvl
plot(topLevel, "TopLevel")`, bars);
  });

  it('compiles user-defined method calls with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled user methods")
type PriceBar
    float price = na
    float norm = 0.0

method normalize(PriceBar this, float lo, float hi) =>
    rng = hi - lo
    this.norm := rng == 0 ? 50.0 : (this.price - lo) / rng * 100
    this

method double(float this) => this * 2
pb = PriceBar.new(close)
pb.normalize(low, high)
plot(pb.price, "Price")
plot(pb.norm, "Norm")
plot(close.double(), "Double")`, bars.slice(0, 6));
  });

  it('compiles named and default user function arguments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF arguments")
adjust(source=close, offset=1) => source + offset
scale(value, factor=2) => value * factor
plot(adjust(), "Default Adjust")
plot(adjust(open, offset=2), "Mixed Adjust")
plot(scale(close), "Default Scale")
plot(scale(factor=3, value=close), "Named Scale")`, bars.slice(0, 8));
  });

  it('compiles multi-statement user function returns with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF returns")
doubleWithLocal(value) =>
    basis = value * 2
    basis
classify(value) =>
    if value > 0
        1
    else if value < 0
        -1
    else
        0
plot(doubleWithLocal(close), "Doubled")
plot(classify(close - open), "Direction")`, bars.slice(0, 8));
  });

  it('resolves bare user functions before compiled compatibility aliases', () => {
    assertPlotParity(`//@version=3
study("compiled UDF alias shadowing")
dema(source, length) =>
    ema1 = ema(source, length)
    ema2 = ema(ema1, length)
    local = 2 * ema1 - ema2
    local + 7
median(source) =>
    source + 5
plot(dema(close, 3), "User DEMA")
plot(dema(open, 3), "User DEMA Open")
plot(median(close), "User Median")
plot(median(open), "User Median Open")`, bars.slice(0, 8));
  });

  it('compiles legacy same-name UDF accumulator returns with isolated local history', () => {
    assertPlotParity(`//@version=3
study("compiled UDF same-name return")
frama(src, length) =>
    half = round(length / 2)
    hh = highest(high, half)
    ll = lowest(low, half)
    span = (hh[half] - ll[half]) / half
    alpha = nz(span) / 100
    frama = 0.0
    frama := alpha * src + (1 - alpha) * nz(frama[1])

plot(frama(close, 4), "Close FRAMA")
plot(frama(open, 4), "Open FRAMA")`, bars.slice(0, 12));
  });

  it('compiles forward user function references with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled forward UDF reference")
value = doubleWithBias(close, 1.5)
doubleWithBias(source, bias) => source * 2 + bias
plot(value, "Value")`, bars.slice(0, 3));
  });

  it('compiles recursive user function calls with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled recursive UDF")
factorial(n) => n <= 1 ? 1 : n * factorial(n - 1)
plot(factorial(3), "Factorial")`, bars.slice(0, 3));
  });

  it('compiles switch-selected user function TA helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF switch MA")
ma(source, length, _type) =>
    switch _type
        'SMA' => ta.sma(source, length)
        'EMA' => ta.ema(source, length)
plot(ma(close, 5, 'SMA'), "SMA")
plot(ma(close, 5, 'EMA'), "EMA")`, bars);
  });

  it('keeps user function TA helpers isolated by dynamic length', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF TA dynamic lengths")
avg(source, length) => ta.sma(source, length)
plot(avg(close, 3), "SMA 3")
plot(avg(close, 5), "SMA 5")`, bars);
  });

  it('keeps user function TA helpers isolated by call site', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF TA call sites")
avg(source, length) => ta.sma(source, length)
plot(avg(close, 3), "Close SMA")
plot(avg(open, 3), "Open SMA")`, bars);
  });

  it('compiles user function loop expression returns with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF loop returns")
lastNumeric(limit) =>
    for i = 0 to limit
        i * 2
lastWhile(limit) =>
    i = 0
    while i < limit
        i += 1
        i
plot(lastNumeric(3), "Numeric")
plot(lastWhile(3), "While")`, bars.slice(0, 4));
  });

  it('compiles top-level loop expression initializers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled top-level loop initializers")
numericValue = for i = 0 to 2
    close + i
values = array.from(close, open)
collectionValue = for [index, item] in values
    item + index
i = 0
whileValue = while i < 2
    i += 1
    close + i
plot(numericValue, "Numeric")
plot(collectionValue, "Collection")
plot(whileValue, "While")`, bars.slice(0, 6));
  });

  it('compiles loop expression reassignments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled loop expression reassignments")
var float numericValue = 0.0
var float whileValue = 0.0
numericValue := for i = 0 to 2
    close + i
i = 0
whileValue := while i < 2
    i += 1
    close + i
plot(numericValue, "Numeric")
plot(whileValue, "While")`, bars.slice(0, 6));
  });

  it('compiles root if expression reassignments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled root if expression reassignments")
selected = close
selected := if close > open
    high - low
else if close < open
    low - high
else
    close - open
plot(selected, "Selected")`, bars.slice(0, 6));
  });

  it('compiles history-read if expression reassignments through writable targets', () => {
    assertPlotParity(`//@version=6
indicator("compiled history-read if expression reassignments")
var trail = 0.0
trail := if close > open
    math.max(close, nz(trail[1]))
else
    0.0
plot(trail, "Trail")`, bars.slice(0, 6));
  });

  it('keeps local ticker variables ahead of legacy ticker aliases', () => {
    const pine = `//@version=5
strategy("compiled local ticker shadow")
ticker = input.string(defval="ES JUN24", title="Symbol Ticker")
if bar_index == 0
    strategy.entry("Short", strategy.short, alert_message=str.tostring(ticker))
plot(strategy.position_size, "Position")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    if (!compiled.success) throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
    const compiledResult = executeCompiled(compiled, bars.slice(0, 3));
    const interpResult = executeScript(ast, bars.slice(0, 3));

    expect(compiledResult?.strategy.orders[0]?.alertMessage).toBe('ES JUN24');
    expect(interpResult.strategy.orders[0]?.alertMessage).toBe('ES JUN24');
  });

  it('compiles tuple if expression reassignments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled tuple if expression reassignments")
hi = close
lo = open
[hi, lo] := if close > open
    [high, low]
else if close < open
    [close, open]
else
    [open, close]
plot(hi, "Hi")
plot(lo, "Lo")`, bars.slice(0, 6));
  });

  it('compiles tuple switch and loop reassignments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled tuple switch and loop reassignments")
switchValue = close
switchTitle = "base"
[switchValue, switchTitle] := switch
    close > open => [high, "up"]
    close < open => [low, "down"]
    => [close, "flat"]
loopValue = close
loopTitle = "base"
[loopValue, loopTitle] := for i = 0 to 2
    [close + i, "loop"]
i = 0
whileValue = close
whileTitle = "base"
[whileValue, whileTitle] := while i < 2
    i += 1
    [open + i, "while"]
plot(switchValue, "Switch Value")
plot(switchTitle == "base" ? -1 : 1, "Switch Title")
plot(loopValue, "Loop Value")
plot(loopTitle == "loop" ? 1 : -1, "Loop Title")
plot(whileValue, "While Value")
plot(whileTitle == "while" ? 1 : -1, "While Title")`, bars.slice(0, 6));
  });

  it('compiles control-flow tuple initializers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled control-flow tuple initializers")
[ifValue, ifLabel] = if close > open
    [close, "up"]
else
    [open, "down"]
[switchValue, switchLabel] = switch
    close > open => [high, "rise"]
    close < open => [low, "fall"]
    => [close, "flat"]
[blockSwitchValue, blockSwitchLabel] = switch
    close > open =>
        basis = high - low
        [basis, "block"]
    => [close, "fallback"]
[loopValue, loopLabel] = for i = 0 to 2
    [close + i, "loop"]
plot(ifValue, "If Value")
plot(ifLabel == "up" ? 1 : -1, "If Label")
plot(switchValue, "Switch Value")
plot(switchLabel == "rise" ? 1 : -1, "Switch Label")
plot(blockSwitchValue, "Block Switch Value")
plot(blockSwitchLabel == "block" ? 1 : -1, "Block Switch Label")
plot(loopValue, "Loop Value")
plot(loopLabel == "loop" ? 1 : -1, "Loop Label")`, bars.slice(0, 6));
  });

  it('compiles user function tuple control-flow returns with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF tuple control-flow returns")
branchPair(float value, bool enabled) =>
    if enabled
        [value, "up"]
    else
        [value + 1, "down"]
layeredPair(float value, int mode) =>
    if mode == 1
        [value, "one"]
    else if mode == 2
        [value + 1, "two"]
    else
        [value + 2, "other"]
wideningPair(float value, bool enabled) =>
    if enabled
        [1, "one"]
    else
        [value, "float"]
switchPair(float value, string mode) => switch mode
    "price" => [value, "price"]
    "wide" => [1, "wide"]
    => [value + 1, "default"]
loopPair(float value, int limit) =>
    for i = 0 to limit
        [value + i, "loop"]
[branchValue, branchLabel] = branchPair(close, close > open)
[layeredValue, layeredLabel] = layeredPair(close, 2)
[widenedValue, widenedLabel] = wideningPair(close, close > open)
[switchValue, switchLabel] = switchPair(close, "wide")
[loopValue, loopLabel] = loopPair(close, 2)
plot(branchValue, "Branch Value")
plot(branchLabel == "up" ? 1 : -1, "Branch Label")
plot(layeredValue, "Layered Value")
plot(layeredLabel == "two" ? 1 : -1, "Layered Label")
plot(widenedValue, "Widened Value")
plot(widenedLabel == "one" ? 1 : -1, "Widened Label")
plot(switchValue, "Switch Value")
plot(switchLabel == "wide" ? 1 : -1, "Switch Label")
plot(loopValue, "Loop Value")
plot(loopLabel == "loop" ? 1 : -1, "Loop Label")`, bars.slice(0, 6));
  });

  it('compiles switch branch statement blocks with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled switch branch statement blocks")
selected = switch
    close > open =>
        basis = high - low
        basis := basis + close
        basis
    =>
        fallback = close, damped = open
        fallback - damped
plot(selected, "Selected")`, bars.slice(0, 6));
  });

  it('compiles function-local var state per call site with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF local var state")
nextCount() =>
    var counter = 0
    counter += 1
    counter
first = nextCount()
secondCount = nextCount()
plot(first, "First")
plot(secondCount, "Second")`, bars.slice(0, 6));
  });

  it('keeps imported library persistent state isolated per compiled call site', () => {
    const library = parse(`//@version=6
library("StatefulTools", true)
export type Bucket
    float value = 0
export nextVar(float step) =>
    var counter = 0.0
    counter += step
    counter
export nextVarip(float step) =>
    varip counter = 0.0
    counter += step
    counter
export bucketValue(float step) =>
    var Bucket bucket = Bucket.new()
    bucket.value += step
    bucket.value
`);

    const options = {
      libraries: new Map([['TestUser/StatefulTools/1', library]]),
    };

    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled imported persistent state")
import TestUser/StatefulTools/1 as state
varOne = state.nextVar(1)
varTen = state.nextVar(10)
varipTwo = state.nextVarip(2)
varipTwenty = state.nextVarip(20)
bucketThree = state.bucketValue(3)
bucketThirty = state.bucketValue(30)
plot(varOne, "Var One")
plot(varTen, "Var Ten")
plot(varipTwo, "Varip Two")
plot(varipTwenty, "Varip Twenty")
plot(bucketThree, "Bucket Three")
plot(bucketThirty, "Bucket Thirty")`, bars.slice(0, 6), options);

    expect(findPlot(compiledResult, 'Var One').values).toEqual([1, 2, 3, 4, 5, 6]);
    expect(findPlot(compiledResult, 'Var Ten').values).toEqual([10, 20, 30, 40, 50, 60]);
    expect(findPlot(compiledResult, 'Varip Two').values).toEqual([2, 4, 6, 8, 10, 12]);
    expect(findPlot(compiledResult, 'Varip Twenty').values).toEqual([20, 40, 60, 80, 100, 120]);
    expect(findPlot(compiledResult, 'Bucket Three').values).toEqual([3, 6, 9, 12, 15, 18]);
    expect(findPlot(compiledResult, 'Bucket Thirty').values).toEqual([30, 60, 90, 120, 150, 180]);

    const second = assertPlotParity(`//@version=6
indicator("compiled imported persistent state second script")
import TestUser/StatefulTools/1 as state
again = state.nextVar(5)
plot(again, "Again")`, bars.slice(0, 4), options);

    expect(findPlot(second.compiledResult, 'Again').values).toEqual([5, 10, 15, 20]);
  });

  it('compiles local variables that shadow global names with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled local shadows")
second = close * 2
month = close + 3
plot(second, "Second Local")
plot(month, "Month Local")`, bars.slice(0, 4));
  });

  it('compiles UDF parameter history with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF parameter history")
trend(series float value) =>
    value > nz(value[1], value) ? 1 : value < nz(value[1], value) ? -1 : 0
plot(trend(close), "Trend")`, bars.slice(0, 6));
  });

  it('compiles UDF tuple locals with local history at multiple call sites', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled UDF tuple local history")
pair(series float source) =>
    [lead, lag] = [source + 1, source - 1]
    lead + nz(lag[1], lag)
plot(pair(close), "Close Pair")
plot(pair(open), "Open Pair")`, bars.slice(0, 6));

    expect(compiledResult.profile.compiledBarErrors).toBeUndefined();
  });

  it('compiles reassigned UDF tuple locals with local history at multiple call sites', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled UDF tuple local reassignment history")
seed(series float source) =>
    [hi, lo] = [source + 1, source - 1]
    [hi, lo] := [math.max(hi, nz(hi[1], hi)), math.min(lo, nz(lo[1], lo))]
    hi - lo
plot(seed(high), "High Seed")
plot(seed(low), "Low Seed")`, bars.slice(0, 6));

    expect(compiledResult.profile.compiledBarErrors).toBeUndefined();
  });

  it('compiles UDT field history with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDT field history")
type State
    float score = na
state = State.new(score=close - open)
plot(state.score, "Score")
plot(state.score[1], "Previous")`, bars.slice(0, 6));
  });

  it('compiles indexed TA call results with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled indexed TA result")
raw(series float source, simple int length) =>
    ta.sma(source, length) - nz(ta.sma(source, length)[1], ta.sma(source, length))
plot(raw(close, 3), "Raw")`, bars.slice(0, 8));
  });

  it('compiles UDF local variable history with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF local history")
swing(series float source, simple int length) =>
    basis = ta.sma(source, length)
    basis - nz(basis[1], basis)
plot(swing(close, 3), "Swing")`, bars.slice(0, 8));
  });

  it('keeps stateful TA calls inside UDFs isolated per call site', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled UDF TA call-site history")
smooth(series float source, simple int length) =>
    ta.sma(source, length)
closeFast = smooth(close, 3)
openFast = smooth(open, 3)
closeSlow = smooth(close, 5)
plot(closeFast, "Close Fast")
plot(openFast, "Open Fast")
plot(closeSlow, "Close Slow")`, bars.slice(0, 8));

    expect(findPlot(compiledResult, 'Close Fast').values).toEqual([
      null, null, 11, 11.5, 12.166666666666666, 12.166666666666666, 13, 13.666666666666666,
    ]);
    expect(findPlot(compiledResult, 'Open Fast').values).toEqual([
      null, null, 10.5, 11, 11.666666666666666, 11.666666666666666, 12.5, 13.166666666666666,
    ]);
    expect(findPlot(compiledResult, 'Close Slow').values).toEqual([
      null, null, null, null, 11.5, 11.9, 12.5, 13.1,
    ]);
    expect(compiledResult.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('keeps repeated nested UDF TA call sites isolated across dense graphs', () => {
    assertPlotParity(`//@version=6
indicator("compiled dense UDF TA graph")
momentum(series float source, simple int length) =>
    fast = ta.ema(source, length)
    slow = ta.sma(source, length + 1)
    fast - slow
signal(series float source, simple int length) =>
    raw = momentum(source, length)
    ta.ema(raw, length)
s0 = momentum(close, 2) - signal(close, 3)
s1 = momentum(close + 1, 2) - signal(open, 3)
s2 = momentum(close + 2, 2) - signal(high, 3)
s3 = momentum(close + 3, 2) - signal(low, 3)
s4 = momentum(close + 4, 2) - signal(close, 3)
s5 = momentum(close + 5, 2) - signal(open, 3)
s6 = momentum(close + 6, 2) - signal(high, 3)
s7 = momentum(close + 7, 2) - signal(low, 3)
plot(s0, "S0")
plot(s1, "S1")
plot(s2, "S2")
plot(s3, "S3")
plot(s4, "S4")
plot(s5, "S5")
plot(s6, "S6")
plot(s7, "S7")`, bars.slice(0, 10));
  });

  it('keeps nested volatility UDF TA call sites isolated across repeated calls', () => {
    assertPlotParity(`//@version=6
indicator("compiled dense volatility UDF graph")
bandMean(series float source, simple int length) =>
    ta.ema(source, length)
bandWidth(series float source, simple int length) =>
    atrValue = ta.atr(length)
    dev = math.abs(source - ta.sma(source, length))
    atrValue + dev
regimeScore(series float source, simple int length) =>
    mean = bandMean(source, length)
    width = bandWidth(source, length)
    width == 0 ? 0 : (source - mean) / width
s0 = regimeScore(close, 2)
s1 = regimeScore(close + 1, 2)
s2 = regimeScore(close + 2, 2)
s3 = regimeScore(close + 3, 2)
s4 = regimeScore(close + 4, 2)
s5 = regimeScore(close + 5, 2)
s6 = regimeScore(close + 6, 2)
s7 = regimeScore(close + 7, 2)
total = nz(s0) + nz(s1) + nz(s2) + nz(s3) + nz(s4) + nz(s5) + nz(s6) + nz(s7)
plot(total / 8, "Average")`, bars.slice(0, 10));
  });

  it('executes UDFs with input-qualified TA length parameters in compiled and reference paths', () => {
    assertPlotParity(`//@version=6
indicator("compiled UDF length qualifier")
length = input.int(3, "Length")
smooth(series float source, int window) => ta.sma(source, window)
wrapped(series float source, int window) => smooth(source, window)
plot(wrapped(close, length), "Wrapped")`, bars.slice(0, 8));
  });

  it('compiles timeframe.change with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 0, 5, 0, 0), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 0, 5, 0, 30), open: 11, high: 12, low: 10, close: 11, volume: 101 },
      { time: Date.UTC(2024, 0, 5, 1, 0), open: 12, high: 13, low: 11, close: 12, volume: 102 },
      { time: Date.UTC(2024, 0, 5, 1, 30), open: 13, high: 14, low: 12, close: 13, volume: 103 },
    ];

    assertPlotParity(`//@version=6
indicator("compiled timeframe change")
plot(timeframe.change(timeframe="60") ? 1 : 0, "Hourly")
plot(timeframe.change("1D") ? 1 : 0, "Daily")
plot(timeframe.change("bad") ? 1 : 0, "Invalid")`, timeBars);
  });

  it('compiles calendar timeframe.change boundaries with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 0, 31, 23, 0), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 1, 1, 0, 0), open: 11, high: 12, low: 10, close: 11, volume: 101 },
      { time: Date.UTC(2024, 1, 29, 12, 0), open: 12, high: 13, low: 11, close: 12, volume: 102 },
      { time: Date.UTC(2024, 2, 1, 0, 0), open: 13, high: 14, low: 12, close: 13, volume: 103 },
      { time: Date.UTC(2024, 2, 3, 23, 0), open: 14, high: 15, low: 13, close: 14, volume: 104 },
      { time: Date.UTC(2024, 2, 4, 0, 0), open: 15, high: 16, low: 14, close: 15, volume: 105 },
    ];

    const { compiledResult } = assertPlotParity(`//@version=6
indicator("calendar timeframe change")
plot(timeframe.change("1M") ? 1 : 0, "Monthly")
plot(timeframe.change("1W") ? 1 : 0, "Weekly")
plot(timeframe.period == "60" and timeframe.multiplier == 60 and timeframe.isintraday ? 1 : 0, "Chart Frame")`, timeBars, {
      runtime: {
        timeframe: {
          period: '60',
          multiplier: 60,
          isminutes: true,
          isdaily: false,
          isweekly: false,
          ismonthly: false,
          isintraday: true,
          isseconds: false,
          isticks: false,
        },
        syminfo: { timezone: 'UTC' },
      },
    });

    expect(findPlot(compiledResult, 'Monthly').values).toEqual([1, 1, 0, 1, 0, 0]);
    expect(findPlot(compiledResult, 'Weekly').values).toEqual([1, 0, 1, 0, 0, 1]);
  });

  it('compiles v6 timeframe parsing limits with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("timeframe parse limits")
plot(timeframe.in_seconds("45S"), "Max Seconds")
plot(timeframe.in_seconds("1440"), "Max Minutes")
plot(timeframe.in_seconds("365D"), "Max Days")
plot(timeframe.in_seconds("52W"), "Max Weeks")
plot(timeframe.in_seconds("12M"), "Max Months")
plot(na(timeframe.in_seconds("2S")) ? 1 : 0, "Bad Seconds")
plot(na(timeframe.in_seconds("1441")) ? 1 : 0, "Bad Minutes")
plot(na(timeframe.in_seconds("366D")) ? 1 : 0, "Bad Days")
plot(na(timeframe.in_seconds("53W")) ? 1 : 0, "Bad Weeks")
plot(na(timeframe.in_seconds("13M")) ? 1 : 0, "Bad Months")
plot(na(timeframe.in_seconds("2T")) ? 1 : 0, "Bad Ticks")
plot(na(timeframe.in_seconds("1H")) ? 1 : 0, "Bad Hours")`, bars.slice(0, 2));

    expect(findPlot(compiledResult, 'Max Seconds').values).toEqual([45, 45]);
    expect(findPlot(compiledResult, 'Max Minutes').values).toEqual([86400, 86400]);
    expect(findPlot(compiledResult, 'Max Days').values).toEqual([31536000, 31536000]);
    expect(findPlot(compiledResult, 'Max Weeks').values).toEqual([31449600, 31449600]);
    expect(findPlot(compiledResult, 'Max Months').values).toEqual([31104000, 31104000]);
    for (const title of ['Bad Seconds', 'Bad Minutes', 'Bad Days', 'Bad Weeks', 'Bad Months', 'Bad Ticks', 'Bad Hours']) {
      expect(findPlot(compiledResult, title).values).toEqual([1, 1]);
    }
  });

  it('compiles time session filters with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 0, 5, 14, 0), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 0, 5, 14, 30), open: 11, high: 12, low: 10, close: 11, volume: 101 },
      { time: Date.UTC(2024, 0, 5, 15, 0), open: 12, high: 13, low: 11, close: 12, volume: 102 },
    ];

    assertPlotParity(`//@version=6
indicator("compiled time filters")
plot(time("60", "1430-1600") == time ? 1 : 0, "In Session")
plot(na(time("60", "1600-1700")) ? 1 : 0, "Out Session")
plot(time_close("30", "1430-1600"), "Filtered Close")
plot(time(timeframe="60", session="1430-1600", timezone="UTC") == time ? 1 : 0, "Named Time")
plot(time_close(timeframe="30", session="1430-1600", timezone="UTC"), "Named Close")
plot(time("60", "1430-1600", 1), "Previous Session Open")
plot(time("60", "1430-1600", "UTC", 1), "Previous Session Open With Timezone")
plot(time_close(timeframe="30", session="1430-1600", bars_back=1), "Named Previous Close")
plot(time(timeframe="", bars_back=-1), "Next Open")
plot(time_close(timeframe="", bars_back=-1), "Next Projected Close")
dynamicBarsBack = close > 0 ? 0.5 : 0
plot(na(time("60", bars_back=dynamicBarsBack)) ? 1 : 0, "Invalid Fractional Bars Back")`, timeBars);
  });

  it('compiles session day masks and explicit timezones across DST with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 2, 8, 14, 30), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 2, 9, 14, 30), open: 11, high: 12, low: 10, close: 11, volume: 101 },
      { time: Date.UTC(2024, 2, 10, 13, 30), open: 12, high: 13, low: 11, close: 12, volume: 102 },
      { time: Date.UTC(2024, 2, 11, 13, 30), open: 13, high: 14, low: 12, close: 13, volume: 103 },
      { time: Date.UTC(2024, 2, 11, 20, 30), open: 14, high: 15, low: 13, close: 14, volume: 104 },
    ];

    const { compiledResult } = assertPlotParity(`//@version=6
indicator("session day masks dst")
inWeekday = not na(time(timeframe.period, "0930-1600:23456", "America/New_York"))
inSunday = not na(time(timeframe.period, "0930-1600:1", "America/New_York"))
closeStamp = time_close(timeframe.period, "0930-1600:23456", "America/New_York")
plot(inWeekday ? 1 : 0, "Weekday Session")
plot(inSunday ? 1 : 0, "Sunday Session")
plot(hour(time=closeStamp, timezone="America/New_York"), "Close Hour")
plot(minute(time=closeStamp, timezone="America/New_York"), "Close Minute")`, timeBars, {
      runtime: {
        timeframe: {
          period: '60',
          multiplier: 60,
          isminutes: true,
          isdaily: false,
          isweekly: false,
          ismonthly: false,
          isintraday: true,
          isseconds: false,
          isticks: false,
        },
        syminfo: { timezone: 'America/New_York' },
      },
    });

    expect(findPlot(compiledResult, 'Weekday Session').values).toEqual([1, 0, 0, 1, 0]);
    expect(findPlot(compiledResult, 'Sunday Session').values).toEqual([0, 0, 1, 0, 0]);
    expect(findPlot(compiledResult, 'Close Hour').values).toEqual([10, null, null, 10, null]);
    expect(findPlot(compiledResult, 'Close Minute').values).toEqual([30, null, null, 30, null]);
  });

  it('compiles time filters with runtime closed dates with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 6, 4, 13, 0), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 6, 5, 13, 0), open: 11, high: 12, low: 10, close: 11, volume: 101 },
    ];

    assertPlotParity(`//@version=6
indicator("compiled closed dates")
plot(na(time("60", "0930-1600", "America/New_York")) ? 0 : 1, "Explicit Session")
plot(na(time("60")) ? 0 : 1, "Unfiltered Time")`, timeBars, {
      runtime: {
        session: {
          regular: '0930-1600',
          premarket: '0400-0930',
          postmarket: '1600-2000',
          timezone: 'America/New_York',
          closedDates: ['2024-07-04'],
        },
      },
    });
  });

  it('compiles calendar variables and functions with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 0, 5, 14, 30, 15), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 0, 5, 15, 30, 45), open: 11, high: 12, low: 10, close: 11, volume: 101 },
    ];

    assertPlotParity(`//@version=6
indicator("compiled calendar")
stamp = timestamp("Asia/Singapore", 2024, 1, 6, 0, 5, 7)
plot(dayofweek == dayofweek.friday ? 1 : 0, "Friday")
plot(year(time=stamp, timezone="Asia/Singapore"), "Year")
plot(month(time=stamp, timezone="Asia/Singapore"), "Month")
plot(weekofyear(time=stamp, timezone="Asia/Singapore"), "Week")
plot(dayofmonth(time=stamp, timezone="Asia/Singapore"), "Day")
plot(dayofweek(time=stamp, timezone="Asia/Singapore"), "DOW")
plot(hour(time=stamp, timezone="Asia/Singapore"), "Hour")
plot(minute(time=stamp, timezone="Asia/Singapore"), "Minute")
plot(second(time=stamp, timezone="Asia/Singapore"), "Second")
plot(dayofweek[1], "Previous DOW")
plot(hour[1], "Previous Hour")
plot(year[1], "Previous Year")
plot(hour(time, "America/New_York"), "NY Hour")
plot(hour(time=timestamp("America/New_York", 2024, 1, 5, 9, 30), "America/New_York"), "Prefix NY Hour")`, timeBars);
  });

  it('compiles runtime time values with reference parity', () => {
    const timeBars = [
      { time: Date.UTC(2024, 0, 5, 14, 0), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 0, 5, 15, 0), open: 11, high: 12, low: 10, close: 11, volume: 101 },
    ];

    assertPlotParity(`//@version=6
indicator("compiled runtime time values")
plot(time_close, "Close Time")
plot(time_close[1], "Previous Close Time")
plot(last_bar_time, "Last Bar Time")
plot(last_bar_time[1], "Previous Last Bar Time")
plot(time_tradingday, "Trading Day")
plot(timenow, "Now")
plot(timenow[1], "Previous Now")`, timeBars, { runtime: { now: Date.UTC(2024, 0, 5, 16, 0) } });
  });

  it('compiles session constants and state helpers with reference parity', () => {
    const sessionBars = [
      { time: Date.UTC(2024, 0, 5, 4, 0), open: 10, high: 11, low: 9, close: 10, volume: 100 },
      { time: Date.UTC(2024, 0, 5, 9, 30), open: 11, high: 12, low: 10, close: 11, volume: 101 },
      { time: Date.UTC(2024, 0, 5, 15, 30), open: 12, high: 13, low: 11, close: 12, volume: 102 },
      { time: Date.UTC(2024, 0, 5, 16, 0), open: 13, high: 14, low: 12, close: 13, volume: 103 },
      { time: Date.UTC(2024, 0, 5, 20, 0), open: 14, high: 15, low: 13, close: 14, volume: 104 },
    ];

    assertPlotParity(`//@version=6
indicator("compiled session state")
plot(na(time("60", session.regular, "UTC")) ? 0 : 1, "Regular Constant")
plot(na(time("60", session.extended, "UTC")) ? 0 : 1, "Extended Constant")
plot(session.ispremarket ? 1 : 0, "Premarket")
plot(session.ismarket ? 1 : 0, "Market")
plot(session.ispostmarket ? 1 : 0, "Postmarket")
plot(session.isfirstbar ? 1 : 0, "First Any")
plot(session.isfirstbar_regular ? 1 : 0, "First Regular")
plot(session.islastbar ? 1 : 0, "Last Any")
plot(session.islastbar_regular ? 1 : 0, "Last Regular")`, sessionBars, {
      runtime: {
        session: {
          premarket: '0400-0930',
          regular: '0930-1600',
          postmarket: '1600-2000',
          timezone: 'UTC',
        },
      },
    });
  });

  it('reports compiled session state classification errors with reference parity', () => {
    const pine = `//@version=6
indicator("compiled session error")
plot(session.ismarket ? 1 : 0, "Market State")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars.slice(0, 1));
    const interpResult = executeScript(ast, bars.slice(0, 1));

    expect(compiledResult?.errors[0]?.message).toEqual(interpResult.errors[0]?.message);
  });

  it('compiles ticker helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled ticker helpers")
regularFromNew = ticker.new("NASDAQ", "AAPL")
extendedFromNew = ticker.new("NASDAQ", "AAPL", session.extended)
modifiedTicker = ticker.modify(extendedFromNew, adjustment=adjustment.dividends, backadjustment=backadjustment.on, settlement_as_close=settlement_as_close.off)
regularModified = ticker.modify(modifiedTicker, session=session.regular, adjustment=adjustment.none, backadjustment=backadjustment.inherit, settlement_as_close=settlement_as_close.inherit)
standardTicker = ticker.standard(modifiedTicker)
inheritedTicker = ticker.inherit(modifiedTicker, "NYSE:IBM|chart=heikinashi")
haTicker = ticker.heikinashi(modifiedTicker)
renkoTicker = ticker.renko(symbol=regularFromNew, style="ATR", param=14, request_wicks=true, source="OHLC")
lineBreakTicker = ticker.linebreak(regularFromNew, 3)
kagiTicker = ticker.kagi(tickerid=regularFromNew, style="ATR", reversal=2)
pnfTicker = ticker.pointfigure(symbol=regularFromNew, source="hl", style="ATR", param=14, reversal=3)
plot(regularFromNew == "NASDAQ:AAPL" ? 1 : 0, "New")
plot(str.contains(extendedFromNew, "session=extended") ? 1 : 0, "Extended")
plot(str.contains(modifiedTicker, "adjustment=dividends") ? 1 : 0, "Adjustment")
plot(regularModified == "NASDAQ:AAPL" ? 1 : 0, "Removed Modifiers")
plot(standardTicker == "NASDAQ:AAPL" ? 1 : 0, "Standard")
plot(str.contains(inheritedTicker, "session=extended") and str.contains(inheritedTicker, "adjustment=dividends") ? 1 : 0, "Inherit")
plot(str.contains(haTicker, "chart=heikinashi") ? 1 : 0, "Heikin Ashi")
plot(str.contains(renkoTicker, "chart=renko:ATR:14:true:OHLC") ? 1 : 0, "Renko")
plot(str.contains(lineBreakTicker, "chart=linebreak:3") ? 1 : 0, "Linebreak")
plot(str.contains(kagiTicker, "chart=kagi:ATR:2") ? 1 : 0, "Kagi")
plot(str.contains(pnfTicker, "chart=pointfigure:hl:ATR:14:3") ? 1 : 0, "Point Figure")`, bars.slice(0, 2));
  });

  it('compiles string search and substring helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled string search")
text = "BTCUSDT perpetual"
symbol = "NASDAQ:AAPL"
parts = str.split(symbol, ":")
namedParts = str.split(string=symbol, separator=":")
prefixParts = str.split(source=symbol, ":")
plot(str.contains(text, "USDT") ? 1 : 0, "Contains")
plot(str.contains(source=text, str="USDT") ? 1 : 0, "Named Contains")
plot(str.startswith(source=text, "BTC") ? 1 : 0, "Prefix Starts")
plot(str.endswith(source=text, str="perpetual") ? 1 : 0, "Named Ends")
plot(str.pos(text, "USDT"), "Position")
plot(str.pos(source=text, "ETH"), "Missing Position")
plot(str.substring(text, 0, 3) == "BTC" ? 1 : 0, "Substring")
plot(str.substring(source=text, begin_pos=0, end_pos=3) == "BTC" ? 1 : 0, "Named Substring")
plot(str.match(source="Trade NASDAQ:AAPL now", regex="[A-Z]+:[A-Z]+") == symbol ? 1 : 0, "Named Regex Match")
plot(array.get(parts, 1) == "AAPL" ? 1 : 0, "Split Symbol")
plot(array.get(namedParts, 1) == "AAPL" ? 1 : 0, "Named Split Symbol")
plot(array.get(prefixParts, 1) == "AAPL" ? 1 : 0, "Prefix Split Symbol")
plot(str.length(text), "Length")
plot(str.length(string=text), "Named Length")
plot(str.length(na), "Length NA")`, bars.slice(0, 4));
  });

  it('compiles string transform helpers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled string transform")
text = "  btc-usdt-usdt  "
trimmed = str.trim(text)
plot(str.upper(trimmed) == "BTC-USDT-USDT" ? 1 : 0, "Upper")
plot(str.upper(source=trimmed) == "BTC-USDT-USDT" ? 1 : 0, "Named Upper")
plot(str.lower(source="BTC") == "btc" ? 1 : 0, "Named Lower")
plot(str.trim(source=text) == trimmed ? 1 : 0, "Named Trim")
plot(str.replace(trimmed, "usdt", "perp") == "btc-perp-usdt" ? 1 : 0, "Replace One")
plot(str.replace(source=trimmed, target="usdt", replacement="perp") == "btc-perp-usdt" ? 1 : 0, "Named Replace One")
plot(str.replace(source=trimmed, "usdt", "perp", 1) == "btc-usdt-perp" ? 1 : 0, "Prefix Replace Occurrence")
plot(str.replace_all(source=trimmed, target="usdt", replacement="perp") == "btc-perp-perp" ? 1 : 0, "Named Replace All")
plot(str.repeat(source="?", count=3, separator=",") == "?,?,?" ? 1 : 0, "Named Repeat")
plot(str.repeat(source="?", repeat=3, separator=",") == "?,?,?" ? 1 : 0, "Official Named Repeat")
plot(str.repeat(source="?", 3, ",") == "?,?,?" ? 1 : 0, "Prefix Repeat")
plot(str.trim(na) == "" ? 1 : 0, "Trim NA")
plot(str.repeat("?", -1), "Invalid Repeat")`, bars.slice(0, 4));
  });

  it('compiles alerts and logs with reference output parity', () => {
    const pine = `//@version=6
indicator("compiled alerts")
up = close > open
down = close < open
alertcondition(up, title="Up", message="Close rose")
alertcondition(condition=down, title="Down", message="Close fell")
if up
    alert("Up alert", alert.freq_once_per_bar_close)
    log.info("close {0}", close)
    log.warning(message="named {0:#.0}", close)
if barstate.islast
    log.error("last {0}", close)`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.alerts).toEqual(interpResult.alerts);
    expect(compiledResult?.logs).toEqual(interpResult.logs);
  });

  it('updates same-bar series assignments after the history ring reaches capacity', () => {
    const longBars = makeBars(Array.from({ length: 620 }, (_, index) => 100 + Math.sin(index / 10)));
    const pine = `//@version=6
indicator("Compiled color history after capacity")
color col = na
col := bar_index % 2 == 0 ? color.green : color.red
turned_green = col[1] == color.red and col == color.green
alertcondition(turned_green, title="Turned Green", message="green")
plot(turned_green ? 1 : 0, title="Turned")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, longBars);

    expect(findPlot(compiledResult, 'Turned').values[600]).toBe(1);
    expect(compiledResult.alerts[0]?.renderedMessages?.[600]).toBe('green');
    expect(compiledResult.alerts[0]?.renderedMessages).toEqual(interpResult.alerts[0]?.renderedMessages);
  });

  it('renders compiled alertcondition placeholders with reference parity', () => {
    const pine = `//@version=6
indicator("compiled alert placeholders")
basis = close + 1
plot(basis, title="Basis")
alertcondition(close > open, title="Green", message='{{ticker}} {{exchange}} {{interval}} {{open}} {{high}} {{low}} {{close}} {{volume}} basis={{plot_0}} named={{plot("Basis")}} missing={{plot_9}}')`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.alerts).toEqual(interpResult.alerts);
  });

  it('records compiled runtime.error output and halts like the reference', () => {
    const pine = `//@version=6
indicator("compiled runtime error")
plot(close, title="Before")
if bar_index == 1
    runtime.error(message="named stop")
plot(open, title="After")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors).toEqual(interpResult.errors);
    expect(findPlot(compiledResult!, 'Before').values).toEqual(findPlot(interpResult, 'Before').values);
    expect(findPlot(compiledResult!, 'After').values).toEqual(findPlot(interpResult, 'After').values);
  });

  it('short-circuits runtime.error operands with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled runtime short circuit")
safeAnd = false and runtime.error("and guard failed")
safeOr = true or runtime.error("or guard failed")
plot((safeAnd ? 1 : 0) + (safeOr ? 1 : 0), "Safe")`, bars.slice(0, 4));
  });

  it('reports compiled max_bars_back validation errors', () => {
    const pine = `//@version=6
indicator("compiled invalid max bars back")
max_bars_back(close, -1)
plot(close, title="After")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);

    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, bars);
    const interpResult = executeScript(ast, bars);

    expect(compiledResult?.errors[0]?.message).toBe(interpResult.errors[0]?.message);
  });

  it('returns null for unsupported features', () => {
    const pine = `//@version=6
indicator("test")
plot(ta.this_does_not_exist(close, 3))`;
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

  it('matches expected for deterministic strategy position accounting', () => {
    const strategyBars: Bar[] = [100, 105, 110, 120].map((price, i) => ({
      time: (i + 1) * 60000,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 100 + i,
    }));
    const pine = `//@version=6
strategy("Position Accounting", initial_capital=1000)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 2
    strategy.close("Long")
plot(strategy.position_size, title="Position")
plot(strategy.position_avg_price, title="Average")
plot(strategy.netprofit, title="Net")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, strategyBars);

    expect(findPlot(compiledResult, 'Position').values).toEqual([0, 2, 2, 0]);
    expect(findPlot(compiledResult, 'Average').values).toEqual([null, 105, 105, null]);
    expect(findPlot(compiledResult, 'Net').values).toEqual([0, 0, 0, 30]);
    expect(compiledResult.strategy.position).toEqual(interpResult.strategy.position);
    expect(compiledResult.strategy.closedTrades.map((trade) => trade.profit)).toEqual([30]);
    expect(compiledResult.strategy.closedTrades.map((trade) => trade.profit)).toEqual(
      interpResult.strategy.closedTrades.map((trade) => trade.profit)
    );
  });

  it('preserves strategy metric history after long warmups', () => {
    const strategyBars: Bar[] = Array.from({ length: 620 }, (_, i) => {
      const close = 100 + Math.sin(i / 17) * 3 + i * 0.01;
      return {
        time: (i + 1) * 60000,
        open: close - 0.5,
        high: close + 1,
        low: close - 1,
        close,
        volume: 100 + i,
      };
    });
    const pine = `//@version=6
strategy("Strategy Metric History", initial_capital=1000)
var float daily_profit = 0.0
delta = strategy.netprofit - strategy.netprofit[1]
if bar_index == 520
    daily_profit := 0.0
if bar_index >= 520
    daily_profit += delta
can_trade = daily_profit < 500
if bar_index == 521 and can_trade
    strategy.entry("Late", strategy.long, qty=1)
plot(daily_profit, title="Daily")
plot(can_trade ? 1 : 0, title="Can Trade")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, strategyBars);

    expect(findPlot(compiledResult, 'Daily').values[520]).toBe(0);
    expect(findPlot(compiledResult, 'Can Trade').values[521]).toBe(1);
    expect(compiledResult.strategy.orders).toHaveLength(1);
    expect(compiledResult.strategy.orders).toHaveLength(interpResult.strategy.orders.length);
  });

  it('keeps replaced strategy.exit orders active for historical OHLC fills', () => {
    const strategyBars: Bar[] = [
      { time: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { time: 2, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { time: 3, open: 100, high: 102, low: 99, close: 100, volume: 100 },
      { time: 4, open: 100, high: 100, low: 100, close: 100, volume: 100 },
    ];
    const pine = `//@version=6
strategy("Moving Exit", initial_capital=1000)
if bar_index == 0
    strategy.entry("L", strategy.long, qty=1)
if strategy.position_size > 0
    strategy.exit("Exit", "L", limit=close + 1)
plot(strategy.closedtrades, title="Closed")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, strategyBars);

    expect(findPlot(compiledResult, 'Closed').values).toEqual([0, 0, 0, 1]);
    expect(compiledResult.strategy.closedTrades).toHaveLength(1);
    expect(interpResult.strategy.closedTrades).toHaveLength(1);
    expect(compiledResult.strategy.closedTrades[0]?.exitBarIndex).toBe(2);
    expect(interpResult.strategy.closedTrades[0]?.exitBarIndex).toBe(2);
  });

  it('matches expected for process-on-close strategy.entry reversals', () => {
    const strategyBars: Bar[] = [100, 105, 110, 120].map((price, i) => ({
      time: (i + 1) * 60000,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 100 + i,
    }));
    const pine = `//@version=6
strategy("Reversal Accounting", initial_capital=1000, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.entry("Short", strategy.short, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.position_avg_price, title="Average")
plot(strategy.netprofit, title="Net")
plot(strategy.closedtrades, title="Closed")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, strategyBars);

    expect(findPlot(compiledResult, 'Position').values).toEqual([2, -1, -1, -1]);
    expect(findPlot(compiledResult, 'Average').values).toEqual([100, 105, 105, 105]);
    expect(findPlot(compiledResult, 'Net').values).toEqual([0, 10, 10, 10]);
    expect(findPlot(compiledResult, 'Closed').values).toEqual([0, 1, 1, 1]);
    expect(compiledResult.strategy.position).toEqual(interpResult.strategy.position);
    expect(compiledResult.strategy.closedTrades.map((trade) => trade.profit)).toEqual([10]);
  });

  it('matches expected for the v6 strategy.entry pyramiding cap', () => {
    const strategyBars: Bar[] = [100, 105, 110, 120].map((price, i) => ({
      time: (i + 1) * 60000,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 100 + i,
    }));
    const pine = `//@version=6
strategy("Pyramiding Cap", pyramiding=2, process_orders_on_close=true)
if bar_index <= 2
    strategy.entry("Long " + str.tostring(bar_index), strategy.long, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.opentrades, title="Open")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, strategyBars);

    expect(findPlot(compiledResult, 'Position').values).toEqual([1, 2, 2, 2]);
    expect(findPlot(compiledResult, 'Open').values).toEqual([1, 2, 2, 2]);
    expect(compiledResult.strategy.openTrades.map((trade) => trade.entryOrderId)).toEqual(['Long 0', 'Long 1']);
    expect(compiledResult.strategy.openTrades.map((trade) => trade.entryOrderId)).toEqual(
      interpResult.strategy.openTrades.map((trade) => trade.entryOrderId)
    );
  });

  it('matches expected when restricted strategy.entry closes without reversing', () => {
    const strategyBars: Bar[] = [100, 105, 110].map((price, i) => ({
      time: (i + 1) * 60000,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 100 + i,
    }));
    const pine = `//@version=6
strategy("Restricted Entry Accounting", initial_capital=1000, process_orders_on_close=true)
if bar_index == 0
    strategy.entry("Long", strategy.long, qty=2)
if bar_index == 1
    strategy.risk.allow_entry_in(strategy.direction.long)
    strategy.entry("Blocked Short", strategy.short, qty=1)
plot(strategy.position_size, title="Position")
plot(strategy.position_avg_price, title="Average")
plot(strategy.netprofit, title="Net")
plot(strategy.closedtrades, title="Closed")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, strategyBars);

    expect(findPlot(compiledResult, 'Position').values).toEqual([2, 0, 0]);
    expect(findPlot(compiledResult, 'Average').values).toEqual([100, null, null]);
    expect(findPlot(compiledResult, 'Net').values).toEqual([0, 10, 10]);
    expect(findPlot(compiledResult, 'Closed').values).toEqual([0, 1, 1]);
    expect(compiledResult.strategy.position).toEqual(interpResult.strategy.position);
    expect(compiledResult.strategy.openTrades).toHaveLength(0);
    expect(compiledResult.strategy.closedTrades.map((trade) => trade.profit)).toEqual([10]);
  });

  it('compiles public-style strategy foundations with reference parity', () => {
    const pine = `//@version=6
strategy("Foundation Strategy",
     shorttitle="FS",
     overlay=true,
     initial_capital=10000,
     default_qty_type=strategy.percent_of_equity,
     default_qty_value=10,
     pyramiding=1,
     commission_type=strategy.commission.percent,
     commission_value=0.05,
     slippage=1,
     process_orders_on_close=true,
     calc_on_order_fills=false,
     close_entries_rule="ANY",
     max_labels_count=50,
     max_lines_count=50,
     max_boxes_count=50,
     max_polylines_count=50,
     risk_free_rate=1.5,
     fill_orders_on_standard_ohlc=true,
     use_bar_magnifier=false)
strategy.risk.allow_entry_in(strategy.direction.all)
strategy.risk.max_position_size(20)
strategy.risk.max_drawdown(40, strategy.percent_of_equity, "drawdown")
strategy.risk.max_intraday_loss(value=5000, type=strategy.cash, alert_message="loss")
strategy.risk.max_intraday_filled_orders(count=10, alert_message="fills")
strategy.risk.max_cons_loss_days(count=5, alert_message="days")
fast = ta.sma(close, 3)
slow = ta.sma(close, 5)
longSignal = ta.crossover(fast, slow)
shortSignal = ta.crossunder(fast, slow)
if longSignal
    strategy.entry("Long", strategy.long, qty=1, limit=close + 0.25, stop=close - 0.5, oca_name="entry", oca_type=strategy.oca.cancel, comment="long", alert_message="long fill")
if shortSignal
    strategy.order(id="Hedge", direction=strategy.short, qty=1, limit=close - 0.25, stop=close + 0.5, oca_name="hedge", oca_type=strategy.oca.reduce, comment="hedge", alert_message="hedge fill")
if strategy.position_size > 0
    strategy.exit("Long Exit", from_entry="Long", qty_percent=50, profit=8, loss=4, trail_points=6, trail_offset=2, comment="exit", alert_message="exit fill")
if bar_index == 10
    strategy.close("Long", comment="manual", qty_percent=50, alert_message="close fill", immediately=true, disable_alert=false)
if bar_index == 12
    strategy.cancel("Hedge")
if bar_index == 14
    strategy.close_all(comment="flat", alert_message="flat fill", immediately=true)
if bar_index == 16
    strategy.cancel_all()
plot(strategy.position_size, title="Position")
plot(strategy.position_avg_price, title="Average")
plot(strategy.opentrades, title="Open Trades")
plot(strategy.closedtrades, title="Closed Trades")
plot(strategy.wintrades + strategy.losstrades + strategy.eventrades, title="Outcomes")
plot(strategy.equity, title="Equity")
plot(strategy.netprofit, title="Net Profit")
plot(strategy.openprofit, title="Open Profit")
plot(strategy.max_runup, title="Max Runup")
plot(strategy.max_drawdown, title="Max Drawdown")
plot(strategy.opentrades.capital_held, title="Capital Held")
plot(strategy.opentrades.entry_price(0), title="Open Entry")
plot(strategy.opentrades.profit_percent(trade_num=0), title="Open Percent")
plot(strategy.closedtrades.exit_price(0), title="Closed Exit")
plot(strategy.closedtrades.profit_percent(trade_num=0), title="Closed Percent")
plot(strategy.closedtrades.first_index, title="First Closed")`;

    const { compiledResult, interpResult } = assertPlotParity(pine, bars);

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult.strategy.orders.length).toBe(interpResult.strategy.orders.length);
    expect(compiledResult.strategy.fills.length).toBe(interpResult.strategy.fills.length);
  });

  it('compiles strategy.default_entry_qty from default sizing settings', () => {
    const singleBar = [{ time: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 }];
    const run = (pine: string, title: string): (number | null)[] => {
      const ast = parse(pine);
      const compiled = tryCompile(ast);
      if (!compiled.success) throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
      const result = executeCompiled(compiled, singleBar);

      expect(result?.errors).toEqual([]);
      return findPlot(result!, title).values;
    };

    expect(run(`//@version=6
strategy("Default entry quantity", initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=25)
fixedQty = strategy.default_entry_qty(50)
plot(fixedQty, "Percent")`, 'Percent')).toEqual([50]);
    expect(run(`//@version=6
strategy("Default cash quantity", default_qty_type=strategy.cash, default_qty_value=2000)
plot(strategy.default_entry_qty(fill_price=200), "Cash")`, 'Cash')).toEqual([10]);
    expect(run(`//@version=6
strategy("Default fixed quantity", default_qty_type=strategy.fixed, default_qty_value=7)
plot(strategy.default_entry_qty(close), "Fixed")`, 'Fixed')).toEqual([7]);
  });

  it('preserves strategy.entry OCA groups for compiled sibling cancellation', () => {
    const pine = `//@version=6
strategy("Compiled entry OCA", process_orders_on_close=false)
if bar_index == 0
    strategy.entry("LongStop", strategy.long, qty=1, stop=101, oca_name="entry-group", oca_type=strategy.oca.cancel)
    strategy.entry("ShortStop", strategy.short, qty=1, stop=99, oca_name="entry-group", oca_type=strategy.oca.cancel)
plot(strategy.position_size, "Position")`;
    const localBars: Bar[] = [
      { time: 1, open: 100, high: 100.5, low: 99.5, close: 100, volume: 100 },
      { time: 2, open: 100, high: 102, low: 100, close: 101.5, volume: 100 },
      { time: 3, open: 101.5, high: 102, low: 100.5, close: 101, volume: 100 },
    ];

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    if (!compiled.success) throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
    const compiledResult = executeCompiled(compiled, localBars);
    const interpResult = executeScript(ast, localBars);

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(compiledResult?.strategy.orders.map((order) => ({
      id: order.id,
      status: order.status,
      ocaName: order.ocaName,
      ocaType: order.ocaType,
      avgFillPrice: order.avgFillPrice,
    }))).toEqual(interpResult.strategy.orders.map((order) => ({
      id: order.id,
      status: order.status,
      ocaName: order.ocaName,
      ocaType: order.ocaType,
      avgFillPrice: order.avgFillPrice,
    })));
    expect(compiledResult?.strategy.orders.map((order) => order.status)).toEqual(['filled', 'cancelled']);
  });
});

describe('executeCompiled — request.security integration', () => {
  const chartBars: Bar[] = [
    { time: 100, open: 10, high: 12, low: 9, close: 11, volume: 100 },
    { time: 200, open: 11, high: 13, low: 10, close: 12, volume: 110 },
    { time: 300, open: 12, high: 14, low: 11, close: 13, volume: 120 },
    { time: 400, open: 13, high: 15, low: 12, close: 14, volume: 130 },
    { time: 500, open: 14, high: 16, low: 13, close: 15, volume: 140 },
    { time: 600, open: 15, high: 17, low: 14, close: 16, volume: 150 },
  ];

  const htfBars: Bar[] = [
    { time: 100, open: 10, high: 13, low: 9, close: 12, volume: 210 },
    { time: 300, open: 12, high: 15, low: 11, close: 14, volume: 250 },
    { time: 500, open: 14, high: 17, low: 13, close: 16, volume: 290 },
  ];
  const lowerChartBars: Bar[] = [
    { time: 0, open: 10, high: 15, low: 9, close: 12, volume: 100 },
    { time: 120000, open: 20, high: 25, low: 19, close: 22, volume: 110 },
    { time: 240000, open: 30, high: 35, low: 29, close: 32, volume: 120 },
  ];
  const lowerTfBars: Bar[] = [
    { time: 0, open: 10, high: 13, low: 10, close: 11, volume: 50 },
    { time: 60000, open: 12, high: 15, low: 11, close: 13, volume: 55 },
    { time: 120000, open: 20, high: 24, low: 19, close: 21, volume: 60 },
    { time: 180000, open: 23, high: 27, low: 22, close: 24, volume: 65 },
    { time: 240000, open: 30, high: 33, low: 30, close: 31, volume: 70 },
    { time: 300000, open: 32, high: 36, low: 31, close: 34, volume: 75 },
  ];

  const datafeed = new InMemoryRequestDatafeed([
    { symbol: 'TEST', timeframe: 'D', bars: htfBars },
    { symbol: 'TEST', timeframe: '1', bars: lowerTfBars },
  ]);
  const multiSymbolDatafeed = new InMemoryRequestDatafeed([
    { symbol: 'TEST', timeframe: 'D', bars: htfBars },
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: 'D',
      bars: htfBars,
      syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL', currency: 'USD', timezone: 'America/New_York' },
    },
    {
      symbol: 'NASDAQ:AAPL|session=extended',
      timeframe: 'D',
      bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 1 })),
      syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL|session=extended', currency: 'USD', timezone: 'America/New_York' },
    },
  ]);
  const tickerModifierDatafeed = new InMemoryRequestDatafeed([
    { symbol: 'NASDAQ:AAPL', timeframe: 'D', bars: htfBars },
    { symbol: 'NASDAQ:AAPL', timeframe: '1', bars: lowerTfBars },
    { symbol: 'NASDAQ:AAPL|session=extended', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 1 })) },
    { symbol: 'NASDAQ:AAPL|session=extended', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 1 })) },
    { symbol: 'NASDAQ:AAPL|session=extended|adjustment=splits', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 10 })) },
    { symbol: 'NASDAQ:AAPL|session=extended|adjustment=splits', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 10 })) },
    { symbol: 'NASDAQ:MSFT|session=extended|adjustment=splits', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 20 })) },
    { symbol: 'NASDAQ:MSFT|session=extended|adjustment=splits', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 20 })) },
    { symbol: 'NASDAQ:AAPL|chart=renko:ATR:10', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 30 })) },
    { symbol: 'NASDAQ:AAPL|chart=renko:ATR:10', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 30 })) },
    { symbol: 'NASDAQ:AAPL|chart=linebreak:3', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 40 })) },
    { symbol: 'NASDAQ:AAPL|chart=linebreak:3', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 40 })) },
    { symbol: 'NASDAQ:AAPL|chart=kagi:ATR:10', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 50 })) },
    { symbol: 'NASDAQ:AAPL|chart=kagi:ATR:10', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 50 })) },
    { symbol: 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3', timeframe: 'D', bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 60 })) },
    { symbol: 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3', timeframe: '1', bars: lowerTfBars.map((bar) => ({ ...bar, close: bar.close + 60 })) },
  ], [], [], [], [
    seedCorporateAction('dividends', 'NASDAQ:AAPL|chart=renko:ATR:10', [
      { time: chartBars[0]!.time, value: { kind: 'dividends', gross: 0.8 } },
    ], 'USD'),
    seedCorporateAction('dividends', 'NASDAQ:AAPL|session=extended|adjustment=dividends', [
      { time: chartBars[0]!.time, value: { kind: 'dividends', gross: 0.7 } },
    ], 'USD'),
    seedCorporateAction('earnings', 'NASDAQ:AAPL|session=extended|adjustment=dividends', [
      { time: chartBars[0]!.time, value: { kind: 'earnings', actual: 2.7 } },
    ], 'USD'),
    seedCorporateAction('earnings', 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3', [
      { time: chartBars[0]!.time, value: { kind: 'earnings', actual: 3.1 } },
    ], 'USD'),
    seedCorporateAction('splits', 'NASDAQ:AAPL|adjustment=splits', [
      { time: chartBars[0]!.time, value: { kind: 'splits', numerator: 4, denominator: 1 } },
    ]),
    seedCorporateAction('splits', 'NASDAQ:AAPL|chart=kagi:ATR:10', [
      { time: chartBars[0]!.time, value: { kind: 'splits', numerator: 3, denominator: 1 } },
    ]),
  ], [
    seedFinancialMetric('NASDAQ:MSFT|session=extended|adjustment=splits', 'TOTAL_REVENUE', 'FQ', [
      { time: chartBars[0]!.time, value: 4000 },
    ], 'USD'),
    seedFinancialMetric('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', [
      { time: chartBars[0]!.time, value: 2000 },
    ], 'USD'),
    seedFinancialMetric('NASDAQ:AAPL|session=extended|adjustment=dividends', 'TOTAL_REVENUE', 'FQ', [
      { time: chartBars[0]!.time, value: 3000 },
    ], 'USD'),
  ], [
    seedQuandlSeries('NASDAQ:AAPL|chart=linebreak:3', 0, [
      { time: chartBars[0]!.time, value: 41 },
    ]),
  ]);
  const currencyRateDatafeed = new InMemoryRequestDatafeed([], [
    {
      family: 'currency_rate',
      key: currencyRateRequestKey('USD', 'GBP'),
      points: [
        { time: 500, value: 0.85 },
        { time: 100, value: 0.8 },
        { time: 300, value: 0.82 },
      ],
    },
  ]);
  const seededCurrencyRateDatafeed = new InMemoryRequestDatafeed([], [], [
    seedCurrencyRate('USD', 'JPY', [
      { time: chartBars[0]!.time, value: 150 },
      { time: chartBars[3]!.time, value: 151 },
    ]),
  ]);
  const seededEconomicDatafeed = new InMemoryRequestDatafeed([], [], [], [
    seedEconomicSeries('US', 'GDP', [
      { time: chartBars[0]!.time, value: 3.1 },
      { time: chartBars[3]!.time, value: 3.3 },
    ]),
  ]);
  const corporateActionDatafeed = new InMemoryRequestDatafeed([], [], [], [], [
    seedCorporateAction('dividends', 'NASDAQ:AAPL', [
      { time: chartBars[1]!.time, value: { kind: 'dividends', gross: 0.24, net: 0.2 } },
      { time: chartBars[4]!.time, value: { kind: 'dividends', gross: 0.25, net: 0.21 } },
    ], 'USD'),
    seedCorporateAction('earnings', 'NASDAQ:AAPL', [
      { time: chartBars[0]!.time, value: { kind: 'earnings', actual: 1.5, estimate: 1.4, standardized: 1.45 } },
      { time: chartBars[4]!.time, value: { kind: 'earnings', actual: 1.8, estimate: 1.7, standardized: 1.75 } },
    ], 'USD'),
    seedCorporateAction('splits', 'NASDAQ:AAPL', [
      { time: chartBars[3]!.time, value: { kind: 'splits', numerator: 2, denominator: 1 } },
    ]),
  ]);
  const financialMetricDatafeed = new InMemoryRequestDatafeed([], [], [], [], [], [
    seedFinancialMetric('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', [
      { time: chartBars[0]!.time, value: 1000 },
      { time: chartBars[4]!.time, value: 1100 },
    ], 'USD'),
    seedFinancialMetric('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FY', [
      { time: chartBars[0]!.time, value: 4000 },
      { time: chartBars[4]!.time, value: 4400 },
    ], 'USD'),
  ]);
  const quandlDatafeed = new InMemoryRequestDatafeed([], [], [], [], [], [], [
    seedQuandlSeries('MULTPL/SHILLER_PE_RATIO_MONTH', 0, [
      { time: chartBars[0]!.time, value: 28.5 },
      { time: chartBars[4]!.time, value: 29.25 },
    ]),
  ]);
  const footprintDatafeed = new InMemoryRequestDatafeed([], [], [], [], [], [], [], [
    seedFootprints('BTCUSDT', '60', 10, 70, [
      {
        time: chartBars[0]!.time,
        totalVolume: 1200,
        buyVolume: 700,
        sellVolume: 500,
        pointOfControl: 101.5,
        valueAreaHigh: 102.5,
        valueAreaLow: 100.5,
        rows: [
          {
            downPrice: 100,
            upPrice: 101,
            totalVolume: 350,
            buyVolume: 120,
            sellVolume: 230,
            hasSellImbalance: true,
          },
          {
            downPrice: 101,
            upPrice: 102,
            totalVolume: 850,
            buyVolume: 580,
            sellVolume: 270,
            hasBuyImbalance: true,
          },
          {
            downPrice: 102,
            upPrice: 103,
            totalVolume: 600,
            buyVolume: 350,
            sellVolume: 250,
          },
        ],
      },
      {
        time: chartBars[4]!.time,
        totalVolume: 1400,
        buyVolume: 820,
        sellVolume: 580,
        pointOfControl: 104.5,
        valueAreaHigh: 105.5,
        valueAreaLow: 103.5,
        rows: [
          {
            downPrice: 103,
            upPrice: 104,
            totalVolume: 450,
            buyVolume: 180,
            sellVolume: 270,
            hasSellImbalance: true,
          },
          {
            downPrice: 104,
            upPrice: 105,
            totalVolume: 950,
            buyVolume: 640,
            sellVolume: 310,
            hasBuyImbalance: true,
          },
          {
            downPrice: 105,
            upPrice: 106,
            totalVolume: 700,
            buyVolume: 390,
            sellVolume: 310,
          },
        ],
      },
    ]),
  ]);
  const pointSeriesDatafeed = new InMemoryRequestDatafeed([], [
    {
      family: 'dividends',
      key: corporateActionRequestKey('NASDAQ:AAPL', 'dividends.gross', 'USD'),
      points: [{ time: 300, value: 0.24 }, { time: 500, value: 0.25 }],
    },
    {
      family: 'earnings',
      key: corporateActionRequestKey('NASDAQ:AAPL', 'earnings.actual', 'USD'),
      points: [{ time: 100, value: 1.5 }, { time: 500, value: 1.8 }],
    },
    {
      family: 'splits',
      key: corporateActionRequestKey('NASDAQ:AAPL', 'splits.denominator'),
      points: [{ time: 400, value: 4 }],
    },
    {
      family: 'financial',
      key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ', 'USD'),
      points: [{ time: 100, value: 1000 }, { time: 500, value: 1100 }],
    },
    {
      family: 'economic',
      key: economicRequestKey('US', 'GDP'),
      points: [{ time: 300, value: 3.1 }],
    },
  ]);
  const seedDatafeed = new InMemoryRequestDatafeed([
    {
      symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'BTC_DEV'),
      timeframe: '60',
      bars: htfBars,
    },
  ]);
  const requestSessionDatafeed = new InMemoryRequestDatafeed([
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: 'D',
      bars: htfBars,
      syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
      session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
    },
  ]);

  it('request.security returns HTF close values aligned to chart', () => {
    const pine = `//@version=6
indicator("test")
htfClose = request.security("TEST", "D", close)
plot(htfClose)`;

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.analysis.securitySites.length).toBe(1);

    const result = executeCompiled(compiled, chartBars, undefined, {
      requestDatafeed: datafeed,
    });
    expect(result).not.toBeNull();

    const values = result!.plots[0]?.values ?? [];
    expect(values.length).toBe(chartBars.length);
    const nonNull = values.filter((v) => v !== null);
    expect(nonNull.length).toBeGreaterThan(0);
  });

  it('request.security resolves named merge arguments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request modes")
lookahead = request.security("TEST", "D", close, lookahead=barmerge.lookahead_on)
confirmedGaps = request.security("TEST", "D", close, gaps=barmerge.gaps_on)
lookaheadGaps = request.security(symbol="TEST", timeframe="D", expression=close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
mixed = request.security(symbol="TEST", "D", close, barmerge.gaps_on, barmerge.lookahead_on)
plot(lookahead, "Lookahead")
plot(confirmedGaps, "Confirmed Gaps")
plot(lookaheadGaps, "Lookahead Gaps")
plot(mixed, "Mixed")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security treats empty timeframe as chart timeframe in compiled host contexts', () => {
    const emptyTimeframeDatafeed = new InMemoryRequestDatafeed([
      { symbol: 'TEST', timeframe: '60', bars: chartBars.map((bar) => ({ ...bar, close: bar.close + 100 })) },
    ]);
    const compiledOptions = {
      requestDatafeed: emptyTimeframeDatafeed,
      runtime: { timeframe: { period: '' } },
    };
    const referenceOptions = {
      requestDatafeed: emptyTimeframeDatafeed,
    };
    const pine = `//@version=6
indicator("compiled empty request timeframe")
inputTf = input.timeframe("", "Input TF")
literalTf = ""
fromInput = request.security("TEST", inputTf, close, lookahead=barmerge.lookahead_on)
fromLiteral = request.security("TEST", literalTf, high, lookahead=barmerge.lookahead_on)
label.new(bar_index, fromInput, text=str.format("{0}|{1}", fromInput, fromLiteral))
plot(fromInput, "Input")
plot(fromLiteral, "Literal")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, chartBars, undefined, compiledOptions);
    const referenceResult = executeScript(ast, chartBars, undefined, referenceOptions);

    expect(compiledResult).not.toBeNull();
    expect(compiledResult?.errors).toEqual([]);
    expect(referenceResult.errors).toEqual([]);
    expect(compiledResult?.plots.map((plot) => plot.values)).toEqual(referenceResult.plots.map((plot) => plot.values));
    expect(compiledResult?.drawings).toEqual(referenceResult.drawings);
    expect(compiledResult?.drawings.filter((drawing) => drawing.type === 'label')).toHaveLength(chartBars.length);
  });

  it('request.security matches v6 HTF barmerge gaps and lookahead series exactly', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled request exact barmerge")
offGapsOff = request.security("TEST", "D", close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_off)
offGapsOn = request.security("TEST", "D", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_off)
onGapsOff = request.security("TEST", "D", close, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_on)
onGapsOn = request.security("TEST", "D", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
plot(offGapsOff, "Off Gaps Off")
plot(offGapsOn, "Off Gaps On")
plot(onGapsOff, "On Gaps Off")
plot(onGapsOn, "On Gaps On")`, chartBars, { requestDatafeed: datafeed });

    const expected = new Map<string, Array<number | null>>([
      ['Off Gaps Off', [null, null, 12, 12, 14, 14]],
      ['Off Gaps On', [null, null, 12, null, 14, null]],
      ['On Gaps Off', [12, 12, 14, 14, 16, 16]],
      ['On Gaps On', [12, null, 14, null, 16, null]],
    ]);

    for (const [title, values] of expected) {
      expect(findPlot(compiledResult, title).values).toEqual(values);
      expect(findPlot(interpResult, title).values).toEqual(values);
    }
  });

  it('request.security replays prior computed globals in requested context during realtime reconstruction', () => {
    const ast = parse(`//@version=6
indicator("compiled realtime HTF computed request")
basis = ta.sma(close, 2)
htf = request.security("TEST", "D", basis, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_off)
plot(htf, "HTF")`);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, chartBars.slice(0, 5), undefined, {
      requestDatafeed: datafeed,
      confirmedRealtimeBarStartIndex: 4,
      realtimeLastBar: { isNew: true },
    });
    const directChartBasis = (chartBars[3]!.close + chartBars[4]!.close) / 2;

    expect(compiledResult).not.toBeNull();
    expect(compiledResult?.errors).toEqual([]);
    // The first confirmed requested bar does not have enough history for
    // ta.sma(close, 2), so gaps_on keeps it absent until the realtime bar uses
    // the active requested bar.
    expect(findPlot(compiledResult!, 'HTF').values).toEqual([null, null, null, null, 15]);
    expect(findPlot(compiledResult!, 'HTF').values.at(-1)).toBe(15);
    expect(findPlot(compiledResult!, 'HTF').values.at(-1)).not.toBe(directChartBasis);
  });

  it('compiles host-provided imported helpers used by request and timeframe logic', () => {
    const library = parse(`//@version=6
library("PublicHelper", true)
export const int FAST = 2
export const string HTF = "D"
export value(series float source) =>
    ta.sma(source, 2)
export extended(simple string tickerid) =>
    ticker.modify(tickerid, session=session.extended)
export isHigher(simple string tf) =>
    timeframe.in_seconds(tf) > timeframe.in_seconds()
`);

    assertPlotParity(`//@version=6
indicator("compiled imported helpers")
import PublicUser/PublicHelper/1 as helper
requested = request.security(helper.extended("NASDAQ:AAPL"), helper.HTF, close, lookahead=barmerge.lookahead_on)
plot(helper.value(close), "Value")
plot(helper.FAST, "Fast")
plot(helper.isHigher(helper.HTF) ? 1 : 0, "Higher")
plot(requested, "Requested")`, chartBars, {
      requestDatafeed: multiSymbolDatafeed,
      libraries: new Map([['PublicUser/PublicHelper/1', library]]),
    });
  });

  it('compiles imported block helpers, methods, types, and enums with reference parity', () => {
    const library = parse(`//@version=6
library("PublicObjects", true)
export type Pivot
    float level = na
    string label = "pivot"
export enum Mode
    strict = "Strict"
    loose
export blockValue(series float source, simple int len) =>
    smoothed = ta.sma(source, len)
    smoothed + 1
export method lifted(Pivot this, float amount, float factor=1) =>
    adjusted = this.level + amount * factor
    adjusted
`);

    assertPlotParity(`//@version=6
indicator("compiled imported objects")
import PublicUser/PublicObjects/1 as helper
pivot = helper.Pivot.new(level=close, label="close")
requested = request.security("TEST", "D", helper.blockValue(close, 2), lookahead=barmerge.lookahead_on)
plot(helper.blockValue(close, 2), "Block")
plot(pivot.level, "Level")
plot(pivot.lifted(1, factor=2), "Lifted")
plot(helper.Mode.strict == helper.Mode.loose ? 0 : 1, "Mode")
plot(str.length(helper.Mode.strict.title()) + str.length(helper.Mode.loose.title()), "Mode Title")
plot(requested, "Requested")`, chartBars, {
      requestDatafeed: datafeed,
      libraries: new Map([['PublicUser/PublicObjects/1', library]]),
    });
  });

  it('compiles imported method overloads by receiver type with reference parity', () => {
    const library = parse(`//@version=6
library("OverloadedObjects", true)
export type Left
    float value = na
export type Right
    float value = na
export method score(Left this) =>
    var hits = 0
    hits += 1
    this.value + hits
export method score(Right this) =>
    var hits = 0
    hits += 10
    this.value + hits
`);

    assertPlotParity(`//@version=6
indicator("compiled imported method overloads")
import PublicUser/OverloadedObjects/1 as helper
left = helper.Left.new(close)
right = helper.Right.new(close)
plot(left.score(), "Left Score")
plot(right.score(), "Right Score")`, chartBars, {
      libraries: new Map([['PublicUser/OverloadedObjects/1', library]]),
    });
  });

  it('compiles versioned library imports and export-to-export calls with reference parity', () => {
    const libV1 = parse(`//@version=6
library("VersionedTools", true)
export normalize(series float source) =>
    ta.sma(source, 2)
export score(series float source) =>
    normalize(source) + 1
`);
    const libV2 = parse(`//@version=6
library("VersionedTools", true)
export normalize(series float source) =>
    ta.ema(source, 2)
export score(series float source) =>
    normalize(source) + 2
`);

    assertPlotParity(`//@version=6
indicator("compiled versioned imports")
import PublicUser/VersionedTools/1 as fast
import PublicUser/VersionedTools/2 as slow
plot(fast.score(close), "Fast Score")
plot(slow.score(close), "Slow Score")`, chartBars, {
      libraries: new Map([
        ['PublicUser/VersionedTools/1', libV1],
        ['PublicUser/VersionedTools/2', libV2],
      ]),
    });
  });

  it('compiles exported helpers that import a third library with reference parity', () => {
    const base = parse(`//@version=6
library("BaseTools", true)
export scale(series float source, simple float factor) =>
    ta.sma(source, 2) * factor
`);
    const helper = parse(`//@version=6
library("HelperTools", true)
import PublicUser/BaseTools/1 as base
export score(series float source) =>
    base.scale(source, 2) + 1
`);

    assertPlotParity(`//@version=6
indicator("compiled transitive imports")
import PublicUser/HelperTools/1 as helper
plot(helper.score(close), "Score")`, chartBars, {
      libraries: new Map([
        ['PublicUser/BaseTools/1', base],
        ['PublicUser/HelperTools/1', helper],
      ]),
    });
  });

  it('compiles local enum title methods with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled local enum titles")
enum Mode
    strict = "Strict Mode"
    loose
plot(str.length(Mode.strict.title()), "Strict")
plot(str.length(Mode.loose.title()), "Loose")`, chartBars);
  });

  it('request.security supports source-parameter UDF wrappers with reference parity', () => {
    const ast = parse(`//@version=6
indicator("compiled request wrapper")
mtf(series float source, string tf) =>
    request.security("TEST", tf, source, lookahead=barmerge.lookahead_on)
wrappedClose = mtf(close, "D")
wrappedOpen = mtf(open, "D")
plot(wrappedClose, "Wrapped Close")
plot(wrappedOpen, "Wrapped Open")`);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.securityScripts.size).toBe(0);
    expect(compiled.analysis.securitySites[0]?.expressionSourceParam).toBe('source');

    const compiledResult = executeCompiled(compiled, chartBars, undefined, { requestDatafeed: datafeed });
    const interpResult = executeScript(ast, chartBars, undefined, { requestDatafeed: datafeed });
    expect(findPlot(compiledResult!, 'Wrapped Close').values).toEqual(findPlot(interpResult, 'Wrapped Close').values);
    expect(findPlot(compiledResult!, 'Wrapped Open').values).toEqual(findPlot(interpResult, 'Wrapped Open').values);
  });

  it('request.security supports computed TA expressions in UDF wrappers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request computed wrapper")
mtf(series float source, simple string tf, simple int len) =>
    request.security("TEST", tf, ta.sma(source, len), lookahead=barmerge.lookahead_on)
plot(mtf(close, "D", 2), "Close SMA")
plot(mtf(open, "D", 2), "Open SMA")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security UDF expressions include global series dependencies', () => {
    const pine = `//@version=6
indicator("compiled request global UDF dependencies")
spread = math.abs(close - open)
signal = spread > 0
payload() => [close, signal]
[requestedClose, requestedSignal] = request.security("TEST", "D", payload(), lookahead=barmerge.lookahead_on)
plot(requestedSignal ? requestedClose : na, "Requested Signal")
if requestedSignal
    alert("requested hit", alert.freq_once_per_bar_close)`;

    const { compiledResult, interpResult } = assertPlotParity(pine, chartBars, { requestDatafeed: datafeed });

    expect(compiledResult.alerts.length).toBe(interpResult.alerts.length);
    expect(compiledResult.alerts[0]?.events.map((event) => event.barIndex))
      .toEqual(interpResult.alerts[0]?.events.map((event) => event.barIndex));
  });

  it('request.security UDF expressions replay global series history once per requested bar', () => {
    const pine = `//@version=5
indicator("compiled request global UDF history")
per = input.timeframe(defval='D', title='PERIOD')
start = input.float(title='Start', step=0.001, defval=0.02)
increment = input.float(title='Increment', step=0.001, defval=0.02)
maximum = input.float(title='Maximum', step=0.01, defval=0.2)
psar = ta.sar(start, increment, maximum)
dir = psar < close ? 1 : -1
buySignal = dir == 1 and dir[1] == -1
changeCond = dir != dir[1]
payload() =>
    cond = changeCond and buySignal
    [close, cond]
[requestedClose, requestedSignal] = request.security("TEST", per, payload(), ignore_invalid_symbol=true)
plot(requestedSignal ? requestedClose : na, "Requested SAR")
if requestedSignal
    alert("requested SAR hit", alert.freq_once_per_bar_close)`;

    const { compiledResult, interpResult } = assertPlotParity(pine, chartBars, { requestDatafeed: datafeed });

    expect(findPlot(compiledResult, 'Requested SAR').values)
      .toEqual(findPlot(interpResult, 'Requested SAR').values);
    expect(compiledResult.alerts[0]?.events.map((event) => event.barIndex))
      .toEqual(interpResult.alerts[0]?.events.map((event) => event.barIndex));
    expect(compiledResult.alerts[0]?.events.length).toBeGreaterThan(0);
  });

  it('request.security UDF dependencies include branch-only globals and tuple globals', () => {
    const pine = `//@version=6
indicator("compiled request branched globals")
showSignal = input.bool(true, "Show")
[macdLine, signalLine, histLine] = ta.macd(close, 3, 6, 3)
payload() =>
    signal = false
    if showSignal and macdLine > signalLine
        signal := true
    [close, signal]
[requestedClose, requestedSignal] = request.security("TEST", "D", payload())
plot(requestedSignal ? requestedClose : na, "Requested Signal")
if requestedSignal
    alert("requested signal", alert.freq_once_per_bar_close)`;

    const { compiledResult, interpResult } = assertPlotParity(pine, chartBars, { requestDatafeed: datafeed });

    expect(compiledResult.profile.swallowedErrors).toBeUndefined();
    expect(findPlot(compiledResult, 'Requested Signal').values)
      .toEqual(findPlot(interpResult, 'Requested Signal').values);
    expect(compiledResult.alerts[0]?.events.map((event) => event.barIndex))
      .toEqual(interpResult.alerts[0]?.events.map((event) => event.barIndex));
  });

  it('keeps stateful TA calls inside request-wrapper UDFs isolated per call site', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled request UDF TA call-site history")
wrapped(string symbol, series float source, simple int length) =>
    request.security(symbol, "D", ta.sma(source, length), lookahead=barmerge.lookahead_on)
closeFast = wrapped("TEST", close, 2)
openFast = wrapped("TEST", open, 2)
closeSlow = wrapped("TEST", close, 3)
plot(closeFast, "Requested Close Fast")
plot(openFast, "Requested Open Fast")
plot(closeSlow, "Requested Close Slow")`, chartBars, { requestDatafeed: datafeed });

    expect(findPlot(compiledResult, 'Requested Close Fast').values).toEqual([null, null, 13, 13, 15, 15]);
    expect(findPlot(compiledResult, 'Requested Open Fast').values).toEqual([null, null, 11, 11, 13, 13]);
    expect(findPlot(compiledResult, 'Requested Close Slow').values).toEqual([null, null, null, null, 14, 14]);
    expect(compiledResult.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('request.security wrapper helpers can read root inputs in compiled subprograms', () => {
    assertPlotParity(`//@version=6
indicator("compiled request root input wrapper")
len = input.int(2)
smooth(series float source) => ta.sma(source, len)
mtf(series float source, simple string tf) =>
    request.security("TEST", tf, smooth(source), lookahead=barmerge.lookahead_on)
plot(mtf(close, "D"), "Wrapped SMA")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security wrappers preserve input.source aliases through imported helpers', () => {
    const library = parse(`//@version=6
library("SourceAlias", true)
export wrap(simple string symbol, simple string tf, series float source, simple int len) =>
    request.security(symbol, tf, ta.sma(source, len), lookahead=barmerge.lookahead_on)
`);

    assertPlotParity(`//@version=6
indicator("compiled request source alias")
import PublicUser/SourceAlias/1 as helper
source = input.source(close, "Source")
plot(helper.wrap("TEST", "D", source, 2), "Wrapped")`, chartBars, {
      requestDatafeed: datafeed,
      libraries: new Map([['PublicUser/SourceAlias/1', library]]),
    });
  });

  it('request.security supports computed tuple UDF wrappers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request tuple wrapper")
mtf(series float source, simple string tf, simple int len) =>
    request.security("TEST", tf, [source, ta.sma(source, len)], lookahead=barmerge.lookahead_on)
[raw, smooth] = mtf(close, "D", 2)
plot(raw, "Raw")
plot(smooth, "Smooth")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security tuple-returning UDF expressions destructure through the reference', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled request tuple-returning expression")
pair(series float source, simple int len) =>
    [source, ta.sma(source, len)]
[rawA, smoothA] = request.security("TEST", "D", pair(close, 2), lookahead=barmerge.lookahead_off)
[rawB, smoothB] = request.security("TEST", "D", pair(open, 2), lookahead=barmerge.lookahead_off)
plot(rawA, "Raw A")
plot(smoothA, "Smooth A")
plot(rawB, "Raw B")
plot(smoothB, "Smooth B")`, chartBars, { requestDatafeed: datafeed });

    expect(compiledResult.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(findPlot(compiledResult, 'Raw A').values).toEqual([null, null, 12, 12, 14, 14]);
    expect(findPlot(compiledResult, 'Smooth A').values).toEqual([null, null, null, null, 13, 13]);
    expect(compiledResult.plots.map((plot) => plot.values)).toEqual(interpResult.plots.map((plot) => plot.values));
  });

  it('request.security captures UDF local arrays in computed expressions with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request local array")
len = input.int(2, "Length")
weighted(array<float> values) =>
    total = 0.0
    weight = 1.0
    for item in values
        total += nz(item) * weight
        weight += 1
    total
wrapped(series float source, simple int length) =>
    values = array.from(source, source[1], ta.sma(source, length))
    request.security("TEST", "D", weighted(values), lookahead=barmerge.lookahead_on)
plot(wrapped(close, len), "Wrapped")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security tuple expressions keep imported function locals scoped', () => {
    const library = parse(`//@version=6
library("TupleImport", true)
export blockScore(series float source, simple int fastLen, simple int slowLen) =>
    fast = ta.ema(source, fastLen)
    slow = ta.sma(source, slowLen)
    fast - slow
`);

    assertPlotParity(`//@version=6
indicator("compiled request imported tuple locals")
import PublicUser/TupleImport/1 as helper
mtf(series float src, simple int fast, simple int slow) =>
    request.security("TEST", "D", [helper.blockScore(src, fast, slow), ta.ema(src, fast) - ta.sma(src, slow)], lookahead=barmerge.lookahead_on)
[imported, local] = mtf(close, 2, 3)
plot(imported, "Imported")
plot(local, "Local")`, chartBars, {
      requestDatafeed: datafeed,
      libraries: new Map([['PublicUser/TupleImport/1', library]]),
    });
  });

  it('request.security captures a parameter used in both symbol and expression with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request symbol expression capture")
mtf(simple string tickerId, series float source) =>
    request.security(tickerId, "D", source + str.length(tickerId), lookahead=barmerge.lookahead_on)
plot(mtf("TEST", close), "TEST")
plot(mtf("NASDAQ:AAPL", close), "AAPL")`, chartBars, { requestDatafeed: multiSymbolDatafeed });
  });

  it('global security alias resolves named merge arguments with reference parity', () => {
    assertPlotParity(`//@version=5
indicator("compiled security alias")
lookahead = security("TEST", "D", close, lookahead=barmerge.lookahead_on)
confirmedGaps = security("TEST", "D", close, gaps=barmerge.gaps_on)
mixed = security(symbol="TEST", "D", close, barmerge.gaps_on, barmerge.lookahead_on)
plot(lookahead, "Lookahead")
plot(confirmedGaps, "Confirmed Gaps")
plot(mixed, "Mixed")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security with ta.sma expression', () => {
    const pine = `//@version=6
indicator("test")
htfSma = request.security("TEST", "D", ta.sma(close, 2))
plot(htfSma)`;

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.securityScripts.size).toBe(1);

    const result = executeCompiled(compiled, chartBars, undefined, {
      requestDatafeed: datafeed,
    });
    expect(result).not.toBeNull();

    const values = result!.plots[0]?.values ?? [];
    expect(values.length).toBe(chartBars.length);
  });

  it('request.security resolves optional datafeed arguments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request optionals")
trimmed = request.security("TEST", "D", close, calc_bars_count=2)
missing = request.security("MISSING", "D", close, ignore_invalid_symbol=true)
plot(trimmed, "Trimmed")
plot(missing, "Missing")`, chartBars, { requestDatafeed: datafeed });
  });

  it('request.security ignores provider-gated synthetic ticker contexts with reference parity', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled synthetic guard")
renkoTicker = ticker.renko("NASDAQ:AAPL", "ATR", 10)
guarded = request.security(renkoTicker, "D", close, ignore_invalid_symbol=true)
plot(guarded, "Guarded")`, chartBars, { requestDatafeed: multiSymbolDatafeed });

    expect(findPlot(compiledResult, 'Guarded').values).toEqual([null, null, null, null, null, null]);
    expect(findPlot(interpResult, 'Guarded').values).toEqual([null, null, null, null, null, null]);
  });

  it('request.security resolves heikinashi ticker chains through nearest host context', () => {
    const { compiledResult, interpResult } = assertPlotParity(`//@version=6
indicator("compiled heikinashi chain")
base = ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.dividends)
ha = ticker.heikinashi(base)
standard = ticker.standard(ha)
plot(str.length(standard), "Standard")
plot(request.security(ha, "D", close, lookahead=barmerge.lookahead_on), "HA")`, chartBars, { requestDatafeed: multiSymbolDatafeed });

    expect(findPlot(compiledResult, 'HA').values.some((value) => value !== null)).toBe(true);
    expect(findPlot(compiledResult, 'HA').values).toEqual(findPlot(interpResult, 'HA').values);
  });

  it('request.security round-trips seeded ticker modifier contexts with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled ticker modifier request contexts")
modified = ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.splits)
standard = ticker.standard(modified)
inherited = ticker.inherit(modified, "NASDAQ:MSFT")
ha = ticker.heikinashi(ticker.modify("NASDAQ:AAPL", session=session.extended))
renko = ticker.renko("NASDAQ:AAPL", "ATR", 10)
lineBreak = ticker.linebreak("NASDAQ:AAPL", 3)
kagi = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
pointFigure = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
plot(request.security(modified, "D", close, lookahead=barmerge.lookahead_on), "Modified")
plot(request.security(standard, "D", close, lookahead=barmerge.lookahead_on), "Standard")
plot(request.security(inherited, "D", close, lookahead=barmerge.lookahead_on), "Inherited")
plot(request.security(ha, "D", close, lookahead=barmerge.lookahead_on), "Heikin Ashi")
plot(request.security(renko, "D", close, lookahead=barmerge.lookahead_on), "Renko")
plot(request.security(lineBreak, "D", close, lookahead=barmerge.lookahead_on), "Linebreak")
plot(request.security(kagi, "D", close, lookahead=barmerge.lookahead_on), "Kagi")
plot(request.security(pointFigure, "D", close, lookahead=barmerge.lookahead_on), "Point Figure")`, chartBars, { requestDatafeed: tickerModifierDatafeed });

    expect(findPlot(compiledResult, 'Modified').values).toEqual([22, 22, 24, 24, 26, 26]);
    expect(findPlot(compiledResult, 'Standard').values).toEqual([12, 12, 14, 14, 16, 16]);
    expect(findPlot(compiledResult, 'Inherited').values).toEqual([32, 32, 34, 34, 36, 36]);
    expect(findPlot(compiledResult, 'Heikin Ashi').values).toEqual([11.25, 11.25, 13.25, 13.25, 15.25, 15.25]);
    expect(findPlot(compiledResult, 'Renko').values).toEqual([42, 42, 44, 44, 46, 46]);
    expect(findPlot(compiledResult, 'Linebreak').values).toEqual([52, 52, 54, 54, 56, 56]);
    expect(findPlot(compiledResult, 'Kagi').values).toEqual([62, 62, 64, 64, 66, 66]);
    expect(findPlot(compiledResult, 'Point Figure').values).toEqual([72, 72, 74, 74, 76, 76]);
  });

  it('point-data request families keep modified ticker keys with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled ticker modifier point data")
adjusted = ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.dividends)
splitAdjusted = ticker.modify("NASDAQ:AAPL", adjustment=adjustment.splits)
lineBreak = ticker.linebreak("NASDAQ:AAPL", 3)
dividend = request.dividends(adjusted, dividends.gross, currency="USD")
earn = request.earnings(adjusted, earnings.actual, currency=currency.USD)
split = request.splits(splitAdjusted, splits.numerator)
revenue = request.financial(adjusted, "TOTAL_REVENUE", "FQ", currency="USD")
quandl = request.quandl(lineBreak, barmerge.gaps_off, 0)
plot(dividend, "Dividend")
plot(earn, "Earnings")
plot(split, "Split")
plot(revenue, "Revenue")
plot(quandl, "Quandl")`, chartBars, { requestDatafeed: tickerModifierDatafeed });

    expect(findPlot(compiledResult, 'Dividend').values).toEqual([0.7, 0.7, 0.7, 0.7, 0.7, 0.7]);
    expect(findPlot(compiledResult, 'Earnings').values).toEqual([2.7, 2.7, 2.7, 2.7, 2.7, 2.7]);
    expect(findPlot(compiledResult, 'Split').values).toEqual([4, 4, 4, 4, 4, 4]);
    expect(findPlot(compiledResult, 'Revenue').values).toEqual([3000, 3000, 3000, 3000, 3000, 3000]);
    expect(findPlot(compiledResult, 'Quandl').values).toEqual([41, 41, 41, 41, 41, 41]);
  });

  it('request.security_lower_tf round-trips seeded ticker modifier contexts with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled ticker modifier lower tf", timeframe="2")
modified = ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.splits)
standard = ticker.standard(modified)
inherited = ticker.inherit(modified, "NASDAQ:MSFT")
renko = ticker.renko("NASDAQ:AAPL", "ATR", 10)
lineBreak = ticker.linebreak("NASDAQ:AAPL", 3)
kagi = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
pointFigure = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
modifiedBars = request.security_lower_tf(modified, "1", close)
standardBars = request.security_lower_tf(standard, "1", close)
inheritedBars = request.security_lower_tf(inherited, "1", close)
renkoBars = request.security_lower_tf(renko, "1", close)
lineBreakBars = request.security_lower_tf(lineBreak, "1", close)
kagiBars = request.security_lower_tf(kagi, "1", close)
pointFigureBars = request.security_lower_tf(pointFigure, "1", close)
plot(array.get(modifiedBars, 1), "Modified")
plot(array.get(standardBars, 1), "Standard")
plot(array.get(inheritedBars, 1), "Inherited")
plot(array.get(renkoBars, 1), "Renko")
plot(array.get(lineBreakBars, 1), "Linebreak")
plot(array.get(kagiBars, 1), "Kagi")
plot(array.get(pointFigureBars, 1), "Point Figure")`, lowerChartBars, { requestDatafeed: tickerModifierDatafeed });

    expect(findPlot(compiledResult, 'Modified').values).toEqual([23, 34, 44]);
    expect(findPlot(compiledResult, 'Standard').values).toEqual([13, 24, 34]);
    expect(findPlot(compiledResult, 'Inherited').values).toEqual([33, 44, 54]);
    expect(findPlot(compiledResult, 'Renko').values).toEqual([43, 54, 64]);
    expect(findPlot(compiledResult, 'Linebreak').values).toEqual([53, 64, 74]);
    expect(findPlot(compiledResult, 'Kagi').values).toEqual([63, 74, 84]);
    expect(findPlot(compiledResult, 'Point Figure').values).toEqual([73, 84, 94]);
  });

  it('point-data request families resolve synthetic modifier key shapes with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled ticker point data modifier spread")
modified = ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.dividends)
standard = ticker.standard(ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.splits))
inherited = ticker.inherit(ticker.modify("NASDAQ:AAPL", session=session.extended, adjustment=adjustment.splits), "NASDAQ:MSFT")
renko = ticker.renko("NASDAQ:AAPL", "ATR", 10)
lineBreak = ticker.linebreak("NASDAQ:AAPL", 3)
kagi = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
pointFigure = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
plot(request.dividends(modified, dividends.gross, currency="USD"), "Modified Dividend")
plot(request.financial(standard, "TOTAL_REVENUE", "FQ", currency="USD"), "Standard Financial")
plot(request.financial(inherited, "TOTAL_REVENUE", "FQ", currency="USD"), "Inherited Financial")
plot(request.dividends(renko, dividends.gross, currency="USD"), "Renko Dividend")
plot(request.quandl(lineBreak, barmerge.gaps_off, 0), "Linebreak Quandl")
plot(request.splits(kagi, splits.numerator), "Kagi Split")
plot(request.earnings(pointFigure, earnings.actual, currency="USD"), "Point Figure Earnings")`, chartBars, { requestDatafeed: tickerModifierDatafeed });

    expect(findPlot(compiledResult, 'Modified Dividend').values).toEqual([0.7, 0.7, 0.7, 0.7, 0.7, 0.7]);
    expect(findPlot(compiledResult, 'Standard Financial').values).toEqual([2000, 2000, 2000, 2000, 2000, 2000]);
    expect(findPlot(compiledResult, 'Inherited Financial').values).toEqual([4000, 4000, 4000, 4000, 4000, 4000]);
    expect(findPlot(compiledResult, 'Renko Dividend').values).toEqual([0.8, 0.8, 0.8, 0.8, 0.8, 0.8]);
    expect(findPlot(compiledResult, 'Linebreak Quandl').values).toEqual([41, 41, 41, 41, 41, 41]);
    expect(findPlot(compiledResult, 'Kagi Split').values).toEqual([3, 3, 3, 3, 3, 3]);
    expect(findPlot(compiledResult, 'Point Figure Earnings').values).toEqual([3.1, 3.1, 3.1, 3.1, 3.1, 3.1]);
  });

  it('request.security evaluates requested symbol metadata with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request metadata")
aaplTickerLen = request.security("NASDAQ:AAPL", "D", str.length(syminfo.ticker), lookahead=barmerge.lookahead_on)
aaplTickerIdLen = request.security("NASDAQ:AAPL", "D", str.length(syminfo.tickerid), lookahead=barmerge.lookahead_on)
aaplCurrencyLen = request.security("NASDAQ:AAPL", "D", str.length(syminfo.currency), currency="EUR", lookahead=barmerge.lookahead_on)
aaplPeriodLen = request.security("NASDAQ:AAPL", "D", str.length(timeframe.period), lookahead=barmerge.lookahead_on)
mainTickerIdLen = request.security("NASDAQ:AAPL", "D", str.length(syminfo.main_tickerid), lookahead=barmerge.lookahead_on)
plot(aaplTickerLen, "Ticker")
plot(aaplTickerIdLen, "Ticker ID")
plot(aaplCurrencyLen, "Currency")
plot(aaplPeriodLen, "Period")
plot(mainTickerIdLen, "Main Ticker ID")`, chartBars, {
      requestDatafeed: multiSymbolDatafeed,
      runtime: { syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT' } },
    });
  });

  it('request.security evaluates requested session state with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled request session")
aaplMarket = request.security("NASDAQ:AAPL", "D", session.ismarket ? 1 : 0, lookahead=barmerge.lookahead_on)
plot(aaplMarket, "AAPL Market")`, chartBars, {
      requestDatafeed: requestSessionDatafeed,
      runtime: { session: { timezone: 'Etc/UTC', regular: '0000-0001:1234567' } },
    });
  });

  it('request.security returns tuple expression values aligned to chart', () => {
    const pine = `//@version=6
indicator("test")
[htfOpen, htfHigh, htfLow, htfClose] = request.security("TEST", "D", [open, high, low, close])
plot(htfOpen, title="HTF Open")
plot(htfHigh, title="HTF High")
plot(htfLow, title="HTF Low")
plot(htfClose, title="HTF Close")`;

    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    expect(compiled.securityScripts.size).toBe(1);

    const result = executeCompiled(compiled, chartBars, undefined, {
      requestDatafeed: datafeed,
    });
    expect(result).not.toBeNull();

    expect(result!.plots.map((plot) => plot.values)).toEqual([
      [null, null, 10, 10, 12, 12],
      [null, null, 13, 13, 15, 15],
      [null, null, 9, 9, 11, 11],
      [null, null, 12, 12, 14, 14],
    ]);
  });

  it('request.security_lower_tf returns intrabar arrays with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled lower tf", timeframe="2")
intrabars = request.security_lower_tf("TEST", "1", close)
ranges = request.security_lower_tf("TEST", "1", high - low)
plot(array.size(intrabars), "Count")
plot(array.get(intrabars, 0), "First")
plot(array.get(intrabars, array.size(intrabars) - 1), "Last")
plot(array.get(ranges, 0), "First Range")
plot(array.get(ranges, 1), "Second Range")`, lowerChartBars, { requestDatafeed: datafeed });
  });

  it('request.security_lower_tf supports source-parameter UDF wrappers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled lower tf wrapper", timeframe="2")
lower(series float source, string tf) =>
    request.security_lower_tf("TEST", tf, source)
intrabars = lower(close, "1")
openBars = lower(open, "1")
plot(array.size(intrabars), "Count")
plot(array.get(intrabars, 0), "First Close")
plot(array.get(openBars, 0), "First Open")`, lowerChartBars, { requestDatafeed: datafeed });
  });

  it('request.security_lower_tf wrapper helpers can read root inputs in compiled subprograms', () => {
    assertPlotParity(`//@version=6
indicator("compiled lower tf root input wrapper", timeframe="2")
len = input.int(2)
lower(series float source, string tf) =>
    request.security_lower_tf("TEST", tf, ta.sma(source, len))
intrabars = lower(close, "1")
plot(array.size(intrabars), "Count")
plot(array.get(intrabars, 1), "Second Close SMA")`, lowerChartBars, { requestDatafeed: datafeed });
  });

  it('request.security_lower_tf captures UDF local arrays in computed expressions with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled lower tf local array", timeframe="2")
len = input.int(2)
weighted(array<float> values) =>
    total = 0.0
    weight = 1.0
    for item in values
        total += nz(item) * weight
        weight += 1
    total
lower(series float source, string tf) =>
    values = array.from(source, source[1], ta.sma(source, len))
    request.security_lower_tf("TEST", tf, weighted(values))
intrabars = lower(close, "1")
plot(array.size(intrabars), "Count")
plot(array.get(intrabars, 0), "First Weighted")`, lowerChartBars, { requestDatafeed: datafeed });
  });

  it('request.security_lower_tf resolves mixed request arguments with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled lower tf mixed", timeframe="2")
intrabars = request.security_lower_tf(symbol="TEST", "1", close, false, na, false, 2)
plot(array.size(intrabars), "Count")`, lowerChartBars, { requestDatafeed: datafeed });
  });

  it('request.security_lower_tf handles invalid contexts with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled lower tf invalid", timeframe="2")
missing = request.security_lower_tf("MISSING", "1", close, ignore_invalid_symbol=true)
sameTf = request.security_lower_tf("TEST", "2", close, ignore_invalid_timeframe=true)
plot(array.size(missing), "Missing")
plot(array.size(sameTf), "Same TF")`, [lowerChartBars[0]!], { requestDatafeed: datafeed });
  });

  it('request.currency_rate merges series points with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled currency rate")
rate = request.currency_rate(currency.USD, "GBP")
plot(rate, "USDGBP")`, chartBars, { requestDatafeed: currencyRateDatafeed });
  });

  it('request.currency_rate resolves seeded provider rates with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled seeded currency rate")
rate = request.currency_rate("USD", "JPY")
plot(rate, "USDJPY")`, chartBars, { requestDatafeed: seededCurrencyRateDatafeed });

    expect(findPlot(compiledResult, 'USDJPY').values).toEqual([150, 150, 150, 151, 151, 151]);
  });

  it('request.currency_rate returns na for unseeded provider rates with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled unseeded currency rate")
missing = request.currency_rate("EUR", "JPY")
plot(na(missing) ? 1 : 0, "Missing Is NA")`, chartBars, { requestDatafeed: seededCurrencyRateDatafeed });

    expect(findPlot(compiledResult, 'Missing Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('request.currency_rate handles same and ignored missing currencies with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled currency rate edge cases")
same = request.currency_rate("USD", currency.USD)
missing = request.currency_rate("USD", "EUR", ignore_invalid_currency=true)
plot(same, "Same")
plot(missing, "Missing")`, [chartBars[0]!], { requestDatafeed: currencyRateDatafeed });
  });

  it('optional point-series requests merge fixture values with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled point requests")
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
earnings = request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD")
split = request.splits("NASDAQ:AAPL", splits.denominator)
revenue = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency="USD")
gdp = request.economic("US", "GDP")
plot(dividend, "Dividend")
plot(earnings, "Earnings")
plot(split, "Split")
plot(revenue, "Revenue")
plot(gdp, "GDP")`, chartBars, { requestDatafeed: pointSeriesDatafeed });
  });

  it('corporate-action requests resolve seeded provider events with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled seeded corporate actions")
gross = request.dividends("NASDAQ:AAPL", dividends.gross, currency=currency.USD)
net = request.dividends("NASDAQ:AAPL", dividends.net, gaps=barmerge.gaps_on, currency="USD")
actual = request.earnings("NASDAQ:AAPL", earnings.actual, currency="USD")
standardized = request.earnings("NASDAQ:AAPL", earnings.standardized, gaps=barmerge.gaps_on, currency="USD")
splitNum = request.splits("NASDAQ:AAPL", splits.numerator)
splitDen = request.splits("NASDAQ:AAPL", splits.denominator)
plot(gross, "Gross Dividend")
plot(net, "Net Dividend Gaps")
plot(actual, "Actual EPS")
plot(standardized, "Standardized EPS Gaps")
plot(splitNum, "Split Numerator")
plot(splitDen, "Split Denominator")`, chartBars, { requestDatafeed: corporateActionDatafeed });

    expect(findPlot(compiledResult, 'Gross Dividend').values).toEqual([null, 0.24, 0.24, 0.24, 0.25, 0.25]);
    expect(findPlot(compiledResult, 'Net Dividend Gaps').values).toEqual([null, 0.2, null, null, 0.21, null]);
    expect(findPlot(compiledResult, 'Actual EPS').values).toEqual([1.5, 1.5, 1.5, 1.5, 1.8, 1.8]);
    expect(findPlot(compiledResult, 'Standardized EPS Gaps').values).toEqual([1.45, null, null, null, 1.75, null]);
    expect(findPlot(compiledResult, 'Split Numerator').values).toEqual([null, null, null, 2, 2, 2]);
    expect(findPlot(compiledResult, 'Split Denominator').values).toEqual([null, null, null, 1, 1, 1]);
  });

  it('corporate-action requests return na for unseeded provider events with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled unseeded corporate actions")
dividend = request.dividends("MISSING", dividends.gross)
earnings = request.earnings("MISSING", earnings.actual)
split = request.splits("MISSING", splits.denominator)
plot(na(dividend) ? 1 : 0, "Missing Dividend")
plot(na(earnings) ? 1 : 0, "Missing Earnings")
plot(na(split) ? 1 : 0, "Missing Split")`, chartBars, { requestDatafeed: corporateActionDatafeed });

    expect(findPlot(compiledResult, 'Missing Dividend').values).toEqual([1, 1, 1, 1, 1, 1]);
    expect(findPlot(compiledResult, 'Missing Earnings').values).toEqual([1, 1, 1, 1, 1, 1]);
    expect(findPlot(compiledResult, 'Missing Split').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('request.economic resolves seeded provider values with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled seeded economic")
gdp = request.economic("US", "GDP")
plot(gdp, "GDP")`, chartBars, { requestDatafeed: seededEconomicDatafeed });

    expect(findPlot(compiledResult, 'GDP').values).toEqual([3.1, 3.1, 3.1, 3.3, 3.3, 3.3]);
  });

  it('request.economic returns na for unseeded provider values with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled unseeded economic")
gdp = request.economic("ZZ", "GDP")
plot(na(gdp) ? 1 : 0, "Missing Is NA")`, chartBars, { requestDatafeed: seededEconomicDatafeed });

    expect(findPlot(compiledResult, 'Missing Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('request.financial resolves seeded provider values by period with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled seeded financial")
quarterly = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ", currency=currency.USD)
annual = request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FY", gaps=barmerge.gaps_on, currency="USD")
plot(quarterly, "Quarterly Revenue")
plot(annual, "Annual Revenue Gaps")`, chartBars, { requestDatafeed: financialMetricDatafeed });

    expect(findPlot(compiledResult, 'Quarterly Revenue').values).toEqual([1000, 1000, 1000, 1000, 1100, 1100]);
    expect(findPlot(compiledResult, 'Annual Revenue Gaps').values).toEqual([4000, null, null, null, 4400, null]);
  });

  it('request.financial returns na for unseeded provider values with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled unseeded financial")
metric = request.financial("NASDAQ:AAPL", "NET_INCOME", "FQ")
plot(na(metric) ? 1 : 0, "Missing Is NA")`, chartBars, { requestDatafeed: financialMetricDatafeed });

    expect(findPlot(compiledResult, 'Missing Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('request.quandl resolves seeded provider values with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled seeded quandl")
cape = request.quandl("MULTPL/SHILLER_PE_RATIO_MONTH", barmerge.gaps_on, 0)
plot(cape, "CAPE")`, chartBars, { requestDatafeed: quandlDatafeed });

    expect(findPlot(compiledResult, 'CAPE').values).toEqual([28.5, null, null, null, 29.25, null]);
  });

  it('request.quandl returns na for unseeded provider values with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled unseeded quandl")
metric = request.quandl("MULTPL/SP500_PE_RATIO_MONTH", barmerge.gaps_off, 0, ignore_invalid_symbol=true)
plot(na(metric) ? 1 : 0, "Missing Is NA")`, chartBars, { requestDatafeed: quandlDatafeed });

    expect(findPlot(compiledResult, 'Missing Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('request.footprint resolves seeded provider objects with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled seeded footprint")
fp = request.footprint(10, 70)
rows = na(fp) ? array.new<float>() : fp.rows()
firstRow = array.size(rows) > 0 ? array.get(rows, 0) : na
pocRow = na(fp) ? na : fp.poc()
vahRow = na(fp) ? na : footprint.vah(fp)
valRow = na(fp) ? na : footprint.val(fp)
lookupPrice = bar_index < 4 ? 101.5 : 104.5
priceRow = na(fp) ? na : fp.get_row_by_price(lookupPrice)
namedPriceRow = na(fp) ? na : footprint.get_row_by_price(id=fp, price=close + 20)
firstBuyImbalance = na(firstRow) ? false : volume_row.has_buy_imbalance(firstRow)
valSellImbalance = na(valRow) ? false : volume_row.has_sell_imbalance(valRow)
plot(na(fp) ? na : footprint.total_volume(fp), "Total")
plot(na(fp) ? na : fp.buy_volume(), "Buy")
plot(na(fp) ? na : fp.sell_volume(), "Sell")
plot(na(fp) ? na : fp.delta(), "Delta")
plot(na(pocRow) ? na : pocRow.total_volume(), "POC Volume")
plot(na(vahRow) ? na : vahRow.up_price(), "VAH Up")
plot(na(valRow) ? na : volume_row.down_price(valRow), "VAL Down")
plot(na(priceRow) ? na : priceRow.total_volume(), "Price Row Volume")
plot(na(namedPriceRow) ? 1 : 0, "Missing Price Row Is NA")
plot(firstBuyImbalance ? 1 : 0, "First Buy Imbalance")
plot(valSellImbalance ? 1 : 0, "VAL Sell Imbalance")`, chartBars, { requestDatafeed: footprintDatafeed });

    expect(findPlot(compiledResult, 'Total').values).toEqual([1200, 1200, 1200, 1200, 1400, 1400]);
    expect(findPlot(compiledResult, 'Buy').values).toEqual([700, 700, 700, 700, 820, 820]);
    expect(findPlot(compiledResult, 'Sell').values).toEqual([500, 500, 500, 500, 580, 580]);
    expect(findPlot(compiledResult, 'Delta').values).toEqual([200, 200, 200, 200, 240, 240]);
    expect(findPlot(compiledResult, 'POC Volume').values).toEqual([850, 850, 850, 850, 950, 950]);
    expect(findPlot(compiledResult, 'VAH Up').values).toEqual([103, 103, 103, 103, 106, 106]);
    expect(findPlot(compiledResult, 'VAL Down').values).toEqual([100, 100, 100, 100, 103, 103]);
    expect(findPlot(compiledResult, 'Price Row Volume').values).toEqual([850, 850, 850, 850, 950, 950]);
    expect(findPlot(compiledResult, 'Missing Price Row Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
    expect(findPlot(compiledResult, 'First Buy Imbalance').values).toEqual([0, 0, 0, 0, 0, 0]);
    expect(findPlot(compiledResult, 'VAL Sell Imbalance').values).toEqual([1, 1, 1, 1, 1, 1]);
    expect(compiledResult.profile.executionMode).toBe('compiled');
  });

  it('request.footprint returns na for unseeded provider objects with reference parity', () => {
    const { compiledResult } = assertPlotParity(`//@version=6
indicator("compiled unseeded footprint")
fp = request.footprint(ticks_per_row=5, va_percent=68, imbalance_percent=250)
missingTotal = na(fp) ? na : fp.total_volume()
plot(na(fp) ? 1 : 0, "Missing Is NA")
plot(na(missingTotal) ? 1 : 0, "Guarded Total Is NA")`, chartBars, { requestDatafeed: footprintDatafeed });

    expect(findPlot(compiledResult, 'Missing Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
    expect(findPlot(compiledResult, 'Guarded Total Is NA').values).toEqual([1, 1, 1, 1, 1, 1]);
    expect(compiledResult.profile.executionMode).toBe('compiled');
  });

  it('optional point-series requests handle gaps and ignored missing fixtures with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled point request gaps")
dividend = request.dividends("NASDAQ:AAPL", dividends.gross, gaps=barmerge.gaps_on, currency="USD")
missingDividend = request.dividends("MISSING", dividends.gross, ignore_invalid_symbol=true)
missingFinancial = request.financial("MISSING", "TOTAL_REVENUE", "FQ", ignore_invalid_symbol=true)
missingEconomic = request.economic("ZZ", "GDP", ignore_invalid_symbol=true)
plot(dividend, "Dividend")
plot(missingDividend, "Missing Dividend")
plot(missingFinancial, "Missing Financial")
plot(missingEconomic, "Missing Economic")`, chartBars, { requestDatafeed: pointSeriesDatafeed });
  });

  it('request.seed evaluates requested expressions with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled seed request")
seedClose = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", close)
seedAverage = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", ta.sma(close, 2))
plot(seedClose, "Seed Close")
plot(seedAverage, "Seed Average")`, chartBars, { requestDatafeed: seedDatafeed });
  });

  it('request.seed supports source-parameter UDF wrappers with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled seed wrapper")
seedWrap(series float source) =>
    request.seed("tradingview-pine-seeds/demo", "BTC_DEV", source)
plot(seedWrap(close), "Seed Close")
plot(seedWrap(open), "Seed Open")`, chartBars, { requestDatafeed: seedDatafeed });
  });

  it('request.seed wrapper helpers can read root inputs in compiled subprograms', () => {
    assertPlotParity(`//@version=6
indicator("compiled seed root input wrapper")
len = input.int(2)
seedWrap(series float source) =>
    request.seed("tradingview-pine-seeds/demo", "BTC_DEV", ta.sma(source, len))
plot(seedWrap(close), "Seed Close SMA")`, chartBars, { requestDatafeed: seedDatafeed });
  });

  it('request.seed captures UDF local arrays in computed expressions with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled seed local array")
len = input.int(2)
weighted(array<float> values) =>
    total = 0.0
    weight = 1.0
    for item in values
        total += nz(item) * weight
        weight += 1
    total
seedWrap(series float source) =>
    values = array.from(source, source[1], ta.sma(source, len))
    request.seed("tradingview-pine-seeds/demo", "BTC_DEV", weighted(values))
plot(seedWrap(close), "Seed Weighted")`, chartBars, { requestDatafeed: seedDatafeed });
  });

  it('request.seed handles calc bars and ignored missing contexts with reference parity', () => {
    assertPlotParity(`//@version=6
indicator("compiled seed request edge cases")
seedClose = request.seed("tradingview-pine-seeds/demo", "BTC_DEV", close, calc_bars_count=2)
missing = request.seed("missing/repo", "MISSING", close, ignore_invalid_symbol=true)
plot(seedClose, "Seed Close")
plot(missing, "Missing")`, chartBars, { requestDatafeed: seedDatafeed });
  });

  it('reports missing request datafeeds from compiled execution', () => {
    const pine = `//@version=6
indicator("compiled request missing datafeed")
htfClose = request.security("TEST", "D", close)
plot(htfClose, "HTF Close")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, [chartBars[0]!]);

    expect(compiledResult?.errors[0]?.message).toBe('request.security requires a request datafeed');
    expect(compiledResult?.profile.executionMode).toBe('compiled');
  });

  it('reports tryExecuteScript request errors when compiled requests lack a datafeed', () => {
    const pine = `//@version=6
indicator("compiled request fallback reason")
htfClose = request.security("TEST", "D", close)
plot(htfClose, "HTF Close")`;
    const ast = parse(pine);
    const fallbackReasons: string[] = [];

    const result = tryExecuteScript(ast, [chartBars[0]!], undefined, {
      onFallback: (reason) => fallbackReasons.push(reason),
    });

    expect(result?.errors[0]?.message).toBe('request.security requires a request datafeed');
    expect(findPlot(result!, 'HTF Close').values).toEqual([null]);
    expect(result?.profile.executionMode).toBe('compiled');
    expect(fallbackReasons).toEqual([]);
  });

  it('keeps imported library scripts on the compiled path when the host supplies libraries', () => {
    const library = parse(`//@version=6
library("WorkerTools", true)
export smooth(series float source) =>
    ta.sma(source, 2)`);
    const pine = `//@version=6
indicator("worker libraries")
import TestUser/WorkerTools/1 as wt
plot(wt.smooth(close), "Smooth")`;
    const ast = parse(pine);
    const fallbackReasons: string[] = [];

    const missingLibraryResult = tryExecuteScript(ast, chartBars, undefined, {
      onFallback: (reason) => fallbackReasons.push(reason),
    });
    const compiledResult = tryExecuteScript(ast, chartBars, undefined, {
      libraries: new Map([['TestUser/WorkerTools/1', library]]),
    });
    const interpResult = executeScript(ast, chartBars, undefined, {
      libraries: new Map([['TestUser/WorkerTools/1', library]]),
    });

    expect(missingLibraryResult?.errors.map((error) => error.message)).toEqual([
      'import not found in deterministic library registry: TestUser/WorkerTools/1 as wt',
    ]);
    expect(fallbackReasons).toEqual([]);
    expect(compiledResult?.profile.executionMode).toBe('compiled');
    expect(compiledResult?.errors).toEqual([]);
    expect(compiledResult?.plots[0]?.values).toEqual(interpResult.plots[0]?.values);
  });

  it('executes official TradingView ta library builtins without host-supplied source', () => {
    const pine = `//@version=6
indicator("official ta")
import TradingView/ta/7
plot(ta.changePercent(close, open), "Change")
plot(ta.dema(close, 2), "Official DEMA")
plot(ta.rsi(close, 14), "Native RSI")`;
    const result = executeScript(parse(pine), makeBars([100, 105, 110]));

    expect(result.errors).toEqual([]);
    expect(result.profile.executionMode).toBe('compiled');
    expect(result.plots[0]?.title).toBe('Change');
    expect(result.plots[0]?.values.map((value) => value === null ? null : Number(value.toFixed(8)))).toEqual([
      0.50251256,
      0.4784689,
      0.456621,
    ]);
    expect(result.plots[1]?.title).toBe('Official DEMA');
    expect(result.plots[1]?.values.every((value) => value !== null && Number.isFinite(value))).toBe(true);
    expect(result.plots[2]?.title).toBe('Native RSI');
  });

  it('executes aliased official TradingView ta supertrend through the native TA state machine', () => {
    const pine = `//@version=6
indicator("official ta aliased supertrend")
import TradingView/ta/9 as tvta
[trend, direction] = tvta.supertrend(2.5, 3)
plot(trend, "Trend")
plot(direction, "Direction")`;
    const result = executeScript(parse(pine), makeBars([100, 105, 110, 103, 99, 101]));

    expect(result.errors).toEqual([]);
    expect(result.profile.executionMode).toBe('compiled');
    expect(result.plots.map((plot) => plot.title)).toEqual(['Trend', 'Direction']);
    expect(result.plots[0]?.values.some((value) => value !== null && Number.isFinite(value))).toBe(true);
    expect(result.plots[1]?.values.some((value) => value !== null && Number.isFinite(value))).toBe(true);
  });

  it('executes official TradingView ZigZag v8 imports without host-supplied source', () => {
    const pine = `//@version=6
indicator("official zigzag")
import TradingView/ZigZag/8 as zlib
settings = zlib.Settings.new(devThreshold=3.0, depth=12, allowZigZagOnOneBar=true)
var zlib.ZigZag zigZag = zlib.newInstance(settings)
changed = zlib.update(zigZag)
array<zlib.Pivot> pivots = zigZag.pivots
last = zlib.lastPivot(zigZag)
plot(array.size(pivots), "Pivot Count")
plot(na(last) ? 1 : last.end.index - last.start.index, "Last Span")`;
    const result = executeScript(parse(pine), makeBars([100, 105, 110]));

    expect(result.errors).toEqual([]);
    expect(result.profile.executionMode).toBe('compiled');
    expect(result.plots.map((plot) => plot.title)).toEqual(['Pivot Count', 'Last Span']);
    expect(result.plots[0]?.values).toEqual([0, 0, 0]);
    expect(result.plots[1]?.values).toEqual([1, 1, 1]);
  });

  it('returns na for missing currency rates with reference parity', () => {
    const pine = `//@version=6
indicator("compiled missing currency rate")
rate = request.currency_rate("USD", "EUR")
plot(na(rate) ? 1 : 0, "Missing Is NA")`;
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, [chartBars[0]!], undefined, {
      requestDatafeed: currencyRateDatafeed,
    });
    const interpResult = executeScript(ast, [chartBars[0]!], undefined, {
      requestDatafeed: currencyRateDatafeed,
    });

    expect(compiledResult?.errors).toEqual([]);
    expect(interpResult.errors).toEqual([]);
    expect(findPlot(compiledResult!, 'Missing Is NA').values).toEqual(findPlot(interpResult, 'Missing Is NA').values);
    expect(findPlot(compiledResult!, 'Missing Is NA').values).toEqual([1]);
  });

  it('enforces unique request context caps with reference parity', () => {
    const requestLines = Array.from({ length: 41 }, (_, index) => (
      `rate${index} = request.currency_rate("USD", "C${index}")`
    )).join('\n');
    const pine = `//@version=6
indicator("compiled unique request cap")
${requestLines}
plot(rate40, "Last Rate")`;
    const permissiveDatafeed: RequestDatafeed = {
      getBars() {
        return { ok: false, code: 'missing_context', message: 'no bars' };
      },
      getSeries(query) {
        return { ok: true, context: { ...query, points: [{ time: chartBars[0]!.time, value: 1 }] } };
      },
    };
    const ast = parse(pine);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);

    const compiledResult = executeCompiled(compiled, [chartBars[0]!], undefined, {
      requestDatafeed: permissiveDatafeed,
    });
    const interpResult = executeScript(ast, [chartBars[0]!], undefined, {
      requestDatafeed: permissiveDatafeed,
    });

    expect(compiledResult?.errors[0]?.message).toBe(interpResult.errors[0]?.message);
    expect(compiledResult?.errors[0]?.message).toBe('Too many unique request.* contexts: maximum is 40');
  });
});
