import { afterAll, describe, expect, it } from 'vitest';

import {
  InMemoryRequestDatafeed,
  classifyPineCompatibilitySource,
  executeScript,
  getCompiledFallbackBaselineGroup,
  parse,
  seedRequestSymbol,
  type Bar,
  type ExecutionResult,
  type PlotOutput,
  type TealscriptExecutionOptions,
} from '../../src';
import { summarizeCompiledFallbackReasons } from '../../src/compat/compiledFallbackBaseline';
import {
  getProductionWorkerFallbackBaselineGroup,
  isProductionWorkerFallbackMeasurement,
  summarizeRealtimeParityMismatches,
  summarizeProductionWorkerExecutionModes,
  summarizeProductionWorkerFallbackReasons,
} from '../../src/compat/productionWorkerFallbackBaseline';
import { checkProgram } from '../../src/semantic/checker';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen';
import { measureProductionWorkerSessions, measureRealtimeReentryParity, type ProductionWorkerCase } from './productionWorkerHarness';

const LONG_COMPOSITE_TIMEOUT_MS = 30_000;
const RUN_REALTIME_SWEEP = process.env.TEALSCRIPT_REALTIME_SWEEP === '1';
const REALTIME_SWEEP_BACKEND = 'worker';
const realtimeSweepIt = RUN_REALTIME_SWEEP ? it : it.skip;

function makeBars(closes: number[], start = 1_700_000_000_000, step = 60_000): Bar[] {
  return closes.map((close, i) => ({
    time: start + i * step,
    open: close - (i % 2 === 0 ? 0.5 : -0.25),
    high: close + 1.25,
    low: close - 1.1,
    close,
    volume: 900 + i * 37,
  }));
}

function approxArrayEqual(a: (number | null)[], b: (number | null)[], tol = 1e-10): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    if (av === null && bv === null) continue;
    if (av === null || bv === null) return false;
    if (Math.abs(av - bv) > tol) return false;
  }
  return true;
}

function findPlot(result: ExecutionResult, title: string): PlotOutput {
  const plot = result.plots.find((candidate) => candidate.title === title);
  if (!plot) throw new Error(`Missing plot ${title}`);
  return plot;
}

function assertCompositeParity(source: string, options: TealscriptExecutionOptions = {}, bars: Bar[] = chartBars) {
  const ast = parse(source);
  const semantic = checkProgram(ast, { libraries: options.libraries });
  if (semantic.diagnostics.length > 0) {
    throw new Error(`Semantic diagnostics: ${semantic.diagnostics.map((d) => d.message).join('; ')}`);
  }

  const classification = classifyPineCompatibilitySource(source, { bars, engineOptions: options });
  const failedStage = classification.find((stage) => stage.status === 'failed');
  if (failedStage) {
    throw new Error(`Classification failed: ${JSON.stringify(classification)}`);
  }

  const compiled = tryCompile(ast, undefined, { libraries: options.libraries });
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }

  const compiledResult = executeCompiled(compiled, bars, undefined, options);
  if (!compiledResult) throw new Error('Compiled execution returned null');
  const interpretedResult = executeScript(ast, bars, undefined, options);

  expect(compiledResult.errors).toEqual([]);
  expect(interpretedResult.errors).toEqual([]);
  expect(compiledResult.plots.length).toBe(interpretedResult.plots.length);

  for (let i = 0; i < compiledResult.plots.length; i += 1) {
    const compiledPlot = compiledResult.plots[i]!;
    const interpretedPlot = interpretedResult.plots[i]!;
    if (!approxArrayEqual(compiledPlot.values, interpretedPlot.values)) {
      const firstDiff = compiledPlot.values.findIndex((value, index) => {
        const other = interpretedPlot.values[index];
        if (value === null && other === null) return false;
        if (value === null || other === null) return true;
        return Math.abs(value - other) > 1e-10;
      });
      throw new Error(
        `${compiledPlot.title} mismatch at ${firstDiff}: compiled=${compiledPlot.values[firstDiff]}, reference=${interpretedPlot.values[firstDiff]}`,
      );
    }
  }

  return { compiledResult, interpretedResult };
}

function assertLongCompositeParity(source: string) {
  const lineCount = source.trim().split('\n').length;
  expect(lineCount).toBeGreaterThanOrEqual(150);
  expect(lineCount).toBeLessThanOrEqual(300);
  return assertCompositeParity(source, longEngineOptions, longChartBars);
}

const trueLengthCompositeCompileResults: Array<{ scriptId: string; reasons: readonly string[] }> = [];
const awkwardCompositeCompileResults: Array<{ scriptId: string; reasons: readonly string[] }> = [];
const trueLengthCompositeProductionCases: ProductionWorkerCase[] = [];
const awkwardCompositeProductionCases: ProductionWorkerCase[] = [];

function assertTrueLengthCompositeParity(source: string) {
  const lineCount = source.trim().split('\n').length;
  expect(lineCount).toBeGreaterThanOrEqual(200);
  expect(lineCount).toBeLessThanOrEqual(300);
  const scriptId = source.match(/indicator\("([^"]+)"/)?.[1] ?? `true-length-${trueLengthCompositeCompileResults.length + 1}`;
  const ast = parse(source);
  const compiled = tryCompile(ast, undefined, { libraries: longEngineOptions.libraries });
  trueLengthCompositeCompileResults.push({
    scriptId,
    reasons: compiled.success ? [] : compiled.unsupported,
  });
  trueLengthCompositeProductionCases.push({
    scriptId,
    source,
    bars: longChartBars,
    engineOptions: longEngineOptions,
  });
  return assertCompositeParity(source, longEngineOptions, longChartBars);
}

function assertAwkwardCompositeParity(source: string) {
  const scriptId = source.match(/indicator\("([^"]+)"/)?.[1] ?? `awkward-${awkwardCompositeCompileResults.length + 1}`;
  const ast = parse(source);
  const compiled = tryCompile(ast, undefined, { libraries: longEngineOptions.libraries });
  awkwardCompositeCompileResults.push({
    scriptId,
    reasons: compiled.success ? [] : compiled.unsupported,
  });
  awkwardCompositeProductionCases.push({
    scriptId,
    source,
    bars: longChartBars,
    engineOptions: longEngineOptions,
  });
  return assertCompositeParity(source, longEngineOptions, longChartBars);
}

const chartBars = makeBars([100, 101.5, 99.5, 103, 104.5, 102, 106, 107.5, 105, 108.5, 110, 109]);
const htfBars = makeBars([101, 103, 106, 109, 111, 110, 113], chartBars[0]!.time, 120_000);
const lowerBars = makeBars([99, 100, 101, 102, 103, 104, 105, 106], chartBars[0]!.time, 30_000);
const longChartBars = makeBars(
  Array.from({ length: 220 }, (_, i) => 100 + Math.sin(i / 6) * 4 + i * 0.07 + ((i % 9) - 4) * 0.18),
);
const longHtfBars = makeBars(
  Array.from({ length: 90 }, (_, i) => 102 + Math.sin(i / 5) * 5 + i * 0.12),
  longChartBars[0]!.time,
  180_000,
);
const longLowerBars = makeBars(
  Array.from({ length: 360 }, (_, i) => 99 + Math.sin(i / 8) * 3 + i * 0.025),
  longChartBars[0]!.time,
  30_000,
);

const compositeLibrary = parse(`//@version=6
library("CompositeHelpers", true)
export const int FAST = 3
export const string HTF = "3"
export enum Regime
    trend = "Trend"
    range
export type Dashboard
    float score = na
    string title = "Score"
export smooth(series float source, simple int len) =>
    ta.ema(source, len)
export blockScore(series float source, simple int fastLen, simple int slowLen) =>
    fast = ta.ema(source, fastLen)
    slow = ta.sma(source, slowLen)
    fast - slow
export method adjusted(Dashboard this, float offset, float factor=1) =>
    next = this.score + offset * factor
    next
export wrapSecurity(simple string symbol, simple string tf, series float source, simple int len) =>
    request.security(symbol, tf, ta.sma(source, len), lookahead=barmerge.lookahead_on)
`);

const engineOptions: TealscriptExecutionOptions = {
  libraries: new Map([['PublicUser/CompositeHelpers/1', compositeLibrary]]),
  requestDatafeed: new InMemoryRequestDatafeed([
    {
      symbol: 'TEST',
      timeframe: '3',
      bars: htfBars,
      syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
      session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
    },
    {
      symbol: 'TEST',
      timeframe: '30S',
      bars: lowerBars,
      syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: '3',
      bars: htfBars.map((bar) => ({ ...bar, close: bar.close + 2 })),
      syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL', currency: 'USD', timezone: 'Etc/UTC' },
    },
    {
      symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'OSC'),
      timeframe: '1',
      bars: htfBars,
    },
  ]),
  runtime: {
    now: Date.UTC(2024, 0, 5, 8, 15),
    syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC', currency: 'USDT' },
    timeframe: { period: '1', multiplier: 1, isintraday: true },
    chart: {
      leftVisibleBarTime: chartBars[2]!.time,
      rightVisibleBarTime: chartBars[9]!.time,
      bgColor: '#101014',
      fgColor: '#eeeeee',
    },
    session: {
      timezone: 'Etc/UTC',
      regular: '0000-2359:1234567',
      premarket: '2300-2359:1234567',
      postmarket: '0000-0100:1234567',
    },
  },
};

const longEngineOptions: TealscriptExecutionOptions = {
  ...engineOptions,
  requestDatafeed: new InMemoryRequestDatafeed([
    {
      symbol: 'TEST',
      timeframe: '3',
      bars: longHtfBars,
      syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
      session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
    },
    {
      symbol: 'TEST',
      timeframe: '15',
      bars: longHtfBars.map((bar) => ({ ...bar, close: bar.close + 1 })),
      syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'TEST',
      timeframe: '30S',
      bars: longLowerBars,
      syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: '3',
      bars: longHtfBars.map((bar) => ({ ...bar, close: bar.close + 2 })),
      syminfo: { ticker: 'AAPL', tickerid: 'NASDAQ:AAPL', currency: 'USD', timezone: 'Etc/UTC' },
      session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
    },
    {
      symbol: 'NASDAQ:MSFT',
      timeframe: '15',
      bars: longHtfBars.map((bar) => ({ ...bar, close: bar.close - 1.5 })),
      syminfo: { ticker: 'MSFT', tickerid: 'NASDAQ:MSFT', currency: 'USD', timezone: 'Etc/UTC' },
      session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
    },
    {
      symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'OSC'),
      timeframe: '1',
      bars: longHtfBars,
    },
  ]),
  runtime: {
    ...engineOptions.runtime,
    chart: {
      leftVisibleBarTime: longChartBars[20]!.time,
      rightVisibleBarTime: longChartBars[180]!.time,
      bgColor: '#101014',
      fgColor: '#eeeeee',
    },
  },
};

describe('composite public-style indicator parity', { timeout: LONG_COMPOSITE_TIMEOUT_MS }, () => {
  afterAll(() => {
    for (const [groupId, results] of [
      ['true-length-composites', trueLengthCompositeCompileResults],
      ['awkward-composites', awkwardCompositeCompileResults],
    ] as const) {
      const baseline = getCompiledFallbackBaselineGroup(groupId);
      const fallbacks = results.filter((result) => result.reasons.length > 0);

      expect(results.length).toBe(baseline.scriptCount);
      expect(results.length).toBe(baseline.eligible);
      expect(results.length - fallbacks.length).toBe(baseline.compiled);
      expect(fallbacks.length).toBe(baseline.fallback);
      expect(fallbacks.length / results.length).toBe(baseline.fallbackRate);
      expect(summarizeCompiledFallbackReasons(fallbacks)).toEqual(baseline.knownFallbackReasons);
    }
  });

  it('runs an MTF trend dashboard with imports, drawings, fills, and alerts', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite MTF Trend Dashboard", overlay=true, max_labels_count=20, max_lines_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupCore = "Core"
fastLen = input.int(3, "Fast", minval=1, tooltip="Fast EMA", inline="len", group=groupCore)
slowLen = input.int(5, "Slow", minval=2, tooltip="Slow SMA", inline="len", group=groupCore)
tf = input.timeframe(helper.HTF, "Higher timeframe", group=groupCore)
showDash = input.bool(true, "Dashboard", inline="dash", group=groupCore)
type State
    float lastScore = na
    int flips = 0
calcScore(series float src, simple int fast, simple int slow) =>
    emaValue = helper.smooth(src, fast)
    smaValue = ta.sma(src, slow)
    emaValue - smaValue
mtfPack(series float src, simple string htf, simple int fast, simple int slow) =>
    request.security("TEST", htf, [calcScore(src, fast, slow), helper.blockScore(src, fast, slow)], lookahead=barmerge.lookahead_on)
[score, importedScore] = mtfPack(close, tf, fastLen, slowLen)
var State state = State.new()
changed = ta.change(score)
if not na(changed) and math.abs(changed) > 0
    state.flips += 1
state.lastScore := nz(score, state.lastScore)
dash = helper.Dashboard.new(score=state.lastScore, title=helper.Regime.trend.title())
adjusted = dash.adjusted(importedScore, factor=0.5)
fastPlot = plot(score, "Score", color=color.teal, linewidth=2)
slowPlot = plot(adjusted, "Adjusted", color=color.orange)
h = hline(0, "Zero", color=color.gray)
fill(fastPlot, slowPlot, color=color.new(color.blue, 85), title="Score Fill")
plotshape(score > adjusted and session.ismarket, title="Bull", style=shape.triangleup, location=location.belowbar, text="B")
bgcolor(timeframe.isintraday and score > 0 ? color.new(color.green, 90) : na)
var table board = table.new(position.top_right, 2, 2)
if showDash and barstate.islast
    table.cell(board, 0, 0, dash.title)
    table.cell(board, 1, 0, str.format("{0:#.00}", adjusted))
    label.new(bar_index, high, str.format("{0} {1}", dash.title, state.flips))
alertcondition(score > adjusted, title="Trend Up", message="Score crossed")`, engineOptions);

    expect(findPlot(compiledResult, 'Score').values.some((value) => value !== null)).toBe(true);
    expect(compiledResult.alerts.some((alert) => alert.title === 'Trend Up')).toBe(true);
  });

  it('runs an oscillator composite with imported request wrappers and persistent labels', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Oscillator", overlay=false, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupOsc = "Oscillator"
len = input.int(helper.FAST, "Length", minval=2, group=groupOsc, inline="osc")
signalLen = input.int(4, "Signal", minval=2, group=groupOsc, inline="osc")
source = input.source(close, "Source", group=groupOsc)
normalize(series float value, simple int length) =>
    hi = ta.highest(value, length)
    lo = ta.lowest(value, length)
    span = hi - lo
    span == 0 ? 0 : (value - lo) / span * 100
calc(series float src, simple int length) =>
    base = ta.rsi(src, length)
    normalize(base, length)
remote = helper.wrapSecurity("TEST", helper.HTF, source, len)
osc = calc(source, len)
signal = ta.ema(osc, signalLen)
seeded = request.seed("tradingview-pine-seeds/demo", "OSC", ta.sma(close, 2))
var label lastLabel = na
if barstate.islast
    lastLabel := label.new(bar_index, osc, str.format("osc {0:#.0} seed {1:#.0}", osc, seeded))
upper = hline(70, "Upper")
lower = hline(30, "Lower")
fill(upper, lower, color=color.new(color.gray, 92), title="Band")
plot(osc, "Osc")
plot(signal, "Signal")
plot(remote, "Remote")
plotshape(ta.crossover(osc, signal), title="Cross Up", style=shape.circle, text="X")
alertcondition(ta.crossunder(osc, signal), title="Cross Down", message="Oscillator down")`, engineOptions);

    expect(findPlot(compiledResult, 'Remote').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a session breadth table with arrays, maps, and lower timeframe requests', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Session Breadth", overlay=true, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupBreadth = "Breadth"
tfLower = input.timeframe("30S", "Lower", group=groupBreadth)
threshold = input.float(0.0, "Threshold", step=0.1, group=groupBreadth)
inWindow() =>
    chart.left_visible_bar_time <= time and time <= chart.right_visible_bar_time
lowerValues = request.security_lower_tf("TEST", tfLower, helper.blockScore(close, 2, 3))
var map<string, float> scores = map.new<string, float>()
var table panel = table.new(position.bottom_right, 2, 3)
sum = 0.0
for [index, item] in lowerValues
    sum += nz(item)
count = array.size(lowerValues)
avg = count > 0 ? sum / count : na
map.put(scores, "avg", avg)
map.put(scores, "close", close)
visibleScore = inWindow() ? map.get(scores, "avg") : na
if barstate.islast
    table.cell(panel, 0, 0, "Avg")
    table.cell(panel, 1, 0, str.format("{0:#.00}", visibleScore))
plot(visibleScore, "Visible Avg")
plot(map.get(scores, "close"), "Close Map")
plotshape(visibleScore > threshold and session.ismarket, title="Breadth", style=shape.diamond, text="A")
alertcondition(visibleScore > threshold, title="Breadth Above", message="Breadth above threshold")`, engineOptions);

    expect(findPlot(compiledResult, 'Visible Avg').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a ticker synthetic composite with modified Heikin-Ashi request output', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Synthetic Ticker", overlay=true, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper
base = input.symbol("NASDAQ:AAPL", "Base", group="Ticker", tooltip="Requested symbol")
modified = ticker.modify(base, session=session.extended, adjustment=adjustment.splits)
ha = ticker.heikinashi(modified)
standard = ticker.standard(ha)
remoteClose = request.security(ha, helper.HTF, close, lookahead=barmerge.lookahead_on)
remoteTrend = request.security(ha, helper.HTF, helper.blockScore(close, 2, 3), lookahead=barmerge.lookahead_on)
trend(series float value) =>
    value > nz(value[1], value) ? 1 : value < nz(value[1], value) ? -1 : 0
state = trend(remoteClose)
plot(remoteClose, "HA Close", color=color.purple)
plot(remoteTrend, "HA Trend", color=color.yellow)
plot(str.length(standard), "Standard Length")
plotshape(state > 0, title="HA Up", style=shape.triangleup, location=location.belowbar, text="HA")
bgcolor(state < 0 ? color.new(color.red, 88) : na)
alertcondition(state > 0, title="HA Up Alert", message="Heikin-Ashi up")`, engineOptions);

    expect(findPlot(compiledResult, 'HA Close').values.some((value) => value !== null)).toBe(true);
  });

  it('runs imported UDT state with tuple request destructuring and field history', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Imported State", overlay=false, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper
len = input.int(3, "Length", minval=2, group="State")
pack(series float src, simple int length) =>
    request.security("TEST", helper.HTF, [helper.blockScore(src, 2, length), ta.sma(src, length)], lookahead=barmerge.lookahead_on)
[score, basis] = pack(close, len)
dash = helper.Dashboard.new(score=score, title=helper.Regime.range.title())
adjusted = dash.adjusted(basis, factor=0.25)
previous = dash.score[1]
delta = dash.score - nz(previous, dash.score)
var float persistent = na
persistent := nz(persistent[1], adjusted)
if not na(adjusted)
    persistent := adjusted
plot(dash.score, "Score")
plot(previous, "Previous")
plot(delta, "Delta")
plot(persistent, "Persistent")
plotshape(delta > 0, title="Delta Up", style=shape.square, text="D")
alertcondition(delta < 0, title="Delta Down", message="Delta down")`, engineOptions);

    expect(findPlot(compiledResult, 'Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a formatted dashboard composite with forward UDF calls and mixed placeholders', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Format Dashboard", overlay=true, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupFormat = "Format"
len = input.int(3, "Length", group=groupFormat, inline="fmt", tooltip="Rolling length")
show = input.bool(true, "Show", group=groupFormat, inline="fmt")
finalScore(series float src) =>
    rawScore(src, len) + helper.blockScore(src, 2, len)
rawScore(series float src, simple int length) =>
    ta.sma(src, length) - nz(ta.sma(src, length)[1], ta.sma(src, length))
score = finalScore(close)
remote = request.security("TEST", helper.HTF, finalScore(close), lookahead=barmerge.lookahead_on)
var array<float> recent = array.new_float()
if not na(score)
    array.push(recent, score)
if array.size(recent) > 5
    array.shift(recent)
sum = 0.0
for item in recent
    sum += item
avg = array.size(recent) > 0 ? sum / array.size(recent) : na
txt = str.format("avg {0:#.00} remote {1} flag {2}", avg, remote, score > 0)
if show and barstate.islast
    label.new(bar_index, close, txt)
plot(score, "Score")
plot(avg, "Average")
plot(remote, "Remote")
plotshape(score > avg, title="Above Avg", text="AVG")
alertcondition(score > avg, title="Score Above Average", message="Score above average")`, engineOptions);

    expect(findPlot(compiledResult, 'Average').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a drawing lifecycle composite with request-fed state', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Drawing Lifecycle", overlay=true, max_lines_count=20, max_labels_count=20, max_boxes_count=10)
import PublicUser/CompositeHelpers/1 as helper
groupDraw = "Draw"
len = input.int(3, "Length", minval=2, inline="draw", group=groupDraw, tooltip="Swing length")
tf = input.timeframe(helper.HTF, "Request", inline="draw", group=groupDraw)
show = input.bool(true, "Show", group=groupDraw)
type Swing
    float level = na
    int born = na
swingScore(series float src, simple int length) =>
    basis = ta.sma(src, length)
    basis - nz(basis[1], basis)
remoteSwing(simple string reqTf, series float src, simple int length) =>
    request.security("TEST", reqTf, [swingScore(src, length), helper.blockScore(src, 2, length)], lookahead=barmerge.lookahead_on)
[delta, remoteBias] = remoteSwing(tf, close, len)
var Swing swing = Swing.new()
if not na(delta) and (na(swing.level) or math.abs(delta) > math.abs(swing.level))
    swing.level := delta
    swing.born := bar_index
var line guide = na
var box zone = na
var label tag = na
upper = swing.level + remoteBias
lower = swing.level - remoteBias
if show and barstate.islast
    guide := line.new(swing.born, swing.level, bar_index, upper, color=color.new(color.teal, 20), width=2)
    zone := box.new(swing.born, upper, bar_index, lower, bgcolor=color.new(color.orange, 85), border_color=color.orange)
    tag := label.new(bar_index, upper, str.format("swing {0:#.00} bars {1}", swing.level, bar_index - swing.born))
zero = hline(0, "Zero")
scorePlot = plot(swing.level, "Swing")
biasPlot = plot(remoteBias, "Bias")
fill(scorePlot, biasPlot, color=color.new(color.green, 90), title="Swing Fill")
plotshape(delta > 0 and session.ismarket, title="Positive Swing", style=shape.triangleup, text="S")
bgcolor(delta < 0 ? color.new(color.red, 90) : na)
alertcondition(delta > remoteBias, title="Swing Break", message="Swing break")`, engineOptions);

    expect(findPlot(compiledResult, 'Swing').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a request metadata dashboard composite with tables and labels', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Metadata Dashboard", overlay=false, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupMeta = "Meta"
sym = input.symbol("NASDAQ:AAPL", "Symbol", inline="meta", group=groupMeta)
tf = input.timeframe(helper.HTF, "TF", inline="meta", group=groupMeta, tooltip="Requested timeframe")
len = input.int(3, "Length", minval=2, group=groupMeta)
type Row
    float value = na
    string caption = ""
metaScore(simple string tickerId, simple string reqTf, series float src, simple int length) =>
    request.security(tickerId, reqTf, helper.blockScore(src, 2, length) + str.length(syminfo.ticker), lookahead=barmerge.lookahead_on)
formatRow(Row row, string suffix) =>
    str.format("{0}: {1:#.00} {2}", row.caption, row.value, suffix)
remote = metaScore(sym, tf, close, len)
local = helper.blockScore(close, 2, len)
row = Row.new(value=remote, caption=helper.Regime.trend.title())
prevRemote = row.value[1]
spread = row.value - nz(prevRemote, row.value)
var table dash = table.new(position.top_left, 2, 3)
var label note = na
var map<string, float> values = map.new<string, float>()
map.put(values, "remote", remote)
map.put(values, "spread", spread)
if barstate.islast
    table.cell(dash, 0, 0, "Ticker")
    table.cell(dash, 1, 0, sym)
    table.cell(dash, 0, 1, "Value")
    table.cell(dash, 1, 1, formatRow(row, timeframe.period))
    note := label.new(bar_index, local, str.format("{0} {1}", chart.fg_color, formatRow(row, "now")))
plot(map.get(values, "remote"), "Remote")
plot(local, "Local")
plot(spread, "Spread")
plotshape(spread > 0, title="Spread Up", style=shape.circle, text="M")
alertcondition(spread > 0 and timeframe.isintraday, title="Metadata Up", message="Metadata up")`, engineOptions);

    expect(findPlot(compiledResult, 'Remote').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a loop-weighted request composite with varip UDT state', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Loop Request State", overlay=true, max_labels_count=20, max_lines_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupLoop = "Loop"
sym = input.symbol("TEST", "Symbol", inline="loop", group=groupLoop, tooltip="Requested source")
tf = input.timeframe(helper.HTF, "TF", inline="loop", group=groupLoop)
len = input.int(3, "Length", minval=2, group=groupLoop)
show = input.bool(true, "Show", group=groupLoop)
type Cell
    float main = na
    float aux = na
    varip int updates = 0
weighted(array<float> values) =>
    total = 0.0
    weight = 1.0
    for item in values
        total += nz(item) * weight
        weight += 1
    total
pack(simple string tickerId, simple string reqTf, series float src, simple int length) =>
    localPack = array.from(src, src[1], ta.sma(src, length))
    request.security(tickerId, reqTf, [helper.blockScore(src, 2, length), weighted(localPack)], lookahead=barmerge.lookahead_on)
[remoteScore, remoteWeight] = pack(sym, tf, close, len)
var Cell cell = Cell.new()
if not na(remoteScore)
    cell.main := remoteScore
    cell.aux := remoteWeight
    cell.updates += 1
delta = cell.main - nz(cell.main[1], cell.main)
normalized = cell.aux == 0 ? na : cell.main / cell.aux
var table dash = table.new(position.middle_right, 2, 3)
var label tag = na
var line guide = na
if show and barstate.islast
    table.cell(dash, 0, 0, helper.Regime.trend.title())
    table.cell(dash, 1, 0, str.format("{0:#.00}", normalized))
    table.cell(dash, 0, 1, "Updates")
    table.cell(dash, 1, 1, str.tostring(cell.updates))
    tag := label.new(bar_index, high, str.format("{0} {1:#.00} {2}", sym, delta, timeframe.period))
    guide := line.new(bar_index - 1, nz(cell.main[1], cell.main), bar_index, cell.main, color=color.teal)
basePlot = plot(show ? cell.main : na, "Loop Score", color=color.teal)
normPlot = plot(show ? normalized : na, "Normalized", color=color.orange)
fill(basePlot, normPlot, color=color.new(color.blue, 90), title="Loop Fill")
plotshape(delta > 0 and session.ismarket, title="Loop Up", style=shape.triangleup, location=location.abovebar, text="L")
bgcolor(delta < 0 ? color.new(color.red, 90) : na)
alertcondition(delta > 0, title="Loop Rising", message="Loop score rising")`, engineOptions);

    expect(findPlot(compiledResult, 'Loop Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs an imported-object request composite with map aggregation', () => {
    const { compiledResult } = assertCompositeParity(`//@version=6
indicator("Composite Imported Object Request", overlay=false, max_labels_count=30, max_lines_count=20)
import PublicUser/CompositeHelpers/1 as helper
groupReq = "Request"
symbolInput = input.symbol("NASDAQ:AAPL", "Symbol", inline="req", group=groupReq, tooltip="Remote symbol")
tfInput = input.timeframe(helper.HTF, "TF", inline="req", group=groupReq)
lengthInput = input.int(3, "Length", minval=2, group=groupReq)
showBoard = input.bool(true, "Board", group=groupReq)
type Panel
    float remote = na
    float adjusted = na
    varip int hits = 0
remotePack(simple string tickerId, simple string reqTf, series float src, simple int length) =>
    base = helper.Dashboard.new(score=src, title=helper.Regime.range.title())
    packed = array.from(helper.smooth(src, length), base.adjusted(src, factor=0.25), nz(src[1], src))
    request.security(tickerId, reqTf, [array.avg(packed), base.adjusted(1, factor=0.5)], lookahead=barmerge.lookahead_on)
[remoteAvg, remoteAdjusted] = remotePack(symbolInput, tfInput, close, lengthInput)
var Panel panel = Panel.new()
var map<string, float> levels = map.new<string, float>()
if not na(remoteAvg)
    panel.remote := remoteAvg
    panel.adjusted := remoteAdjusted
    panel.hits += 1
    map.put(levels, "avg", remoteAvg)
    map.put(levels, "adjusted", remoteAdjusted)
spread = panel.adjusted - panel.remote
total = 0.0
for [name, value] in levels
    total += name == "avg" ? value : value * 0.5
baseline = map.size(levels) > 0 ? total / map.size(levels) : na
fast = plot(panel.remote, "Remote Avg", color=color.aqua)
slow = plot(panel.adjusted, "Remote Adjusted", color=color.fuchsia)
mid = plot(baseline, "Map Baseline", color=color.gray)
fill(fast, slow, color=color.new(spread > 0 ? color.green : color.red, 88), title="Object Fill")
hline(0, "Zero", color=color.gray)
plotshape(showBoard and spread > 0 and session.ismarket, title="Positive Spread", style=shape.circle, location=location.bottom, text="P")
bgcolor(timeframe.isintraday and panel.hits > 0 ? color.new(color.blue, 92) : na)
var table board = table.new(position.bottom_right, 2, 3)
var label badge = na
if showBoard and barstate.islast
    table.cell(board, 0, 0, helper.Regime.range.title())
    table.cell(board, 1, 0, str.format("{0} {1:#.00}", symbolInput, spread))
    table.cell(board, 0, 1, "Hits")
    table.cell(board, 1, 1, str.tostring(panel.hits))
    badge := label.new(bar_index, high, str.format("{0} {1} {2:#.00}", timeframe.period, helper.Regime.range.title(), baseline))
alertcondition(spread > 0, title="Object Spread", message="Imported object spread")`, engineOptions);

    expect(findPlot(compiledResult, 'Remote Avg').values.some((value) => value !== null)).toBe(true);
    expect(findPlot(compiledResult, 'Map Baseline').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a long multi-timeframe confluence dashboard', () => {
    const source = [
      '//@version=6',
      'indicator("Long MTF Confluence Dashboard", overlay=true, max_labels_count=80, max_lines_count=80)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupTrend = "Trend"',
      'groupRisk = "Risk"',
      'groupDash = "Dashboard"',
      'baseSymbol = input.symbol("TEST", "Base", group=groupTrend, inline="ctx", tooltip="Primary requested market")',
      'peerSymbol = input.symbol("NASDAQ:AAPL", "Peer", group=groupTrend, inline="ctx")',
      'tfFast = input.timeframe("3", "Fast TF", group=groupTrend, inline="tf")',
      'tfSlow = input.timeframe("15", "Slow TF", group=groupTrend, inline="tf")',
      'showTable = input.bool(true, "Table", group=groupDash, inline="dash")',
      'showLabels = input.bool(true, "Labels", group=groupDash, inline="dash")',
      ...Array.from({ length: 42 }, (_, i) => `len${i} = input.int(${2 + (i % 13)}, "Length ${i}", minval=1, group=groupTrend, inline="l${Math.floor(i / 2)}")`),
      ...Array.from({ length: 18 }, (_, i) => `weight${i} = input.float(${(i + 1) / 10}, "Weight ${i}", step=0.1, group=groupRisk, inline="w${Math.floor(i / 2)}")`),
      'type Bucket',
      '    float score = na',
      '    float remote = na',
      '    int hits = 0',
      'scoreFast(series float src, simple int fast, simple int slow) =>',
      '    emaValue = ta.ema(src, fast)',
      '    smaValue = ta.sma(src, slow)',
      '    emaValue - smaValue',
      'scoreSlow(series float src, simple int fast, simple int slow) =>',
      '    base = helper.blockScore(src, fast, slow)',
      '    bias = scoreFast(src, fast, slow)',
      '    base + bias',
      'requestPack(simple string sym, simple string tf, series float src, simple int fast, simple int slow) =>',
      '    request.security(sym, tf, [scoreFast(src, fast, slow), scoreSlow(src, fast, slow)], lookahead=barmerge.lookahead_on)',
      'normalize(series float value, simple int len) =>',
      '    hi = ta.highest(value, len)',
      '    lo = ta.lowest(value, len)',
      '    span = hi - lo',
      '    span == 0 ? 0 : (value - lo) / span',
      'visibleNow() =>',
      '    chart.left_visible_bar_time <= time and time <= chart.right_visible_bar_time',
      '[baseFast, baseSlow] = requestPack(baseSymbol, tfFast, close, len0, len1)',
      '[peerFast, peerSlow] = requestPack(peerSymbol, tfFast, close, len2, len3)',
      '[slowFast, slowSlow] = requestPack(baseSymbol, tfSlow, close, len4, len5)',
      'var Bucket bucket = Bucket.new()',
      'var map<string, float> board = map.new<string, float>()',
      'var table dash = table.new(position.top_right, 3, 6)',
      ...Array.from({ length: 36 }, (_, i) => `metric${i} = normalize(close + nz(baseFast) * weight${i % 18} - nz(peerSlow) * weight${(i + 7) % 18}, len${i % 42})`),
      'sumScore = close * 0',
      ...Array.from({ length: 36 }, (_, i) => `sumScore += nz(metric${i}) * weight${i % 18}`),
      'avgScore = sumScore / 36',
      'remoteBlend = nz(baseSlow) + nz(peerFast) - nz(slowSlow)',
      'bucket.score := avgScore',
      'bucket.remote := remoteBlend',
      'bucket.hits += visibleNow() ? 1 : 0',
      'map.put(board, "score", bucket.score)',
      'map.put(board, "remote", bucket.remote)',
      'map.put(board, "spread", bucket.score - bucket.remote)',
      'trendLine = bucket.score - nz(bucket.score[1], bucket.score)',
      'lineStart = nz(bucket.score[20], bucket.score)',
      'state = helper.Dashboard.new(score=bucket.score, title=helper.Regime.trend.title())',
      'adjusted = state.adjusted(bucket.remote, factor=0.25)',
      'fastPlot = plot(bucket.score, "Confluence Score", color=color.teal, linewidth=2)',
      'slowPlot = plot(adjusted, "Adjusted Remote", color=color.orange)',
      'plot(lineStart, "Confluence History")',
      'plot(map.get(board, "spread"), "Spread")',
      'plot(baseFast, "Base Fast")',
      'plot(peerSlow, "Peer Slow")',
      'plot(slowFast, "Slow Fast")',
      'hline(0, "Zero", color=color.gray)',
      'fill(fastPlot, slowPlot, color=color.new(color.blue, 88), title="Confluence Fill")',
      'plotshape(trendLine > 0 and session.ismarket, title="Trend Rising", style=shape.triangleup, location=location.belowbar, text="C")',
      'bgcolor(timeframe.isintraday and bucket.score > adjusted ? color.new(color.green, 92) : na)',
      'var label lastLabel = na',
      'var line guide = na',
      'if showTable and barstate.islast',
      '    table.cell(dash, 0, 0, "Score")',
      '    table.cell(dash, 1, 0, str.format("{0:#.00}", bucket.score))',
      '    table.cell(dash, 0, 1, "Remote")',
      '    table.cell(dash, 1, 1, str.format("{0:#.00}", bucket.remote))',
      '    table.cell(dash, 0, 2, "Hits")',
      '    table.cell(dash, 1, 2, str.tostring(bucket.hits))',
      'if showLabels and barstate.islast',
      '    lastLabel := label.new(bar_index, high, str.format("{0} {1:#.00} {2}", state.title, adjusted, syminfo.ticker))',
      '    guide := line.new(bar_index - 20, lineStart, bar_index, bucket.score, color=color.teal)',
      'alertcondition(bucket.score > adjusted, title="Long Confluence Up", message="Confluence score crossed adjusted remote")',
    ].join('\n');

    const { compiledResult } = assertLongCompositeParity(source);
    expect(findPlot(compiledResult, 'Confluence Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a long volatility regime model with bands and fills', () => {
    const source = [
      '//@version=6',
      'indicator("Long Volatility Regime Bands", overlay=true, max_labels_count=60, max_lines_count=40)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupVol = "Volatility"',
      'source = input.source(close, "Source", group=groupVol, inline="src", tooltip="Band source")',
      'remoteSymbol = input.symbol("TEST", "Remote", group=groupVol, inline="src")',
      'remoteTf = input.timeframe("15", "Remote TF", group=groupVol, inline="tf")',
      'showCloud = input.bool(true, "Cloud", group=groupVol, inline="tf")',
      ...Array.from({ length: 54 }, (_, i) => `volLen${i} = input.int(${2 + (i % 21)}, "Vol Len ${i}", minval=1, group=groupVol, inline="v${Math.floor(i / 3)}")`),
      'type RegimeState',
      '    float mean = na',
      '    float width = na',
      '    float score = na',
      '    int flips = 0',
      'bandMean(series float src, simple int len) =>',
      '    ta.ema(src, len)',
      'bandWidth(series float src, simple int len) =>',
      '    atrValue = ta.atr(len)',
      '    dev = math.abs(src - ta.sma(src, len))',
      '    atrValue + dev',
      'regimeScore(series float src, simple int len) =>',
      '    mean = bandMean(src, len)',
      '    width = bandWidth(src, len)',
      '    width == 0 ? 0 : (src - mean) / width',
      'remoteRegime(simple string sym, simple string tf, series float src, simple int len) =>',
      '    request.security(sym, tf, [bandMean(src, len), bandWidth(src, len), regimeScore(src, len)], lookahead=barmerge.lookahead_on)',
      '[remoteMean, remoteWidth, remoteScore] = remoteRegime(remoteSymbol, remoteTf, source, volLen0)',
      'var RegimeState state = RegimeState.new()',
      'var array<float> widths = array.new_float()',
      'var table panel = table.new(position.middle_right, 2, 6)',
      ...Array.from({ length: 40 }, (_, i) => `score${i} = regimeScore(source + nz(remoteScore) * ${(i % 5) + 1}, volLen${i % 54})`),
      'combined = close * 0',
      ...Array.from({ length: 40 }, (_, i) => `combined += nz(score${i}) / 40`),
      'localMean = bandMean(source, volLen1)',
      'localWidth = bandWidth(source, volLen2)',
      'upper1 = localMean + localWidth',
      'lower1 = localMean - localWidth',
      'upper2 = localMean + localWidth * 2',
      'lower2 = localMean - localWidth * 2',
      'array.push(widths, localWidth)',
      'if array.size(widths) > 30',
      '    array.shift(widths)',
      'widthSum = 0.0',
      'for item in widths',
      '    widthSum += nz(item)',
      'widthAvg = array.size(widths) > 0 ? widthSum / array.size(widths) : na',
      'state.mean := localMean',
      'state.width := widthAvg',
      'state.score := combined + nz(remoteScore)',
      'if ta.cross(state.score, 0)',
      '    state.flips += 1',
      'midPlot = plot(state.mean, "Regime Mean", color=color.gray)',
      'u1Plot = plot(upper1, "Upper One", color=color.orange)',
      'l1Plot = plot(lower1, "Lower One", color=color.orange)',
      'u2Plot = plot(upper2, "Upper Two", color=color.red)',
      'l2Plot = plot(lower2, "Lower Two", color=color.green)',
      'plot(state.score, "Regime Score")',
      'plot(remoteMean, "Remote Mean")',
      'plot(remoteWidth, "Remote Width")',
      'fill(u1Plot, l1Plot, color=showCloud ? color.new(color.orange, 90) : na, title="Inner Cloud")',
      'fill(u2Plot, l2Plot, color=showCloud ? color.new(color.blue, 94) : na, title="Outer Cloud")',
      'plotshape(state.score > 1, title="Expansion", style=shape.triangleup, location=location.abovebar, text="E")',
      'plotshape(state.score < -1, title="Compression", style=shape.triangledown, location=location.belowbar, text="C")',
      'bgcolor(state.score > 0 ? color.new(color.green, 94) : color.new(color.red, 94))',
      'var label regimeLabel = na',
      'if barstate.islast',
      '    table.cell(panel, 0, 0, helper.Regime.trend.title())',
      '    table.cell(panel, 1, 0, str.format("{0:#.00}", state.score))',
      '    table.cell(panel, 0, 1, "Width")',
      '    table.cell(panel, 1, 1, str.format("{0:#.00}", state.width))',
      '    table.cell(panel, 0, 2, "Flips")',
      '    table.cell(panel, 1, 2, str.tostring(state.flips))',
      '    regimeLabel := label.new(bar_index, upper2, str.format("regime {0:#.00} remote {1:#.00}", state.score, remoteScore))',
      'alertcondition(state.score > 1, title="Regime Expansion", message="Volatility expansion")',
    ].join('\n');

    const { compiledResult } = assertLongCompositeParity(source);
    expect(findPlot(compiledResult, 'Regime Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a long market-structure drawing lifecycle script', () => {
    const source = [
      '//@version=6',
      'indicator("Long Market Structure Lifecycle", overlay=true, max_labels_count=120, max_lines_count=120, max_boxes_count=60)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupStruct = "Structure"',
      'structureTf = input.timeframe("3", "Structure TF", group=groupStruct, inline="ctx")',
      'structureSymbol = input.symbol("TEST", "Symbol", group=groupStruct, inline="ctx")',
      'showZones = input.bool(true, "Zones", group=groupStruct, inline="draw", tooltip="Draw swing zones")',
      ...Array.from({ length: 36 }, (_, i) => `swingLen${i} = input.int(${2 + (i % 18)}, "Swing ${i}", minval=1, group=groupStruct, inline="s${Math.floor(i / 2)}")`),
      'type Swing',
      '    float highLevel = na',
      '    float lowLevel = na',
      '    int born = na',
      '    int touches = 0',
      'pivotScore(series float src, simple int len) =>',
      '    hi = ta.highest(high, len)',
      '    lo = ta.lowest(low, len)',
      '    span = hi - lo',
      '    span == 0 ? 0 : (src - lo) / span',
      'structurePack(simple string sym, simple string tf, series float src, simple int len) =>',
      '    request.security(sym, tf, [ta.highest(high, len), ta.lowest(low, len), pivotScore(src, len)], lookahead=barmerge.lookahead_on)',
      '[remoteHigh, remoteLow, remoteScore] = structurePack(structureSymbol, structureTf, close, swingLen0)',
      'var Swing swing = Swing.new()',
      'var array<float> pivots = array.new_float()',
      'var line lastHighLine = na',
      'var line lastLowLine = na',
      'var box lastBox = na',
      'var label lastTag = na',
      'localHigh = ta.highest(high, swingLen1)',
      'localLow = ta.lowest(low, swingLen2)',
      'breakUp = close > nz(localHigh[1], localHigh)',
      'breakDown = close < nz(localLow[1], localLow)',
      'if breakUp or na(swing.highLevel)',
      '    swing.highLevel := localHigh',
      '    swing.lowLevel := localLow',
      '    swing.born := bar_index',
      '    swing.touches += 1',
      'if breakDown',
      '    swing.highLevel := remoteHigh',
      '    swing.lowLevel := remoteLow',
      '    swing.born := bar_index',
      '    swing.touches += 1',
      'array.push(pivots, swing.highLevel - swing.lowLevel)',
      'if array.size(pivots) > 50',
      '    array.shift(pivots)',
      'pivotTotal = 0.0',
      'for item in pivots',
      '    pivotTotal += nz(item)',
      'pivotAvg = array.size(pivots) > 0 ? pivotTotal / array.size(pivots) : na',
      ...Array.from({ length: 38 }, (_, i) => `zone${i} = pivotScore(close + nz(remoteScore) * ${(i % 4) + 1}, swingLen${i % 36})`),
      'structureScore = close * 0',
      ...Array.from({ length: 38 }, (_, i) => `structureScore += nz(zone${i}) / 38`),
      'upper = swing.highLevel + pivotAvg * 0.1',
      'lower = swing.lowLevel - pivotAvg * 0.1',
      'plot(swing.highLevel, "Swing High", color=color.red)',
      'plot(swing.lowLevel, "Swing Low", color=color.green)',
      'plot(pivotAvg, "Pivot Width")',
      'plot(structureScore, "Structure Score")',
      'plot(remoteScore, "Remote Structure")',
      'plotshape(breakUp, title="Break Up", style=shape.triangleup, location=location.abovebar, text="B")',
      'plotshape(breakDown, title="Break Down", style=shape.triangledown, location=location.belowbar, text="S")',
      'if showZones and barstate.islast',
      '    lastHighLine := line.new(swing.born, swing.highLevel, bar_index, upper, color=color.red, width=2)',
      '    lastLowLine := line.new(swing.born, swing.lowLevel, bar_index, lower, color=color.green, width=2)',
      '    lastBox := box.new(swing.born, upper, bar_index, lower, bgcolor=color.new(color.blue, 90), border_color=color.gray)',
      '    lastTag := label.new(bar_index, upper, str.format("touches {0} score {1:#.00}", swing.touches, structureScore))',
      'bgcolor(structureScore > remoteScore ? color.new(color.green, 92) : color.new(color.red, 92))',
      'alertcondition(breakUp, title="Structure Break Up", message="Market structure broke higher")',
      'alertcondition(breakDown, title="Structure Break Down", message="Market structure broke lower")',
    ].join('\n');

    const { compiledResult } = assertLongCompositeParity(source);
    expect(findPlot(compiledResult, 'Structure Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a long volume-profile-style array and map model', () => {
    const source = [
      '//@version=6',
      'indicator("Long Volume Profile Model", overlay=false, max_labels_count=80, max_lines_count=40)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupProfile = "Profile"',
      'profileTf = input.timeframe("30S", "Profile TF", group=groupProfile, inline="ctx")',
      'profileSymbol = input.symbol("TEST", "Symbol", group=groupProfile, inline="ctx")',
      'showProfile = input.bool(true, "Show", group=groupProfile, inline="view", tooltip="Show profile dashboard")',
      ...Array.from({ length: 48 }, (_, i) => `bucketLen${i} = input.int(${2 + (i % 20)}, "Bucket ${i}", minval=1, group=groupProfile, inline="b${Math.floor(i / 3)}")`),
      'type Profile',
      '    float poc = na',
      '    float vah = na',
      '    float val = na',
      '    varip int updates = 0',
      'bucketScore(series float src, simple int len) =>',
      '    range = ta.highest(high, len) - ta.lowest(low, len)',
      '    range == 0 ? 0 : volume / range',
      'lowerPack(simple string sym, simple string tf, series float src) =>',
      '    request.security_lower_tf(sym, tf, bucketScore(src, bucketLen0))',
      'lowerValues = lowerPack(profileSymbol, profileTf, close)',
      'var Profile profile = Profile.new()',
      'var array<float> volumeBins = array.new_float()',
      'var map<string, float> levels = map.new<string, float>()',
      'lowerTotal = 0.0',
      'for item in lowerValues',
      '    lowerTotal += nz(item)',
      ...Array.from({ length: 42 }, (_, i) => `bin${i} = bucketScore(close + ${i * 0.01}, bucketLen${i % 48}) + lowerTotal * ${(i % 5) + 1}`),
      ...Array.from({ length: 42 }, (_, i) => `array.push(volumeBins, bin${i})`),
      'while array.size(volumeBins) > 60',
      '    array.shift(volumeBins)',
      'profileSum = 0.0',
      'profileHigh = na',
      'profileLow = na',
      'for item in volumeBins',
      '    profileSum += nz(item)',
      '    profileHigh := na(profileHigh) ? item : math.max(profileHigh, item)',
      '    profileLow := na(profileLow) ? item : math.min(profileLow, item)',
      'profile.poc := array.size(volumeBins) > 0 ? profileSum / array.size(volumeBins) : na',
      'profile.vah := profileHigh',
      'profile.val := profileLow',
      'profile.updates += 1',
      'map.put(levels, "poc", profile.poc)',
      'map.put(levels, "vah", profile.vah)',
      'map.put(levels, "val", profile.val)',
      'spread = map.get(levels, "vah") - map.get(levels, "val")',
      'balance = spread == 0 ? na : (close - map.get(levels, "poc")) / spread',
      'pocPlot = plot(map.get(levels, "poc"), "POC", color=color.yellow)',
      'vahPlot = plot(map.get(levels, "vah"), "VAH", color=color.green)',
      'valPlot = plot(map.get(levels, "val"), "VAL", color=color.red)',
      'plot(balance, "Balance")',
      'plot(lowerTotal, "Lower Total")',
      'plot(profile.updates, "Updates")',
      'fill(vahPlot, valPlot, color=color.new(color.blue, 92), title="Value Area")',
      'plotshape(balance > 1, title="Above Value", style=shape.triangleup, text="AV")',
      'plotshape(balance < -1, title="Below Value", style=shape.triangledown, text="BV")',
      'var table profileTable = table.new(position.bottom_left, 2, 5)',
      'var label profileLabel = na',
      'if showProfile and barstate.islast',
      '    table.cell(profileTable, 0, 0, "POC")',
      '    table.cell(profileTable, 1, 0, str.format("{0:#.00}", profile.poc))',
      '    table.cell(profileTable, 0, 1, "Spread")',
      '    table.cell(profileTable, 1, 1, str.format("{0:#.00}", spread))',
      '    profileLabel := label.new(bar_index, profile.poc, str.format("profile {0:#.00} {1}", balance, profile.updates))',
      'alertcondition(balance > 1, title="Profile Above", message="Price above profile value area")',
    ].join('\n');

    const { compiledResult } = assertLongCompositeParity(source);
    expect(findPlot(compiledResult, 'POC').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a long signal script with many plots and alertconditions', () => {
    const source = [
      '//@version=6',
      'indicator("Long Signal Matrix", overlay=true, max_labels_count=80, max_lines_count=40)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupSignal = "Signals"',
      'signalSymbol = input.symbol("NASDAQ:MSFT", "Signal Symbol", group=groupSignal, inline="ctx")',
      'signalTf = input.timeframe("15", "Signal TF", group=groupSignal, inline="ctx")',
      'showSignals = input.bool(true, "Signals", group=groupSignal, inline="view", tooltip="Show signal labels")',
      ...Array.from({ length: 52 }, (_, i) => `sigLen${i} = input.int(${2 + (i % 24)}, "Signal Len ${i}", minval=1, group=groupSignal, inline="g${Math.floor(i / 4)}")`),
      'type SignalState',
      '    float score = na',
      '    float remote = na',
      '    int longCount = 0',
      '    int shortCount = 0',
      'momentum(series float src, simple int len) =>',
      '    fast = ta.ema(src, len)',
      '    slow = ta.sma(src, len + 1)',
      '    fast - slow',
      'signalLine(series float src, simple int len) =>',
      '    raw = momentum(src, len)',
      '    ta.ema(raw, len)',
      'remoteSignal(simple string sym, simple string tf, series float src, simple int len) =>',
      '    request.security(sym, tf, [momentum(src, len), signalLine(src, len)], lookahead=barmerge.lookahead_on)',
      '[remoteMomentum, remoteLine] = remoteSignal(signalSymbol, signalTf, close, sigLen0)',
      'var SignalState state = SignalState.new()',
      'var array<float> signals = array.new_float()',
      ...Array.from({ length: 44 }, (_, i) => `signal${i} = momentum(close + nz(remoteMomentum) * ${(i % 3) + 1}, sigLen${i % 52}) - signalLine(close, sigLen${(i + 5) % 52})`),
      ...Array.from({ length: 44 }, (_, i) => `array.push(signals, signal${i})`),
      'while array.size(signals) > 80',
      '    array.shift(signals)',
      'matrixScore = 0.0',
      'for item in signals',
      '    matrixScore += nz(item)',
      'matrixAvg = array.size(signals) > 0 ? matrixScore / array.size(signals) : na',
      'state.score := matrixAvg',
      'state.remote := remoteMomentum - remoteLine',
      'longSignal = state.score > state.remote and close > open',
      'shortSignal = state.score < state.remote and close < open',
      'if longSignal',
      '    state.longCount += 1',
      'if shortSignal',
      '    state.shortCount += 1',
      ...Array.from({ length: 20 }, (_, i) => `plot(signal${i}, "Signal ${i}", color=${i % 2 === 0 ? 'color.teal' : 'color.orange'})`),
      'plot(state.score, "Matrix Score", color=color.white, linewidth=2)',
      'plot(state.remote, "Remote Signal", color=color.purple)',
      'plot(remoteMomentum, "Remote Momentum")',
      'plot(remoteLine, "Remote Line")',
      'plotarrow(longSignal ? 1 : shortSignal ? -1 : 0, title="Direction Arrow", colorup=color.green, colordown=color.red)',
      'plotbar(open, high, low, close, title="Signal Bars", color=longSignal ? color.green : shortSignal ? color.red : color.gray)',
      'plotcandle(open, high, low, close, title="Signal Candles", color=longSignal ? color.green : shortSignal ? color.red : color.gray)',
      'plotshape(longSignal, title="Long Signal", style=shape.triangleup, location=location.belowbar, text="L")',
      'plotshape(shortSignal, title="Short Signal", style=shape.triangledown, location=location.abovebar, text="S")',
      'var table signalTable = table.new(position.top_left, 2, 5)',
      'var label signalLabel = na',
      'if showSignals and barstate.islast',
      '    table.cell(signalTable, 0, 0, "Score")',
      '    table.cell(signalTable, 1, 0, str.format("{0:#.00}", state.score))',
      '    table.cell(signalTable, 0, 1, "Longs")',
      '    table.cell(signalTable, 1, 1, str.tostring(state.longCount))',
      '    table.cell(signalTable, 0, 2, "Shorts")',
      '    table.cell(signalTable, 1, 2, str.tostring(state.shortCount))',
      '    signalLabel := label.new(bar_index, high, str.format("{0} L{1} S{2}", helper.Regime.trend.title(), state.longCount, state.shortCount))',
      'bgcolor(longSignal ? color.new(color.green, 90) : shortSignal ? color.new(color.red, 90) : na)',
      'alertcondition(longSignal, title="Long Matrix Signal", message="Long signal fired")',
      'alertcondition(shortSignal, title="Short Matrix Signal", message="Short signal fired")',
      'alertcondition(ta.cross(state.score, state.remote), title="Matrix Cross", message="Matrix score crossed remote")',
    ].join('\n');

    const { compiledResult } = assertLongCompositeParity(source);
    expect(findPlot(compiledResult, 'Matrix Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a true-length MTF confluence dashboard with dense request wrappers', () => {
    const source = [
      '//@version=6',
      'indicator("True Length MTF Confluence Dashboard", overlay=true, max_labels_count=140, max_lines_count=120, max_boxes_count=80)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupMain = "Main"',
      'groupRequest = "Requests"',
      'groupDash = "Dashboard"',
      'rootSymbol = input.symbol("TEST", "Root", group=groupRequest, inline="sym", tooltip="Primary requested ticker")',
      'peerSymbol = input.symbol("NASDAQ:AAPL", "Peer", group=groupRequest, inline="sym")',
      'thirdSymbol = input.symbol("NASDAQ:MSFT", "Third", group=groupRequest, inline="sym")',
      'fastTf = input.timeframe("3", "Fast TF", group=groupRequest, inline="tf")',
      'slowTf = input.timeframe("15", "Slow TF", group=groupRequest, inline="tf")',
      'showDash = input.bool(true, "Dashboard", group=groupDash, inline="view")',
      'showDrawings = input.bool(true, "Drawings", group=groupDash, inline="view")',
      ...Array.from({ length: 58 }, (_, i) => `len${i} = input.int(${2 + (i % 19)}, "Length ${i}", minval=1, group=groupMain, inline="l${Math.floor(i / 3)}")`),
      ...Array.from({ length: 24 }, (_, i) => `weight${i} = input.float(${((i % 9) + 1) / 10}, "Weight ${i}", step=0.1, group=groupMain, inline="w${Math.floor(i / 3)}")`),
      'type ConfluenceState',
      '    float score = na',
      '    float remote = na',
      '    float spread = na',
      '    int visibleBars = 0',
      '    int signals = 0',
      'visibleNow() =>',
      '    chart.left_visible_bar_time <= time and time <= chart.right_visible_bar_time',
      'coreMomentum(series float src, simple int fast, simple int slow) =>',
      '    fastValue = ta.ema(src, fast)',
      '    slowValue = ta.sma(src, slow)',
      '    fastValue - slowValue',
      'normalized(series float src, simple int len) =>',
      '    top = ta.highest(src, len)',
      '    bottom = ta.lowest(src, len)',
      '    span = top - bottom',
      '    span == 0 ? 0 : (src - bottom) / span',
      'requestTrend(simple string sym, simple string tf, series float src, simple int fast, simple int slow) =>',
      '    request.security(sym, tf, [coreMomentum(src, fast, slow), normalized(src, slow)], lookahead=barmerge.lookahead_on)',
      '[rootMom, rootNorm] = requestTrend(rootSymbol, fastTf, close, len0, len1)',
      '[peerMom, peerNorm] = requestTrend(peerSymbol, fastTf, close, len2, len3)',
      '[thirdMom, thirdNorm] = requestTrend(thirdSymbol, slowTf, close, len4, len5)',
      'var ConfluenceState state = ConfluenceState.new()',
      'var map<string, float> board = map.new<string, float>()',
      'var array<float> signalHistory = array.new_float()',
      'var table dash = table.new(position.top_right, 4, 8)',
      ...Array.from({ length: 62 }, (_, i) => `factor${i} = normalized(close + nz(rootMom) * weight${i % 24} - nz(peerMom) * weight${(i + 7) % 24} + nz(thirdNorm), len${i % 58})`),
      'scoreSum = 0.0',
      ...Array.from({ length: 62 }, (_, i) => `scoreSum += nz(factor${i}) * weight${i % 24}`),
      'state.score := scoreSum / 62',
      'state.remote := nz(rootNorm) + nz(peerNorm) - nz(thirdMom)',
      'state.spread := state.score - state.remote',
      'state.visibleBars += visibleNow() ? 1 : 0',
      'if ta.cross(state.score, state.remote)',
      '    state.signals += 1',
      'array.push(signalHistory, state.spread)',
      'if array.size(signalHistory) > 90',
      '    array.shift(signalHistory)',
      'historySum = 0.0',
      'for item in signalHistory',
      '    historySum += nz(item)',
      'historyAvg = array.size(signalHistory) > 0 ? historySum / array.size(signalHistory) : na',
      'map.put(board, "score", state.score)',
      'map.put(board, "remote", state.remote)',
      'map.put(board, "spread", state.spread)',
      'map.put(board, "history", historyAvg)',
      'histFast = nz(state.score[5], state.score)',
      'histSlow = nz(state.remote[13], state.remote)',
      'dashboard = helper.Dashboard.new(score=state.score, title=helper.Regime.trend.title())',
      'adjusted = dashboard.adjusted(state.remote, factor=0.5)',
      'scorePlot = plot(map.get(board, "score"), "True MTF Score", color=color.teal, linewidth=2)',
      'remotePlot = plot(adjusted, "True MTF Remote", color=color.orange)',
      'plot(map.get(board, "spread"), "True MTF Spread")',
      'plot(map.get(board, "history"), "True MTF History")',
      'plot(rootMom, "Root Momentum")',
      'plot(peerMom, "Peer Momentum")',
      'plot(thirdNorm, "Third Norm")',
      'plot(histFast - histSlow, "History Delta")',
      'fill(scorePlot, remotePlot, color=color.new(color.blue, 90), title="True MTF Fill")',
      'hline(0, "True Zero", color=color.gray)',
      'plotshape(state.spread > 0 and session.ismarket, title="MTF Positive", style=shape.triangleup, location=location.belowbar, text="M")',
      'plotshape(state.spread < 0 and session.ispostmarket, title="MTF Negative", style=shape.triangledown, location=location.abovebar, text="N")',
      'bgcolor(timeframe.isintraday and state.spread > 0 ? color.new(color.green, 92) : na)',
      'var label statusLabel = na',
      'var line scoreGuide = na',
      'var box scoreBox = na',
      'if showDash and barstate.islast',
      '    table.cell(dash, 0, 0, "Score")',
      '    table.cell(dash, 1, 0, str.format("{0:#.00}", state.score))',
      '    table.cell(dash, 0, 1, "Remote")',
      '    table.cell(dash, 1, 1, str.format("{0:#.00}", state.remote))',
      '    table.cell(dash, 0, 2, "Signals")',
      '    table.cell(dash, 1, 2, str.tostring(state.signals))',
      '    table.cell(dash, 0, 3, "Visible")',
      '    table.cell(dash, 1, 3, str.tostring(state.visibleBars))',
      'if showDrawings and barstate.islast',
      '    statusLabel := label.new(bar_index, high, str.format("{0} {1:#.00} {2}", dashboard.title, adjusted, syminfo.ticker))',
      '    scoreGuide := line.new(bar_index - 40, histFast, bar_index, state.score, color=color.teal, width=2)',
      '    scoreBox := box.new(bar_index - 20, math.max(state.score, adjusted), bar_index, math.min(state.score, adjusted), bgcolor=color.new(color.blue, 90), border_color=color.gray)',
      'alertcondition(state.score > adjusted, title="True MTF Long", message="True MTF confluence crossed up")',
      'alertcondition(state.score < adjusted, title="True MTF Short", message="True MTF confluence crossed down")',
    ].join('\n');

    const { compiledResult } = assertTrueLengthCompositeParity(source);
    expect(findPlot(compiledResult, 'True MTF Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a true-length market-structure drawing lifecycle with churned arrays', () => {
    const source = [
      '//@version=6',
      'indicator("True Length Structure Lifecycle", overlay=true, max_labels_count=180, max_lines_count=180, max_boxes_count=120)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupStructure = "Structure"',
      'structureSymbol = input.symbol("TEST", "Structure Symbol", group=groupStructure, inline="ctx")',
      'structureTf = input.timeframe("3", "Structure TF", group=groupStructure, inline="ctx")',
      'showLines = input.bool(true, "Lines", group=groupStructure, inline="draw", tooltip="Draw projected structure lines")',
      'showBoxes = input.bool(true, "Boxes", group=groupStructure, inline="draw")',
      ...Array.from({ length: 52 }, (_, i) => `pivotLen${i} = input.int(${2 + (i % 22)}, "Pivot Length ${i}", minval=1, group=groupStructure, inline="p${Math.floor(i / 4)}")`),
      'type StructureState',
      '    float swingHigh = na',
      '    float swingLow = na',
      '    float pressure = na',
      '    int born = 0',
      '    int breaks = 0',
      'structureCore(series float src, simple int len) =>',
      '    highestValue = ta.highest(high, len)',
      '    lowestValue = ta.lowest(low, len)',
      '    rangeValue = highestValue - lowestValue',
      '    rangeValue == 0 ? 0 : (src - lowestValue) / rangeValue',
      'remoteStructure(simple string sym, simple string tf, series float src, simple int len) =>',
      '    request.security(sym, tf, [ta.highest(high, len), ta.lowest(low, len), structureCore(src, len)], lookahead=barmerge.lookahead_on)',
      '[remoteHigh, remoteLow, remotePressure] = remoteStructure(structureSymbol, structureTf, close, pivotLen0)',
      'var StructureState state = StructureState.new()',
      'var array<float> ranges = array.new_float()',
      'var array<line> highLines = array.new_line()',
      'var array<line> lowLines = array.new_line()',
      'var array<box> zones = array.new_box()',
      'localHigh = ta.highest(high, pivotLen1)',
      'localLow = ta.lowest(low, pivotLen2)',
      'rangeNow = localHigh - localLow',
      'breakUp = close > nz(localHigh[1], localHigh)',
      'breakDown = close < nz(localLow[1], localLow)',
      'if breakUp or na(state.swingHigh)',
      '    state.swingHigh := localHigh',
      '    state.swingLow := localLow',
      '    state.pressure := remotePressure',
      '    state.born := bar_index',
      '    state.breaks += 1',
      'if breakDown',
      '    state.swingHigh := remoteHigh',
      '    state.swingLow := remoteLow',
      '    state.pressure := -remotePressure',
      '    state.born := bar_index',
      '    state.breaks += 1',
      'array.push(ranges, rangeNow + nz(remoteHigh - remoteLow))',
      'if array.size(ranges) > 120',
      '    array.shift(ranges)',
      'rangeSum = 0.0',
      'rangeMax = na',
      'rangeMin = na',
      'for item in ranges',
      '    rangeSum += nz(item)',
      '    rangeMax := na(rangeMax) ? item : math.max(rangeMax, item)',
      '    rangeMin := na(rangeMin) ? item : math.min(rangeMin, item)',
      'rangeAvg = array.size(ranges) > 0 ? rangeSum / array.size(ranges) : na',
      ...Array.from({ length: 58 }, (_, i) => `layer${i} = structureCore(close + nz(remotePressure) * ${(i % 6) + 1}, pivotLen${i % 52})`),
      'layerSum = 0.0',
      ...Array.from({ length: 58 }, (_, i) => `layerSum += nz(layer${i}) / 58`),
      'state.pressure := layerSum + nz(state.pressure)',
      'upperZone = state.swingHigh + nz(rangeAvg) * 0.15',
      'lowerZone = state.swingLow - nz(rangeAvg) * 0.15',
      'plot(state.swingHigh, "True Structure High", color=color.red)',
      'plot(state.swingLow, "True Structure Low", color=color.green)',
      'plot(state.pressure, "True Structure Pressure")',
      'plot(rangeAvg, "True Structure Average Range")',
      'plot(remotePressure, "True Structure Remote")',
      'plotshape(breakUp, title="True Break Up", style=shape.triangleup, location=location.abovebar, text="B")',
      'plotshape(breakDown, title="True Break Down", style=shape.triangledown, location=location.belowbar, text="S")',
      'if showLines and barstate.islast',
      '    array.push(highLines, line.new(state.born, state.swingHigh, bar_index, upperZone, color=color.red, width=2))',
      '    array.push(lowLines, line.new(state.born, state.swingLow, bar_index, lowerZone, color=color.green, width=2))',
      '    if array.size(highLines) > 20',
      '        line.delete(array.shift(highLines))',
      '    if array.size(lowLines) > 20',
      '        line.delete(array.shift(lowLines))',
      'if showBoxes and barstate.islast',
      '    array.push(zones, box.new(state.born, upperZone, bar_index, lowerZone, bgcolor=color.new(color.blue, 92), border_color=color.gray, text=str.format("{0:#.00}", state.pressure)))',
      '    if array.size(zones) > 12',
      '        box.delete(array.shift(zones))',
      'var table structureTable = table.new(position.bottom_right, 3, 5)',
      'var label structureLabel = na',
      'if barstate.islast',
      '    table.cell(structureTable, 0, 0, "Breaks")',
      '    table.cell(structureTable, 1, 0, str.tostring(state.breaks))',
      '    table.cell(structureTable, 0, 1, "Range")',
      '    table.cell(structureTable, 1, 1, str.format("{0:#.00}", rangeAvg))',
      '    structureLabel := label.new(bar_index, upperZone, str.format("{0} {1:#.00}", helper.Regime.trend.title(), state.pressure))',
      'bgcolor(state.pressure > remotePressure ? color.new(color.green, 92) : color.new(color.red, 92))',
      'alertcondition(breakUp, title="True Structure Up", message="True structure broke up")',
      'alertcondition(breakDown, title="True Structure Down", message="True structure broke down")',
    ].join('\n');

    const { compiledResult } = assertTrueLengthCompositeParity(source);
    expect(findPlot(compiledResult, 'True Structure Pressure').values.some((value) => value !== null)).toBe(true);
  });

  it('runs a true-length volume and signal matrix with many plots', () => {
    const source = [
      '//@version=6',
      'indicator("True Length Volume Signal Matrix", overlay=false, max_labels_count=120, max_lines_count=80)',
      'import PublicUser/CompositeHelpers/1 as helper',
      'groupVolume = "Volume"',
      'volumeSymbol = input.symbol("NASDAQ:MSFT", "Volume Symbol", group=groupVolume, inline="ctx")',
      'volumeTf = input.timeframe("15", "Volume TF", group=groupVolume, inline="ctx")',
      'lowerTf = input.timeframe("30S", "Lower TF", group=groupVolume, inline="ctx")',
      'showMatrix = input.bool(true, "Matrix", group=groupVolume, inline="view", tooltip="Show matrix dashboard")',
      ...Array.from({ length: 56 }, (_, i) => `volLen${i} = input.int(${2 + (i % 25)}, "Volume Length ${i}", minval=1, group=groupVolume, inline="v${Math.floor(i / 4)}")`),
      'type MatrixState',
      '    float score = na',
      '    float remote = na',
      '    int longCount = 0',
      '    int shortCount = 0',
      'volumePulse(series float src, simple int len) =>',
      '    baseline = ta.sma(volume, len)',
      '    baseline == 0 ? 0 : volume / baseline + ta.roc(src, len)',
      'smoothPulse(series float src, simple int len) =>',
      '    pulse = volumePulse(src, len)',
      '    ta.ema(pulse, len)',
      'remotePulse(simple string sym, simple string tf, series float src, simple int len) =>',
      '    request.security(sym, tf, [volumePulse(src, len), smoothPulse(src, len)], lookahead=barmerge.lookahead_on)',
      'lowerPulse(simple string sym, simple string tf, series float src) =>',
      '    request.security_lower_tf(sym, tf, volumePulse(src, volLen0))',
      '[remoteRaw, remoteSmooth] = remotePulse(volumeSymbol, volumeTf, close, volLen1)',
      'lowerValues = lowerPulse("TEST", lowerTf, close)',
      'lowerSum = 0.0',
      'for item in lowerValues',
      '    lowerSum += nz(item)',
      'var MatrixState state = MatrixState.new()',
      'var array<float> pulses = array.new_float()',
      'var map<string, float> matrix = map.new<string, float>()',
      ...Array.from({ length: 64 }, (_, i) => `pulse${i} = smoothPulse(close + nz(remoteRaw) * ${(i % 4) + 1}, volLen${i % 56}) - volumePulse(close, volLen${(i + 3) % 56}) + lowerSum * 0.01`),
      ...Array.from({ length: 64 }, (_, i) => `array.push(pulses, pulse${i})`),
      'while array.size(pulses) > 100',
      '    array.shift(pulses)',
      'pulseSum = 0.0',
      'pulseMax = na',
      'pulseMin = na',
      'for item in pulses',
      '    pulseSum += nz(item)',
      '    pulseMax := na(pulseMax) ? item : math.max(pulseMax, item)',
      '    pulseMin := na(pulseMin) ? item : math.min(pulseMin, item)',
      'state.score := array.size(pulses) > 0 ? pulseSum / array.size(pulses) : na',
      'state.remote := remoteRaw - remoteSmooth',
      'longSignal = state.score > state.remote and close > open',
      'shortSignal = state.score < state.remote and close < open',
      'if longSignal',
      '    state.longCount += 1',
      'if shortSignal',
      '    state.shortCount += 1',
      'map.put(matrix, "score", state.score)',
      'map.put(matrix, "remote", state.remote)',
      'map.put(matrix, "max", pulseMax)',
      'map.put(matrix, "min", pulseMin)',
      ...Array.from({ length: 28 }, (_, i) => `plot(pulse${i}, "True Pulse ${i}", color=${i % 3 === 0 ? 'color.teal' : i % 3 === 1 ? 'color.orange' : 'color.purple'})`),
      'scorePlot = plot(map.get(matrix, "score"), "True Matrix Score", color=color.white, linewidth=2)',
      'remotePlot = plot(map.get(matrix, "remote"), "True Matrix Remote", color=color.yellow)',
      'plot(map.get(matrix, "max"), "True Matrix Max")',
      'plot(map.get(matrix, "min"), "True Matrix Min")',
      'plot(remoteRaw, "True Remote Raw")',
      'plot(remoteSmooth, "True Remote Smooth")',
      'plot(lowerSum, "True Lower Sum")',
      'fill(scorePlot, remotePlot, color=color.new(color.blue, 92), title="True Matrix Fill")',
      'plotarrow(longSignal ? 1 : shortSignal ? -1 : 0, title="True Matrix Arrow", colorup=color.green, colordown=color.red)',
      'plotbar(open, high, low, close, title="True Matrix Bars", color=longSignal ? color.green : shortSignal ? color.red : color.gray)',
      'plotcandle(open, high, low, close, title="True Matrix Candles", color=longSignal ? color.green : shortSignal ? color.red : color.gray)',
      'plotshape(longSignal, title="True Long", style=shape.triangleup, location=location.belowbar, text="L")',
      'plotshape(shortSignal, title="True Short", style=shape.triangledown, location=location.abovebar, text="S")',
      'var table matrixTable = table.new(position.top_left, 3, 6)',
      'var label matrixLabel = na',
      'if showMatrix and barstate.islast',
      '    table.cell(matrixTable, 0, 0, "Score")',
      '    table.cell(matrixTable, 1, 0, str.format("{0:#.00}", state.score))',
      '    table.cell(matrixTable, 0, 1, "Remote")',
      '    table.cell(matrixTable, 1, 1, str.format("{0:#.00}", state.remote))',
      '    table.cell(matrixTable, 0, 2, "Longs")',
      '    table.cell(matrixTable, 1, 2, str.tostring(state.longCount))',
      '    table.cell(matrixTable, 0, 3, "Shorts")',
      '    table.cell(matrixTable, 1, 3, str.tostring(state.shortCount))',
      '    matrixLabel := label.new(bar_index, high, str.format("{0} {1:#.00} L{2} S{3}", helper.Regime.trend.title(), state.score, state.longCount, state.shortCount))',
      'bgcolor(longSignal ? color.new(color.green, 90) : shortSignal ? color.new(color.red, 90) : na)',
      'alertcondition(longSignal, title="True Matrix Long", message="True volume matrix long")',
      'alertcondition(shortSignal, title="True Matrix Short", message="True volume matrix short")',
      'alertcondition(ta.cross(state.score, state.remote), title="True Matrix Cross", message="True volume matrix crossed")',
    ].join('\n');

    const { compiledResult } = assertTrueLengthCompositeParity(source);
    expect(findPlot(compiledResult, 'True Matrix Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs awkward multiline request calls and boolean chains', () => {
    const { compiledResult } = assertAwkwardCompositeParity(`//@version=6
indicator("Awkward Multiline Request", overlay=true, max_labels_count=20)
import PublicUser/CompositeHelpers/1 as helper

// Deliberately odd wrapping and spacing.
groupOne = "One"
a = input.int(
     defval=3,
 title="A",
     minval=1,
 group=groupOne)
b = input.int(5,
     "B",
     minval=2,
     group=groupOne,
     inline="ab")
src = input.source(
 close,
 "Source",
 group=groupOne,
 tooltip="Wrapped source")
remote =
 request.security(
  "TEST",
       helper.HTF,
  expression=
       ta.sma(
           src,
           a),
  lookahead=barmerge.lookahead_on)
gate =
    (remote > src and timeframe.isintraday and session.ismarket) or
    (remote < src and not session.ispostmarket and chart.right_visible_bar_time >= time)
score = gate ? remote > src ? 2 : -2 : na(remote) ? 0 : remote - src
plot(score, "Awkward Request Score")
plot(remote, "Awkward Remote")
plotshape(gate, title="Awkward Gate", style=shape.circle, location=location.abovebar, text="G")
var table t = table.new(position.top_right, 2, 2)
if barstate.islast
    table.cell(t, 0, 0, "score")
    table.cell(t, 1, 0, str.format("{0:#.00}", score))
alertcondition(gate, title="Awkward Request Gate", message="Awkward request gate")`);

    expect(findPlot(compiledResult, 'Awkward Request Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs awkward UDT method chains and shadowed identifiers', () => {
    const { compiledResult } = assertAwkwardCompositeParity(`//@version=6
indicator("Awkward UDT Chains", overlay=false)
type A
    float v = 0.0
    int n = 0
method bump(A a, float v) =>
    a.v += v
    a.n += 1
    a
method score(A a) =>
    a.v / math.max(a.n, 1)

a = input.float(1.0, "a", step=0.1)
v = close - open
var A s = A.new()
next =
    s
     .bump(v)
     .bump(a)
     .bump(nz(ta.change(close)))
raw = next.score()
mode = raw > 2 ? "wide" : raw < -2 ? "short" : "flat"
out = switch mode
    "wide" => raw * 2
    "short" => raw - 2
    => raw
plot(raw, "Awkward UDT Raw")
plot(out, "Awkward UDT Out")
bgcolor(mode == "wide" ? color.new(color.green, 90) : mode == "short" ? color.new(color.red, 90) : na)`);

    expect(findPlot(compiledResult, 'Awkward UDT Out').values.some((value) => value !== null)).toBe(true);
  });

  it('runs awkward tuple assignments inside branches', () => {
    const { compiledResult } = assertAwkwardCompositeParity(`//@version=6
indicator("Awkward Tuple Branches", overlay=false)
import PublicUser/CompositeHelpers/1 as helper
pack(series float s, simple int len) =>
    [ta.ema(s, len), ta.sma(s, len), helper.blockScore(s, 2, len)]

fast = input.int(3, "Fast", minval=1)
slow = input.int(8, "Slow", minval=2)
[a, b, c] = pack(close, fast)
[ha, hb, hc] = pack(high, slow)
[la, lb, lc] = pack(low, fast)
if close > open
    [a, b, c] := [ha, hb, hc]
else
    [a, b, c] := [la, lb, lc]
spread = (a - b) + c
hist = spread[1]
plot(spread, "Awkward Tuple Spread")
plot(hist, "Awkward Tuple History")
plotshape(ta.cross(spread, hist), title="Awkward Tuple Cross", style=shape.xcross)`);

    expect(findPlot(compiledResult, 'Awkward Tuple Spread').values.some((value) => value !== null)).toBe(true);
  });

  it('runs awkward for-in, while, map, and matrix work', () => {
    const { compiledResult } = assertAwkwardCompositeParity(`//@version=6
indicator("Awkward Collections", overlay=false)
var array<float> xs = array.new<float>()
var map<string, float> m = map.new<string, float>()
matrix<float> grid = matrix.new<float>(2, 2, 0.0)
array.push(xs, close)
while array.size(xs) > 12
    array.shift(xs)

sum = 0.0
for [i, x] in xs
    sum += nz(x) * (i + 1)
matrix.set(grid, 0, 0, sum)
matrix.set(grid, 0, 1, array.size(xs))
matrix.set(grid, 1, 0, close)
matrix.set(grid, 1, 1, nz(sum[1]))
map.put(m, "sum", matrix.get(grid, 0, 0))
map.put(m, "count", matrix.get(grid, 0, 1))
score = map.get(m, "sum") / math.max(map.get(m, "count"), 1)
plot(score, "Awkward Collection Score")
plot(matrix.get(grid, 1, 1), "Awkward Collection Prev")`);

    expect(findPlot(compiledResult, 'Awkward Collection Score').values.some((value) => value !== null)).toBe(true);
  });

  it('runs awkward interleaved vars, plots, comments, and drawings', () => {
    const { compiledResult } = assertAwkwardCompositeParity(`//@version=6
indicator("Awkward Interleaved Drawings", overlay=true, max_labels_count=40, max_lines_count=40)
base = ta.sma(close, 3)
plot(base, "Awkward Base")

var float carry = na
carry := nz(carry[1], base)
plot(carry, "Awkward Carry")
// A plot between persistent drawing declarations is intentional.
var array<label> labels = array.new_label()
var array<line> lines = array.new_line()
hit = ta.crossover(close, carry) or (close > high[1] and not na(high[1]))
if hit
    array.push(labels, label.new(bar_index, high, str.format("{0:#.00}", close)))
    array.push(lines, line.new(bar_index - 1, nz(close[1], close), bar_index, close, extend=extend.right))
if array.size(labels) > 8
    label.delete(array.shift(labels))

if array.size(lines) > 8
    line.delete(array.shift(lines))
plotshape(hit, title="Awkward Hit", style=shape.triangleup, location=location.belowbar)
alertcondition(hit, title="Awkward Hit Alert", message="Awkward drawing hit")`);

    expect(findPlot(compiledResult, 'Awkward Carry').values.some((value) => value !== null)).toBe(true);
  });

  it('runs awkward imported helpers inside chained conditions', () => {
    const { compiledResult } = assertAwkwardCompositeParity(`//@version=6
indicator("Awkward Imported Conditions", overlay=false)
import PublicUser/CompositeHelpers/1 as helper
symbol = input.symbol("NASDAQ:AAPL", "Symbol")
tf = input.timeframe("3", "TF")
left = helper.Dashboard.new(score=close, title="left")
right = helper.Dashboard.new(score=open, title="right")
remoteA = request.security(symbol, tf, helper.blockScore(close, 2, 3), lookahead=barmerge.lookahead_on)
remoteB = request.security("NASDAQ:MSFT", "15", helper.smooth(close, 3), lookahead=barmerge.lookahead_on)
condition =
    (left.adjusted(remoteA, factor=0.5) > right.adjusted(remoteB, factor=0.25)) and
    (timeframe.in_seconds(tf) >= timeframe.in_seconds()) and
    (str.length(helper.Regime.trend.title()) > str.length(helper.Regime.range.title()) or session.ismarket)
score = condition ? remoteA - remoteB : remoteB - remoteA
plot(score, "Awkward Imported Score")
plot(left.adjusted(score, factor=0.1), "Awkward Imported Adjusted")
plotshape(condition, title="Awkward Imported Condition", style=shape.square)`);

    expect(findPlot(compiledResult, 'Awkward Imported Score').values.some((value) => value !== null)).toBe(true);
  });

  it('tracks production worker fallback rate for composite indicators', async () => {
    for (const [groupId, cases] of [
      ['true-length-composites', trueLengthCompositeProductionCases],
      ['awkward-composites', awkwardCompositeProductionCases],
    ] as const) {
      const baseline = getProductionWorkerFallbackBaselineGroup(groupId);
      const session = await measureProductionWorkerSessions(cases, { includeLiveUpdates: true });
      const measurements = session.loadMeasurements;
      const updateMeasurements = session.updateMeasurements;
      const fallbacks = measurements.filter(isProductionWorkerFallbackMeasurement);
      const updateFallbacks = updateMeasurements.filter(isProductionWorkerFallbackMeasurement);

      expect(cases.length).toBe(baseline.scriptCount);
      expect(cases.length).toBe(baseline.eligible);
      expect(cases.length - fallbacks.length).toBe(baseline.compiled);
      expect(fallbacks.length).toBe(baseline.fallback);
      expect(fallbacks.length / cases.length).toBe(baseline.fallbackRate);
      expect(summarizeProductionWorkerExecutionModes(measurements)).toEqual(baseline.executionModes);
      expect(summarizeProductionWorkerFallbackReasons(measurements)).toEqual(baseline.knownFallbackReasons);
      expect(updateMeasurements.length).toBe(baseline.liveUpdates.total);
      expect(updateMeasurements.length - updateFallbacks.length).toBe(baseline.liveUpdates.compiled);
      expect(updateFallbacks.length).toBe(baseline.liveUpdates.fallback);
      expect(updateFallbacks.length / updateMeasurements.length).toBe(baseline.liveUpdates.fallbackRate);
      expect(summarizeProductionWorkerExecutionModes(updateMeasurements)).toEqual(baseline.liveUpdates.executionModes);
      expect(summarizeProductionWorkerFallbackReasons(updateMeasurements)).toEqual(baseline.liveUpdates.knownFallbackReasons);
    }
  });
  realtimeSweepIt('tracks realtime re-entry output parity for composite indicators', async () => {
    for (const [groupId, cases] of [
      ['true-length-composites', trueLengthCompositeProductionCases],
      ['awkward-composites', awkwardCompositeProductionCases],
    ] as const) {
      const baseline = getProductionWorkerFallbackBaselineGroup(groupId).realtimeParity;
      const measurement = await measureRealtimeReentryParity(cases, {
        backend: REALTIME_SWEEP_BACKEND,
      });

      expect({
        backend: measurement.backend,
        totalUpdates: measurement.totalUpdates,
        workerMatched: measurement.workerMatched,
        workerMismatches: summarizeRealtimeParityMismatches(measurement.workerMismatches),
      }).toEqual({
        backend: REALTIME_SWEEP_BACKEND,
        ...baseline,
      });
    }
  }, 30_000);
});
