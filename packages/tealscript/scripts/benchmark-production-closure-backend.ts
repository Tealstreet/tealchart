import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

import { checkProgram } from '../src/semantic/checker.ts';
import { parse } from '../src/parser/parser.ts';
import type { Program } from '../src/parser/ast.ts';
import type { Bar } from '../src/runtime/context.ts';
import type { ExecutionResult, TealscriptEngineOptions } from '../src/runtime/engine.ts';
import { executeScript } from '../src/runtime/engine.ts';
import type { CompiledScript } from '../src/runtime/codegen/compile.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import type { ClosureCompiledScript } from '../src/runtime/closure/execute.ts';
import { executeClosure, tryCompileClosure } from '../src/runtime/closure/execute.ts';
import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';
import { createSyntheticBars, SyntheticExternalCorpusRequestDatafeed } from './run-external-pine-corpus.ts';

type BackendName = 'interpreter' | 'compiled' | 'closure';

interface SourceEntry {
  id: string;
  localPath: string;
  source: string;
  reportRow: ExternalCorpusReportRow;
}

interface BackendPreparedScript {
  ast: Program;
  compiled?: CompiledScript;
  closure?: ClosureCompiledScript;
}

interface BackendTiming {
  backend: BackendName;
  handledScripts: number;
  failedScripts: number;
  totalBars: number;
  coldUsPerBar: number | null;
  steadyUsPerBar: number | null;
  failures: Array<{ id: string; diagnostic: string }>;
  slowestSteadyScripts: Array<{ id: string; steadyUsPerBar: number }>;
}

interface PerScriptRatio {
  id: string;
  compiledUsPerBar: number;
  closureUsPerBar: number;
  ratio: number;
}

interface RatioDistribution {
  count: number;
  median: number | null;
  q1: number | null;
  q3: number | null;
  min: number | null;
  max: number | null;
  closureFaster: number;
  closureWithinTenPercent: number;
  closureSlower: number;
  closureAtLeastTwoTimesSlower: number;
  closureAtLeastTwoTimesFaster: number;
  closureFasterClasses: Record<string, number>;
  scripts: PerScriptRatio[];
  fastestClosureScripts: PerScriptRatio[];
  slowestClosureScripts: PerScriptRatio[];
}

interface PerScriptTiming {
  id: string;
  backend: BackendName;
  handled: boolean;
  coldMs: number;
  steadyMs: number;
  diagnostic?: string;
}

interface CohortTiming {
  name: string;
  description: string;
  scriptCount: number;
  backends: Record<BackendName, BackendTiming>;
  steadyClosureToCompiledRatio: number | null;
  perScriptClosureToCompiled: RatioDistribution;
}

interface CorpusTiming {
  corpus: 'v1' | 'v2';
  reportPath: string;
  inputDir: string;
  totalScripts: number;
  cohorts: CohortTiming[];
}

interface ProductionClosureBenchmarkReport {
  schemaVersion: 2;
  generatedAt: string;
  gitCommit: string;
  bars: {
    count: number;
    firstTime: number;
    lastTime: number;
  };
  measurement: {
    warmupRuns: number;
    steadyRuns: number;
    coldIncludes: string;
    steadyIncludes: string;
    handledDefinition: string;
  };
  corpora: CorpusTiming[];
  summary: {
    cutoverCohort: Record<'v1' | 'v2', {
      scripts: number;
      compiledSteadyUsPerBar: number | null;
      closureSteadyUsPerBar: number | null;
      interpreterSteadyUsPerBar: number | null;
      closureToCompiledRatio: number | null;
      closureToInterpreterRatio: number | null;
      perScriptMedianClosureToCompiledRatio: number | null;
      closureFasterScripts: number;
      closureSlowerScripts: number;
      closureAtLeastTwoTimesSlowerScripts: number;
    }>;
    pooledCutoverCohort: RatioDistribution;
  };
  limitations: string[];
}

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);
const DEFAULT_OUTPUT = resolve(repoRoot, 'packages/tealscript/reports/production-closure-performance-t102.json');
const BARS_PER_SCRIPT = 160;
const WARMUP_RUNS = 1;
const STEADY_RUNS = 1;

const BACKENDS: BackendName[] = ['interpreter', 'compiled', 'closure'];

function currentGitCommit(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatThrown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function executionSucceeded(result: ExecutionResult | null): boolean {
  return !!result && result.errors.length === 0;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function readSources(inputDir: string, rows: ExternalCorpusReportRow[]): Promise<SourceEntry[]> {
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      localPath: row.localPath,
      reportRow: row,
      source: await readFile(resolve(inputDir, row.localPath), 'utf8'),
    })),
  );
}

function prepareForBackend(entry: SourceEntry, backend: BackendName): BackendPreparedScript {
  const ast = parse(entry.source, { grammarSource: entry.reportRow.sourceFilePath ?? entry.localPath });
  const semantic = checkProgram(ast);
  const semanticError = semantic.diagnostics.find((diagnostic) => diagnostic.severity === 'error');
  if (semanticError) {
    throw new Error(`${semanticError.code}: ${semanticError.message}`);
  }

  if (backend === 'compiled') {
    const compiled = tryCompile(ast);
    if (!compiled.success) throw new Error(compiled.unsupported.join('; ') || 'compiled backend unsupported');
    return { ast, compiled };
  }

  if (backend === 'closure') {
    const closure = tryCompileClosure(ast);
    if (!closure.success) throw new Error(closure.unsupported.join('; ') || 'closure backend unsupported');
    return { ast, closure };
  }

  return { ast };
}

function runPrepared(
  backend: BackendName,
  prepared: BackendPreparedScript,
  bars: Bar[],
  options: TealscriptEngineOptions,
): ExecutionResult | null {
  if (backend === 'compiled') return executeCompiled(prepared.compiled!, bars, undefined, options);
  if (backend === 'closure') return executeClosure(prepared.closure!, bars, undefined, options);
  return executeScript(prepared.ast, bars, undefined, options);
}

function benchmarkBackendEntries(
  backend: BackendName,
  entries: SourceEntry[],
  bars: Bar[],
  options: TealscriptEngineOptions,
): PerScriptTiming[] {
  const timings: PerScriptTiming[] = [];
  for (const entry of entries) {
    let script: BackendPreparedScript;
    const coldStart = performance.now();
    try {
      script = prepareForBackend(entry, backend);
      const result = runPrepared(backend, script, bars, options);
      if (!executionSucceeded(result)) {
        throw new Error(result?.errors[0]?.message ?? `${backend} execution returned no result`);
      }
    } catch (error) {
      timings.push({
        id: entry.id,
        backend,
        handled: false,
        coldMs: 0,
        steadyMs: 0,
        diagnostic: formatThrown(error),
      });
      continue;
    }
    const coldMs = performance.now() - coldStart;

    try {
      for (let warmup = 0; warmup < WARMUP_RUNS; warmup += 1) {
        runPrepared(backend, script, bars, options);
      }
      const steadyStart = performance.now();
      for (let run = 0; run < STEADY_RUNS; run += 1) {
        const result = runPrepared(backend, script, bars, options);
        if (!executionSucceeded(result)) {
          throw new Error(result?.errors[0]?.message ?? `${backend} execution returned no result`);
        }
      }
      timings.push({
        id: entry.id,
        backend,
        handled: true,
        coldMs,
        steadyMs: performance.now() - steadyStart,
      });
    } catch (error) {
      timings.push({
        id: entry.id,
        backend,
        handled: false,
        coldMs: 0,
        steadyMs: 0,
        diagnostic: formatThrown(error),
      });
    }
  }
  return timings;
}

function summarizeBackendTiming(
  backend: BackendName,
  entries: SourceEntry[],
  timingsById: Map<string, PerScriptTiming>,
  barsPerScript: number,
): BackendTiming {
  const timings = entries.map((entry) => timingsById.get(entry.id)).filter((timing): timing is PerScriptTiming => Boolean(timing));
  const handled = timings.filter((timing) => timing.handled);
  const coldMs = handled.reduce((sum, timing) => sum + timing.coldMs, 0);
  const steadyMs = handled.reduce((sum, timing) => sum + timing.steadyMs, 0);
  const steadyBars = handled.length * barsPerScript * STEADY_RUNS;
  return {
    backend,
    handledScripts: handled.length,
    failedScripts: entries.length - handled.length,
    totalBars: handled.length * barsPerScript,
    coldUsPerBar: handled.length === 0 ? null : round(coldMs * 1000 / (handled.length * barsPerScript)),
    steadyUsPerBar: steadyBars === 0 ? null : round(steadyMs * 1000 / steadyBars),
    failures: timings
      .filter((timing) => !timing.handled)
      .slice(0, 20)
      .map((timing) => ({ id: timing.id, diagnostic: timing.diagnostic ?? 'unknown failure' })),
    slowestSteadyScripts: handled
      .map((timing) => ({ id: timing.id, steadyUsPerBar: round(timing.steadyMs * 1000 / (barsPerScript * STEADY_RUNS)) }))
      .sort((left, right) => right.steadyUsPerBar - left.steadyUsPerBar)
      .slice(0, 10),
  };
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (!numerator || !denominator) return null;
  return round(numerator / denominator);
}

function usPerBar(timing: PerScriptTiming, barsPerScript: number): number {
  return round(timing.steadyMs * 1000 / (barsPerScript * STEADY_RUNS));
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.floor((sorted.length - 1) * p);
  return sorted[index] ?? null;
}

function summarizeRatios(ratios: PerScriptRatio[]): RatioDistribution {
  const sortedValues = ratios.map((entry) => entry.ratio).sort((left, right) => left - right);
  const fastest = [...ratios].sort((left, right) => left.ratio - right.ratio).slice(0, 10);
  const slowest = [...ratios].sort((left, right) => right.ratio - left.ratio).slice(0, 10);
  return {
    count: ratios.length,
    median: percentile(sortedValues, 0.5),
    q1: percentile(sortedValues, 0.25),
    q3: percentile(sortedValues, 0.75),
    min: sortedValues[0] ?? null,
    max: sortedValues.at(-1) ?? null,
    closureFaster: ratios.filter((entry) => entry.ratio < 1).length,
    closureWithinTenPercent: ratios.filter((entry) => entry.ratio >= 0.9 && entry.ratio <= 1.1).length,
    closureSlower: ratios.filter((entry) => entry.ratio > 1).length,
    closureAtLeastTwoTimesSlower: ratios.filter((entry) => entry.ratio >= 2).length,
    closureAtLeastTwoTimesFaster: ratios.filter((entry) => entry.ratio <= 0.5).length,
    closureFasterClasses: countBy(ratios.filter((entry) => entry.ratio < 1), (entry) => classifyScriptPerformanceShape(entry.id)),
    scripts: [...ratios].sort((left, right) => left.id.localeCompare(right.id)),
    fastestClosureScripts: fastest,
    slowestClosureScripts: slowest,
  };
}

function classifyScriptPerformanceShape(id: string): string {
  if (/(scanner|screener|tarama|kripto|aranlar)/i.test(id)) return 'scanner-or-screener';
  if (/\bstrategy\b|strategies\//i.test(id)) return 'strategy';
  if (/(HTF|MTF|multi.time|request\.|security)/i.test(id)) return 'multi-timeframe-or-request';
  if (/(movings|moving|average|ema|sma|rsi|macd|stoch|sar)/i.test(id)) return 'moving-average-or-ta';
  if (/(level|line|box|fvg|liquidity|market.structure|swing)/i.test(id)) return 'drawing-or-level';
  return 'other';
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const name = key(value);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function ratioDistributionForStdout(distribution: RatioDistribution): Omit<RatioDistribution, 'scripts'> {
  const { scripts: _scripts, ...rest } = distribution;
  return rest;
}

function summarizeClosureToCompiledRatios(
  entries: SourceEntry[],
  barsPerScript: number,
  timings: Record<BackendName, Map<string, PerScriptTiming>>,
): RatioDistribution {
  const ratios: PerScriptRatio[] = [];
  for (const entry of entries) {
    const compiled = timings.compiled.get(entry.id);
    const closure = timings.closure.get(entry.id);
    if (!compiled?.handled || !closure?.handled) continue;
    const compiledUsPerBar = usPerBar(compiled, barsPerScript);
    const closureUsPerBar = usPerBar(closure, barsPerScript);
    ratios.push({
      id: entry.id,
      compiledUsPerBar,
      closureUsPerBar,
      ratio: round(closureUsPerBar / compiledUsPerBar),
    });
  }
  return summarizeRatios(ratios);
}

function benchmarkCohort(
  name: string,
  description: string,
  entries: SourceEntry[],
  barsPerScript: number,
  timings: Record<BackendName, Map<string, PerScriptTiming>>,
): CohortTiming {
  const backendTimings = Object.fromEntries(
    BACKENDS.map((backend) => [backend, summarizeBackendTiming(backend, entries, timings[backend], barsPerScript)]),
  ) as Record<BackendName, BackendTiming>;
  return {
    name,
    description,
    scriptCount: entries.length,
    backends: backendTimings,
    steadyClosureToCompiledRatio: ratio(backendTimings.closure.steadyUsPerBar, backendTimings.compiled.steadyUsPerBar),
    perScriptClosureToCompiled: summarizeClosureToCompiledRatios(entries, barsPerScript, timings),
  };
}

async function benchmarkCorpus(
  corpus: 'v1' | 'v2',
  inputDir: string,
  reportPath: string,
  bars: Bar[],
): Promise<CorpusTiming> {
  const report = await readJson<ExternalCorpusReport>(reportPath);
  const sources = await readSources(inputDir, report.rows);
  const options: TealscriptEngineOptions = { requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars) };
  const semanticallyRunnable = sources.filter((entry) => entry.reportRow.stages.semantic.status === 'passed');
  const timings = Object.fromEntries(
    BACKENDS.map((backend) => {
      const entries = benchmarkBackendEntries(backend, semanticallyRunnable, bars, options);
      return [backend, new Map(entries.map((entry) => [entry.id, entry]))];
    }),
  ) as Record<BackendName, Map<string, PerScriptTiming>>;
  const currentCompiledOutput = sources.filter(
    (entry) => entry.reportRow.outcome === 'produced-output-compiled'
      && entry.reportRow.closure.parityAgainstCompiled.status === 'matched',
  );

  return {
    corpus,
    reportPath,
    inputDir,
    totalScripts: sources.length,
    cohorts: [
      benchmarkCohort(
        'semantic-passed',
        'Every corpus script that passes parsing and semantic checking; this measures broad backend execution cost, including scripts that produce no visible output.',
        semanticallyRunnable,
        bars.length,
        timings,
      ),
      benchmarkCohort(
        'compiled-visible-dominated',
        'The exact scripts where today\'s compiled web path produces parity-enforced visible output and closure must replace it; this is the web cutover cost cohort.',
        currentCompiledOutput,
        bars.length,
        timings,
      ),
    ],
  };
}

function parseArgs(args: string[]): {
  inputV1: string;
  inputV2: string;
  outputPath: string;
  reportV1: string;
  reportV2: string;
} {
  let inputV1 = '/tmp/pine-corpus-v1';
  let inputV2 = '/tmp/pine-corpus-v2';
  let outputPath = DEFAULT_OUTPUT;
  let reportV1 = resolve(repoRoot, 'packages/tealscript/reports/external-pine-corpus-v1.report.json');
  let reportV2 = resolve(repoRoot, 'packages/tealscript/reports/external-pine-corpus-v2.report.json');

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--input-v1') {
      inputV1 = args[++index] ?? '';
    } else if (arg === '--input-v2') {
      inputV2 = args[++index] ?? '';
    } else if (arg === '--output') {
      outputPath = resolve(repoRoot, args[++index] ?? '');
    } else if (arg === '--report-v1') {
      reportV1 = resolve(repoRoot, args[++index] ?? '');
    } else if (arg === '--report-v2') {
      reportV2 = resolve(repoRoot, args[++index] ?? '');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!inputV1 || !inputV2 || !outputPath || !reportV1 || !reportV2) {
    throw new Error('Usage: yarn workspace @tealstreet/tealscript pine:closure:perf --input-v1 /tmp/pine-corpus-v1 --input-v2 /tmp/pine-corpus-v2 --report-v1 packages/tealscript/reports/external-pine-corpus-v1.report.json --report-v2 packages/tealscript/reports/external-pine-corpus-v2.report.json --output packages/tealscript/reports/production-closure-performance-t102.json');
  }

  return { inputV1, inputV2, outputPath, reportV1, reportV2 };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const bars = createSyntheticBars(BARS_PER_SCRIPT);
  const corpora = [
    await benchmarkCorpus('v1', args.inputV1, args.reportV1, bars),
    await benchmarkCorpus('v2', args.inputV2, args.reportV2, bars),
  ];
  const report: ProductionClosureBenchmarkReport = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    gitCommit: currentGitCommit(),
    bars: {
      count: bars.length,
      firstTime: bars[0]?.time ?? 0,
      lastTime: bars.at(-1)?.time ?? 0,
    },
    measurement: {
      warmupRuns: WARMUP_RUNS,
      steadyRuns: STEADY_RUNS,
      coldIncludes: 'parse + semantic check + backend preparation + one execution over 160 synthetic bars; disk IO is excluded',
      steadyIncludes: 'one warmed full-corpus pass using reused parsed/backend artifacts where the production API supports them',
      handledDefinition: 'A backend handles a script when it passes backend preparation and executes without runtime errors; visible-output cutover cost is reported as a separate compiled-visible-dominated cohort.',
    },
    corpora,
    summary: {
      cutoverCohort: Object.fromEntries(corpora.map((corpus) => {
        const cohort = corpus.cohorts.find((candidate) => candidate.name === 'compiled-visible-dominated')!;
        return [corpus.corpus, {
          scripts: cohort.scriptCount,
          compiledSteadyUsPerBar: cohort.backends.compiled.steadyUsPerBar,
          closureSteadyUsPerBar: cohort.backends.closure.steadyUsPerBar,
          interpreterSteadyUsPerBar: cohort.backends.interpreter.steadyUsPerBar,
          closureToCompiledRatio: ratio(cohort.backends.closure.steadyUsPerBar, cohort.backends.compiled.steadyUsPerBar),
          closureToInterpreterRatio: ratio(cohort.backends.closure.steadyUsPerBar, cohort.backends.interpreter.steadyUsPerBar),
          perScriptMedianClosureToCompiledRatio: cohort.perScriptClosureToCompiled.median,
          closureFasterScripts: cohort.perScriptClosureToCompiled.closureFaster,
          closureSlowerScripts: cohort.perScriptClosureToCompiled.closureSlower,
          closureAtLeastTwoTimesSlowerScripts: cohort.perScriptClosureToCompiled.closureAtLeastTwoTimesSlower,
        }];
      })) as ProductionClosureBenchmarkReport['summary']['cutoverCohort'],
      pooledCutoverCohort: summarizeRatios(corpora.flatMap((corpus) => (
        corpus.cohorts.find((candidate) => candidate.name === 'compiled-visible-dominated')?.perScriptClosureToCompiled.scripts ?? []
      ))),
    },
    limitations: [
      'Measured under Node on the shared development machine, not under Hermes on a mobile device.',
      'The benchmark stops at TealScript execution; it does not include Tealchart rendering, Worker transport, Metro bundling, or native app startup.',
      'The closure production API currently stores the AST and re-binds the closure tree inside executeClosure(), so steady-state closure timings include binding cost that a future cached-bound artifact could remove.',
      'The steady-state timing is a single warmed full-corpus pass so this command remains practical to rerun; treat ratios as directional, not as a low-noise benchmark.',
      'Request-backed scripts use the same deterministic SyntheticExternalCorpusRequestDatafeed as the corpus report, not live exchange/provider data.',
      'Scripts are measured on the 160-bar synthetic corpus window; date/session/provider-specific public scripts may have different real-market hot paths.',
    ],
  };

  await mkdir(dirname(args.outputPath), { recursive: true });
  await writeFile(args.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    cutoverCohort: report.summary.cutoverCohort,
    pooledCutoverCohort: ratioDistributionForStdout(report.summary.pooledCutoverCohort),
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
