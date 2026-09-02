import { describe, expect, it } from 'vitest';

import {
  InMemoryRequestDatafeed,
  executeScript,
  getCompiledFallbackBaselineGroup,
  parse,
  seedRequestSymbol,
  type Bar,
  type ExecutionResult,
  type TealscriptEngineOptions,
} from '../../src';
import { summarizeCompiledFallbackReasons } from '../../src/compat/compiledFallbackBaseline';
import {
  getProductionWorkerFallbackBaselineGroup,
  summarizeRealtimeParityMismatches,
  summarizeProductionWorkerExecutionModes,
  summarizeProductionWorkerFallbackReasons,
} from '../../src/compat/productionWorkerFallbackBaseline';
import { executeCompiled, tryCompile, type CompiledScript } from '../../src/runtime/codegen';
import type { Program } from '../../src/parser/ast';
import { measureForcedCompiledRealtimeSafety, measureProductionWorkerSessions, measureRealtimeReentryParity } from './productionWorkerHarness';

interface BenchmarkCase {
  name: string;
  source: string;
  bars: Bar[];
  options?: TealscriptEngineOptions;
  iterations: number;
  provenance: {
    measuredAt: string;
    machine: string;
    composite: string;
    bars: number;
    iterations: number;
    note?: string;
  };
  thresholds: {
    compileMs: number;
    interpreterUsPerBar: number;
    compiledUsPerBar: number;
    heapDeltaMb?: number;
  };
  baseline: {
    compileMs: number;
    interpreterUsPerBar: number;
    compiledUsPerBar: number;
    heapDeltaMb?: number;
  };
}

const ASSERT_PERFORMANCE_THRESHOLDS = process.env.TEALSCRIPT_PERF_ASSERT === '1';
const RUN_REALTIME_SWEEP = process.env.TEALSCRIPT_REALTIME_SWEEP === '1';
const REALTIME_SWEEP_BACKEND = process.env.TEALSCRIPT_REALTIME_BACKEND === 'closure' ? 'closure' : 'worker';
const fullPerformanceIt = ASSERT_PERFORMANCE_THRESHOLDS ? it : it.skip;
const realtimeSweepIt = RUN_REALTIME_SWEEP ? it : it.skip;
const SMOKE_BAR_COUNT = 12;

function makeBars(count: number, start = Date.UTC(2024, 0, 1), step = 60_000): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 + Math.sin(index / 11) * 4 + Math.cos(index / 17) * 2 + index * 0.015;
    return {
      time: start + index * step,
      open: close - 0.4 + (index % 3) * 0.12,
      high: close + 1.2 + (index % 5) * 0.08,
      low: close - 1.1 - (index % 7) * 0.05,
      close,
      volume: 1_000 + ((index * 37) % 700),
    };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function measureMedian(iterations: number, fn: () => void): number {
  const samples: number[] = [];
  fn();
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return median(samples);
}

function compileOrThrow(ast: Program, options?: TealscriptEngineOptions): CompiledScript {
  const compiled = tryCompile(ast, undefined, { libraries: options?.libraries });
  if (!compiled.success) {
    throw new Error(`Compilation failed: ${compiled.unsupported.join(', ')}`);
  }
  return compiled;
}

function executeCompiledOrThrow(compiled: CompiledScript, bars: Bar[], options?: TealscriptEngineOptions): ExecutionResult {
  const result = executeCompiled(compiled, bars, undefined, options);
  if (!result) throw new Error('Compiled execution returned null');
  return result;
}

function assertResultClean(result: ExecutionResult): void {
  expect(result.errors).toEqual([]);
  expect(result.profile.bars).toBeGreaterThan(0);
}

function assertPlotShapeParity(compiled: ExecutionResult, interpreted: ExecutionResult): void {
  expect(compiled.plots.length).toBe(interpreted.plots.length);
  for (let plotIndex = 0; plotIndex < compiled.plots.length; plotIndex += 1) {
    expect(compiled.plots[plotIndex]?.values.length).toBe(interpreted.plots[plotIndex]?.values.length);
  }
}

function runBenchmarkCase(testCase: BenchmarkCase): void {
  expect(testCase.source.trim().split('\n').length).toBeGreaterThanOrEqual(200);

  const ast = parse(testCase.source);
  const compileMs = measureMedian(testCase.iterations, () => {
    compileOrThrow(ast, testCase.options);
  });
  const compiled = compileOrThrow(ast, testCase.options);

  const interpreterMs = measureMedian(testCase.iterations, () => {
    assertResultClean(executeScript(ast, testCase.bars, undefined, testCase.options));
  });

  const heapBefore = process.memoryUsage().heapUsed;
  const compiledMs = measureMedian(testCase.iterations, () => {
    assertResultClean(executeCompiledOrThrow(compiled, testCase.bars, testCase.options));
  });
  const compiledResult = executeCompiledOrThrow(compiled, testCase.bars, testCase.options);
  const heapAfter = process.memoryUsage().heapUsed;
  const interpretedResult = executeScript(ast, testCase.bars, undefined, testCase.options);

  assertResultClean(compiledResult);
  assertResultClean(interpretedResult);
  assertPlotShapeParity(compiledResult, interpretedResult);

  const bars = testCase.bars.length;
  const interpreterUsPerBar = (interpreterMs * 1_000) / bars;
  const compiledUsPerBar = (compiledMs * 1_000) / bars;
  const heapDeltaMb = Math.max(0, heapAfter - heapBefore) / 1024 / 1024;
  const speedup = interpreterUsPerBar / compiledUsPerBar;

  if (process.env.TEALSCRIPT_PERF_LOG === '1') {
    console.info(
      `${testCase.name}: compile=${compileMs.toFixed(1)}ms interpreter=${interpreterUsPerBar.toFixed(1)}us/bar compiled=${compiledUsPerBar.toFixed(1)}us/bar speedup=${speedup.toFixed(1)}x heap=${heapDeltaMb.toFixed(1)}MB`,
    );
  }

  expect(testCase.provenance.bars).toBe(testCase.bars.length);
  expect(testCase.provenance.iterations).toBe(testCase.iterations);
  if (ASSERT_PERFORMANCE_THRESHOLDS) {
    expect(compileMs, `${testCase.name} compile ms`).toBeLessThanOrEqual(testCase.thresholds.compileMs);
    expect(interpreterUsPerBar, `${testCase.name} interpreter us/bar`).toBeLessThanOrEqual(testCase.thresholds.interpreterUsPerBar);
    expect(compiledUsPerBar, `${testCase.name} compiled us/bar`).toBeLessThanOrEqual(testCase.thresholds.compiledUsPerBar);
    if (testCase.thresholds.heapDeltaMb !== undefined) {
      expect(heapDeltaMb, `${testCase.name} heap delta MB`).toBeLessThanOrEqual(testCase.thresholds.heapDeltaMb);
    }
  }

  expect(testCase.baseline.compileMs).toBeLessThanOrEqual(testCase.thresholds.compileMs);
  expect(testCase.baseline.interpreterUsPerBar).toBeLessThanOrEqual(testCase.thresholds.interpreterUsPerBar);
  expect(testCase.baseline.compiledUsPerBar).toBeLessThanOrEqual(testCase.thresholds.compiledUsPerBar);
  if (testCase.baseline.heapDeltaMb !== undefined && testCase.thresholds.heapDeltaMb !== undefined) {
    expect(testCase.baseline.heapDeltaMb).toBeLessThanOrEqual(testCase.thresholds.heapDeltaMb);
  }
}

function makeSmokeCase(testCase: BenchmarkCase): BenchmarkCase {
  return {
    ...testCase,
    bars: testCase.bars.slice(0, SMOKE_BAR_COUNT),
    iterations: 1,
    provenance: {
      ...testCase.provenance,
      bars: SMOKE_BAR_COUNT,
      iterations: 1,
    },
  };
}

function runSmokeCase(testCase: BenchmarkCase): void {
  expect(testCase.source.trim().split('\n').length).toBeGreaterThanOrEqual(200);

  const ast = parse(testCase.source);
  const compiled = compileOrThrow(ast, testCase.options);
  const interpretedResult = executeScript(ast, testCase.bars, undefined, testCase.options);
  const compiledResult = executeCompiledOrThrow(compiled, testCase.bars, testCase.options);

  assertResultClean(interpretedResult);
  assertResultClean(compiledResult);
  assertPlotShapeParity(compiledResult, interpretedResult);
}

const computeBars = makeBars(900);
const drawingBars = makeBars(2_400);
const requestBars = makeBars(720);
const requestHtfBars = makeBars(220, requestBars[0]!.time, 300_000);
const helperLibrary = parse(`//@version=6
library("BenchmarkHelpers", true)
export const string HTF = "5"
export type Row
    float value = na
    string name = "row"
export score(series float src, simple int len) =>
    fast = ta.ema(src, len)
    slow = ta.sma(src, len + 1)
    fast - slow
export method shifted(Row this, float offset) =>
    this.value + offset
`);

const requestDatafeed = new InMemoryRequestDatafeed([
  {
    symbol: 'TEST',
    timeframe: '5',
    bars: requestHtfBars,
    syminfo: { ticker: 'TEST', tickerid: 'TEST', currency: 'USD', timezone: 'Etc/UTC' },
    session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
  },
  {
    symbol: seedRequestSymbol('tradingview-pine-seeds/demo', 'BENCH'),
    timeframe: '1',
    bars: requestHtfBars,
  },
  ...Array.from({ length: 24 }, (_, index) => ({
    symbol: `BENCH:SYM${index}`,
    timeframe: '5',
    bars: requestHtfBars.map((bar) => ({
      ...bar,
      close: bar.close + index * 0.75,
      open: bar.open + index * 0.75,
      high: bar.high + index * 0.75,
      low: bar.low + index * 0.75,
    })),
    syminfo: { ticker: `SYM${index}`, tickerid: `BENCH:SYM${index}`, currency: 'USD', timezone: 'Etc/UTC' },
    session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
  })),
]);

const engineOptions: TealscriptEngineOptions = {
  libraries: new Map([['PublicUser/BenchmarkHelpers/1', helperLibrary]]),
  requestDatafeed,
  runtime: {
    now: Date.UTC(2024, 0, 6, 12),
    syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', timezone: 'Etc/UTC', currency: 'USDT' },
    timeframe: { period: '1', multiplier: 1, isintraday: true },
    chart: {
      leftVisibleBarTime: computeBars[50]!.time,
      rightVisibleBarTime: computeBars[700]!.time,
      bgColor: '#101014',
      fgColor: '#eeeeee',
    },
    session: { timezone: 'Etc/UTC', regular: '0000-2359:1234567' },
  },
};

function makeComputationComposite(): string {
  return [
    '//@version=6',
    'indicator("Performance Dense Computation", overlay=true, max_labels_count=120, max_lines_count=80)',
    'import PublicUser/BenchmarkHelpers/1 as helper',
    'groupMain = "Main"',
    'groupRisk = "Risk"',
    'src = input.source(close, "Source", group=groupMain, inline="src")',
    'show = input.bool(true, "Show", group=groupMain, inline="src")',
    ...Array.from({ length: 70 }, (_, index) => `len${index} = input.int(${2 + (index % 29)}, "Length ${index}", minval=1, group=groupMain, inline="l${Math.floor(index / 4)}")`),
    ...Array.from({ length: 28 }, (_, index) => `weight${index} = input.float(${((index % 9) + 1) / 10}, "Weight ${index}", step=0.1, group=groupRisk, inline="w${Math.floor(index / 4)}")`),
    'type BenchState',
    '    float score = na',
    '    float trend = na',
    '    int flips = 0',
    'normalize(series float value, simple int len) =>',
    '    top = ta.highest(value, len)',
    '    bottom = ta.lowest(value, len)',
    '    span = top - bottom',
    '    span == 0 ? 0 : (value - bottom) / span',
    'chain(series float value, simple int fast, simple int slow) =>',
    '    base = helper.score(value, fast)',
    '    smooth = ta.ema(base, slow)',
    '    normalize(smooth, slow)',
    'var BenchState state = BenchState.new()',
    'var array<float> recent = array.new_float()',
    'var map<string, float> board = map.new<string, float>()',
    ...Array.from({ length: 76 }, (_, index) => `metric${index} = chain(src + nz(src[${index % 12}], src) * weight${index % 28}, len${index % 70}, len${(index + 5) % 70})`),
    'total = close * 0',
    ...Array.from({ length: 76 }, (_, index) => `total += nz(metric${index}) * weight${index % 28}`),
    'state.score := total / 76',
    'state.trend := ta.ema(state.score, len1)',
    'if ta.cross(state.score, state.trend)',
    '    state.flips += 1',
    'array.push(recent, state.score - state.trend)',
    'if array.size(recent) > 100',
    '    array.shift(recent)',
    'sumRecent = 0.0',
    'for item in recent',
    '    sumRecent += nz(item)',
    'avgRecent = array.size(recent) > 0 ? sumRecent / array.size(recent) : na',
    'map.put(board, "score", state.score)',
    'map.put(board, "trend", state.trend)',
    'map.put(board, "avg", avgRecent)',
    ...Array.from({ length: 20 }, (_, index) => `plot(metric${index}, "Metric ${index}", color=${index % 2 === 0 ? 'color.teal' : 'color.orange'})`),
    'scorePlot = plot(map.get(board, "score"), "Score", color=color.white, linewidth=2)',
    'trendPlot = plot(map.get(board, "trend"), "Trend", color=color.yellow)',
    'plot(map.get(board, "avg"), "Average")',
    'fill(scorePlot, trendPlot, color=color.new(color.blue, 90), title="Score Fill")',
    'plotshape(show and state.score > state.trend, title="Score Up", style=shape.triangleup, text="U")',
    'bgcolor(show and state.score > state.trend ? color.new(color.green, 92) : na)',
    'alertcondition(state.score > state.trend, title="Score Above Trend", message="Score above trend")',
  ].join('\n');
}

function makeDrawingComposite(): string {
  return [
    '//@version=6',
    'indicator("Performance Drawing Churn", overlay=true, max_labels_count=500, max_lines_count=500, max_boxes_count=500)',
    'import PublicUser/BenchmarkHelpers/1 as helper',
    'groupDraw = "Draw"',
    'show = input.bool(true, "Show", group=groupDraw, inline="draw")',
    ...Array.from({ length: 54 }, (_, index) => `pivotLen${index} = input.int(${2 + (index % 25)}, "Pivot ${index}", minval=1, group=groupDraw, inline="p${Math.floor(index / 4)}")`),
    'type DrawState',
    '    float highLevel = na',
    '    float lowLevel = na',
    '    int turns = 0',
    'pivot(series float src, simple int len) =>',
    '    top = ta.highest(high, len)',
    '    bottom = ta.lowest(low, len)',
    '    span = top - bottom',
    '    span == 0 ? 0 : (src - bottom) / span',
    'var DrawState state = DrawState.new()',
    'var array<line> lines = array.new_line()',
    'var array<label> labels = array.new_label()',
    'var array<box> boxes = array.new_box()',
    'var array<float> scores = array.new_float()',
    ...Array.from({ length: 66 }, (_, index) => `score${index} = pivot(close + ${(index % 7) * 0.05}, pivotLen${index % 54})`),
    'scoreSum = 0.0',
    ...Array.from({ length: 66 }, (_, index) => `scoreSum += nz(score${index}) / 66`),
    'state.highLevel := ta.highest(high, pivotLen0)',
    'state.lowLevel := ta.lowest(low, pivotLen1)',
    'state.turns += ta.cross(scoreSum, nz(scoreSum[1], scoreSum)) ? 1 : 0',
    'array.push(scores, scoreSum)',
    'if array.size(scores) > 200',
    '    array.shift(scores)',
    'rangeAvg = 0.0',
    'for item in scores',
    '    rangeAvg += nz(item)',
    'rangeAvg := array.size(scores) > 0 ? rangeAvg / array.size(scores) : na',
    'if show and bar_index % 5 == 0',
    '    array.push(lines, line.new(bar_index - 3, state.lowLevel, bar_index, state.highLevel, color=color.teal, width=2))',
    '    array.push(labels, label.new(bar_index, state.highLevel, str.format("{0:#.00}", scoreSum)))',
    '    array.push(boxes, box.new(bar_index - 2, state.highLevel, bar_index, state.lowLevel, bgcolor=color.new(color.blue, 90), border_color=color.gray))',
    'if array.size(lines) > 80',
    '    line.delete(array.shift(lines))',
    'if array.size(labels) > 80',
    '    label.delete(array.shift(labels))',
    'if array.size(boxes) > 60',
    '    box.delete(array.shift(boxes))',
    ...Array.from({ length: 18 }, (_, index) => `plot(score${index}, "Draw Score ${index}")`),
    'plot(scoreSum, "Drawing Score", color=color.white, linewidth=2)',
    'plot(rangeAvg, "Drawing Average")',
    'plot(state.turns, "Drawing Turns")',
    'plotshape(scoreSum > rangeAvg, title="Drawing Positive", style=shape.circle, text="D")',
    'bgcolor(scoreSum > rangeAvg ? color.new(color.green, 94) : color.new(color.red, 94))',
    'alertcondition(scoreSum > rangeAvg, title="Drawing Score Above", message="Drawing score above average")',
  ].join('\n');
}

function makeRequestFanoutComposite(): string {
  return [
    '//@version=6',
    'indicator("Performance Request Fanout", overlay=false, max_labels_count=80)',
    'import PublicUser/BenchmarkHelpers/1 as helper',
    'groupRequest = "Requests"',
    'tf = input.timeframe(helper.HTF, "Request TF", group=groupRequest, inline="tf")',
    ...Array.from({ length: 24 }, (_, index) => `sym${index} = input.symbol("BENCH:SYM${index}", "Symbol ${index}", group=groupRequest, inline="s${Math.floor(index / 3)}")`),
    ...Array.from({ length: 44 }, (_, index) => `len${index} = input.int(${2 + (index % 18)}, "Length ${index}", minval=1, group=groupRequest, inline="l${Math.floor(index / 4)}")`),
    'type FanoutState',
    '    float score = na',
    '    int hits = 0',
    'remote(simple string symbol, simple string reqTf, series float src, simple int len) =>',
    '    request.security(symbol, reqTf, helper.score(src, len), lookahead=barmerge.lookahead_on)',
    'remotePack(simple string symbol, simple string reqTf, series float src, simple int len) =>',
    '    request.security(symbol, reqTf, [ta.sma(src, len), ta.ema(src, len)], lookahead=barmerge.lookahead_on)',
    'seeded = request.seed("tradingview-pine-seeds/demo", "BENCH", ta.sma(close, 2))',
    'var FanoutState state = FanoutState.new()',
    'var array<float> values = array.new_float()',
    'var map<string, float> board = map.new<string, float>()',
    ...Array.from({ length: 24 }, (_, index) => `remote${index} = remote(sym${index}, tf, close, len${index})`),
    ...Array.from({ length: 12 }, (_, index) => `[packFast${index}, packSlow${index}] = remotePack(sym${index}, tf, close, len${(index + 10) % 44})`),
    ...Array.from({ length: 24 }, (_, index) => `array.push(values, remote${index})`),
    ...Array.from({ length: 12 }, (_, index) => `array.push(values, packFast${index} - packSlow${index})`),
    'sumValue = 0.0',
    'for item in values',
    '    sumValue += nz(item)',
    'while array.size(values) > 120',
    '    array.shift(values)',
    'state.score := sumValue / 36 + nz(seeded)',
    'state.hits += not na(state.score) ? 1 : 0',
    'map.put(board, "score", state.score)',
    'map.put(board, "hits", state.hits)',
    ...Array.from({ length: 24 }, (_, index) => `plot(remote${index}, "Remote ${index}", color=${index % 2 === 0 ? 'color.teal' : 'color.orange'})`),
    'plot(map.get(board, "score"), "Fanout Score", color=color.white, linewidth=2)',
    'plot(map.get(board, "hits"), "Fanout Hits")',
    'plotshape(state.score > nz(state.score[1], state.score), title="Fanout Rising", style=shape.triangleup, text="F")',
    'var table fanoutTable = table.new(position.top_right, 2, 4)',
    'if barstate.islast',
    '    table.cell(fanoutTable, 0, 0, "Score")',
    '    table.cell(fanoutTable, 1, 0, str.format("{0:#.00}", state.score))',
    '    table.cell(fanoutTable, 0, 1, "Hits")',
    '    table.cell(fanoutTable, 1, 1, str.tostring(state.hits))',
    'bgcolor(state.score > 0 ? color.new(color.green, 92) : na)',
    'alertcondition(state.score > nz(state.score[1], state.score), title="Fanout Rising", message="Fanout score rising")',
  ].join('\n');
}

describe('composite performance baselines', () => {
  const cases: BenchmarkCase[] = [
    {
      name: 'dense computation composite',
      source: makeComputationComposite(),
      bars: computeBars,
      options: engineOptions,
      iterations: 3,
      provenance: {
        measuredAt: '2026-08-31',
        machine: 'Sam local macOS Apple Silicon shared agent machine',
        composite: 'Performance Dense Computation',
        bars: 900,
        iterations: 3,
        note: 'Remeasured after interpreter global scalar input declaration caching, UDF call metadata/frame fast paths, and TA window/ordered-argument helper allocation trims. This script is interpreter-heavy because it evaluates 76 UDF/imported-helper/TA metric chains per bar; profiling showed call/declaration overhead dominates direct TA and array/map builtin cost.',
      },
      baseline: { compileMs: 6, interpreterUsPerBar: 1_421, compiledUsPerBar: 281 },
      thresholds: { compileMs: 250, interpreterUsPerBar: 2_800, compiledUsPerBar: 700 },
    },
    {
      name: 'drawing lifecycle composite',
      source: makeDrawingComposite(),
      bars: drawingBars,
      options: engineOptions,
      iterations: 3,
      provenance: {
        measuredAt: '2026-08-31',
        machine: 'Sam local macOS Apple Silicon shared agent machine',
        composite: 'Performance Drawing Churn',
        bars: 2_400,
        iterations: 3,
        note: 'Remeasured after interpreter global scalar input declaration caching, UDF call metadata/frame fast paths, and TA window/ordered-argument helper allocation trims. Heap delta is measured without forcing GC, so the threshold intentionally allows shared-machine and collector timing variance.',
      },
      baseline: { compileMs: 4, interpreterUsPerBar: 554, compiledUsPerBar: 138, heapDeltaMb: 0 },
      thresholds: { compileMs: 250, interpreterUsPerBar: 1_500, compiledUsPerBar: 700, heapDeltaMb: 192 },
    },
    {
      name: 'request fanout composite',
      source: makeRequestFanoutComposite(),
      bars: requestBars,
      options: engineOptions,
      iterations: 3,
      provenance: {
        measuredAt: '2026-08-31',
        machine: 'Sam local macOS Apple Silicon shared agent machine',
        composite: 'Performance Request Fanout',
        bars: 720,
        iterations: 3,
        note: 'Remeasured after interpreter global scalar input declaration caching, UDF call metadata/frame fast paths, and TA window/ordered-argument helper allocation trims. Covers 24 scalar request.security calls, 12 tuple request.security calls, and one request.seed call against seeded in-memory contexts.',
      },
      baseline: { compileMs: 11, interpreterUsPerBar: 727, compiledUsPerBar: 184 },
      thresholds: { compileMs: 300, interpreterUsPerBar: 2_500, compiledUsPerBar: 2_000 },
    },
  ];

  it('tracks compiled fallback rate for performance composites', () => {
    const baseline = getCompiledFallbackBaselineGroup('performance-composites');
    const fallbacks = cases.flatMap((testCase) => {
      expect(testCase.source.trim().split('\n').length).toBeGreaterThanOrEqual(200);
      const ast = parse(testCase.source);
      const compiled = tryCompile(ast, undefined, { libraries: testCase.options?.libraries });
      return compiled.success ? [] : [{ scriptId: testCase.name, reasons: compiled.unsupported }];
    });

    expect(cases.length).toBe(baseline.scriptCount);
    expect(cases.length).toBe(baseline.eligible);
    expect(cases.length - fallbacks.length).toBe(baseline.compiled);
    expect(fallbacks.length).toBe(baseline.fallback);
    expect(fallbacks.length / cases.length).toBe(baseline.fallbackRate);
    expect(summarizeCompiledFallbackReasons(fallbacks)).toEqual(baseline.knownFallbackReasons);
  });

  it('smoke-runs performance composites through interpreter and compiled execution', () => {
    const smokeCases = cases.map(makeSmokeCase);
    for (const testCase of smokeCases) {
      runSmokeCase(testCase);
    }
  });

  it('smoke-runs a request-backed performance composite through the worker path', async () => {
    const requestCase = cases.find((testCase) => testCase.name === 'request fanout composite');
    expect(requestCase).toBeDefined();
    const smokeCases = [makeSmokeCase(requestCase!)];
    const workerSession = await measureProductionWorkerSessions(smokeCases.map((testCase) => ({
      scriptId: testCase.name,
      source: testCase.source,
      bars: testCase.bars,
      engineOptions: testCase.options,
    })), { includeLiveUpdates: true });
    expect(workerSession.loadMeasurements).toHaveLength(smokeCases.length);
    expect(workerSession.updateMeasurements).toHaveLength(smokeCases.length * 3);
    expect(workerSession.loadMeasurements.every((measurement) => measurement.executionMode !== undefined)).toBe(true);
    expect(workerSession.updateMeasurements.every((measurement) => measurement.executionMode !== undefined)).toBe(true);
  }, 10_000);

  it('smoke-runs a request-backed performance composite through realtime safety classification', () => {
    const requestCase = cases.find((testCase) => testCase.name === 'request fanout composite');
    expect(requestCase).toBeDefined();
    const smokeCases = [makeSmokeCase(requestCase!)];
    const safetyMeasurement = measureForcedCompiledRealtimeSafety(smokeCases.map((testCase) => ({
      scriptId: testCase.name,
      source: testCase.source,
      bars: testCase.bars,
      engineOptions: testCase.options,
    })), { includeSafe: true });
    expect(safetyMeasurement.scripts).toHaveLength(smokeCases.length);
    expect(safetyMeasurement.updates).toHaveLength(smokeCases.length * 3);
  }, 10_000);

  fullPerformanceIt('tracks production worker fallback rate for performance composites', async () => {
    const baseline = getProductionWorkerFallbackBaselineGroup('performance-composites');
    const session = await measureProductionWorkerSessions(cases.map((testCase) => ({
      scriptId: testCase.name,
      source: testCase.source,
      bars: testCase.bars,
      engineOptions: testCase.options,
    })), { includeLiveUpdates: true });
    const measurements = session.loadMeasurements;
    const updateMeasurements = session.updateMeasurements;
    const fallbacks = measurements.filter((measurement) => measurement.executionMode !== 'compiled');
    const updateFallbacks = updateMeasurements.filter((measurement) => measurement.executionMode !== 'compiled');

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
  }, 30_000);

  fullPerformanceIt('classifies performance realtime safety fallbacks by forced compiled behaviour', () => {
    const measurement = measureForcedCompiledRealtimeSafety(cases.map((testCase) => ({
      scriptId: testCase.name,
      source: testCase.source,
      bars: testCase.bars,
      engineOptions: testCase.options,
    })), { includeSafe: true });

    expect(measurement.scripts.map((entry) => ({
      scriptId: entry.scriptId,
      classification: entry.classification,
    }))).toEqual([
      { scriptId: 'dense computation composite', classification: 'overtrigger-matched' },
      { scriptId: 'drawing lifecycle composite', classification: 'genuine-divergence' },
      { scriptId: 'request fanout composite', classification: 'genuine-divergence' },
    ]);
    expect(measurement.updates).toHaveLength(9);
    expect(measurement.updates.filter((entry) => entry.classification === 'genuine-divergence')).toHaveLength(6);
    expect(measurement.updates.filter((entry) => entry.classification === 'overtrigger-matched')).toHaveLength(3);
  }, 30_000);

  realtimeSweepIt('tracks realtime re-entry output parity for performance composites', async () => {
    const baseline = getProductionWorkerFallbackBaselineGroup('performance-composites').realtimeParity;
    const measurement = await measureRealtimeReentryParity(cases.map((testCase) => ({
      scriptId: testCase.name,
      source: testCase.source,
      bars: testCase.bars,
      engineOptions: testCase.options,
    })), {
      backend: REALTIME_SWEEP_BACKEND,
    });
    const expected = REALTIME_SWEEP_BACKEND === 'closure'
      ? {
          totalUpdates: baseline.totalUpdates,
          workerMatched: baseline.totalUpdates,
          workerMismatches: [],
          interpreterMatched: baseline.totalUpdates,
          interpreterMismatches: [],
        }
      : baseline;

    expect({
      backend: measurement.backend,
      totalUpdates: measurement.totalUpdates,
      workerMatched: measurement.workerMatched,
      workerMismatches: summarizeRealtimeParityMismatches(measurement.workerMismatches),
      interpreterMatched: measurement.interpreterMatched,
      interpreterMismatches: summarizeRealtimeParityMismatches(measurement.interpreterMismatches),
    }).toEqual({
      backend: REALTIME_SWEEP_BACKEND,
      ...expected,
    });
    if (REALTIME_SWEEP_BACKEND === 'closure') {
      expect(measurement.closureMatched).toBe(baseline.totalUpdates);
      expect(measurement.closureMismatches).toEqual([]);
    }
  }, 120_000);

  for (const testCase of cases) {
    fullPerformanceIt(
      `keeps ${testCase.name} within the committed baseline envelope`,
      () => {
        runBenchmarkCase(testCase);
      },
      60_000,
    );
  }
});
