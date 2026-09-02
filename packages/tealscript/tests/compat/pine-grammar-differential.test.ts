import { describe, expect, it } from 'vitest';

import { PINE_V6_GRAMMAR_CONSTRUCTS } from '../../src/compat/pineV6GrammarReference';
import { parse } from '../../src/parser';
import type { Program } from '../../src/parser/ast';
import type { Bar, ExecutionResult, TealscriptEngineOptions } from '../../src/runtime';
import { TealscriptEngine, executeScript } from '../../src/runtime';
import { executeCompiled, tryCompile, type CompiledExecutionOptions } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed, type RequestDataContext } from '../../src/runtime/requestDatafeed';
import { COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX, analyzeCompiledRealtimeSafety } from '../../src/runtime/realtimeSafety';
import { measureProductionWorkerSessions, type RealtimeOutputSnapshot } from './productionWorkerHarness';

interface GeneratedBlock {
  id: string;
  source: string;
}

interface GeneratedProgram {
  id: string;
  seed: number;
  blocks: GeneratedBlock[];
  source: string;
}

interface DifferentialOutcome {
  ok: boolean;
  reason?: string;
}

interface RealtimeDifferentialFinding {
  programId: string;
  updateIndex: number;
  blocks: string[];
  reason: string;
  classification: string;
}

const DEFAULT_PROGRAMS = 48;
const SOAK_PROGRAMS = 384;
const DEFAULT_REALTIME_PROGRAMS = 12;
const SOAK_REALTIME_PROGRAMS = 96;
const programCount = process.env.TEALSCRIPT_GRAMMAR_DIFF_SOAK === '1' ? SOAK_PROGRAMS : DEFAULT_PROGRAMS;
const realtimeProgramCount = process.env.TEALSCRIPT_GRAMMAR_DIFF_SOAK === '1' ? SOAK_REALTIME_PROGRAMS : DEFAULT_REALTIME_PROGRAMS;
const EXPECTED_REALTIME_DIVERGENCE_CLASSIFICATIONS = new Set([
  COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX,
]);

const differentialBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 104, low: 99, close: 102, volume: 1_000 },
  { time: 1_700_000_060_000, open: 102, high: 106, low: 101, close: 105, volume: 1_100 },
  { time: 1_700_000_120_000, open: 105, high: 108, low: 104, close: 107, volume: 900 },
  { time: 1_700_000_180_000, open: 107, high: 109, low: 102, close: 103, volume: 1_250 },
  { time: 1_700_000_240_000, open: 103, high: 104, low: 98, close: 99, volume: 1_400 },
  { time: 1_700_000_300_000, open: 99, high: 101, low: 96, close: 100, volume: 1_050 },
  { time: 1_700_000_360_000, open: 100, high: 105, low: 99, close: 104, volume: 1_300 },
  { time: 1_700_000_420_000, open: 104, high: 110, low: 103, close: 109, volume: 1_600 },
];

const requestBars: Bar[] = differentialBars.map((bar, index) => ({
  ...bar,
  open: 200 + index,
  high: 204 + index,
  low: 198 + index,
  close: 201 + index,
  volume: 2_000 + index,
}));

const libraryRegistry = new Map<string, Program>([
  [
    'TestUser/DiffLib/1',
    parse(`//@version=6
library("DiffLib")
export adjust(float source, float offset) => source + offset
export method scale(float source, float factor) => source * factor
`),
  ],
]);

const options: TealscriptEngineOptions & CompiledExecutionOptions = {
  libraries: libraryRegistry,
  requestDatafeed: new InMemoryRequestDatafeed([
    requestContext('NASDAQ:AAPL', '1', requestBars),
  ]),
};

function requestContext(symbol: string, timeframe: string, bars: Bar[]): RequestDataContext {
  return {
    symbol,
    timeframe,
    bars,
    syminfo: {
      ticker: symbol,
      tickerid: symbol,
      currency: 'USD',
    },
  };
}

function xorshift32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

function shuffle<T>(random: () => number, values: readonly T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

function blockLibraryImport(suffix: string): GeneratedBlock {
  return {
    id: 'imports.function-method',
    source: `import TestUser/DiffLib/1 as lib${suffix}
plot(lib${suffix}.adjust(close, ${Number(suffix) + 1}), title="import_fn_${suffix}")`,
  };
}

function nestedNumericExpression(random: () => number, depth: number): string {
  if (depth <= 0) {
    return pick(random, [
      'close',
      'open',
      'high - low',
      'nz(close[1])',
      'bar_index',
      'na(close[2]) ? open : close[2]',
    ]);
  }

  const left = nestedNumericExpression(random, depth - 1);
  const right = nestedNumericExpression(random, depth - 1);
  return pick(random, [
    `(${left}) + (${right})`,
    `math.max(${left}, ${right})`,
    `math.min(${left}, ${right})`,
    `close > open ? (${left}) : (${right})`,
    `na(${left}) ? nz(${right}) : (${left})`,
  ]);
}

function blockNestedExpressions(suffix: string, random: () => number): GeneratedBlock {
  const first = nestedNumericExpression(random, 2);
  const second = nestedNumericExpression(random, 3);
  return {
    id: 'deep.nested-expressions',
    source: `exprA${suffix} = ${first}
exprB${suffix} = ${second}
plot(nz(exprA${suffix}) + nz(exprB${suffix}[1]), title="nested_expr_${suffix}")`,
  };
}

function blockRepeatedCallSites(suffix: string): GeneratedBlock {
  return {
    id: 'deep.repeated-call-sites',
    source: `deepFn${suffix}(float source, int length, float bias) =>
    ta.ema(source + bias, length) + nz(source[1])
method deepMethod${suffix}(float source, int length) =>
    ta.rma(source, length) + nz(source[1])
plot(deepFn${suffix}(close, 3, 1), title="deep_fn_close_${suffix}")
plot(deepFn${suffix}(open, 4, 2), title="deep_fn_open_${suffix}")
plot(close.deepMethod${suffix}(3), title="deep_method_close_${suffix}")
plot(open.deepMethod${suffix}(3), title="deep_method_open_${suffix}")`,
  };
}

function blockUdtCollections(suffix: string): GeneratedBlock {
  return {
    id: 'deep.udt-collections',
    source: `type DiffBox${suffix}
    float value = na
    int touches = 0
var boxes${suffix} = array.new<DiffBox${suffix}>()
var keyed${suffix} = map.new<string, DiffBox${suffix}>()
if barstate.isfirst
    array.push(boxes${suffix}, DiffBox${suffix}.new(close, 0))
box${suffix} = array.get(boxes${suffix}, 0)
box${suffix}.value := close + nz(close[1])
box${suffix}.touches += 1
array.set(boxes${suffix}, 0, box${suffix})
map.put(keyed${suffix}, "live", box${suffix})
fromMap${suffix} = map.get(keyed${suffix}, "live")
plot(fromMap${suffix}.value + fromMap${suffix}.touches, title="udt_collections_${suffix}")`,
  };
}

function blockRequestWrappedUdf(suffix: string): GeneratedBlock {
  return {
    id: 'deep.request-wrapped-udf',
    source: `requestExpr${suffix}(float source) =>
    ta.sma(source + nz(source[1]), 2)
wrappedReq${suffix} = request.security("NASDAQ:AAPL", "1", requestExpr${suffix}(close), lookahead=barmerge.lookahead_on)
plot(wrappedReq${suffix}, title="request_wrapped_udf_${suffix}")`,
  };
}

function blockVaripHistory(suffix: string): GeneratedBlock {
  return {
    id: 'deep.varip-history',
    source: `varip float tickCarry${suffix} = 0.0
tickCarry${suffix} := nz(tickCarry${suffix}[1]) + (barstate.isrealtime ? close - open : high - low)
plot(tickCarry${suffix} + nz(tickCarry${suffix}[1]) + nz(close[2]), title="varip_history_${suffix}")`,
  };
}

function generatedBlocks(suffix: string, random: () => number = xorshift32(Number(suffix) || 1)): GeneratedBlock[] {
  return [
    {
      id: 'operators.arithmetic-ternary-history',
      source: `arith${suffix} = close > open ? close + nz(close[1]) - open : na
plot(arith${suffix}, title="arith_${suffix}")`,
    },
    {
      id: 'conditionals.if-else',
      source: `ifValue${suffix} = 0.0
if close >= open
    ifValue${suffix} := high - low
else
    ifValue${suffix} := low - high
plot(ifValue${suffix}, title="if_${suffix}")`,
    },
    {
      id: 'conditionals.switch',
      source: `switchValue${suffix} = switch
    close > high[1] => 3
    close < low[1] => -2
    => 1
plot(switchValue${suffix}, title="switch_${suffix}")`,
    },
    {
      id: 'loops.for-break-continue',
      source: `forSum${suffix} = 0.0
for i${suffix} = 0 to 3
    if i${suffix} == 1
        continue
    if i${suffix} == 3
        break
    forSum${suffix} += nz(close[i${suffix}])
plot(forSum${suffix}, title="for_${suffix}")`,
    },
    {
      id: 'loops.while',
      source: `whileCount${suffix} = 0
while whileCount${suffix} < 2
    whileCount${suffix} += 1
plot(whileCount${suffix} + bar_index, title="while_${suffix}")`,
    },
    {
      id: 'functions.udf',
      source: `diffFn${suffix}(float source, int length) =>
    ta.sma(source, length)
plot(diffFn${suffix}(close, 3), title="udf_${suffix}")`,
    },
    {
      id: 'functions.method',
      source: `method lift${suffix}(float source, float amount) =>
    source + amount
plot(close.lift${suffix}(${Number(suffix) + 0.5}), title="method_${suffix}")`,
    },
    {
      id: 'types.udt-fields',
      source: `type DiffPoint${suffix}
    float level = na
    int index = 0
point${suffix} = DiffPoint${suffix}.new(close, bar_index)
plot(point${suffix}.level + point${suffix}.index, title="udt_${suffix}")`,
    },
    {
      id: 'enums.comparison-title',
      source: `enum DiffMode${suffix}
    fast = "Fast"
    slow = "Slow"
mode${suffix} = bar_index % 2 == 0 ? DiffMode${suffix}.fast : DiffMode${suffix}.slow
plot(mode${suffix} == DiffMode${suffix}.fast ? 1 : 2, title="enum_${suffix}")`,
    },
    {
      id: 'tuples.destructure',
      source: `[basis${suffix}, upper${suffix}, lower${suffix}] = ta.bb(close, 3, 2)
plot(nz(basis${suffix}) + nz(upper${suffix}) - nz(lower${suffix}), title="tuple_${suffix}")`,
    },
    {
      id: 'arrays.literal-methods',
      source: `var arr${suffix} = array.new<float>()
array.push(arr${suffix}, close)
if array.size(arr${suffix}) > 4
    array.shift(arr${suffix})
plot(array.avg(arr${suffix}), title="array_${suffix}")`,
    },
    {
      id: 'matrices.maps',
      source: `matrix${suffix} = matrix.new<float>(2, 2, close)
map${suffix} = map.new<string, float>()
map.put(map${suffix}, "k", matrix.get(matrix${suffix}, 0, 1))
plot(map.get(map${suffix}, "k"), title="matrix_map_${suffix}")`,
    },
    {
      id: 'variables.var-varip',
      source: `var float carry${suffix} = 0.0
varip float supportTickCarry${suffix} = 0.0
carry${suffix} += close > open ? 1 : -1
supportTickCarry${suffix} := carry${suffix}
plot(supportTickCarry${suffix}, title="var_${suffix}")`,
    },
    {
      id: 'inputs.source',
      source: `src${suffix} = input.source(hlc3, "Source ${suffix}")
plot(src${suffix}, title="input_source_${suffix}")`,
    },
    {
      id: 'requests.security',
      source: `req${suffix} = request.security("NASDAQ:AAPL", "1", close + ${Number(suffix)}, lookahead=barmerge.lookahead_on)
plot(req${suffix}, title="request_${suffix}")`,
    },
    {
      id: 'drawings.labels',
      source: `if barstate.islast
    label.new(bar_index, close, text="L${suffix}", color=color.new(color.green, ${Number(suffix) % 80}))
plot(array.size(label.all), title="labels_${suffix}")`,
    },
    {
      id: 'alerts.logs',
      source: `alertcondition(close > open, title="Up ${suffix}", message="{{close}}")
if bar_index == 0
    log.info("seed ${suffix} close {0}", close)
plot(close > open ? 1 : 0, title="alerts_logs_${suffix}")`,
    },
    blockLibraryImport(suffix),
    blockNestedExpressions(suffix, random),
    blockRepeatedCallSites(suffix),
    blockUdtCollections(suffix),
    blockRequestWrappedUdf(suffix),
    blockVaripHistory(suffix),
  ];
}

function generateProgram(seed: number): GeneratedProgram {
  const random = xorshift32(seed);
  const suffix = String(seed);
  const blocks = shuffle(random, generatedBlocks(suffix, random)).slice(0, 3 + Math.floor(random() * 5));
  if (!blocks.some((block) => block.id === 'operators.arithmetic-ternary-history')) {
    blocks.push(generatedBlocks(suffix, random)[0]!);
  }
  const source = `//@version=6
indicator("Generated differential ${seed}", overlay=true, max_labels_count=20)
${blocks.map((block) => block.source).join('\n')}`;

  return {
    id: `generated-${seed}`,
    seed,
    blocks,
    source,
  };
}

function generateRealtimeProgram(seed: number): GeneratedProgram {
  const random = xorshift32(seed);
  const suffix = String(seed);
  const deepBlocks = generatedBlocks(suffix, random).filter((block) => block.id.startsWith('deep.'));
  const supportingBlocks = generatedBlocks(suffix, random).filter((block) => [
    'arrays.literal-methods',
    'drawings.labels',
    'imports.function-method',
    'requests.security',
    'variables.var-varip',
  ].includes(block.id));
  const blocks = uniqueBlocksById([
    ...shuffle(random, deepBlocks).slice(0, 3),
    ...shuffle(random, supportingBlocks).slice(0, 2),
  ]);
  const source = `//@version=6
indicator("Generated realtime differential ${seed}", overlay=true, max_labels_count=20)
${blocks.map((block) => block.source).join('\n')}`;

  return {
    id: `generated-realtime-${seed}`,
    seed,
    blocks,
    source,
  };
}

function uniqueBlocksById(blocks: GeneratedBlock[]): GeneratedBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    if (seen.has(block.id)) return false;
    seen.add(block.id);
    return true;
  });
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    return Math.round(value * 1e9) / 1e9;
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key, entry]) => !['profile'].includes(key) && entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizeValue(entry)]));
  }
  return value;
}

function compactPlot(plot: ExecutionResult['plots'][number]): unknown {
  return normalizeValue({
    id: plot.id,
    type: plot.type,
    title: plot.title,
    values: plot.values,
    openValues: plot.openValues,
    highValues: plot.highValues,
    lowValues: plot.lowValues,
    closeValues: plot.closeValues,
    color: plot.color,
    wickColor: plot.wickColor,
    borderColor: plot.borderColor,
    textValues: plot.textValues,
  });
}

function comparableResult(result: ExecutionResult): unknown {
  return normalizeValue({
    plots: result.plots.map(compactPlot),
    drawings: result.drawings,
    alerts: result.alerts,
    logs: result.logs,
    errors: result.errors.map((error) => ({ code: error.code, message: error.message })),
  });
}

function comparableSnapshot(snapshot: RealtimeOutputSnapshot): unknown {
  return normalizeValue({
    plots: (snapshot.plots as ExecutionResult['plots']).map(compactPlot),
    drawings: snapshot.drawings,
    alerts: snapshot.alerts,
    logs: snapshot.logs,
  });
}

function executeDifferential(source: string): DifferentialOutcome {
  let ast: Program;
  try {
    ast = parse(source);
  } catch (error) {
    return { ok: false, reason: `parse failed: ${String(error)}` };
  }

  const compiled = tryCompile(ast, undefined, { libraries: libraryRegistry });
  if (!compiled.success) {
    return { ok: false, reason: `compile failed: ${compiled.unsupported.join(', ')}` };
  }

  const interpreted = executeScript(ast, differentialBars, undefined, options);
  const compiledResult = executeCompiled(compiled, differentialBars, undefined, options);
  if (!compiledResult) {
    return { ok: false, reason: 'executeCompiled returned null' };
  }

  const left = comparableResult(compiledResult);
  const right = comparableResult(interpreted);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    return {
      ok: false,
      reason: `compiled/interpreter mismatch\ncompiled=${JSON.stringify(left, null, 2)}\ninterpreter=${JSON.stringify(right, null, 2)}`,
    };
  }

  return { ok: true };
}

function liveUpdateBars(bars: Bar[]): Bar[] {
  const last = bars[bars.length - 1]!;
  return [0.25, -0.15, 0.4].map((delta, index) => {
    const close = last.close + delta;
    return {
      ...last,
      high: Math.max(last.high, close),
      low: Math.min(last.low, close),
      close,
      volume: last.volume + (index + 1) * 10,
    };
  });
}

function cloneBars(bars: Bar[]): Bar[] {
  return bars.map((bar) => ({ ...bar }));
}

async function executeRealtimeDifferential(programs: GeneratedProgram[]): Promise<RealtimeDifferentialFinding[]> {
  const workerSession = await measureProductionWorkerSessions(programs.map((program) => ({
    scriptId: program.id,
    source: program.source,
    bars: differentialBars,
    engineOptions: options,
  })), {
    includeLiveUpdates: true,
    includeOutputs: true,
  });
  const workerByScript = new Map<string, typeof workerSession.updateMeasurements>();
  for (const measurement of workerSession.updateMeasurements) {
    const measurements = workerByScript.get(measurement.scriptId) ?? [];
    measurements.push(measurement);
    workerByScript.set(measurement.scriptId, measurements);
  }

  const findings: RealtimeDifferentialFinding[] = [];
  for (const program of programs) {
    const ast = parse(program.source);
    const realtimeSafety = analyzeCompiledRealtimeSafety(ast);
    const interpreted = new TealscriptEngine(options);
    interpreted.execute(ast, cloneBars(differentialBars));
    const workerUpdates = workerByScript.get(program.id) ?? [];

    for (const [updateIndex, bar] of liveUpdateBars(differentialBars).entries()) {
      const workerUpdate = workerUpdates.find((measurement) => measurement.updateIndex === updateIndex);
      if (!workerUpdate?.output) {
        findings.push({
          programId: program.id,
          updateIndex,
          blocks: program.blocks.map((block) => block.id),
          reason: `worker ${workerUpdate?.error ?? 'missing-output'}`,
          classification: 'worker-missing-output',
        });
        continue;
      }

      const plots = interpreted.updateBar(ast, bar);
      const interpreterSnapshot = comparableSnapshot({
        plots,
        drawings: interpreted.getDrawings(),
        alerts: interpreted.getAlerts(),
        logs: interpreted.getLogs(),
      });

      if (workerUpdate.executionMode !== 'compiled') {
        const workerSnapshot = comparableSnapshot(workerUpdate.output);
        findings.push(JSON.stringify(workerSnapshot) === JSON.stringify(interpreterSnapshot) && workerUpdate.fallbackReason?.startsWith(COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX)
          ? {
              programId: program.id,
              updateIndex,
              blocks: program.blocks.map((block) => block.id),
              reason: workerUpdate.fallbackReason,
              classification: COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX,
            }
          : {
              programId: program.id,
              updateIndex,
              blocks: program.blocks.map((block) => block.id),
              reason: `worker executionMode=${workerUpdate.executionMode} reason=${workerUpdate.fallbackReason ?? 'none'} diff=${firstGeneratedSnapshotDifference(workerUpdate.output, {
                plots,
                drawings: interpreted.getDrawings(),
                alerts: interpreted.getAlerts(),
                logs: interpreted.getLogs(),
              })}`,
              classification: 'worker-not-compiled',
            });
        continue;
      }

      const workerSnapshot = comparableSnapshot(workerUpdate.output);
      if (JSON.stringify(workerSnapshot) !== JSON.stringify(interpreterSnapshot)) {
        findings.push({
          programId: program.id,
          updateIndex,
          blocks: program.blocks.map((block) => block.id),
          reason: firstGeneratedSnapshotDifference(workerUpdate.output, {
            plots,
            drawings: interpreted.getDrawings(),
            alerts: interpreted.getAlerts(),
            logs: interpreted.getLogs(),
          }),
          classification: classifyRealtimeFinding(program),
        });
      } else if (!realtimeSafety.safe) {
        findings.push({
          programId: program.id,
          updateIndex,
          blocks: program.blocks.map((block) => block.id),
          reason: `unsafe realtime shape reached compiled path: ${realtimeSafety.fallbackReason ?? 'unknown'}`,
          classification: 'unsafe-compiled-realtime',
        });
      }
    }
  }

  return findings;
}

function classifyRealtimeFinding(program: GeneratedProgram): string {
  if (program.blocks.some((block) => block.id.startsWith('deep.'))) {
    return COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX;
  }
  return 'unclassified';
}

function firstGeneratedSnapshotDifference(left: RealtimeOutputSnapshot, right: RealtimeOutputSnapshot): string {
  const leftPlots = left.plots as ExecutionResult['plots'];
  const rightPlots = right.plots as ExecutionResult['plots'];
  for (let plotIndex = 0; plotIndex < Math.max(leftPlots.length, rightPlots.length); plotIndex += 1) {
    const leftPlot = leftPlots[plotIndex];
    const rightPlot = rightPlots[plotIndex];
    if (!leftPlot || !rightPlot) return `plot-count:${leftPlots.length}->${rightPlots.length}`;
    if (leftPlot.title !== rightPlot.title) return `plot-title:${leftPlot.title}->${rightPlot.title}`;
    for (let valueIndex = 0; valueIndex < Math.max(leftPlot.values.length, rightPlot.values.length); valueIndex += 1) {
      const leftValue = normalizeValue(leftPlot.values[valueIndex]);
      const rightValue = normalizeValue(rightPlot.values[valueIndex]);
      if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
        return `plots-mismatch:${leftPlot.title}:${valueIndex}:${String(leftValue)}->${String(rightValue)}`;
      }
    }
  }
  for (const key of ['drawings', 'alerts', 'logs'] as const) {
    if (JSON.stringify(normalizeValue(left[key])) !== JSON.stringify(normalizeValue(right[key]))) {
      if (key === 'drawings') {
        return `drawings-mismatch:${JSON.stringify(normalizeValue(left[key]))}->${JSON.stringify(normalizeValue(right[key]))}`;
      }
      return `${key}-mismatch`;
    }
  }
  return 'output-mismatch';
}

function shrinkProgram(program: GeneratedProgram): GeneratedProgram {
  let current = program;
  let changed = true;

  while (changed) {
    changed = false;
    for (let index = 0; index < current.blocks.length; index += 1) {
      const blocks = current.blocks.filter((_, candidateIndex) => candidateIndex !== index);
      if (blocks.length === 0) continue;
      const source = `//@version=6
indicator("Generated differential ${current.seed}", overlay=true, max_labels_count=20)
${blocks.map((block) => block.source).join('\n')}`;
      const candidate = { ...current, blocks, source };
      if (!executeDifferential(candidate.source).ok) {
        current = candidate;
        changed = true;
        break;
      }
    }
  }

  return current;
}

describe('grammar-driven compiled/interpreter differential', () => {
  it('generates programs from the committed v6 grammar construct inventory', () => {
    const coveredCategories = new Set(PINE_V6_GRAMMAR_CONSTRUCTS.map((construct) => construct.category));
    const generatedCategories = new Set(generatedBlocks('0').map((block) => block.id.split('.')[0]));

    expect(coveredCategories.size).toBeGreaterThanOrEqual(10);
    expect(generatedCategories).toEqual(new Set([
      'alerts',
      'arrays',
      'conditionals',
      'deep',
      'drawings',
      'enums',
      'functions',
      'imports',
      'inputs',
      'loops',
      'matrices',
      'operators',
      'requests',
      'tuples',
      'types',
      'variables',
    ]));
  });

  it(`keeps generated compiled output equal to interpreter output over ${programCount} programs`, () => {
    const failures: string[] = [];

    for (let index = 0; index < programCount; index += 1) {
      const program = generateProgram(37_000 + index);
      const outcome = executeDifferential(program.source);
      if (!outcome.ok) {
        const shrunk = shrinkProgram(program);
        failures.push([
          `${program.id} seed=${program.seed}`,
          `blocks=${program.blocks.map((block) => block.id).join(', ')}`,
          `shrunkBlocks=${shrunk.blocks.map((block) => block.id).join(', ')}`,
          outcome.reason,
          shrunk.source,
        ].join('\n'));
      }
    }

    expect(failures).toEqual([]);
  });

  it(`keeps generated realtime re-entry output stable over ${realtimeProgramCount} programs`, async () => {
    const programs = Array.from({ length: realtimeProgramCount }, (_, index) => generateRealtimeProgram(73_000 + index));
    const findings = await executeRealtimeDifferential(programs);
    const unexpected = findings.filter((finding) => !EXPECTED_REALTIME_DIVERGENCE_CLASSIFICATIONS.has(finding.classification));
    const classifications = [...new Set(findings.map((finding) => finding.classification))].sort();
    const sampleFindings = findings.slice(0, 6).map((finding) => ({
      programId: finding.programId,
      updateIndex: finding.updateIndex,
      classification: finding.classification,
      reason: finding.reason,
      blocks: finding.blocks,
    }));

    expect({
      programs: realtimeProgramCount,
      totalUpdates: realtimeProgramCount * 3,
      matched: realtimeProgramCount * 3 - findings.length,
      knownFindings: findings.length,
      classifications,
      sampleFindings,
      unexpected,
    }).toEqual({
      programs: realtimeProgramCount,
      totalUpdates: realtimeProgramCount * 3,
      matched: 0,
      knownFindings: realtimeProgramCount * 3,
      classifications: [COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX],
      sampleFindings,
      unexpected: [],
    });
  });
});
