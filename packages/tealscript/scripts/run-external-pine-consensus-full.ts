import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

import { checkProgram } from '../src/semantic/checker.ts';
import { parse } from '../src/parser/parser.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';
import type { TealscriptRuntimeOptions } from '../src/runtime/types.ts';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const ENGINE_ROOT = resolve(PACKAGE_ROOT, '.cache/external-pine-engines');
const PINE_TS_PATH = resolve(ENGINE_ROOT, 'pinets-package/node_modules/pinets/dist/pinets.min.es.js');
const PINE_A_PATH = resolve(ENGINE_ROOT, 'Pine-A-Script/src/transpiler.js');
const BARS_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-pilot-bars-v1.json');
const CONTEXT_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-pilot-context-v1.json');
const JSON_REPORT_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-full-v1.json');
const MD_REPORT_PATH = resolve(PACKAGE_ROOT, 'reports/external-pine-consensus-full-v1.md');
const EPSILON = 1e-6;
const ENGINE_TIMEOUT_MS = 2_500;
const PROGRESS_EVERY = 25;
const DEBUG_LIMIT = Number(process.env.CONSENSUS_FULL_LIMIT ?? 0);

type CorpusName = 'v5' | 'v6' | 'v7' | 'v7-size-recovery';
type Comparison = 'agree' | 'tealscript-differs' | 'voters-differ' | 'engine-failed' | 'coercion-suspect';
type DifferenceClass = 'none' | 'warmup-seed' | 'later-value' | 'shape' | 'engine-failed';
type CanonProvenance = 'external-consensus' | 'pinets-sole' | 'pine-a-script-sole' | 'none';

interface ManifestEntry {
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceSha256?: string;
}

interface CorpusCandidate extends ManifestEntry {
  corpus: CorpusName;
  rowId: string;
  absolutePath: string;
  source: string;
  sourceSha256: string;
  declaredVersion: number | 'unknown';
}

type DeclaredV5V6Candidate = CorpusCandidate & { declaredVersion: 5 | 6 };

interface NormalizedPlot {
  index: number;
  title: string | null;
  values: Array<number | null>;
}

interface EngineOk {
  ok: true;
  plots: NormalizedPlot[];
}

interface EngineFail {
  ok: false;
  stage: string;
  message: string;
}

type EngineResult = EngineOk | EngineFail;

interface ConsensusRow {
  corpus: CorpusName;
  rowId: string;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceSha256: string;
  declaredVersion: 5 | 6;
  comparison: Comparison;
  differenceClass: DifferenceClass;
  provenance: CanonProvenance;
  voterPlotCount?: number;
  tealscriptPlotCount?: number;
  firstDifference?: string;
  causeKey?: string;
  engineFailures?: string[];
  titles?: {
    pineTS: Array<string | null>;
    pineAScript: Array<string | null>;
    tealscript: Array<string | null>;
  };
  outputFamilyVote?: OutputFamilyVote;
  coercionSuspect?: string;
}

interface ConsensusContext {
  symbol: string;
  syminfo: Record<string, unknown>;
  timeframe: Record<string, unknown>;
  chart: Record<string, unknown>;
  session?: Record<string, unknown>;
  scale?: Record<string, unknown>;
  now?: number;
}

interface CauseGroup {
  causeKey: string;
  rows: number;
  corpora: Partial<Record<CorpusName, number>>;
  examples: ConsensusRow[];
}

interface EngineFailureBreakdown {
  engineOkRows: Record<'pineTS' | 'pine-a-script' | 'tealscript', number>;
  engineFailedRows: Record<'pineTS' | 'pine-a-script' | 'tealscript', number>;
  failureCombinations: Record<string, number>;
  bucketsByEngine: Record<string, Record<string, number>>;
  rowReachabilityClasses: Record<string, number>;
  pinetsAndTealRunnableRows: number;
  bothVotersAndTealRunnableRows: number;
  secondVoterTaxRows: number;
  harnessOnlyRows: number;
  externalLimitationRows: number;
}

interface ShapeDisagreementBreakdown {
  shapeRows: number;
  pineTSMoreRows: number;
  pineAScriptMoreRows: number;
  familyAwarePineAScriptDroppedRows: number;
  pineTSCaptureArtifactRows: number;
  outputFamilyRows: Record<string, number>;
  missingPlotCountDistribution: Record<string, number>;
  topOutputFamilyCombinations: Array<{ combination: string; rows: number }>;
}

interface OutputCallCounts {
  total: number;
  pineAScriptComparable: number;
  byFamily: Record<string, number>;
  unsupportedByPineAScript: string[];
}

interface OutputFamilyVote {
  status: 'full-surface' | 'pine-a-script-family-dropped' | 'pinets-capture-artifact';
  staticTotal: number;
  pineAScriptComparableStaticCount: number;
  pineTSPlotCount: number;
  pineAScriptPlotCount: number;
  droppedPineAScriptFamilies: string[];
}

interface HlineCompletenessRow {
  corpus: CorpusName;
  rowId: string;
  localPath: string;
  expectedAcceptedReport?: string;
  hlinePlots: number;
  completeHlinePlots: number;
  incompleteHlinePlots: number;
  firstIncomplete?: string;
  failed?: string;
}

const CORPORA: Array<{ name: CorpusName; expectedRows: number; inputDir: string; latestAcceptedReport?: string }> = [
  {
    name: 'v5',
    expectedRows: 1000,
    inputDir: '.cache/tealscript/pine-corpus-v5-20260910',
    latestAcceptedReport: 'reports/external-pine-corpus-v5.daily-rerun-5da61fcb1a.json',
  },
  {
    name: 'v6',
    expectedRows: 1000,
    inputDir: '.cache/tealscript/pine-corpus-v6-20260911',
    latestAcceptedReport: 'reports/external-pine-corpus-v6.daily-rerun-5da61fcb1a.json',
  },
  {
    name: 'v7',
    expectedRows: 456,
    inputDir: '.cache/tealscript/pine-corpus-v7-20260911',
    latestAcceptedReport: 'reports/external-pine-corpus-v7.daily-rerun-5da61fcb1a.json',
  },
  {
    name: 'v7-size-recovery',
    expectedRows: 50,
    inputDir: '.cache/tealscript/pine-corpus-v7-size-recovery-20260911',
    latestAcceptedReport: 'reports/external-pine-corpus-v7-size-recovery.daily-rerun-3c2c00ac84.json',
  },
];

const PILOT_UNDOCUMENTED_SEED_ROWS = [
  'v5 0123',
  'v5 0151',
  'v5 0222',
  'v5 0310',
  'v5 0314',
  'v6 0201',
];

const HLINE_FAILURE_TIMING_CHECK = {
  checkedPreFixCommit: '75f4f9708e^',
  checkedRows: 35,
  preFixFailures: 35,
  conclusion: 'The 35 rows that fail before the current hline payload check already failed before the hline value fix; they are not an hline regression.',
};

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function shortHead(): string {
  return createHash('sha1').update(`${Date.now()}:${Math.random()}`).digest('hex').slice(0, 10);
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : null;
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : null;
}

function runtimeValue(value: unknown): unknown {
  if (value === null) return Number.NaN;
  if (Array.isArray(value)) return value.map(runtimeValue);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, runtimeValue(child)]));
  }
  return value;
}

function runtimeContext(context: ConsensusContext): TealscriptRuntimeOptions {
  return {
    syminfo: runtimeValue(context.syminfo) as TealscriptRuntimeOptions['syminfo'],
    timeframe: runtimeValue(context.timeframe) as TealscriptRuntimeOptions['timeframe'],
    chart: runtimeValue(context.chart) as TealscriptRuntimeOptions['chart'],
    session: runtimeValue(context.session ?? {}) as TealscriptRuntimeOptions['session'],
    now: context.now,
  };
}

function normalizePlots(rawPlots: Array<{ title?: unknown; values?: unknown[] }>): NormalizedPlot[] {
  return rawPlots.map((plot, index) => ({
    index,
    title: typeof plot.title === 'string' && plot.title.length > 0 ? plot.title : null,
    values: (plot.values ?? []).map(normalizeNumber),
  }));
}

function comparePlotSets(a: NormalizedPlot[], b: NormalizedPlot[]): string | null {
  if (a.length !== b.length) return `plot count ${a.length} != ${b.length}`;
  for (let plotIndex = 0; plotIndex < a.length; plotIndex += 1) {
    const av = a[plotIndex]!.values;
    const bv = b[plotIndex]!.values;
    if (av.length !== bv.length) return `plot[${plotIndex}] length ${av.length} != ${bv.length}`;
    for (let barIndex = 0; barIndex < av.length; barIndex += 1) {
      const left = av[barIndex];
      const right = bv[barIndex];
      if (left === null || right === null) {
        if (left !== right) return `plot[${plotIndex}][${barIndex}] ${left} != ${right}`;
        continue;
      }
      const tolerance = EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
      if (Math.abs(left - right) > tolerance) {
        return `plot[${plotIndex}][${barIndex}] ${left} != ${right}`;
      }
    }
  }
  return null;
}

function classifyDifference(firstDifference: string | undefined, comparison: Comparison): DifferenceClass {
  if (comparison === 'engine-failed') return 'engine-failed';
  if (!firstDifference) return 'none';
  if (/^plot count /.test(firstDifference) || /^pinets output capture artifact:/.test(firstDifference) || /\] length /.test(firstDifference)) return 'shape';
  const barMatch = firstDifference.match(/\]\[(\d+)\]/);
  const bar = barMatch ? Number(barMatch[1]) : null;
  if (bar === 0 || bar === 1) return 'warmup-seed';
  return 'later-value';
}

function causeKeyFor(row: ConsensusRow, source: string): string {
  const diff = row.firstDifference ?? '';
  if (diff.startsWith('tealscript failed:')) {
    return tealFailureCauseKey(diff);
  }
  if (/array\.percentile_(?:linear_interpolation|nearest_rank)\s*\([^)]*["'][^"']+["']/.test(source)) {
    return 'array-percentile-string-percentage-coercion';
  }
  if (/ta\.(?:highestbars|lowestbars)\s*\(\s*(?:length\s*=\s*)?\d+\s*\)/.test(source)) {
    return 'ta-extremebars-source-omitted-warmup-boundary';
  }
  if (/^plot count /.test(diff)) return 'output-call-count-shape-mismatch';
  if (/\] length /.test(diff)) return 'output-series-length-mismatch';
  if (/ null != /.test(diff) || / != null/.test(diff)) {
    return row.differenceClass === 'warmup-seed'
      ? 'warmup-na-vs-finite'
      : 'later-na-vs-finite';
  }
  if (row.differenceClass === 'warmup-seed') return 'warmup-finite-seed-value';
  return 'finite-value-mismatch';
}

function tealFailureCauseKey(firstDifference: string): string {
  const message = firstDifference.replace(/^tealscript failed:\s*/, '');
  if (message.includes('request.security requires a request datafeed')) return 'tealscript-host-request-security-datafeed';
  if (message.includes('request.security_lower_tf requires a request datafeed')) return 'tealscript-host-request-security-lower-tf-datafeed';
  if (message.includes('Import ') && message.includes('was not supplied by the host library registry')) return 'tealscript-host-library-import';
  if (message.includes('strategy calc_on_order_fills') || message.includes('fill_orders_on_standard_ohlc') || message.includes('risk_free_rate')) return 'tealscript-host-strategy-trace-context';
  if (message.includes("Unknown argument 'linewidth' for color.new()")) return 'tealscript-semantic-color-new-linewidth-arg';
  if (message.includes("Argument 'color' for plot() was supplied multiple times")) return 'tealscript-semantic-plot-duplicate-color-arg';
  if (message.includes("Argument 'transp' for fill() was supplied multiple times")) return 'tealscript-semantic-fill-duplicate-transp-arg';
  if (message.includes('matrix.sum() expects at least 2 arguments')) return 'tealscript-semantic-matrix-sum-arity';
  if (message.includes('strategy.exit trailing stop requires trail_offset')) return 'tealscript-semantic-strategy-exit-trailing-stop';
  if (message.includes('Numeric int expression cannot be used as a boolean in Pine v6')) return 'tealscript-semantic-v6-int-as-bool-refusal';
  if (message.includes('na x cannot be a boolean because Pine v6 does not allow boolean na values')) return 'tealscript-semantic-v6-bool-na-refusal';
  if (message.includes('Untyped declarations initialized with na are invalid')) return 'tealscript-semantic-untyped-na-refusal';
  if (message.includes('Cannot assign float value to int variable')) return 'tealscript-semantic-float-to-int-assignment-refusal';
  if (message.includes('Cannot pass series value to simple parameter')) return 'tealscript-semantic-series-to-simple-parameter-refusal';
  if (message.includes('Cannot pass series string message to alertcondition()')) return 'tealscript-semantic-alertcondition-series-message';
  if (message.includes('Duplicate declaration:')) return 'tealscript-semantic-duplicate-declaration';
  if (message.includes('TA length must be a positive integer')) return 'tealscript-runtime-invalid-ta-length-refusal';
  if (message.includes('Table cell coordinates out of bounds')) return 'tealscript-runtime-table-cell-bounds-refusal';
  if (message.includes('Matrix column') || message.includes('Matrix row') || message.includes('Matrix-vector')) return 'tealscript-runtime-matrix-bounds-or-shape-refusal';
  if (message.includes('array.slice') || message.includes("Index 'from' should be less than index 'to'")) return 'tealscript-runtime-array-slice-refusal';
  return message.startsWith('tealscript:semantic:')
    ? 'tealscript-semantic-other-refusal'
    : 'tealscript-runtime-other-refusal';
}

function coercionSuspectFor(source: string): string | undefined {
  if (/array\.percentile_(?:linear_interpolation|nearest_rank)\s*\([^)]*["'][^"']+["']/.test(source)) {
    return 'array.percentile_* string percentage: documented numeric series int/float argument; external JS/TS voters agree through JavaScript string-to-number coercion';
  }
  return undefined;
}

function detectPineVersion(source: string): number | 'unknown' {
  const match = source.match(/^\s*\/\/\s*@version\s*=\s*(\d+)/m);
  if (!match) return 'unknown';
  return Number(match[1]);
}

function barsForPineTS(bars: Bar[]): Array<Record<string, number>> {
  return bars.map((bar, index) => ({
    openTime: bar.time,
    closeTime: bars[index + 1]?.time ? bars[index + 1]!.time - 1 : bar.time + 86_400_000 - 1,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
}

function barsForPineAScript(bars: Bar[]): Record<string, number[]> {
  return {
    open: bars.map((bar) => bar.open),
    high: bars.map((bar) => bar.high),
    low: bars.map((bar) => bar.low),
    close: bars.map((bar) => bar.close),
    volume: bars.map((bar) => bar.volume),
    time: bars.map((bar) => bar.time),
  };
}

async function ensureBarsFixture(): Promise<Bar[]> {
  const parsed = JSON.parse(await readFile(BARS_PATH, 'utf8')) as { bars?: Bar[] };
  if (!Array.isArray(parsed.bars) || parsed.bars.length === 0) {
    throw new Error(`${BARS_PATH} must contain bars`);
  }
  return parsed.bars;
}

async function ensureContextFixture(): Promise<ConsensusContext> {
  const parsed = JSON.parse(await readFile(CONTEXT_PATH, 'utf8')) as ConsensusContext;
  if (!parsed.symbol || !parsed.syminfo || !parsed.timeframe || !parsed.chart) {
    throw new Error(`${CONTEXT_PATH} must contain symbol, syminfo, timeframe, and chart`);
  }
  return parsed;
}

function providerForPineTS(bars: Bar[], context: ConsensusContext) {
  return {
    async getMarketData() {
      return barsForPineTS(bars);
    },
    async getSymbolInfo() {
      return runtimeValue(context.syminfo);
    },
    configure() {},
  };
}

async function runPineTS(source: string, bars: Bar[], context: ConsensusContext): Promise<EngineResult> {
  try {
    const mod = await import(pathToFileURL(PINE_TS_PATH).href);
    const engine = new mod.PineTS(providerForPineTS(bars, context), context.symbol, String(context.timeframe.period ?? 'D'), bars.length);
    engine.setTimezone?.(String(context.syminfo.timezone ?? 'Etc/UTC'));
    engine.setVisibleRange?.(bars[0]?.time ?? 0, bars[bars.length - 1]?.time ?? 0);
    const globalScope = globalThis as typeof globalThis & Record<string, unknown>;
    const previousScale = globalScope.scale;
    globalScope.scale = runtimeValue(context.scale ?? { left: 'left', right: 'right', none: 'none' });
    let result: unknown;
    try {
      result = await engine.run(source);
    } finally {
      globalScope.scale = previousScale;
    }
    const output = result as { plots?: Record<string, { title?: unknown; data?: unknown[] }> } | undefined;
    const rawPlots = output?.plots && typeof output.plots === 'object' ? output.plots : {};
    const plots = Object.keys(rawPlots)
      .filter((key) => !key.startsWith('__'))
      .map((key, index) => {
        const value = rawPlots[key];
        const data = Array.isArray(value?.data) ? value.data : [];
        return {
          index,
          title: typeof value?.title === 'string' ? value.title : key,
          values: data.map((point: unknown) => normalizeNumber((point as { value?: unknown })?.value ?? point)),
        };
      });
    return { ok: true, plots };
  } catch (error) {
    return { ok: false, stage: 'pineTS', message: error instanceof Error ? error.message : String(error) };
  }
}

async function runPineAScript(source: string, bars: Bar[], context: ConsensusContext): Promise<EngineResult> {
  try {
    const mod = await import(pathToFileURL(PINE_A_PATH).href);
    const transpiled = mod.transpile(source, { prettyPrint: false, includeComments: false });
    if (!transpiled.success) {
      return { ok: false, stage: `pine-a-script:${transpiled.stage ?? 'transpile'}`, message: String(transpiled.error) };
    }
    const repairedCode = repairPineAScriptGeneratedCode(transpiled.code);
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(repairedCode, 'utf8').toString('base64')}#${shortHead()}`;
    const runnable = await import(moduleUrl);
    const globalScope = globalThis as typeof globalThis & Record<string, unknown>;
    const previous = {
      syminfo: globalScope.syminfo,
      timeframe: globalScope.timeframe,
      chart: globalScope.chart,
      scale: globalScope.scale,
    };
    globalScope.syminfo = runtimeValue(context.syminfo);
    globalScope.timeframe = runtimeValue(context.timeframe);
    globalScope.chart = runtimeValue(context.chart);
    globalScope.scale = runtimeValue(context.scale ?? { left: 'left', right: 'right', none: 'none' });
    let result: unknown;
    try {
      result = runnable.run(barsForPineAScript(bars), { context: runtimeValue(context) });
    } finally {
      globalScope.syminfo = previous.syminfo;
      globalScope.timeframe = previous.timeframe;
      globalScope.chart = previous.chart;
      globalScope.scale = previous.scale;
    }
    const output = result as { plots?: Record<string, { title?: unknown; data?: unknown[] }> } | undefined;
    const rawPlots = output?.plots && typeof output.plots === 'object' ? output.plots : {};
    const plots = Object.keys(rawPlots).map((key, index) => ({
      index,
      title: typeof rawPlots[key]?.title === 'string' ? rawPlots[key].title : key,
      values: (Array.isArray(rawPlots[key]?.data) ? rawPlots[key].data : []).map(normalizeNumber),
    }));
    return { ok: true, plots };
  } catch (error) {
    return { ok: false, stage: 'pine-a-script', message: error instanceof Error ? error.message : String(error) };
  }
}

function externalWorkerSource(): string {
  return `
    const { parentPort, workerData } = await import('node:worker_threads');
    const { Buffer } = await import('node:buffer');

    function normalizeNumber(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value === 'boolean') return value ? 1 : null;
      const coerced = Number(value);
      return Number.isFinite(coerced) ? coerced : null;
    }

    function runtimeValue(value) {
      if (value === null) return Number.NaN;
      if (Array.isArray(value)) return value.map(runtimeValue);
      if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, runtimeValue(child)]));
      }
      return value;
    }

    function barsForPineTS(bars) {
      return bars.map((bar, index) => ({
        openTime: bar.time,
        closeTime: bars[index + 1]?.time ? bars[index + 1].time - 1 : bar.time + 86400000 - 1,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));
    }

    function barsForPineAScript(bars) {
      return {
        open: bars.map((bar) => bar.open),
        high: bars.map((bar) => bar.high),
        low: bars.map((bar) => bar.low),
        close: bars.map((bar) => bar.close),
        volume: bars.map((bar) => bar.volume),
        time: bars.map((bar) => bar.time),
      };
    }

    function providerForPineTS(bars, context) {
      return {
        async getMarketData() {
          return barsForPineTS(bars);
        },
        async getSymbolInfo() {
          return runtimeValue(context.syminfo);
        },
        configure() {},
      };
    }

    function repairPineAScriptGeneratedCode(code) {
      return code
        .replace(/pinescript\\.hline\\(/g, 'pinescript.plot(')
        .replace(/pinescript\\.plot\\(([^;\\n]+?), \\(\\{([^{}\\n]*)\\}\\)\\);/g, (_match, series, objectBody) => {
          const body = String(objectBody);
          const titleMatch = body.match(/(?:^|,\\s*)title:\\s*("(?:[^"\\\\]|\\\\.)*")/);
          const title = titleMatch?.[1] ?? '""';
          return \`pinescript.plot(\${series}, \${title});\`;
        });
    }

    async function runPineTS() {
      const mod = await import(workerData.enginePathUrl);
      const context = workerData.context;
      const engine = new mod.PineTS(providerForPineTS(workerData.bars, context), context.symbol, String(context.timeframe.period ?? 'D'), workerData.bars.length);
      engine.setTimezone?.(String(context.syminfo.timezone ?? 'Etc/UTC'));
      engine.setVisibleRange?.(workerData.bars[0]?.time ?? 0, workerData.bars[workerData.bars.length - 1]?.time ?? 0);
      const previousScale = globalThis.scale;
      globalThis.scale = runtimeValue(context.scale ?? { left: 'left', right: 'right', none: 'none' });
      let result;
      try {
        result = await engine.run(workerData.source);
      } finally {
        globalThis.scale = previousScale;
      }
      const rawPlots = result?.plots && typeof result.plots === 'object' ? result.plots : {};
      const plots = Object.keys(rawPlots)
        .filter((key) => !key.startsWith('__'))
        .map((key, index) => {
          const value = rawPlots[key];
          const data = Array.isArray(value?.data) ? value.data : [];
          return {
            index,
            title: typeof value?.title === 'string' ? value.title : key,
            values: data.map((point) => normalizeNumber(point?.value ?? point)),
          };
        });
      return { ok: true, plots };
    }

    async function runPineAScript() {
      const mod = await import(workerData.enginePathUrl);
      const transpiled = mod.transpile(workerData.source, { prettyPrint: false, includeComments: false });
      if (!transpiled.success) {
        return { ok: false, stage: \`pine-a-script:\${transpiled.stage ?? 'transpile'}\`, message: String(transpiled.error) };
      }
      const repairedCode = repairPineAScriptGeneratedCode(transpiled.code);
      const moduleUrl = \`data:text/javascript;base64,\${Buffer.from(repairedCode, 'utf8').toString('base64')}#\${Date.now()}-\${Math.random()}\`;
      const runnable = await import(moduleUrl);
      const previous = {
        syminfo: globalThis.syminfo,
        timeframe: globalThis.timeframe,
        chart: globalThis.chart,
        scale: globalThis.scale,
      };
      globalThis.syminfo = runtimeValue(workerData.context.syminfo);
      globalThis.timeframe = runtimeValue(workerData.context.timeframe);
      globalThis.chart = runtimeValue(workerData.context.chart);
      globalThis.scale = runtimeValue(workerData.context.scale ?? { left: 'left', right: 'right', none: 'none' });
      let result;
      try {
        result = runnable.run(barsForPineAScript(workerData.bars), { context: runtimeValue(workerData.context) });
      } finally {
        globalThis.syminfo = previous.syminfo;
        globalThis.timeframe = previous.timeframe;
        globalThis.chart = previous.chart;
        globalThis.scale = previous.scale;
      }
      const rawPlots = result?.plots && typeof result.plots === 'object' ? result.plots : {};
      const plots = Object.keys(rawPlots).map((key, index) => ({
        index,
        title: typeof rawPlots[key]?.title === 'string' ? rawPlots[key].title : key,
        values: (Array.isArray(rawPlots[key]?.data) ? rawPlots[key].data : []).map(normalizeNumber),
      }));
      return { ok: true, plots };
    }

    try {
      const result = workerData.engine === 'pineTS' ? await runPineTS() : await runPineAScript();
      parentPort.postMessage(result);
    } catch (error) {
      parentPort.postMessage({
        ok: false,
        stage: workerData.engine === 'pineTS' ? 'pineTS' : 'pine-a-script',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  `;
}

async function runExternalInWorker(
  engine: 'pineTS' | 'pine-a-script',
  source: string,
  bars: Bar[],
  context: ConsensusContext,
): Promise<EngineResult> {
  const enginePath = engine === 'pineTS' ? PINE_TS_PATH : PINE_A_PATH;
  const worker = new Worker(externalWorkerSource(), {
    eval: true,
    stdout: true,
    stderr: true,
    workerData: {
      engine,
      source,
      bars,
      context,
      enginePathUrl: pathToFileURL(enginePath).href,
    },
  });
  return await new Promise<EngineResult>((resolveWorker) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      resolveWorker({ ok: false, stage: engine, message: `timed out after ${ENGINE_TIMEOUT_MS}ms` });
    }, ENGINE_TIMEOUT_MS);
    worker.once('message', (result: EngineResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void worker.terminate();
      resolveWorker(result);
    });
    worker.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void worker.terminate();
      resolveWorker({ ok: false, stage: engine, message: error.message });
    });
    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveWorker({ ok: false, stage: engine, message: `worker exited before result with code ${code}` });
    });
  });
}

function repairPineAScriptGeneratedCode(code: string): string {
  return code
    .replace(/pinescript\.hline\(/g, 'pinescript.plot(')
    .replace(/pinescript\.plot\(([^;\n]+?), \(\{([^{}\n]*)\}\)\);/g, (_match, series, objectBody) => {
      const body = String(objectBody);
      const titleMatch = body.match(/(?:^|,\s*)title:\s*("(?:[^"\\]|\\.)*")/);
      const title = titleMatch?.[1] ?? '""';
      return `pinescript.plot(${series}, ${title});`;
    });
}

async function withTimeout(label: string, promise: Promise<EngineResult>): Promise<EngineResult> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<EngineResult>((resolveTimeout) => {
    timeout = setTimeout(() => {
      resolveTimeout({ ok: false, stage: label, message: `timed out after ${ENGINE_TIMEOUT_MS}ms` });
    }, ENGINE_TIMEOUT_MS);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeout) clearTimeout(timeout);
  return result;
}

async function runTealScript(candidate: CorpusCandidate, bars: Bar[], context: ConsensusContext): Promise<EngineResult> {
  try {
    const ast = parse(candidate.source, { grammarSource: candidate.sourceFilePath ?? candidate.localPath });
    const semantic = checkProgram(ast);
    const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    if (semanticError) {
      return { ok: false, stage: 'tealscript:semantic', message: semanticError.message };
    }
    const result = executeScript(ast, bars, undefined, { runtime: runtimeContext(context) });
    if (result.errors.length > 0) {
      return { ok: false, stage: 'tealscript:execute', message: result.errors[0]!.message };
    }
    return { ok: true, plots: normalizePlots(result.plots.map((plot: PlotOutput) => ({ title: plot.title, values: plot.values }))) };
  } catch (error) {
    return { ok: false, stage: 'tealscript', message: error instanceof Error ? error.message : String(error) };
  }
}

function corpusConfig(name: CorpusName) {
  const config = CORPORA.find((item) => item.name === name);
  if (!config) throw new Error(`Unknown corpus: ${name}`);
  return config;
}

function corpusInputDir(name: CorpusName): string {
  return resolve(PACKAGE_ROOT, corpusConfig(name).inputDir);
}

async function loadCandidates(name: CorpusName): Promise<CorpusCandidate[]> {
  const inputDir = corpusInputDir(name);
  const manifestPath = join(inputDir, 'manifest.json');
  if (!existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { scripts: ManifestEntry[] };
  if (manifest.scripts.length !== corpusConfig(name).expectedRows) {
    throw new Error(`${name} expected ${corpusConfig(name).expectedRows} rows, got ${manifest.scripts.length}`);
  }
  const candidates: CorpusCandidate[] = [];
  for (let index = 0; index < manifest.scripts.length; index += 1) {
    const entry = manifest.scripts[index]!;
    const absolutePath = join(inputDir, entry.localPath);
    const source = await readFile(absolutePath, 'utf8');
    const sourceSha256 = sha256(source);
    if (entry.sourceSha256 && sourceSha256 !== entry.sourceSha256) {
      throw new Error(`${name} ${entry.localPath} sha256 mismatch`);
    }
    candidates.push({
      ...entry,
      corpus: name,
      rowId: String(index + 1).padStart(4, '0'),
      absolutePath,
      source,
      sourceSha256,
      declaredVersion: detectPineVersion(source),
    });
  }
  return candidates;
}

async function loadDeclaredV5V6Candidates(): Promise<DeclaredV5V6Candidate[]> {
  const all: CorpusCandidate[] = [];
  for (const corpus of CORPORA) {
    all.push(...await loadCandidates(corpus.name));
  }
  return all.filter((candidate): candidate is DeclaredV5V6Candidate => (
    candidate.declaredVersion === 5 || candidate.declaredVersion === 6
  ));
}

function outputCallCounts(source: string): OutputCallCounts {
  const clean = stripComments(source);
  const pineAScriptFamilies = new Set(['plot', 'hline']);
  const byFamily: Record<string, number> = {};
  for (const family of ['plot', 'hline', 'fill', 'bgcolor', 'barcolor', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle']) {
    const count = countCalls(clean, family);
    if (count > 0) byFamily[family] = count;
  }
  const total = Object.values(byFamily).reduce((sum, count) => sum + count, 0);
  const pineAScriptComparable = [...pineAScriptFamilies].reduce((sum, family) => sum + (byFamily[family] ?? 0), 0);
  const unsupportedByPineAScript = Object.entries(byFamily)
    .filter(([family, count]) => count > 0 && !pineAScriptFamilies.has(family))
    .map(([family]) => family);
  return { total, pineAScriptComparable, byFamily, unsupportedByPineAScript };
}

function outputFamilyVoteForShapeDiff(
  source: string,
  pineTsPlots: NormalizedPlot[],
  pineAPlots: NormalizedPlot[],
): OutputFamilyVote | null {
  const calls = outputCallCounts(source);
  if (calls.total === 0) return null;
  const base = {
    staticTotal: calls.total,
    pineAScriptComparableStaticCount: calls.pineAScriptComparable,
    pineTSPlotCount: pineTsPlots.length,
    pineAScriptPlotCount: pineAPlots.length,
    droppedPineAScriptFamilies: calls.unsupportedByPineAScript,
  };
  if (pineTsPlots.length === calls.total && calls.unsupportedByPineAScript.length > 0 && pineAPlots.length <= calls.pineAScriptComparable) {
    return { ...base, status: 'pine-a-script-family-dropped' };
  }
  if (pineTsPlots.length < calls.total && calls.unsupportedByPineAScript.length > 0) {
    return { ...base, status: 'pinets-capture-artifact' };
  }
  return { ...base, status: 'full-surface' };
}

function canonicalVoter(
  pineTS: EngineResult,
  pineA: EngineResult,
  source: string,
): { plots: NormalizedPlot[]; provenance: CanonProvenance; voterDiff?: string; voterPlotCount: number; titles: { pineTS: Array<string | null>; pineAScript: Array<string | null> }; outputFamilyVote?: OutputFamilyVote } | null {
  const pineTsPlots = pineTS.ok ? pineTS.plots : [];
  const pineAPlots = pineA.ok ? pineA.plots : [];
  if (pineTS.ok && pineA.ok) {
    const voterDiff = comparePlotSets(pineTsPlots, pineAPlots);
    if (voterDiff) {
      const outputFamilyVote = /^plot count /.test(voterDiff)
        ? outputFamilyVoteForShapeDiff(source, pineTsPlots, pineAPlots)
        : null;
      if (outputFamilyVote?.status === 'pine-a-script-family-dropped') {
        return {
          plots: pineTsPlots,
          provenance: 'pinets-sole',
          voterPlotCount: pineTsPlots.length,
          titles: {
            pineTS: pineTsPlots.map((plot) => plot.title),
            pineAScript: pineAPlots.map((plot) => plot.title),
          },
          outputFamilyVote,
        };
      }
      const firstDifference = outputFamilyVote?.status === 'pinets-capture-artifact'
        ? `pinets output capture artifact: static output count ${outputFamilyVote.staticTotal}, PineTS ${pineTsPlots.length}, Pine-A-Script ${pineAPlots.length}`
        : voterDiff;
      return {
        plots: pineTsPlots,
        provenance: 'none',
        voterDiff: firstDifference,
        voterPlotCount: Math.max(pineTsPlots.length, pineAPlots.length),
        titles: {
          pineTS: pineTsPlots.map((plot) => plot.title),
          pineAScript: pineAPlots.map((plot) => plot.title),
        },
        outputFamilyVote: outputFamilyVote ?? undefined,
      };
    }
    const fullSurfaceCalls = outputCallCounts(source);
    return {
      plots: pineTsPlots,
      provenance: 'external-consensus',
      voterPlotCount: Math.max(pineTsPlots.length, pineAPlots.length),
      titles: {
        pineTS: pineTsPlots.map((plot) => plot.title),
        pineAScript: pineAPlots.map((plot) => plot.title),
      },
      outputFamilyVote: {
        status: 'full-surface',
        staticTotal: fullSurfaceCalls.total,
        pineAScriptComparableStaticCount: fullSurfaceCalls.pineAScriptComparable,
        pineTSPlotCount: pineTsPlots.length,
        pineAScriptPlotCount: pineAPlots.length,
        droppedPineAScriptFamilies: [],
      },
    };
  }
  if (pineTS.ok) {
    return {
      plots: pineTsPlots,
      provenance: 'pinets-sole',
      voterPlotCount: pineTsPlots.length,
      titles: {
        pineTS: pineTsPlots.map((plot) => plot.title),
        pineAScript: [],
      },
    };
  }
  if (pineA.ok) {
    return {
      plots: pineAPlots,
      provenance: 'pine-a-script-sole',
      voterPlotCount: pineAPlots.length,
      titles: {
        pineTS: [],
        pineAScript: pineAPlots.map((plot) => plot.title),
      },
    };
  }
  return null;
}

async function runConsensusRows(candidates: DeclaredV5V6Candidate[], bars: Bar[], context: ConsensusContext): Promise<ConsensusRow[]> {
  const rows: ConsensusRow[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    if (index % PROGRESS_EVERY === 0) {
      process.stderr.write(`[full-consensus] ${index}/${candidates.length} ${candidate.corpus} ${candidate.rowId}\n`);
    }
    const [pineTS, pineA, teal] = await Promise.all([
      runExternalInWorker('pineTS', candidate.source, bars, context),
      runExternalInWorker('pine-a-script', candidate.source, bars, context),
      runTealScript(candidate, bars, context),
    ]);
    const base = {
      corpus: candidate.corpus,
      rowId: candidate.rowId,
      localPath: candidate.localPath,
      sourceRepoUrl: candidate.sourceRepoUrl,
      sourceFilePath: candidate.sourceFilePath,
      commitSha: candidate.commitSha,
      sourceSha256: candidate.sourceSha256,
      declaredVersion: candidate.declaredVersion,
    };
    const engineFailures = [pineTS, pineA, teal]
      .filter((result): result is EngineFail => !result.ok)
      .map((result) => `${result.stage}: ${result.message}`);
    const coercionSuspect = coercionSuspectFor(candidate.source);
    const canonical = canonicalVoter(pineTS, pineA, candidate.source);
    if (!canonical || canonical.voterDiff) {
      rows.push({
        ...base,
        comparison: canonical?.voterDiff ? 'voters-differ' : 'engine-failed',
        differenceClass: canonical?.voterDiff ? classifyDifference(canonical.voterDiff, 'voters-differ') : 'engine-failed',
        provenance: 'none',
        voterPlotCount: canonical?.voterPlotCount,
        tealscriptPlotCount: teal.ok ? teal.plots.length : undefined,
        firstDifference: canonical?.voterDiff,
        engineFailures,
        titles: canonical ? {
          ...canonical.titles,
          tealscript: teal.ok ? teal.plots.map((plot) => plot.title) : [],
        } : undefined,
        outputFamilyVote: canonical?.outputFamilyVote,
        coercionSuspect,
      });
      continue;
    }
    const tealDiff = teal.ok ? comparePlotSets(canonical.plots, teal.plots) : `tealscript failed: ${engineFailures.find((failure) => failure.startsWith('tealscript:')) ?? 'unknown'}`;
    const comparison: Comparison = tealDiff ? (coercionSuspect ? 'coercion-suspect' : 'tealscript-differs') : 'agree';
    const firstDifference = tealDiff ?? undefined;
    const differenceClass = classifyDifference(firstDifference, comparison);
    const row: ConsensusRow = {
      ...base,
      comparison,
      differenceClass,
      provenance: canonical.provenance,
      voterPlotCount: canonical.voterPlotCount,
      tealscriptPlotCount: teal.ok ? teal.plots.length : undefined,
      firstDifference,
      engineFailures,
      titles: {
        ...canonical.titles,
        tealscript: teal.ok ? teal.plots.map((plot) => plot.title) : [],
      },
      outputFamilyVote: canonical.outputFamilyVote,
      coercionSuspect,
    };
    if (comparison === 'tealscript-differs') row.causeKey = causeKeyFor(row, candidate.source);
    rows.push(row);
  }
  process.stderr.write(`[full-consensus] ${candidates.length}/${candidates.length} done\n`);
  return rows;
}

function groupCauses(rows: ConsensusRow[]): CauseGroup[] {
  const groups = new Map<string, CauseGroup>();
  for (const row of rows.filter((item) => item.comparison === 'tealscript-differs')) {
    const causeKey = row.causeKey ?? 'unclassified-tealscript-difference';
    let group = groups.get(causeKey);
    if (!group) {
      group = { causeKey, rows: 0, corpora: {}, examples: [] };
      groups.set(causeKey, group);
    }
    group.rows += 1;
    group.corpora[row.corpus] = (group.corpora[row.corpus] ?? 0) + 1;
    if (group.examples.length < 10) group.examples.push(row);
  }
  return [...groups.values()].sort((a, b) => b.rows - a.rows || a.causeKey.localeCompare(b.causeKey));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function engineName(failure: string): 'pineTS' | 'pine-a-script' | 'tealscript' | 'unknown' {
  if (failure.startsWith('pineTS:')) return 'pineTS';
  if (failure.startsWith('pine-a-script')) return 'pine-a-script';
  if (failure.startsWith('tealscript:')) return 'tealscript';
  return 'unknown';
}

function failureMessage(failure: string): string {
  return failure.replace(/^(pineTS|pine-a-script(?::unknown)?|tealscript(?::(?:semantic|execute))?):\s*/, '');
}

function failureBucket(engine: ReturnType<typeof engineName>, failure: string): string {
  const message = failureMessage(failure);
  if (engine === 'tealscript') {
    if (message.includes('request.security requires a request datafeed') || message.includes('request.security_lower_tf requires a request datafeed')) {
      return 'host-required request datafeed';
    }
    if (message.includes('Import ') && message.includes('was not supplied by the host library registry')) {
      return 'host-required external library import';
    }
    if (message.includes('strategy calc_on_order_fills') || message.includes('fill_orders_on_standard_ohlc') || message.includes('risk_free_rate')) {
      return 'host/trace-required strategy context';
    }
    if (message.includes('TA length must be a positive integer')) return 'correct runtime refusal: invalid TA length';
    if (message.includes('Historical offset') || message.includes('max_bars_back')) return 'runtime refusal: max_bars_back/history';
    if (message.startsWith('Expected ')) return 'TealScript parse refusal';
    return 'TealScript semantic/runtime refusal';
  }
  if (engine === 'pineTS') {
    if (
      message.includes("reading 'tickerid'")
      || message.includes("reading 'ticker'")
      || message.includes("reading 'mintick'")
      || message.includes("reading 'timezone'")
      || message.includes("reading 'session'")
    ) {
      return 'harness/host context missing syminfo/timeframe fields';
    }
    if (message.includes('Failed to transpile Pine Script version')) return 'external parser/transpiler limitation';
    if (message.includes('is not a function') || message.includes('is not defined')) return 'external runtime missing builtin/member';
    if (message.includes('Index') && message.includes('out of bounds')) return 'external runtime collection bound/refusal';
    if (message.includes('timed out after')) return 'external timeout';
    return 'external runtime error';
  }
  if (engine === 'pine-a-script') {
    if (message.includes('Unexpected token') || message.includes('Expected ') || message.includes('Unexpected character') || message.includes('parseTernary')) {
      return 'external parser/transpiler limitation';
    }
    if (
      message.includes('high.slice is not a function')
      || message.includes('low.slice is not a function')
      || message.includes('close.slice is not a function')
      || message.includes('open.slice is not a function')
    ) {
      return 'harness OHLC series shape mismatch';
    }
    if (message.includes('is not defined') || message.includes('is not a function')) return 'external runtime missing builtin/member';
    if (message.includes('Cannot read properties of undefined')) return 'external runtime missing object/property';
    if (message.includes('timed out after')) return 'external timeout';
    return 'external runtime error';
  }
  return 'unknown';
}

function reachabilityClass(engine: ReturnType<typeof engineName>, bucket: string): 'harness' | 'harness-heavy-request-feed' | 'host-trace-required' | 'tealscript-refusal' | 'external-limitation' {
  if (engine === 'pineTS' && bucket === 'harness/host context missing syminfo/timeframe fields') return 'harness';
  if (engine === 'pine-a-script' && bucket === 'harness OHLC series shape mismatch') return 'harness';
  if (engine === 'tealscript' && bucket === 'host-required request datafeed') return 'harness-heavy-request-feed';
  if (engine === 'tealscript' && (bucket === 'host-required external library import' || bucket === 'host/trace-required strategy context')) return 'host-trace-required';
  if (engine === 'tealscript') return 'tealscript-refusal';
  return 'external-limitation';
}

function analyzeEngineFailures(rows: ConsensusRow[]): EngineFailureBreakdown {
  const engineOkRows = { pineTS: 0, 'pine-a-script': 0, tealscript: 0 };
  const engineFailedRows = { pineTS: 0, 'pine-a-script': 0, tealscript: 0 };
  const failureCombinations: Record<string, number> = {};
  const bucketsByEngine: Record<string, Record<string, number>> = {};
  const rowReachabilityClasses: Record<string, number> = {};
  let pinetsAndTealRunnableRows = 0;
  let bothVotersAndTealRunnableRows = 0;
  for (const row of rows) {
    const failedEngines = new Set((row.engineFailures ?? []).map(engineName).filter((engine) => engine !== 'unknown'));
    for (const engine of ['pineTS', 'pine-a-script', 'tealscript'] as const) {
      if (failedEngines.has(engine)) engineFailedRows[engine] += 1;
      else engineOkRows[engine] += 1;
    }
    if (!failedEngines.has('pineTS') && !failedEngines.has('tealscript')) pinetsAndTealRunnableRows += 1;
    if (!failedEngines.has('pineTS') && !failedEngines.has('pine-a-script') && !failedEngines.has('tealscript')) {
      bothVotersAndTealRunnableRows += 1;
    }
    if (failedEngines.size === 0) continue;
    const combination = [...failedEngines].sort().join('+') || 'none';
    failureCombinations[combination] = (failureCombinations[combination] ?? 0) + 1;
    const reachability = new Set<string>();
    for (const failure of row.engineFailures ?? []) {
      const engine = engineName(failure);
      const bucket = failureBucket(engine, failure);
      bucketsByEngine[engine] ??= {};
      bucketsByEngine[engine]![bucket] = (bucketsByEngine[engine]![bucket] ?? 0) + 1;
      reachability.add(reachabilityClass(engine, bucket));
    }
    const reachabilityKey = [...reachability].sort().join('+') || 'none';
    rowReachabilityClasses[reachabilityKey] = (rowReachabilityClasses[reachabilityKey] ?? 0) + 1;
  }
  return {
    engineOkRows,
    engineFailedRows,
    failureCombinations,
    bucketsByEngine,
    rowReachabilityClasses,
    pinetsAndTealRunnableRows,
    bothVotersAndTealRunnableRows,
    secondVoterTaxRows: pinetsAndTealRunnableRows - bothVotersAndTealRunnableRows,
    harnessOnlyRows: (rowReachabilityClasses.harness ?? 0) + (rowReachabilityClasses['harness+harness-heavy-request-feed'] ?? 0) + (rowReachabilityClasses['harness-heavy-request-feed'] ?? 0),
    externalLimitationRows: Object.entries(rowReachabilityClasses)
      .filter(([key]) => key.includes('external-limitation'))
      .reduce((sum, [, count]) => sum + count, 0),
  };
}

function analyzeShapeDisagreements(rows: ConsensusRow[], candidates: CorpusCandidate[]): ShapeDisagreementBreakdown {
  const candidateByKey = new Map(candidates.map((candidate) => [`${candidate.corpus}:${candidate.rowId}`, candidate]));
  const outputNames = ['plot', 'hline', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle', 'bgcolor', 'barcolor', 'fill', 'alertcondition'];
  const outputFamilyRows: Record<string, number> = {};
  const missingPlotCountDistribution: Record<string, number> = {};
  const combinations: Record<string, number> = {};
  let pineTSMoreRows = 0;
  let pineAScriptMoreRows = 0;
  const familyAwarePineAScriptDroppedRows = rows.filter((row) => row.outputFamilyVote?.status === 'pine-a-script-family-dropped').length;
  const pineTSCaptureArtifactRows = rows.filter((row) => row.outputFamilyVote?.status === 'pinets-capture-artifact').length;
  const shapeRows = rows.filter((row) => row.comparison === 'voters-differ' && row.differenceClass === 'shape');
  for (const row of shapeRows) {
    const match = row.firstDifference?.match(/^plot count (\d+) != (\d+)/);
    if (match) {
      const pineTSCount = Number(match[1]);
      const pineAScriptCount = Number(match[2]);
      if (pineTSCount > pineAScriptCount) pineTSMoreRows += 1;
      if (pineAScriptCount > pineTSCount) pineAScriptMoreRows += 1;
      const missing = Math.abs(pineTSCount - pineAScriptCount);
      missingPlotCountDistribution[String(missing)] = (missingPlotCountDistribution[String(missing)] ?? 0) + 1;
    }
    const candidate = candidateByKey.get(`${row.corpus}:${row.rowId}`);
    if (!candidate) continue;
    const clean = stripComments(candidate.source);
    const present: string[] = [];
    for (const outputName of outputNames) {
      const calls = countCalls(clean, outputName);
      if (calls === 0) continue;
      outputFamilyRows[outputName] = (outputFamilyRows[outputName] ?? 0) + 1;
      if (outputName !== 'plot') present.push(`${outputName}:${calls}`);
    }
    const key = present.join(',') || 'plot-only-or-none';
    combinations[key] = (combinations[key] ?? 0) + 1;
  }
  return {
    shapeRows: shapeRows.length,
    pineTSMoreRows,
    pineAScriptMoreRows,
    familyAwarePineAScriptDroppedRows,
    pineTSCaptureArtifactRows,
    outputFamilyRows,
    missingPlotCountDistribution,
    topOutputFamilyCombinations: Object.entries(combinations)
      .map(([combination, count]) => ({ combination, rows: count }))
      .sort((a, b) => b.rows - a.rows || a.combination.localeCompare(b.combination))
      .slice(0, 20),
  };
}

function countCalls(source: string, name: string): number {
  const re = new RegExp(`\\b${name.replace('.', '\\.')}\\s*\\(`, 'g');
  return [...source.matchAll(re)].length;
}

async function auditHlineCompleteness(bars: Bar[]): Promise<{
  baseline: {
    acceptedProducedRows: Partial<Record<CorpusName, number>>;
    acceptedRowsWithHline: Partial<Record<CorpusName, number>>;
    hlineCallsInAcceptedRows: Partial<Record<CorpusName, number>>;
    hlineOnlyAcceptedRows: HlineCompletenessRow[];
  };
  current: {
    auditedRows: number;
    failedRows: number;
    hlinePlots: number;
    completeHlinePlots: number;
    incompleteHlinePlots: number;
    rows: HlineCompletenessRow[];
  };
}> {
  const acceptedProducedRows: Partial<Record<CorpusName, number>> = {};
  const acceptedRowsWithHline: Partial<Record<CorpusName, number>> = {};
  const hlineCallsInAcceptedRows: Partial<Record<CorpusName, number>> = {};
  const hlineOnlyAcceptedRows: HlineCompletenessRow[] = [];
  const rowsToAudit: Array<CorpusCandidate & { expectedAcceptedReport?: string }> = [];
  const candidatesByKey = new Map<string, CorpusCandidate>();
  for (const corpus of CORPORA) {
    for (const candidate of await loadCandidates(corpus.name)) {
      candidatesByKey.set(`${corpus.name}:${candidate.rowId}`, candidate);
    }
  }

  for (const corpus of CORPORA) {
    if (!corpus.latestAcceptedReport) continue;
    const reportPath = resolve(PACKAGE_ROOT, corpus.latestAcceptedReport);
    if (!existsSync(reportPath)) continue;
    const report = JSON.parse(await readFile(reportPath, 'utf8')) as { rows: Array<{ localPath: string; output?: { produced?: boolean; plots?: number } }> };
    let accepted = 0;
    let withHline = 0;
    let hlineCalls = 0;
    for (let index = 0; index < report.rows.length; index += 1) {
      const reportRow = report.rows[index]!;
      if (!reportRow.output?.produced) continue;
      accepted += 1;
      const rowId = String(index + 1).padStart(4, '0');
      const candidate = candidatesByKey.get(`${corpus.name}:${rowId}`);
      if (!candidate) throw new Error(`Missing candidate for ${corpus.name} ${rowId}`);
      const clean = stripComments(candidate.source);
      const hlineCount = countCalls(clean, 'hline');
      if (hlineCount === 0) continue;
      withHline += 1;
      hlineCalls += hlineCount;
      rowsToAudit.push({ ...candidate, expectedAcceptedReport: corpus.latestAcceptedReport });
      const otherOutput = [
        'plot',
        'plotshape',
        'plotchar',
        'plotarrow',
        'plotbar',
        'plotcandle',
        'bgcolor',
        'barcolor',
        'fill',
        'alertcondition',
        'alert',
        'line.new',
        'label.new',
        'box.new',
        'polyline.new',
        'table.new',
        'table.cell',
        'strategy.entry',
        'strategy.order',
        'strategy.exit',
      ].some((name) => countCalls(clean, name) > 0);
      if (!otherOutput) {
        hlineOnlyAcceptedRows.push({
          corpus: corpus.name,
          rowId,
          localPath: candidate.localPath,
          expectedAcceptedReport: corpus.latestAcceptedReport,
          hlinePlots: reportRow.output?.plots ?? hlineCount,
          completeHlinePlots: 0,
          incompleteHlinePlots: hlineCount,
        });
      }
    }
    acceptedProducedRows[corpus.name] = accepted;
    acceptedRowsWithHline[corpus.name] = withHline;
    hlineCallsInAcceptedRows[corpus.name] = hlineCalls;
  }

  const currentRows: HlineCompletenessRow[] = [];
  let hlinePlots = 0;
  let completeHlinePlots = 0;
  let incompleteHlinePlots = 0;
  let failedRows = 0;
  for (const candidate of rowsToAudit) {
    try {
      const ast = parse(candidate.source, { grammarSource: candidate.sourceFilePath ?? candidate.localPath });
      const result = executeScript(ast, bars);
      if (result.errors.length > 0) throw new Error(result.errors[0]!.message);
      const hlines = result.plots.filter((plot) => plot.type === 'hline' && plot.display !== 0);
      const incomplete = hlines.filter((plot) => plot.values.length !== bars.length);
      hlinePlots += hlines.length;
      completeHlinePlots += hlines.length - incomplete.length;
      incompleteHlinePlots += incomplete.length;
      currentRows.push({
        corpus: candidate.corpus,
        rowId: candidate.rowId,
        localPath: candidate.localPath,
        expectedAcceptedReport: candidate.expectedAcceptedReport,
        hlinePlots: hlines.length,
        completeHlinePlots: hlines.length - incomplete.length,
        incompleteHlinePlots: incomplete.length,
        firstIncomplete: incomplete[0] ? `${incomplete[0].title}: length ${incomplete[0].values.length}` : undefined,
      });
    } catch (error) {
      failedRows += 1;
      currentRows.push({
        corpus: candidate.corpus,
        rowId: candidate.rowId,
        localPath: candidate.localPath,
        expectedAcceptedReport: candidate.expectedAcceptedReport,
        hlinePlots: 0,
        completeHlinePlots: 0,
        incompleteHlinePlots: 0,
        failed: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    baseline: {
      acceptedProducedRows,
      acceptedRowsWithHline,
      hlineCallsInAcceptedRows,
      hlineOnlyAcceptedRows,
    },
    current: {
      auditedRows: rowsToAudit.length,
      failedRows,
      hlinePlots,
      completeHlinePlots,
      incompleteHlinePlots,
      rows: currentRows,
    },
  };
}

async function gitHead(dir: string): Promise<string | null> {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const out = await promisify(execFile)('git', ['-C', dir, 'rev-parse', 'HEAD']);
    return out.stdout.trim();
  } catch {
    return null;
  }
}

async function gitDirty(dir: string): Promise<boolean> {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const out = await promisify(execFile)('git', ['-C', dir, 'status', '--porcelain']);
    return out.stdout.trim().length > 0;
  } catch {
    return true;
  }
}

function summarizeEngineFailures(rows: ConsensusRow[]) {
  const counts = new Map<string, number>();
  for (const failure of rows.flatMap((row) => row.engineFailures ?? [])) {
    const key = failure.slice(0, 160);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count || a.message.localeCompare(b.message))
    .slice(0, 40);
}

function countBy<T extends string>(rows: ConsensusRow[], key: (row: ConsensusRow) => T): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const row of rows) {
    const value = key(row);
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

async function main(): Promise<void> {
  for (const enginePath of [PINE_TS_PATH, PINE_A_PATH]) {
    if (!existsSync(enginePath)) throw new Error(`Missing external engine cache: ${enginePath}`);
  }
  const bars = await ensureBarsFixture();
  const context = await ensureContextFixture();
  const loadedCandidates = await loadDeclaredV5V6Candidates();
  const candidates = DEBUG_LIMIT > 0 ? loadedCandidates.slice(0, DEBUG_LIMIT) : loadedCandidates;
  const rows = await runConsensusRows(candidates, bars, context);
  const causeGroups = groupCauses(rows);
  const engineFailureBreakdown = analyzeEngineFailures(rows);
  const shapeDisagreementBreakdown = analyzeShapeDisagreements(rows, candidates);
  const hlineCompleteness = await auditHlineCompleteness(bars);
  const comparableRows = rows.filter((row) => row.comparison !== 'engine-failed').length;
  const votersDifferRows = rows.filter((row) => row.comparison === 'voters-differ').length;
  const canonRows = rows.filter((row) => row.provenance !== 'none').length;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: await gitHead(REPO_ROOT),
    measuredWorkingTreeDirty: await gitDirty(REPO_ROOT),
    bars: {
      path: 'packages/tealscript/reports/external-pine-consensus-pilot-bars-v1.json',
      count: bars.length,
      sha256: sha256(await readFile(BARS_PATH, 'utf8')),
    },
    context: {
      path: 'packages/tealscript/reports/external-pine-consensus-pilot-context-v1.json',
      symbol: context.symbol,
      timeframe: context.timeframe.period,
      sha256: sha256(await readFile(CONTEXT_PATH, 'utf8')),
    },
    scope: {
      corpora: CORPORA.map(({ name, expectedRows, inputDir }) => ({ name, expectedRows, inputDir })),
      declaredVersions: [5, 6],
      loadedCandidateRows: loadedCandidates.length,
      candidateRows: candidates.length,
      debugLimit: DEBUG_LIMIT > 0 ? DEBUG_LIMIT : undefined,
    },
    voters: {
      pineTS: {
        repo: 'https://github.com/LuxAlgo/PineTS',
        localHead: await gitHead(resolve(ENGINE_ROOT, 'PineTS')),
      },
      pineAScript: {
        repo: 'https://github.com/MeridianAlgo/Pine-A-Script',
        localHead: await gitHead(resolve(ENGINE_ROOT, 'Pine-A-Script')),
      },
    },
    normalizer: {
      plotKey: 'source order/index',
      titleUse: 'metadata only',
      naValues: 'null/undefined/NaN/non-finite normalized to null',
      epsilon: EPSILON,
    },
    summary: {
      totalRows: rows.length,
      comparableRows,
      canonRows,
      comparisons: countBy(rows, (row) => row.comparison),
      provenance: countBy(rows, (row) => row.provenance),
      differenceClasses: countBy(rows, (row) => row.differenceClass),
      votersDifferRateAllRows: rows.length === 0 ? 0 : votersDifferRows / rows.length,
      votersDifferRateComparableRows: comparableRows === 0 ? 0 : votersDifferRows / comparableRows,
      tealscriptDefectRows: rows.filter((row) => row.comparison === 'tealscript-differs').length,
      causeGroups: causeGroups.length,
    },
    causeGroups,
    engineFailureBreakdown,
    shapeDisagreementBreakdown,
    hlineCompleteness,
    hlineFailureTimingCheck: HLINE_FAILURE_TIMING_CHECK,
    undocumentedSeedRows: {
      rule: 'Undocumented seed rows are counted/named and closed per Sam rule; no trace register or follow-up.',
      pilotUndocumentedSeedRows: PILOT_UNDOCUMENTED_SEED_ROWS,
      fullWarmupSeedNoVerdictRows: rows
        .filter((row) => row.comparison === 'voters-differ' && row.differenceClass === 'warmup-seed')
        .map((row) => `${row.corpus} ${row.rowId}`),
    },
    engineFailureSummary: summarizeEngineFailures(rows),
    rows,
  };
  await mkdir(resolve(PACKAGE_ROOT, 'reports'), { recursive: true });
  await writeFile(JSON_REPORT_PATH, `${JSON.stringify(report)}\n`);
  await writeFile(MD_REPORT_PATH, renderMarkdown(report));
  console.log(`${basename(MD_REPORT_PATH)}: ${report.summary.tealscriptDefectRows} TealScript defect rows across ${causeGroups.length} cause groups; ${votersDifferRows}/${rows.length} voters differ`);
}

function renderMarkdown(report: any): string {
  const lines: string[] = [];
  lines.push('# External Pine Consensus Full Corpus v1');
  lines.push('');
  lines.push(`Measured commit: \`${report.measuredCommitSha}\``);
  if (report.measuredWorkingTreeDirty) lines.push('Measurement tree: working tree had local changes for this run.');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`Declared v5/v6 rows measured across the committed corpus union: ${report.summary.totalRows}. Canonical value rows under Sam's rule: ${report.summary.canonRows}.`);
  lines.push(`TealScript defect rows by canonical external value: ${report.summary.tealscriptDefectRows}, grouped into ${report.summary.causeGroups} root-cause buckets below. No auto-fixes were made by this full run.`);
  lines.push(`Voters-differ no-verdict rate: ${report.summary.comparisons['voters-differ'] ?? 0}/${report.summary.totalRows} (${(report.summary.votersDifferRateAllRows * 100).toFixed(2)}%) of all rows; ${(report.summary.votersDifferRateComparableRows * 100).toFixed(2)}% of rows where a value comparison ran.`);
  lines.push('');
  lines.push('| Canon provenance | Rows |');
  lines.push('|---|---:|');
  for (const key of ['external-consensus', 'pinets-sole', 'pine-a-script-sole', 'none'] as const) {
    lines.push(`| ${key} | ${report.summary.provenance[key] ?? 0} |`);
  }
  lines.push('');
  lines.push('PineTS sole-canon taint warning: `external-pine-consensus-pinets-grammar-precedence-audit-v1.md` at `dc2fbac78e` proves PineTS is unsafe as blanket sole canon for documented history/block/shadowing/drawing-method families. It strikes `52/119` survivor candidates, `446/1338` PineTS-sole canon rows, and `319/716` PineTS-sole differing rows. Use `external-pine-consensus-survivor-triage-v1.md` as the action filter; do not treat PineTS-sole figures as uncontaminated until the positive trust map lands.');
  lines.push('');
  lines.push('## Root Causes');
  lines.push('');
  lines.push('| Rank | Cause | Rows | Corpora | Example rows |');
  lines.push('|---:|---|---:|---|---|');
  if (report.causeGroups.length === 0) {
    lines.push('|  | No canonical external TealScript value defects found. | 0 |  |  |');
  } else {
    report.causeGroups.forEach((group: CauseGroup, index: number) => {
      const corpora = Object.entries(group.corpora).map(([corpus, count]) => `${corpus}:${count}`).join(', ');
      const examples = group.examples.map((row) => `${row.corpus} ${row.rowId} ${row.firstDifference ?? ''}`).join('<br>');
      lines.push(`| ${index + 1} | ${group.causeKey} | ${group.rows} | ${corpora} | ${examples} |`);
    });
  }
  lines.push('');
  lines.push('## Split');
  lines.push('');
  lines.push('| Bucket | Rows |');
  lines.push('|---|---:|');
  for (const [bucket, count] of Object.entries(report.summary.comparisons)) {
    lines.push(`| ${bucket} | ${count} |`);
  }
  lines.push('');
  lines.push('| Voters-differ class | Rows |');
  lines.push('|---|---:|');
  for (const key of ['warmup-seed', 'later-value', 'shape'] as const) {
    const count = report.rows.filter((row: ConsensusRow) => row.comparison === 'voters-differ' && row.differenceClass === key).length;
    lines.push(`| ${key} | ${count} |`);
  }
  lines.push('');
  const coercionSuspects = report.rows.filter((row: ConsensusRow) => row.coercionSuspect);
  lines.push('## Coercion Suspects');
  lines.push('');
  lines.push('Rows whose external agreement could be explained by shared JavaScript/TypeScript coercion are tagged and excluded from TealScript defect groups until the Pine manual or a trace settles the type behavior.');
  lines.push('');
  lines.push(`Coercion-suspect rows: ${coercionSuspects.length}.`);
  for (const row of coercionSuspects.slice(0, 20)) {
    lines.push(`- \`${row.corpus} ${row.rowId}\` ${row.coercionSuspect}; first difference: ${row.firstDifference ?? 'none'}`);
  }
  lines.push('');
  lines.push('## Engine Failure Breakdown');
  lines.push('');
  lines.push('Engine failures are counted independently from verdicts. Under Sam\'s rule, PineTS-only and Pine-A-Script-only rows still carry canonical values; Pine-A-Script failures are now second-voter tax, not a hard coverage ceiling.');
  lines.push('');
  lines.push('| Engine | OK rows | Failed rows |');
  lines.push('|---|---:|---:|');
  for (const engine of ['pineTS', 'pine-a-script', 'tealscript'] as const) {
    lines.push(`| ${engine} | ${report.engineFailureBreakdown.engineOkRows[engine]} | ${report.engineFailureBreakdown.engineFailedRows[engine]} |`);
  }
  lines.push('');
  lines.push('| Failure combination | Rows |');
  lines.push('|---|---:|');
  for (const [combination, count] of Object.entries(report.engineFailureBreakdown.failureCombinations).sort((a, b) => (b[1] as number) - (a[1] as number) || a[0].localeCompare(b[0]))) {
    lines.push(`| ${combination} | ${count} |`);
  }
  lines.push('');
  lines.push(`PineTS+TealScript runnable rows: ${report.engineFailureBreakdown.pinetsAndTealRunnableRows}. Full two-voter+TealScript runnable intersection: ${report.engineFailureBreakdown.bothVotersAndTealRunnableRows}. Second-voter tax: ${report.engineFailureBreakdown.secondVoterTaxRows}.`);
  lines.push(`Rows whose failures are harness/feed-only by this classifier: ${report.engineFailureBreakdown.harnessOnlyRows}. Rows with at least one external-engine limitation: ${report.engineFailureBreakdown.externalLimitationRows}.`);
  lines.push('');
  lines.push('| Engine | Cause bucket | Failure messages |');
  lines.push('|---|---|---:|');
  for (const engine of ['pine-a-script', 'pineTS', 'tealscript'] as const) {
    const buckets = report.engineFailureBreakdown.bucketsByEngine[engine] ?? {};
    for (const [bucket, count] of Object.entries(buckets).sort((a, b) => (b[1] as number) - (a[1] as number) || a[0].localeCompare(b[0])).slice(0, 12)) {
      lines.push(`| ${engine} | ${bucket} | ${count} |`);
    }
  }
  lines.push('');
  lines.push('## Shape No-Verdicts');
  lines.push('');
  const shape = report.shapeDisagreementBreakdown;
  lines.push(`Shape handling is output-family aware. Pine-A-Script visual-family under-capture was removed from the vote in ${shape.familyAwarePineAScriptDroppedRows} rows; those rows use PineTS as the canonical voter when PineTS exposes the full static output-call surface.`);
  lines.push(`Remaining shape no-verdicts: ${shape.shapeRows}. PineTS emitted more outputs than Pine-A-Script in ${shape.pineTSMoreRows}/${shape.shapeRows} shape rows; Pine-A-Script emitted more in ${shape.pineAScriptMoreRows}. PineTS capture/key-collapse artifacts were marked non-comparable in ${shape.pineTSCaptureArtifactRows} rows.`);
  lines.push('');
  lines.push('| Output family present in shape rows | Rows |');
  lines.push('|---|---:|');
  for (const [family, count] of Object.entries(shape.outputFamilyRows).sort((a, b) => (b[1] as number) - (a[1] as number) || a[0].localeCompare(b[0]))) {
    lines.push(`| ${family} | ${count} |`);
  }
  lines.push('');
  lines.push('| Missing plot-count delta | Rows |');
  lines.push('|---:|---:|');
  for (const [delta, count] of Object.entries(shape.missingPlotCountDistribution).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    lines.push(`| ${delta} | ${count} |`);
  }
  lines.push('');
  lines.push('| Top non-plot output-family combination | Rows |');
  lines.push('|---|---:|');
  for (const entry of shape.topOutputFamilyCombinations.slice(0, 12)) {
    lines.push(`| ${entry.combination.replace(/\|/g, '\\|')} | ${entry.rows} |`);
  }
  lines.push('');
  lines.push('## HLine Payload Completeness');
  lines.push('');
  const base = report.hlineCompleteness.baseline;
  const current = report.hlineCompleteness.current;
  lines.push('Before the hline fix, accepted rows with visible hline calls registered plot metadata with `values: []`; acceptance counted those plots by metadata presence. Current rerun over the same accepted hline-bearing rows checks value payload completeness, not external consensus.');
  lines.push('');
  lines.push('| Corpus | Accepted output rows | Accepted rows with hline | hline calls in accepted rows |');
  lines.push('|---|---:|---:|---:|');
  for (const corpus of CORPORA.map((item) => item.name)) {
    lines.push(`| ${corpus} | ${base.acceptedProducedRows[corpus] ?? 0} | ${base.acceptedRowsWithHline[corpus] ?? 0} | ${base.hlineCallsInAcceptedRows[corpus] ?? 0} |`);
  }
  lines.push('');
  lines.push(`Current hline payload audit: ${current.auditedRows} rows audited, ${current.failedRows} execution failures, ${current.completeHlinePlots}/${current.hlinePlots} visible hline plots complete, ${current.incompleteHlinePlots} incomplete.`);
  lines.push(`${report.hlineFailureTimingCheck.conclusion} Detached pre-fix check ${report.hlineFailureTimingCheck.checkedPreFixCommit}: ${report.hlineFailureTimingCheck.preFixFailures}/${report.hlineFailureTimingCheck.checkedRows} already failed.`);
  if (base.hlineOnlyAcceptedRows.length > 0) {
    lines.push(`Hline-only accepted rows before the fix: ${base.hlineOnlyAcceptedRows.length}.`);
    for (const row of base.hlineOnlyAcceptedRows.slice(0, 20)) {
      lines.push(`- \`${row.corpus} ${row.rowId}\` ${row.localPath}`);
    }
  }
  lines.push('');
  lines.push('## Undocumented Seed Rows');
  lines.push('');
  lines.push(report.undocumentedSeedRows.rule);
  lines.push(`Pilot undocumented seed rows: ${report.undocumentedSeedRows.pilotUndocumentedSeedRows.map((row: string) => `\`${row}\``).join(', ')}.`);
  lines.push(`Full-run warmup/seed no-verdict rows: ${report.undocumentedSeedRows.fullWarmupSeedNoVerdictRows.length}. They are named in the JSON report and not investigated further.`);
  lines.push('');
  lines.push('## Engine Failures');
  lines.push('');
  lines.push(`Rows where at least one of PineTS, Pine-A-Script, or TealScript failed before a value comparison: ${report.summary.comparisons['engine-failed'] ?? 0}.`);
  lines.push('');
  lines.push('| Count | Failure prefix |');
  lines.push('|---:|---|');
  for (const failure of report.engineFailureSummary.slice(0, 20)) {
    lines.push(`| ${failure.count} | ${String(failure.message).replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  lines.push(`Bars: \`${report.bars.path}\`, ${report.bars.count} bars, sha256 \`${report.bars.sha256}\`.`);
  lines.push(`Context: \`${report.context.path}\`, symbol \`${report.context.symbol}\`, timeframe \`${report.context.timeframe}\`, sha256 \`${report.context.sha256}\`.`);
  lines.push(`PineTS: ${report.voters.pineTS.repo} local head \`${report.voters.pineTS.localHead}\`.`);
  lines.push(`Pine-A-Script: ${report.voters.pineAScript.repo} local head \`${report.voters.pineAScript.localHead}\`.`);
  lines.push('Provenance: `external-consensus` means both voters agreed, `pinets-sole` means only PineTS supplied the canonical value, and `pine-a-script-sole` means only Pine-A-Script supplied it. Manual adjudication remains `documented` or `hand-derived` only in the pilot report, not blurred into external provenance.');
  lines.push('');
  lines.push('## Machine Data');
  lines.push('');
  lines.push(`Full rows and all failure details are in \`${basename(JSON_REPORT_PATH)}\`.`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
