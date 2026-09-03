import type { Program } from '../src/parser/ast.ts';
import type { ClosureCompiledScript } from '../src/runtime/closure/execute.ts';
import type { CompiledScript } from '../src/runtime/codegen/compile.ts';
import type { Bar } from '../src/runtime/context.ts';
import type { TealscriptEngineOptions } from '../src/runtime/engine.ts';
import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import { parse } from '../src/parser/parser.ts';
import { executeClosure, tryCompileClosure } from '../src/runtime/closure/execute.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import { NumericSeries } from '../src/runtime/codegen/runtime.ts';
import { ExecutionContext } from '../src/runtime/context.ts';
import { TealscriptEngine } from '../src/runtime/engine.ts';
import { Scope } from '../src/runtime/scope.ts';
import { Series } from '../src/runtime/series.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import { createSyntheticBars, SyntheticExternalCorpusRequestDatafeed } from './run-external-pine-corpus.ts';

type BackendName = 'compiled' | 'closure';

interface ProductionClosurePerformanceReport {
  corpora: Array<{
    corpus: 'v1' | 'v2';
    cohorts: Array<{
      name: string;
      perScriptClosureToCompiled: {
        scripts: Array<{
          id: string;
          ratio: number;
        }>;
      };
    }>;
  }>;
}

interface SourceEntry {
  corpus: 'v1' | 'v2';
  id: string;
  localPath: string;
  source: string;
  row: ExternalCorpusReportRow;
  ratio: number;
}

interface PreparedScript {
  ast: Program;
  compiled: CompiledScript;
  closure: ClosureCompiledScript;
}

interface BackendRunTiming {
  backend: BackendName;
  totalMs: number;
  usPerBar: number;
}

interface BarCountTiming {
  barCount: number;
  totalBars: number;
  compiled: BackendRunTiming;
  closure: BackendRunTiming;
  closureToCompiledRatio: number;
  perBarGapUs: number;
  closureBindEstimateUsPerBar: number;
  closureBindShareOfGap: number | null;
}

interface ProbeBucket {
  ms: number;
  calls: number;
}

interface SizedProbeBucket extends ProbeBucket {
  totalLength: number;
  maxLength: number;
}

interface RuntimeProbeSummary {
  barCount: number;
  totalBars: number;
  closureTotalMs: number;
  compiledTotalMs: number;
  perBarGapUs: number;
  buckets: Record<
    string,
    ProbeBucket & {
      callsPerBar: number;
      inclusiveUsPerBar: number;
      inclusiveShareOfGap: number | null;
    }
  >;
  builtinFamilies: Record<
    string,
    ProbeBucket & {
      callsPerBar: number;
      inclusiveUsPerBar: number;
      inclusiveShareOfGap: number | null;
    }
  >;
  topBuiltins: Array<{
    name: string;
    ms: number;
    calls: number;
    callsPerBar: number;
    inclusiveUsPerBar: number;
    inclusiveShareOfGap: number | null;
  }>;
  seriesMethods: Record<
    string,
    SizedProbeBucket & {
      callsPerBar: number;
      inclusiveUsPerBar: number;
      inclusiveShareOfGap: number | null;
      averageLength: number;
    }
  >;
}

interface ProductionClosureProfileReport {
  schemaVersion: 1;
  generatedAt: string;
  gitCommit: string;
  sample: {
    selection: string;
    scriptsPerCorpus: number;
    scripts: Array<{
      corpus: 'v1' | 'v2';
      id: string;
      ratio: number;
      declaredVersion: ExternalCorpusReportRow['declaredVersion'];
      byteSize: number;
    }>;
  };
  construction: {
    scripts: number;
    parseCheckMs: number;
    compiledCompileMs: number;
    closureSupportBindMs: number;
    closureSupportBindToCompiledCompileRatio: number;
  };
  barCountCurve: BarCountTiming[];
  runtimeProbe: RuntimeProbeSummary;
  runtimeProbeCurve: RuntimeProbeSummary[];
  findings: {
    typicalCostConclusion: string;
    addressableCostCenters: Array<{
      name: string;
      evidence: string;
      estimatedRecovery: string;
      risk: string;
    }>;
    inherentCostCenters: Array<{
      name: string;
      evidence: string;
      estimatedFloor: string;
    }>;
  };
  limitations: string[];
}

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);
const DEFAULT_OUTPUT = resolve(repoRoot, 'packages/tealscript/reports/production-closure-profile-t104.json');
const DEFAULT_PERF_REPORT = resolve(repoRoot, 'packages/tealscript/reports/production-closure-performance-t102.json');
const REPORT_PATHS: Record<'v1' | 'v2', string> = {
  v1: resolve(repoRoot, 'packages/tealscript/reports/external-pine-corpus-v1.report.json'),
  v2: resolve(repoRoot, 'packages/tealscript/reports/external-pine-corpus-v2.report.json'),
};
const INPUT_DIRS: Record<'v1' | 'v2', string> = {
  v1: '/tmp/pine-corpus-v1',
  v2: '/tmp/pine-corpus-v2',
};
const BAR_COUNTS = [160, 1000, 5000, 10000, 20000] as const;
const RUNTIME_PROBE_BAR_COUNTS = [1000, 5000] as const;
const SCRIPTS_PER_CORPUS = 8;

function currentGitCommit(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function loadSample(
  perfReportPath: string,
  reportPaths: Record<'v1' | 'v2', string>,
  inputDirs: Record<'v1' | 'v2', string>,
): Promise<SourceEntry[]> {
  const perfReport = await readJson<ProductionClosurePerformanceReport>(perfReportPath);
  const entries: SourceEntry[] = [];

  for (const corpusName of ['v1', 'v2'] as const) {
    const corpusPerf = perfReport.corpora.find((corpus) => corpus.corpus === corpusName);
    const cohort = corpusPerf?.cohorts.find((candidate) => candidate.name === 'compiled-visible-dominated');
    if (!cohort) throw new Error(`Missing compiled-visible-dominated cohort for ${corpusName}`);

    const sorted = [...cohort.perScriptClosureToCompiled.scripts].sort((left, right) => left.ratio - right.ratio);
    const medianIndex = Math.floor((sorted.length - 1) / 2);
    const start = Math.max(0, medianIndex - Math.floor(SCRIPTS_PER_CORPUS / 2));
    const chosen = sorted.slice(start, start + SCRIPTS_PER_CORPUS);

    const report = await readJson<ExternalCorpusReport>(reportPaths[corpusName]);
    const rowsById = new Map(report.rows.map((row) => [row.id, row]));
    for (const script of chosen) {
      const row = rowsById.get(script.id);
      if (!row) throw new Error(`Missing corpus row for ${script.id}`);
      entries.push({
        corpus: corpusName,
        id: script.id,
        localPath: row.localPath,
        row,
        ratio: script.ratio,
        source: await readFile(resolve(inputDirs[corpusName], row.localPath), 'utf8'),
      });
    }
  }

  return entries;
}

function prepare(entry: SourceEntry): PreparedScript {
  const ast = parse(entry.source, { grammarSource: entry.row.sourceFilePath ?? entry.localPath });
  const semantic = checkProgram(ast);
  const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (semanticError) throw new Error(`${semanticError.code}: ${semanticError.message}`);
  const compiled = tryCompile(ast);
  if (!compiled.success) throw new Error(`compiled unsupported: ${compiled.unsupported.join('; ')}`);
  const closure = tryCompileClosure(ast);
  if (!closure.success) throw new Error(`closure unsupported: ${closure.unsupported.join('; ')}`);
  return { ast, compiled, closure };
}

function runtimeOptions(bars: Bar[]): TealscriptEngineOptions {
  return { requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars) };
}

function assertSucceeded(
  backend: BackendName,
  result: ReturnType<typeof executeCompiled> | ReturnType<typeof executeClosure>,
): void {
  if (!result || result.errors.length > 0) {
    throw new Error(`${backend} failed: ${result?.errors[0]?.message ?? 'no result'}`);
  }
}

function measureBackend(backend: BackendName, prepared: PreparedScript[], bars: Bar[]): BackendRunTiming {
  const options = runtimeOptions(bars);
  const started = performance.now();
  for (const script of prepared) {
    const result =
      backend === 'compiled'
        ? executeCompiled(script.compiled, bars, undefined, options)
        : executeClosure(script.closure, bars, undefined, options);
    assertSucceeded(backend, result);
  }
  const totalMs = performance.now() - started;
  const totalBars = prepared.length * bars.length;
  return {
    backend,
    totalMs: round(totalMs),
    usPerBar: round((totalMs * 1000) / totalBars, 2),
  };
}

function timeConstruction(entries: SourceEntry[]): ProductionClosureProfileReport['construction'] {
  let parseCheckMs = 0;
  let compiledCompileMs = 0;
  let closureSupportBindMs = 0;

  for (const entry of entries) {
    const parseStarted = performance.now();
    const ast = parse(entry.source, { grammarSource: entry.row.sourceFilePath ?? entry.localPath });
    const semantic = checkProgram(ast);
    const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
    if (semanticError) throw new Error(`${entry.id}: ${semanticError.code}: ${semanticError.message}`);
    parseCheckMs += performance.now() - parseStarted;

    const compiledStarted = performance.now();
    const compiled = tryCompile(ast);
    if (!compiled.success) throw new Error(`${entry.id}: compiled unsupported: ${compiled.unsupported.join('; ')}`);
    compiledCompileMs += performance.now() - compiledStarted;

    const closureStarted = performance.now();
    const closure = tryCompileClosure(ast);
    if (!closure.success) throw new Error(`${entry.id}: closure unsupported: ${closure.unsupported.join('; ')}`);
    closureSupportBindMs += performance.now() - closureStarted;
  }

  return {
    scripts: entries.length,
    parseCheckMs: round(parseCheckMs),
    compiledCompileMs: round(compiledCompileMs),
    closureSupportBindMs: round(closureSupportBindMs),
    closureSupportBindToCompiledCompileRatio: round(closureSupportBindMs / compiledCompileMs, 2),
  };
}

function measureBarCountCurve(
  prepared: PreparedScript[],
  construction: ProductionClosureProfileReport['construction'],
): BarCountTiming[] {
  return BAR_COUNTS.map((barCount) => {
    const bars = createSyntheticBars(barCount);
    const compiled = measureBackend('compiled', prepared, bars);
    const closure = measureBackend('closure', prepared, bars);
    const totalBars = prepared.length * bars.length;
    const gap = closure.usPerBar - compiled.usPerBar;
    const closureBindEstimateUsPerBar = round((construction.closureSupportBindMs * 1000) / totalBars, 2);
    return {
      barCount,
      totalBars,
      compiled,
      closure,
      closureToCompiledRatio: round(closure.usPerBar / compiled.usPerBar, 2),
      perBarGapUs: round(gap, 2),
      closureBindEstimateUsPerBar,
      closureBindShareOfGap: gap > 0 ? round(closureBindEstimateUsPerBar / gap, 2) : null,
    };
  });
}

function bucketForBuiltin(name: string): string {
  if (name.startsWith('ta.')) return 'ta';
  if (name.startsWith('request.')) return 'request';
  if (/^(plot|plotshape|plotchar|plotarrow|plotbar|plotcandle|hline|fill|bgcolor|barcolor)$/.test(name))
    return 'visual';
  if (/^(line|label|box|table|polyline|linefill|chart\.point)\./.test(name)) return 'drawing';
  if (name.startsWith('array.')) return 'array';
  if (name.startsWith('map.')) return 'map';
  if (name.startsWith('matrix.')) return 'matrix';
  if (name.startsWith('strategy.')) return 'strategy';
  return 'other';
}

function addProbe(bucket: ProbeBucket, ms: number): void {
  bucket.ms += ms;
  bucket.calls += 1;
}

function addSizedProbe(bucket: SizedProbeBucket, ms: number, length: number): void {
  bucket.ms += ms;
  bucket.calls += 1;
  bucket.totalLength += length;
  if (length > bucket.maxLength) bucket.maxLength = length;
}

function patchMethod(
  target: Record<string, unknown>,
  name: string,
  bucket: ProbeBucket,
  restorers: Array<() => void>,
): void {
  const original = target[name];
  if (typeof original !== 'function') return;
  target[name] = function patchedMethod(this: unknown, ...args: unknown[]) {
    const started = performance.now();
    try {
      return Reflect.apply(original, this, args);
    } finally {
      addProbe(bucket, performance.now() - started);
    }
  };
  restorers.push(() => {
    target[name] = original;
  });
}

function patchSizedMethod(
  target: Record<string, unknown>,
  name: string,
  bucket: SizedProbeBucket,
  lengthOf: (instance: unknown, result: unknown) => number,
  restorers: Array<() => void>,
): void {
  const original = target[name];
  if (typeof original !== 'function') return;
  target[name] = function patchedSizedMethod(this: unknown, ...args: unknown[]) {
    const started = performance.now();
    let result: unknown;
    try {
      result = Reflect.apply(original, this, args);
      return result;
    } finally {
      addSizedProbe(bucket, performance.now() - started, lengthOf(this, result));
    }
  };
  restorers.push(() => {
    target[name] = original;
  });
}

function profiledRequestDatafeed(bars: Bar[], bucket: ProbeBucket): SyntheticExternalCorpusRequestDatafeed {
  const datafeed = new SyntheticExternalCorpusRequestDatafeed(bars) as unknown as Record<string, unknown>;
  return new Proxy(datafeed, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        const started = performance.now();
        try {
          return Reflect.apply(value, target, args);
        } finally {
          addProbe(bucket, performance.now() - started);
        }
      };
    },
  }) as unknown as SyntheticExternalCorpusRequestDatafeed;
}

function withRuntimeProbes<T>(
  bars: Bar[],
  fn: (options: TealscriptEngineOptions) => T,
): {
  value: T;
  buckets: Record<string, ProbeBucket>;
  builtinFamilies: Record<string, ProbeBucket>;
  builtinNames: Record<string, ProbeBucket>;
  seriesMethods: Record<string, SizedProbeBucket>;
} {
  const buckets: Record<string, ProbeBucket> = {
    builtinInclusive: { ms: 0, calls: 0 },
    scopeInclusive: { ms: 0, calls: 0 },
    contextInclusive: { ms: 0, calls: 0 },
    requestInclusive: { ms: 0, calls: 0 },
  };
  const builtinFamilies: Record<string, ProbeBucket> = {};
  const builtinNames: Record<string, ProbeBucket> = {};
  const seriesMethods: Record<string, SizedProbeBucket> = {
    genericGet: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    genericSet: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    genericAdvance: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    genericCommit: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    genericSnapshot: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    genericRestore: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    genericToArray: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericGet: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericPush: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericUpdate: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericSave: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericRestore: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericToArray: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
    numericToPlotArray: { ms: 0, calls: 0, totalLength: 0, maxLength: 0 },
  };
  const restorers: Array<() => void> = [];
  const genericLength = (instance: unknown, result: unknown): number => {
    const length =
      typeof (instance as { length?: unknown }).length === 'number' ? (instance as { length: number }).length : 0;
    return Array.isArray(result) ? Math.max(length, result.length) : length;
  };
  const numericLength = (instance: unknown, result: unknown): number => {
    const length =
      typeof (instance as { length?: unknown }).length === 'number' ? (instance as { length: number }).length : 0;
    return Array.isArray(result) ? Math.max(length, result.length) : length;
  };

  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'get', buckets.scopeInclusive, restorers);
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'getEntry', buckets.scopeInclusive, restorers);
  patchMethod(
    Scope.prototype as unknown as Record<string, unknown>,
    'getWithOffset',
    buckets.scopeInclusive,
    restorers,
  );
  patchMethod(
    Scope.prototype as unknown as Record<string, unknown>,
    'getSourceSeries',
    buckets.scopeInclusive,
    restorers,
  );
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'has', buckets.scopeInclusive, restorers);
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'set', buckets.scopeInclusive, restorers);
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'declare', buckets.scopeInclusive, restorers);
  patchMethod(
    Scope.prototype as unknown as Record<string, unknown>,
    'declareParameter',
    buckets.scopeInclusive,
    restorers,
  );
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'advanceBar', buckets.scopeInclusive, restorers);
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'commit', buckets.scopeInclusive, restorers);
  patchMethod(Scope.prototype as unknown as Record<string, unknown>, 'createChild', buckets.scopeInclusive, restorers);

  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'get',
    seriesMethods.genericGet,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'set',
    seriesMethods.genericSet,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'advance',
    seriesMethods.genericAdvance,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'commit',
    seriesMethods.genericCommit,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'snapshot',
    seriesMethods.genericSnapshot,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'restore',
    seriesMethods.genericRestore,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    Series.prototype as unknown as Record<string, unknown>,
    'toArray',
    seriesMethods.genericToArray,
    genericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'get',
    seriesMethods.numericGet,
    numericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'push',
    seriesMethods.numericPush,
    numericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'update',
    seriesMethods.numericUpdate,
    numericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'save',
    seriesMethods.numericSave,
    numericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'restore',
    seriesMethods.numericRestore,
    numericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'toArray',
    seriesMethods.numericToArray,
    numericLength,
    restorers,
  );
  patchSizedMethod(
    NumericSeries.prototype as unknown as Record<string, unknown>,
    'toPlotArray',
    seriesMethods.numericToPlotArray,
    numericLength,
    restorers,
  );

  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'advanceBar',
    buckets.contextInclusive,
    restorers,
  );
  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'commitBar',
    buckets.contextInclusive,
    restorers,
  );
  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'loadBars',
    buckets.contextInclusive,
    restorers,
  );
  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'addPlot',
    buckets.contextInclusive,
    restorers,
  );
  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'addAlert',
    buckets.contextInclusive,
    restorers,
  );
  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'addLog',
    buckets.contextInclusive,
    restorers,
  );
  patchMethod(
    ExecutionContext.prototype as unknown as Record<string, unknown>,
    'addDrawing',
    buckets.contextInclusive,
    restorers,
  );

  const enginePrototype = TealscriptEngine.prototype as unknown as Record<string, unknown>;
  const originalRegisterBuiltins = enginePrototype.registerBuiltins;
  if (typeof originalRegisterBuiltins === 'function') {
    enginePrototype.registerBuiltins = function patchedRegisterBuiltins(
      this: Record<string, unknown>,
      ...args: unknown[]
    ) {
      Reflect.apply(originalRegisterBuiltins, this, args);
      const registry = this.builtins;
      if (!(registry instanceof Map)) return;
      for (const [name, builtin] of registry.entries()) {
        if (typeof builtin !== 'function') continue;
        registry.set(name, (...builtinArgs: unknown[]) => {
          const started = performance.now();
          try {
            return Reflect.apply(builtin, this, builtinArgs);
          } finally {
            const elapsed = performance.now() - started;
            addProbe(buckets.builtinInclusive, elapsed);
            const family = bucketForBuiltin(name);
            builtinFamilies[family] ??= { ms: 0, calls: 0 };
            addProbe(builtinFamilies[family], elapsed);
            builtinNames[name] ??= { ms: 0, calls: 0 };
            addProbe(builtinNames[name], elapsed);
          }
        });
      }
    };
    restorers.push(() => {
      enginePrototype.registerBuiltins = originalRegisterBuiltins;
    });
  }

  try {
    const value = fn({ requestDatafeed: profiledRequestDatafeed(bars, buckets.requestInclusive) });
    return { value, buckets, builtinFamilies, builtinNames, seriesMethods };
  } finally {
    for (const restore of restorers.reverse()) restore();
  }
}

function summarizeProbeBucket(
  bucket: ProbeBucket,
  totalBars: number,
  gapUs: number,
): ProbeBucket & { callsPerBar: number; inclusiveUsPerBar: number; inclusiveShareOfGap: number | null } {
  const inclusiveUsPerBar = round((bucket.ms * 1000) / totalBars, 2);
  return {
    ms: round(bucket.ms),
    calls: bucket.calls,
    callsPerBar: round(bucket.calls / totalBars, 2),
    inclusiveUsPerBar,
    inclusiveShareOfGap: gapUs > 0 ? round(inclusiveUsPerBar / gapUs, 2) : null,
  };
}

function summarizeSizedProbeBucket(
  bucket: SizedProbeBucket,
  totalBars: number,
  gapUs: number,
): SizedProbeBucket & {
  callsPerBar: number;
  inclusiveUsPerBar: number;
  inclusiveShareOfGap: number | null;
  averageLength: number;
} {
  const inclusiveUsPerBar = round((bucket.ms * 1000) / totalBars, 2);
  return {
    ms: round(bucket.ms),
    calls: bucket.calls,
    callsPerBar: round(bucket.calls / totalBars, 2),
    totalLength: bucket.totalLength,
    maxLength: bucket.maxLength,
    averageLength: bucket.calls > 0 ? round(bucket.totalLength / bucket.calls, 1) : 0,
    inclusiveUsPerBar,
    inclusiveShareOfGap: gapUs > 0 ? round(inclusiveUsPerBar / gapUs, 2) : null,
  };
}

function measureRuntimeProbe(prepared: PreparedScript[], barCount: number): RuntimeProbeSummary {
  const bars = createSyntheticBars(barCount);
  const totalBars = prepared.length * bars.length;
  const compiled = measureBackend('compiled', prepared, bars);
  const started = performance.now();
  const { buckets, builtinFamilies, builtinNames, seriesMethods } = withRuntimeProbes(bars, (options) => {
    for (const script of prepared) {
      const result = executeClosure(script.closure, bars, undefined, options);
      assertSucceeded('closure', result);
    }
  });
  const closureTotalMs = performance.now() - started;
  const closureUsPerBar = (closureTotalMs * 1000) / totalBars;
  const gapUs = closureUsPerBar - compiled.usPerBar;
  return {
    barCount,
    totalBars,
    closureTotalMs: round(closureTotalMs),
    compiledTotalMs: compiled.totalMs,
    perBarGapUs: round(gapUs, 2),
    buckets: Object.fromEntries(
      Object.entries(buckets).map(([name, bucket]) => [name, summarizeProbeBucket(bucket, totalBars, gapUs)]),
    ),
    builtinFamilies: Object.fromEntries(
      Object.entries(builtinFamilies).map(([name, bucket]) => [name, summarizeProbeBucket(bucket, totalBars, gapUs)]),
    ),
    topBuiltins: Object.entries(builtinNames)
      .map(([name, bucket]) => ({ name, ...summarizeProbeBucket(bucket, totalBars, gapUs) }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 20),
    seriesMethods: Object.fromEntries(
      Object.entries(seriesMethods).map(([name, bucket]) => [
        name,
        summarizeSizedProbeBucket(bucket, totalBars, gapUs),
      ]),
    ),
  };
}

function buildFindings(
  curve: BarCountTiming[],
  probeCurve: RuntimeProbeSummary[],
): ProductionClosureProfileReport['findings'] {
  const probe = probeCurve[0]!;
  const longerProbe = probeCurve[1] ?? probe;
  const at160 = curve.find((entry) => entry.barCount === 160)!;
  const at5000 = curve.find((entry) => entry.barCount === 5000)!;
  const at20000 = curve.find((entry) => entry.barCount === 20000) ?? at5000;
  const scope = probe.buckets.scopeInclusive;
  const longerScope = longerProbe.buckets.scopeInclusive;
  const builtins = probe.buckets.builtinInclusive;
  const longerBuiltins = longerProbe.buckets.builtinInclusive;
  const context = probe.buckets.contextInclusive;
  const snapshot = longerProbe.seriesMethods.genericSnapshot;
  const toArray = longerProbe.seriesMethods.genericToArray;
  const ratioChange = round(at5000.closureToCompiledRatio - at160.closureToCompiledRatio, 2);
  return {
    typicalCostConclusion: `On the middle-ratio sample, closure/compiled is ${at160.closureToCompiledRatio}x at 160 bars, ${at5000.closureToCompiledRatio}x at 5000 bars (${ratioChange >= 0 ? '+' : ''}${ratioChange}x from 160), and ${at20000.closureToCompiledRatio}x at 20000 bars. The curve plateaus in the high-1.x range rather than climbing without bound. The 160-bar regression is mostly construction amortization: closure binding costs ${at160.closureBindEstimateUsPerBar} us/bar at 160 bars but ${at5000.closureBindEstimateUsPerBar} us/bar at 5000 bars.`,
    addressableCostCenters: [
      {
        name: 'Scope and lifecycle method traffic',
        evidence: `Instrumented closure execution made ${scope.calls} scope/lifecycle calls on ${probe.totalBars} bar executions (${scope.callsPerBar} per bar) and ${longerScope.calls} calls on ${longerProbe.totalBars} bar executions (${longerScope.callsPerBar} per bar). Inclusive scope probes account for ${scope.inclusiveUsPerBar} us/bar at ${probe.barCount} bars and ${longerScope.inclusiveUsPerBar} us/bar at ${longerProbe.barCount} bars; this bucket is larger than the measured uninstrumented gap because probe wrappers add overhead, but it remains the highest call-volume surface.`,
        estimatedRecovery:
          'Moderate: local slot binding for simple globals/UDF locals and cheaper function-scope lifecycle handling could remove many Map/prototype calls.',
        risk: 'High around re-entry: scope snapshots, imported UDF state and call-site isolation are the bug-prone areas this branch already fixed repeatedly.',
      },
      {
        name: 'Builtin argument marshalling and shared builtin dispatch',
        evidence: `Inclusive builtin probes account for ${builtins.inclusiveUsPerBar} us/bar at ${probe.barCount} bars and ${longerBuiltins.inclusiveUsPerBar} us/bar at ${longerProbe.barCount} bars; calls per bar rise from ${builtins.callsPerBar} to ${longerBuiltins.callsPerBar}. The hottest ${longerProbe.barCount}-bar families are ${Object.entries(
          longerProbe.builtinFamilies,
        )
          .sort((a, b) => b[1].ms - a[1].ms)
          .slice(0, 4)
          .map(([name, bucket]) => `${name}:${round(bucket.inclusiveUsPerBar, 2)}us/bar/${bucket.callsPerBar}calls`)
          .join(', ')}.`,
        estimatedRecovery:
          'Moderate: pre-bind no-named positional call shapes and reuse empty named maps where safe; bigger gains need direct helpers for hot visual/TA calls.',
        risk: 'Medium: named-argument ordering and source-aware input/TA values have produced correctness bugs, so each specialization needs two-path parity tests.',
      },
      {
        name: 'Lookback-gated workload becoming active',
        evidence: `The 5000-bar probe shows no meaningful full-history copy cost: generic snapshot is ${snapshot.inclusiveUsPerBar} us/bar over ${snapshot.calls} calls and generic toArray is ${toArray.inclusiveUsPerBar} us/bar over ${toArray.calls} calls. The rise is instead ordinary per-bar work: builtin calls per bar and scope/lifecycle calls per bar are higher at 5000 than at 1000 because longer synthetic windows cross script lookback and drawing/array thresholds.`,
        estimatedRecovery:
          'Moderate and targeted: specialize hot builtin/method call shapes and reduce scope mirroring around active drawing/array paths; history representation is not currently the measured slope.',
        risk: 'Medium: these are exactly the conditional long-window paths the 160-bar corpus can underexercise.',
      },
      {
        name: 'Closure executable re-binding on every executeClosure call',
        evidence: `The closure support/bind pass costs ${at160.closureBindEstimateUsPerBar} us/bar at 160 bars and ${at5000.closureBindEstimateUsPerBar} us/bar at 5000 bars in this sample, while the closure/compiled ratio does not improve with bar count.`,
        estimatedRecovery:
          'Small for steady-state charts; still worth considering for frequent short-window executions or realtime recompute if a reusable closure plan can avoid retaining runtime state.',
        risk: 'Medium: closures currently capture an engine instance, so the cache must not retain runtime state across executions or AST versions.',
      },
      {
        name: 'Context/output lifecycle',
        evidence: `Context probes account for ${context.inclusiveUsPerBar} us/bar at ${probe.barCount} bars, far below scope and builtin traffic.`,
        estimatedRecovery: 'Low: this is not where the 1.5x median primarily goes.',
        risk: 'Low to medium; output identity and drawing lifecycle are heavily tested but easy to regress visually.',
      },
    ],
    inherentCostCenters: [
      {
        name: 'Closure-per-node invocation chain',
        evidence:
          'After removing measured setup/builtin/scope/context/request inclusive buckets, the remaining time is ordinary closure calls, arithmetic, control flow and output assembly; compiled JavaScript inlines much of that into one generated function.',
        estimatedFloor:
          'Non-zero: each bound expression remains at least one JavaScript function call unless a later closure optimizer fuses expression trees.',
      },
    ],
  };
}

async function main(): Promise<void> {
  const outputIndex = process.argv.indexOf('--output');
  const outputPath = outputIndex >= 0 ? resolve(process.argv[outputIndex + 1]!) : DEFAULT_OUTPUT;
  const perfIndex = process.argv.indexOf('--perf-report');
  const perfReportPath = perfIndex >= 0 ? resolve(process.argv[perfIndex + 1]!) : DEFAULT_PERF_REPORT;
  const reportV1Index = process.argv.indexOf('--report-v1');
  const reportV2Index = process.argv.indexOf('--report-v2');
  const inputV1Index = process.argv.indexOf('--input-v1');
  const inputV2Index = process.argv.indexOf('--input-v2');
  const reportPaths = {
    v1: reportV1Index >= 0 ? resolve(process.argv[reportV1Index + 1]!) : REPORT_PATHS.v1,
    v2: reportV2Index >= 0 ? resolve(process.argv[reportV2Index + 1]!) : REPORT_PATHS.v2,
  };
  const inputDirs = {
    v1: inputV1Index >= 0 ? resolve(process.argv[inputV1Index + 1]!) : INPUT_DIRS.v1,
    v2: inputV2Index >= 0 ? resolve(process.argv[inputV2Index + 1]!) : INPUT_DIRS.v2,
  };

  const sample = await loadSample(perfReportPath, reportPaths, inputDirs);
  const construction = timeConstruction(sample);
  const prepared = sample.map(prepare);
  const barCountCurve = measureBarCountCurve(prepared, construction);
  const runtimeProbeCurve = RUNTIME_PROBE_BAR_COUNTS.map((barCount) => measureRuntimeProbe(prepared, barCount));
  const runtimeProbe = runtimeProbeCurve[0]!;
  const report: ProductionClosureProfileReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitCommit: currentGitCommit(),
    sample: {
      selection: `The ${SCRIPTS_PER_CORPUS} scripts nearest the median closure/compiled ratio from each corpus' compiled-visible-dominated cutover cohort; screener outliers and fastest rows are intentionally excluded.`,
      scriptsPerCorpus: SCRIPTS_PER_CORPUS,
      scripts: sample.map((entry) => ({
        corpus: entry.corpus,
        id: entry.id,
        ratio: entry.ratio,
        declaredVersion: entry.row.declaredVersion,
        byteSize: entry.row.byteSize,
      })),
    },
    construction,
    barCountCurve,
    runtimeProbe,
    runtimeProbeCurve,
    findings: buildFindings(barCountCurve, runtimeProbeCurve),
    limitations: [
      'Node timing on the shared development machine; absolute times are noisier than ratios.',
      'The sample deliberately targets the middle of T103 distribution and excludes screener outliers, so it answers typical web-user cost rather than fan-out cost.',
      'Inclusive probes can overlap: builtin time may include scope/context work performed inside a builtin. Use them to rank cost centers, not to sum to 100%.',
      'The bar-count curve uses synthetic bars. It shows amortization direction, but not real exchange/session/provider behavior.',
      'This is measurement only; it does not change runtime behavior or optimize the closure backend.',
    ],
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify(
      {
        sample: report.sample.scripts.map((script) => ({ corpus: script.corpus, id: script.id, ratio: script.ratio })),
        construction: report.construction,
        barCountCurve: report.barCountCurve,
        runtimeProbe: report.runtimeProbe,
        findings: report.findings,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
