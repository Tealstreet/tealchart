import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { CompiledScript } from '../src/runtime/codegen/compile.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import type { ClosureCompiledScript } from '../src/runtime/closure/execute.ts';
import { executeClosure, tryCompileClosure } from '../src/runtime/closure/execute.ts';
import type { Bar } from '../src/runtime/context.ts';
import type { ExecutionResult, TealscriptEngineOptions } from '../src/runtime/engine.ts';
import { TealscriptEngine } from '../src/runtime/engine.ts';
import { parse } from '../src/parser/parser.ts';
import type { Program } from '../src/parser/ast.ts';
import type { ClosureCutoverGateReport } from './update-closure-cutover-gate.ts';
import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';
import {
  compareStrategyLedger,
  compareExecutionOutput,
  createSyntheticBars,
  outputCounts,
  strategyLedgerCounts,
  SyntheticExternalCorpusRequestDatafeed,
} from './run-external-pine-corpus.ts';
import type { ExternalCorpusStrategyLedgerCounts } from './run-external-pine-corpus.ts';

export const EXTERNAL_PINE_CORPUS_REALTIME_REPORT_SCHEMA_VERSION = 2;

type BackendName = 'interpreter' | 'compiled' | 'closure';
type CorpusLabel = string;
type RealtimeEventKind = 'append' | 'replace' | 'confirm-next';
type RealtimeParityStatus = 'matched' | 'mismatched' | 'failed' | 'not-run';

interface SourceReportConfig {
  corpus: CorpusLabel;
  reportPath: string;
}

type RealtimeSubset =
  | { kind: 'limit'; limitPerCorpus: number }
  | { kind: 'mismatched'; reportPath: string }
  | { kind: 'named'; scripts: string[] };

interface RealtimeEvent {
  index: number;
  kind: RealtimeEventKind;
  bar: Bar;
  isNew: boolean;
}

export interface ExternalCorpusRealtimeMismatch {
  scriptId: string;
  localPath: string;
  eventIndex: number;
  eventKind: RealtimeEventKind;
  backendPair: 'compiled/interpreter' | 'closure/interpreter' | 'closure/compiled';
  dimension: 'visual-output' | 'strategy-ledger';
  status: RealtimeParityStatus;
  diagnostic: string;
  firstDifference?: {
    path: string;
    kind: string;
  };
}

export interface ExternalCorpusRealtimeScriptRow {
  id: string;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  events: number;
  status: 'matched' | 'mismatched' | 'failed';
  output: {
    interpreter: ReturnType<typeof outputCounts>;
    compiled: ReturnType<typeof outputCounts>;
    closure: ReturnType<typeof outputCounts>;
  };
  strategyLedger?: {
    interpreter: ExternalCorpusStrategyLedgerCounts;
    compiled: ExternalCorpusStrategyLedgerCounts;
    closure: ExternalCorpusStrategyLedgerCounts;
  };
  mismatches: ExternalCorpusRealtimeMismatch[];
  strategyLedgerMismatches: ExternalCorpusRealtimeMismatch[];
  firstMismatch?: ExternalCorpusRealtimeMismatch;
  firstStrategyLedgerMismatch?: ExternalCorpusRealtimeMismatch;
}

export interface ExternalCorpusRealtimeCorpusSummary {
  corpus: CorpusLabel;
  dominatedScripts: number;
  realtimeEventsPerScript: number;
  totalBackendPairComparisons: number;
  matchedScripts: number;
  mismatchedScripts: number;
  failedScripts: number;
  matchedComparisons: number;
  mismatchedComparisons: number;
  failedComparisons: number;
  mismatchKinds: Record<string, number>;
  firstCauses: Array<{
    cause: string;
    count: number;
    representativeScript: string;
    representativeDiagnostic: string;
  }>;
  strategyLedger: {
    strategies: number;
    activeStrategies: number;
    totalBackendPairComparisons: number;
    matchedScripts: number;
    mismatchedScripts: number;
    failedScripts: number;
    matchedComparisons: number;
    mismatchedComparisons: number;
    failedComparisons: number;
    mismatchKinds: Record<string, number>;
    firstCauses: Array<{
      cause: string;
      count: number;
      representativeScript: string;
      representativeDiagnostic: string;
    }>;
  };
}

export interface ExternalCorpusRealtimeCorpusReport {
  corpus: CorpusLabel;
  sourceReport: string;
  inputDir: string;
  seedBars: number;
  realtimeTailBars: number;
  sameTimeReplacements: number;
  confirmationBars: number;
  summary: ExternalCorpusRealtimeCorpusSummary;
  rows: ExternalCorpusRealtimeScriptRow[];
}

export interface ExternalCorpusRealtimeReport {
  schemaVersion: number;
  generatedAt: string;
  sourceGateReport: string;
  scope: string;
  subset?: {
    mode: 'development-subset';
    selection: string;
    note: string;
    selectedScripts: Record<string, string[]>;
  };
  replay: {
    seedBars: number;
    realtimeTailBars: number;
    sameTimeReplacements: number;
    confirmationBars: number;
    comparison: string;
  };
  corpora: ExternalCorpusRealtimeCorpusReport[];
}

const DEFAULT_GATE_REPORT = 'reports/closure-cutover-gate.report.json';
const DEFAULT_SOURCE_REPORTS: SourceReportConfig[] = [
  { corpus: 'v1', reportPath: 'reports/external-pine-corpus-v1.report.json' },
  { corpus: 'v2', reportPath: 'reports/external-pine-corpus-v2.report.json' },
];
const DEFAULT_OUTPUT = 'reports/external-pine-corpus-realtime.report.json';
const DEFAULT_SEED_BARS = 148;
const DEFAULT_REALTIME_TAIL_BARS = 12;
const DEFAULT_REPLACEMENTS_PER_REALTIME_BAR = 2;
const DEFAULT_CONFIRMATION_BARS = 1;
const REALTIME_RUNTIME_NOW = Date.UTC(2024, 0, 1, 12, 0);
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const COMMITTED_OUTPUT = resolve(PACKAGE_ROOT, DEFAULT_OUTPUT);

export async function buildExternalCorpusRealtimeReport(options: {
  gateReportPath?: string;
  sourceReports?: SourceReportConfig[];
  subset?: RealtimeSubset;
  allowGateExceptions?: boolean;
} = {}): Promise<ExternalCorpusRealtimeReport> {
  const gateReportPath = options.gateReportPath ?? DEFAULT_GATE_REPORT;
  const sourceReports = options.sourceReports ?? DEFAULT_SOURCE_REPORTS;
  const gateReport = await readJson<ClosureCutoverGateReport>(resolveReportPath(gateReportPath));
  const corpora: ExternalCorpusRealtimeCorpusReport[] = [];
  const subsetSelection = options.subset ? await buildSubsetSelection(options.subset) : undefined;
  const selectedScripts: Record<string, string[]> = {};

  for (const source of sourceReports) {
    const report = await readJson<ExternalCorpusReport>(resolveReportPath(source.reportPath));
    const gateCorpus = gateReport.corpora.find((entry) => entry.corpus === source.corpus);
    if (!gateCorpus || (!options.allowGateExceptions && gateCorpus.dominated.exceptions.length > 0)) {
      throw new Error(`Closure cutover gate must be clean before realtime corpus replay for ${source.corpus}`);
    }
    const dominatedIds = new Set(report.rows.filter((row) => row.outcome === 'produced-output-compiled').map((row) => row.id));
    const dominatedRows = report.rows.filter((candidate) => dominatedIds.has(candidate.id));
    const selectedRows = selectRealtimeRows(source.corpus, dominatedRows, subsetSelection);
    selectedScripts[source.corpus] = selectedRows.map((row) => row.localPath);
    const rows: ExternalCorpusRealtimeScriptRow[] = [];
    for (const [index, row] of selectedRows.entries()) {
      if (process.env.TEALSCRIPT_CORPUS_REALTIME_PROGRESS === '1') {
        process.stderr.write(`[${source.corpus}] ${index + 1}/${selectedRows.length} ${row.localPath}\n`);
      }
      rows.push(await runRealtimeScriptRow(report.inputDir, row));
    }
    corpora.push({
      corpus: source.corpus,
      sourceReport: source.reportPath,
      inputDir: report.inputDir,
      seedBars: DEFAULT_SEED_BARS,
      realtimeTailBars: DEFAULT_REALTIME_TAIL_BARS,
      sameTimeReplacements: DEFAULT_REALTIME_TAIL_BARS * DEFAULT_REPLACEMENTS_PER_REALTIME_BAR,
      confirmationBars: DEFAULT_CONFIRMATION_BARS,
      summary: summarizeRealtimeCorpus(source.corpus, rows),
      rows,
    });
  }

  if (subsetSelection && selectedScripts.v1.length + selectedScripts.v2.length === 0) {
    throw new Error(`Realtime subset selected no scripts: ${subsetSelection.selection}`);
  }

  return {
    schemaVersion: EXTERNAL_PINE_CORPUS_REALTIME_REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceGateReport: gateReportPath,
    scope:
      subsetSelection === undefined
        ? 'All scripts from each closure cutover dominated set: compiled produced visible historical output and closure matches compiled.'
        : `DEVELOPMENT SUBSET (${subsetSelection.selection}): not a denominator for claims and must not overwrite the committed realtime corpus report.`,
    subset: subsetSelection
      ? {
        mode: 'development-subset',
        selection: subsetSelection.selection,
        note: 'Subset runs are for inner-loop diagnosis only. Run the full realtime corpus and commit that report before making coverage or cutover claims.',
        selectedScripts,
      }
      : undefined,
    replay: {
      seedBars: DEFAULT_SEED_BARS,
      realtimeTailBars: DEFAULT_REALTIME_TAIL_BARS,
      sameTimeReplacements: DEFAULT_REALTIME_TAIL_BARS * DEFAULT_REPLACEMENTS_PER_REALTIME_BAR,
      confirmationBars: DEFAULT_CONFIRMATION_BARS,
      comparison:
        'After a historical seed, each backend receives realtime append updates, two same-time replacements on every realtime tail bar, and one confirming next bar; interpreter, compiled, and closure outputs are compared pairwise with the historical corpus comparator.',
    },
    corpora,
  };
}

async function runRealtimeScriptRow(
  inputDir: string,
  row: ExternalCorpusReportRow,
): Promise<ExternalCorpusRealtimeScriptRow> {
  const source = await readFile(resolve(inputDir, row.localPath), 'utf8');
  const ast = parse(source, { grammarSource: row.sourceFilePath ?? row.localPath });
  const compiled = tryCompile(ast);
  const closure = tryCompileClosure(ast);
  const bars = createSyntheticBars(DEFAULT_SEED_BARS + DEFAULT_REALTIME_TAIL_BARS + DEFAULT_CONFIRMATION_BARS);
  const requestDatafeed = new SyntheticExternalCorpusRequestDatafeed(bars);
  const options: TealscriptEngineOptions = { requestDatafeed, runtime: { now: REALTIME_RUNTIME_NOW } };
  const events = createRealtimeEvents(bars);
  const mismatches: ExternalCorpusRealtimeMismatch[] = [];
  const strategyLedgerMismatches: ExternalCorpusRealtimeMismatch[] = [];

  if (!compiled.success || !closure.success) {
    return {
      id: row.id,
      localPath: row.localPath,
      sourceRepoUrl: row.sourceRepoUrl,
      sourceFilePath: row.sourceFilePath,
      commitSha: row.commitSha,
      events: events.length,
      status: 'failed',
      output: {
        interpreter: outputCounts(null),
        compiled: outputCounts(null),
        closure: outputCounts(null),
      },
      strategyLedger: undefined,
      mismatches: [{
        scriptId: row.id,
        localPath: row.localPath,
        eventIndex: 0,
        eventKind: 'append',
        backendPair: 'closure/compiled',
        dimension: 'visual-output',
        status: 'failed',
        diagnostic: !compiled.success
          ? `compiled unsupported during realtime replay: ${compiled.unsupported.join('; ')}`
          : `closure unsupported during realtime replay: ${closure.unsupported.join('; ')}`,
      }],
      strategyLedgerMismatches: [],
      firstMismatch: {
        scriptId: row.id,
        localPath: row.localPath,
        eventIndex: 0,
        eventKind: 'append',
        backendPair: 'closure/compiled',
        dimension: 'visual-output',
        status: 'failed',
        diagnostic: !compiled.success
          ? `compiled unsupported during realtime replay: ${compiled.unsupported.join('; ')}`
          : `closure unsupported during realtime replay: ${closure.unsupported.join('; ')}`,
      },
    };
  }

  const interpreter = new TealscriptEngine(options);
  const seedBars = bars.slice(0, DEFAULT_SEED_BARS);
  interpreter.execute(ast, seedBars);
  let activeBars = seedBars.map((bar) => ({ ...bar }));
  let previousRealtimeTime: number | undefined;
  let latestInterpreter = interpreter.getCurrentExecutionResult();
  let latestCompiled: ExecutionResult | null = null;
  let latestClosure: ExecutionResult | null = null;
  let confirmedRealtimeBarStartIndex: number | undefined;

  for (const event of events) {
    const confirmedRealtimeBarIndex = event.kind !== 'replace' && previousRealtimeTime === activeBars.at(-1)?.time
      ? activeBars.length - 1
      : undefined;
    if (confirmedRealtimeBarStartIndex === undefined) {
      confirmedRealtimeBarStartIndex = activeBars.length;
    }
    activeBars = event.kind === 'replace'
      ? [...activeBars.slice(0, -1), { ...event.bar }]
      : [...activeBars, { ...event.bar }];
    previousRealtimeTime = event.bar.time;

    try {
      interpreter.updateBar(ast, { ...event.bar });
      latestInterpreter = interpreter.getCurrentExecutionResult();
    } catch (error) {
      mismatches.push(failedMismatch(row, event, 'compiled/interpreter', `interpreter threw: ${formatUnknown(error)}`));
      break;
    }

    latestCompiled = runCompiledRealtime(compiled, activeBars, options, event, confirmedRealtimeBarIndex, confirmedRealtimeBarStartIndex);
    latestClosure = runClosureRealtime(closure, activeBars, options, event, confirmedRealtimeBarIndex, confirmedRealtimeBarStartIndex);
    if (!latestCompiled) {
      mismatches.push(failedMismatch(row, event, 'compiled/interpreter', 'compiled returned no result'));
      break;
    }

    collectPairMismatch(row, event, latestCompiled, latestInterpreter, 'compiled/interpreter', mismatches);
    collectPairMismatch(row, event, latestClosure, latestInterpreter, 'closure/interpreter', mismatches);
    collectPairMismatch(row, event, latestClosure, latestCompiled, 'closure/compiled', mismatches);
    collectStrategyLedgerPairMismatch(row, event, latestCompiled, latestInterpreter, 'compiled/interpreter', strategyLedgerMismatches);
    collectStrategyLedgerPairMismatch(row, event, latestClosure, latestInterpreter, 'closure/interpreter', strategyLedgerMismatches);
    collectStrategyLedgerPairMismatch(row, event, latestClosure, latestCompiled, 'closure/compiled', strategyLedgerMismatches);
  }

  return {
    id: row.id,
    localPath: row.localPath,
    sourceRepoUrl: row.sourceRepoUrl,
    sourceFilePath: row.sourceFilePath,
    commitSha: row.commitSha,
    events: events.length,
    status: mismatches.some((mismatch) => mismatch.status === 'failed')
      ? 'failed'
      : mismatches.length > 0
        ? 'mismatched'
        : 'matched',
    output: {
      interpreter: outputCounts(latestInterpreter),
      compiled: outputCounts(latestCompiled),
      closure: outputCounts(latestClosure),
    },
    strategyLedger: row.declarationKind === 'strategy' && latestCompiled && latestClosure
      ? {
          interpreter: strategyLedgerCounts(latestInterpreter.strategy),
          compiled: strategyLedgerCounts(latestCompiled.strategy),
          closure: strategyLedgerCounts(latestClosure.strategy),
        }
      : undefined,
    mismatches,
    strategyLedgerMismatches,
    firstMismatch: mismatches[0],
    firstStrategyLedgerMismatch: strategyLedgerMismatches[0],
  };
}

function runCompiledRealtime(
  compiled: CompiledScript,
  bars: Bar[],
  options: TealscriptEngineOptions,
  event: RealtimeEvent,
  confirmedRealtimeBarIndex: number | undefined,
  confirmedRealtimeBarStartIndex: number | undefined,
): ExecutionResult | null {
  return executeCompiled(compiled, bars, undefined, {
    ...options,
    realtimeLastBar: { isNew: event.isNew },
    confirmedRealtimeBarIndex,
    confirmedRealtimeBarStartIndex,
    libraries: options.libraries,
    runtime: options.runtime,
  });
}

function runClosureRealtime(
  closure: ClosureCompiledScript,
  bars: Bar[],
  options: TealscriptEngineOptions,
  event: RealtimeEvent,
  confirmedRealtimeBarIndex: number | undefined,
  confirmedRealtimeBarStartIndex: number | undefined,
): ExecutionResult {
  return executeClosure(closure, bars, undefined, {
    ...options,
    realtimeLastBar: { isNew: event.isNew },
    confirmedRealtimeBarIndex,
    confirmedRealtimeBarStartIndex,
    runtime: options.runtime,
  });
}

function createRealtimeEvents(bars: Bar[]): RealtimeEvent[] {
  const events: RealtimeEvent[] = [];
  const realtimeEnd = DEFAULT_SEED_BARS + DEFAULT_REALTIME_TAIL_BARS;
  for (let index = DEFAULT_SEED_BARS; index < realtimeEnd; index += 1) {
    const bar = bars[index]!;
    events.push({ index: events.length, kind: 'append', bar, isNew: true });
    events.push({
      index: events.length,
      kind: 'replace',
      isNew: false,
      bar: {
        ...bar,
        high: Math.max(bar.high, bar.close + 2.25),
        close: bar.close + 1.75,
        volume: bar.volume + 250,
      },
    });
    events.push({
      index: events.length,
      kind: 'replace',
      isNew: false,
      bar: {
        ...bar,
        low: Math.min(bar.low, bar.close - 2.5),
        close: bar.close - 1.25,
        volume: bar.volume + 500,
      },
    });
  }
  events.push({ index: events.length, kind: 'confirm-next', bar: bars[realtimeEnd]!, isNew: true });
  return events;
}

function collectPairMismatch(
  row: ExternalCorpusReportRow,
  event: RealtimeEvent,
  actual: ExecutionResult,
  expected: ExecutionResult,
  backendPair: ExternalCorpusRealtimeMismatch['backendPair'],
  mismatches: ExternalCorpusRealtimeMismatch[],
): void {
  const comparison = compareExecutionOutput(actual, expected, backendPair.split('/')[0]!, backendPair.split('/')[1]!);
  if (comparison.status !== 'mismatched') return;
  mismatches.push({
    scriptId: row.id,
    localPath: row.localPath,
    eventIndex: event.index,
    eventKind: event.kind,
    backendPair,
    dimension: 'visual-output',
    status: 'mismatched',
    diagnostic: comparison.diagnostic ?? 'output mismatch',
    firstDifference: comparison.firstDifference,
  });
}

function collectStrategyLedgerPairMismatch(
  row: ExternalCorpusReportRow,
  event: RealtimeEvent,
  actual: ExecutionResult,
  expected: ExecutionResult,
  backendPair: ExternalCorpusRealtimeMismatch['backendPair'],
  mismatches: ExternalCorpusRealtimeMismatch[],
): void {
  if (row.declarationKind !== 'strategy') return;
  const comparison = compareStrategyLedger(actual, expected, backendPair.split('/')[0]!, backendPair.split('/')[1]!);
  if (comparison.status !== 'mismatched') return;
  mismatches.push({
    scriptId: row.id,
    localPath: row.localPath,
    eventIndex: event.index,
    eventKind: event.kind,
    backendPair,
    dimension: 'strategy-ledger',
    status: 'mismatched',
    diagnostic: comparison.diagnostic ?? 'strategy ledger mismatch',
    firstDifference: comparison.firstDifference,
  });
}

function failedMismatch(
  row: ExternalCorpusReportRow,
  event: RealtimeEvent,
  backendPair: ExternalCorpusRealtimeMismatch['backendPair'],
  diagnostic: string,
): ExternalCorpusRealtimeMismatch {
  return {
    scriptId: row.id,
    localPath: row.localPath,
    eventIndex: event.index,
    eventKind: event.kind,
    backendPair,
    dimension: 'visual-output',
    status: 'failed',
    diagnostic,
  };
}

function summarizeRealtimeCorpus(
  corpus: CorpusLabel,
  rows: ExternalCorpusRealtimeScriptRow[],
): ExternalCorpusRealtimeCorpusSummary {
  const mismatches = rows.flatMap((row) => row.mismatches);

  const events = rows[0]?.events ?? 0;
  const totalPairComparisons = rows.length * events * 3;
  const failedComparisons = mismatches.filter((mismatch) => mismatch.status === 'failed').length;
  const mismatchedComparisons = mismatches.filter((mismatch) => mismatch.status === 'mismatched').length;
  return {
    corpus,
    dominatedScripts: rows.length,
    realtimeEventsPerScript: events,
    totalBackendPairComparisons: totalPairComparisons,
    matchedScripts: rows.filter((row) => row.status === 'matched').length,
    mismatchedScripts: rows.filter((row) => row.status === 'mismatched').length,
    failedScripts: rows.filter((row) => row.status === 'failed').length,
    matchedComparisons: totalPairComparisons - mismatchedComparisons - failedComparisons,
    mismatchedComparisons,
    failedComparisons,
    mismatchKinds: countBy(mismatches, (mismatch) => mismatch.firstDifference?.kind ?? mismatch.status),
    firstCauses: summarizeRealtimeCauses(mismatches),
    strategyLedger: summarizeRealtimeStrategyLedger(rows, events),
  };
}

function summarizeRealtimeStrategyLedger(
  rows: ExternalCorpusRealtimeScriptRow[],
  events: number,
): ExternalCorpusRealtimeCorpusSummary['strategyLedger'] {
  const strategyRows = rows.filter((row) => row.strategyLedger !== undefined);
  const mismatches = strategyRows.flatMap((row) => row.strategyLedgerMismatches);
  const totalPairComparisons = strategyRows.length * events * 3;
  const failedComparisons = mismatches.filter((mismatch) => mismatch.status === 'failed').length;
  const mismatchedComparisons = mismatches.filter((mismatch) => mismatch.status === 'mismatched').length;
  return {
    strategies: strategyRows.length,
    activeStrategies: strategyRows.filter((row) => (
      row.strategyLedger?.interpreter.active
      || row.strategyLedger?.compiled.active
      || row.strategyLedger?.closure.active
    )).length,
    totalBackendPairComparisons: totalPairComparisons,
    matchedScripts: strategyRows.filter((row) => row.strategyLedgerMismatches.length === 0).length,
    mismatchedScripts: strategyRows.filter((row) => row.strategyLedgerMismatches.some((mismatch) => mismatch.status === 'mismatched')).length,
    failedScripts: strategyRows.filter((row) => row.strategyLedgerMismatches.some((mismatch) => mismatch.status === 'failed')).length,
    matchedComparisons: totalPairComparisons - mismatchedComparisons - failedComparisons,
    mismatchedComparisons,
    failedComparisons,
    mismatchKinds: countBy(mismatches, (mismatch) => mismatch.firstDifference?.kind ?? mismatch.status),
    firstCauses: summarizeRealtimeCauses(mismatches),
  };
}

function summarizeRealtimeCauses(mismatches: ExternalCorpusRealtimeMismatch[]): ExternalCorpusRealtimeCorpusSummary['firstCauses'] {
  const firstCauses = new Map<string, {
    cause: string;
    count: number;
    representativeScript: string;
    representativeDiagnostic: string;
  }>();
  for (const mismatch of mismatches) {
    const cause = mismatch.firstDifference?.kind ?? mismatch.status;
    const existing = firstCauses.get(cause);
    if (existing) {
      existing.count += 1;
    } else {
      firstCauses.set(cause, {
        cause,
        count: 1,
        representativeScript: mismatch.localPath,
        representativeDiagnostic: mismatch.diagnostic,
      });
    }
  }
  return [...firstCauses.values()].sort((left, right) => right.count - left.count || left.cause.localeCompare(right.cause));
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const name = key(value);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function formatUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

interface BuiltSubsetSelection {
  kind: RealtimeSubset['kind'];
  selection: string;
  namedScripts?: Set<string>;
  mismatchedIds?: Record<string, Set<string>>;
  limitPerCorpus?: number;
}

async function buildSubsetSelection(subset: RealtimeSubset): Promise<BuiltSubsetSelection> {
  if (subset.kind === 'limit') {
    return {
      kind: 'limit',
      limitPerCorpus: subset.limitPerCorpus,
      selection: `first ${subset.limitPerCorpus} script(s) per corpus`,
    };
  }
  if (subset.kind === 'named') {
    return {
      kind: 'named',
      namedScripts: new Set(subset.scripts),
      selection: `named scripts: ${subset.scripts.join(', ')}`,
    };
  }

  const current = await readJson<ExternalCorpusRealtimeReport>(resolveReportPath(subset.reportPath));
  const mismatchedIds: Record<string, Set<string>> = {};
  for (const corpus of current.corpora) {
    mismatchedIds[corpus.corpus] = new Set(corpus.rows.filter((row) => row.status === 'mismatched').map((row) => row.id));
  }
  return {
    kind: 'mismatched',
    mismatchedIds,
    selection: `mismatched scripts from ${subset.reportPath}`,
  };
}

function selectRealtimeRows(
  corpus: CorpusLabel,
  rows: ExternalCorpusReportRow[],
  subset: BuiltSubsetSelection | undefined,
): ExternalCorpusReportRow[] {
  if (!subset) return rows;
  if (subset.kind === 'limit') return rows.slice(0, subset.limitPerCorpus);
  if (subset.kind === 'mismatched') {
    const ids = subset.mismatchedIds?.[corpus] ?? new Set<string>();
    return rows.filter((row) => ids.has(row.id));
  }
  const scripts = subset.namedScripts ?? new Set<string>();
  return rows.filter((row) => (
    scripts.has(row.id) ||
    scripts.has(row.localPath) ||
    (row.sourceFilePath !== undefined && scripts.has(row.sourceFilePath))
  ));
}

export function parseExternalCorpusRealtimeArgs(argv: string[]): {
  check: boolean;
  output: string;
  subset?: RealtimeSubset;
  sourceReports: SourceReportConfig[];
  gateReportPath: string;
  allowGateExceptions: boolean;
} {
  const check = argv.includes('--check');
  const all = argv.includes('--all');
  const allowGateExceptions = argv.includes('--allow-gate-exceptions');
  const outputIndex = argv.indexOf('--output');
  const output = outputIndex === -1 ? DEFAULT_OUTPUT : argv[outputIndex + 1];
  if (!output) throw new Error('--output requires a path');
  const gateReportIndex = argv.indexOf('--gate-report');
  const gateReportPath = gateReportIndex === -1 ? DEFAULT_GATE_REPORT : argv[gateReportIndex + 1];
  if (!gateReportPath) throw new Error('--gate-report requires a path');
  const reportsIndex = argv.indexOf('--reports');
  const reports = reportsIndex === -1
    ? undefined
    : valuesAfterArg(argv, reportsIndex);
  const sourceReports = reports ? parseSourceReports(reports) : DEFAULT_SOURCE_REPORTS;
  const limitIndex = argv.indexOf('--limit-per-corpus');
  const limitPerCorpus = all
    ? undefined
    : limitIndex === -1
      ? undefined
      : Number(argv[limitIndex + 1]);
  if (limitPerCorpus !== undefined && (!Number.isInteger(limitPerCorpus) || limitPerCorpus < 1)) {
    throw new Error('--limit-per-corpus requires a positive integer');
  }
  const mismatchedOnly = argv.includes('--mismatched-only');
  const onlyScripts = valuesForRepeatedArg(argv, '--only-script');
  const subsetModes = [
    limitPerCorpus !== undefined,
    mismatchedOnly,
    onlyScripts.length > 0,
  ].filter(Boolean).length;
  if (subsetModes > 1) {
    throw new Error('Use only one realtime subset selector: --limit-per-corpus, --mismatched-only, or --only-script');
  }
  let subset: RealtimeSubset | undefined;
  if (limitPerCorpus !== undefined) {
    subset = { kind: 'limit', limitPerCorpus };
  } else if (mismatchedOnly) {
    subset = { kind: 'mismatched', reportPath: DEFAULT_OUTPUT };
  } else if (onlyScripts.length > 0) {
    subset = { kind: 'named', scripts: onlyScripts };
  }
  return { check, output, subset, sourceReports, gateReportPath, allowGateExceptions };
}

function valuesAfterArg(argv: string[], index: number): string[] {
  const values: string[] = [];
  for (let cursor = index + 1; cursor < argv.length; cursor += 1) {
    const value = argv[cursor]!;
    if (value.startsWith('--')) break;
    values.push(value);
  }
  return values;
}

function parseSourceReports(values: string[]): SourceReportConfig[] {
  const reports: SourceReportConfig[] = [];
  for (const value of values) {
    const separator = value.indexOf(':');
    if (separator === -1) {
      reports.push({ corpus: reports.length === 0 ? 'v1' : `corpus-${reports.length + 1}`, reportPath: value });
      continue;
    }
    const corpus = value.slice(0, separator);
    const reportPath = value.slice(separator + 1);
    if (!corpus || !reportPath) throw new Error(`Invalid --reports entry: ${value}`);
    reports.push({ corpus, reportPath });
  }
  if (reports.length < 1) throw new Error('--reports expects at least one source report');
  return reports;
}

function valuesForRepeatedArg(argv: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== flag) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    values.push(value);
    index += 1;
  }
  return values;
}

export function assertRealtimeSubsetOutputSafe(args: { output: string; subset?: RealtimeSubset; check?: boolean }): void {
  if (!args.subset) return;
  if (args.check) {
    throw new Error('Realtime subset runs are development-only and cannot be used with --check');
  }
  const output = resolveReportPath(args.output);
  if (output === COMMITTED_OUTPUT || output === resolveReportPath(DEFAULT_OUTPUT)) {
    throw new Error(
      'Realtime subset runs must pass --output to a scratch path outside the committed report; run the full corpus to update reports/external-pine-corpus-realtime.report.json.',
    );
  }
}

function resolveReportPath(path: string): string {
  const resolved = path.startsWith('packages/')
    ? resolve(REPO_ROOT, path)
    : resolve(PACKAGE_ROOT, path);
  const nestedPackagePath = resolve(PACKAGE_ROOT, 'packages');
  if (resolved === nestedPackagePath || resolved.startsWith(`${nestedPackagePath}/`)) {
    throw new Error(
      `Refusing to write realtime corpus report under ${relative(REPO_ROOT, nestedPackagePath)}; ` +
      'when using yarn workspace, pass reports/... or a repo-relative packages/tealscript/reports/... path.',
    );
  }
  return resolved;
}

async function main(): Promise<void> {
  const { check, output, subset, sourceReports, gateReportPath, allowGateExceptions } = parseExternalCorpusRealtimeArgs(process.argv.slice(2));
  assertRealtimeSubsetOutputSafe({ check, output, subset });
  const outputPath = resolveReportPath(output);
  const report = await buildExternalCorpusRealtimeReport({ subset, sourceReports, gateReportPath, allowGateExceptions });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (check) {
    const current = JSON.parse(await readFile(outputPath, 'utf8')) as ExternalCorpusRealtimeReport;
    const comparableCurrent = { ...current, generatedAt: report.generatedAt };
    if (`${JSON.stringify(comparableCurrent, null, 2)}\n` !== serialized) {
      process.stderr.write(
        `External realtime corpus report is stale. Run yarn workspace @tealstreet/tealscript pine:external-corpus:realtime.\n`,
      );
      process.exitCode = 1;
    }
    return;
  }

  await writeFile(outputPath, serialized, 'utf8');
  process.stdout.write(`${JSON.stringify(report.corpora.map((corpus) => corpus.summary), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
