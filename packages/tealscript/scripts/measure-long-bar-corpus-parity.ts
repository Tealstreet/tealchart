import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Bar } from '../src/runtime/context.ts';
import {
  type ExternalCorpusReport,
  type ExternalCorpusReportRow,
  runExternalPineCorpus,
} from './run-external-pine-corpus.ts';

export const LONG_BAR_CORPUS_PARITY_SCHEMA_VERSION = 2;

interface SourceReportSpec {
  corpus: string;
  path: string;
}

interface LongBarCorpusParityReport {
  schemaVersion: number;
  generatedAt: string;
  sourceReports: string[];
  barCounts: number[];
  selection: {
    kind: 'full-dominated-set' | 'deterministic-dominated-subset';
    maxPerCorpus?: number;
    note: string;
  };
  generator: {
    name: string;
    note: string;
  };
  corpora: LongBarCorpusParityCorpus[];
}

interface LongBarCorpusParityCorpus {
  corpus: string;
  inputDir: string;
  sourceReport: string;
  dominatedScripts: number;
  measuredScripts: number;
  runs: LongBarCorpusParityRun[];
}

interface LongBarCorpusParityRun {
  barCount: number;
  bars: {
    count: number;
    firstTime: number;
    lastTime: number;
    minLow: number;
    maxHigh: number;
    minClose: number;
    maxClose: number;
  };
  summary: {
    scripts: number;
    visualAllThreeMatched: number;
    visualMismatched: number;
    visualFailedOrNoOutput: number;
    strategyRows: number;
    strategyLedgerAllThreeMatched: number;
    strategyLedgerMismatched: number;
    strategyLedgerNotRun: number;
    swallowedErrors: ExternalCorpusReport['summary']['swallowedErrors'];
    compiledBarErrors: ExternalCorpusReport['summary']['compiledBarErrors'];
    outputParityDifferenceKinds: Record<string, number>;
    strategyLedgerDifferenceKinds: Record<string, number>;
    exceptionDifferenceKinds: Record<string, number>;
    exceptionDimensions: Record<string, number>;
    exceptionBackendPairs: Record<string, number>;
  };
  exceptions: LongBarCorpusParityException[];
}

interface LongBarCorpusParityException {
  id: string;
  localPath: string;
  outcome: ExternalCorpusReportRow['outcome'];
  declarationKind: ExternalCorpusReportRow['declarationKind'];
  visualStatus: 'matched' | 'mismatched' | 'failed-or-no-output';
  strategyLedgerStatus: 'matched' | 'mismatched' | 'not-run';
  firstDifference?: {
    dimension: 'visual-output' | 'strategy-ledger';
    backendPair: 'compiled/interpreter' | 'closure/interpreter' | 'closure/compiled';
    path: string;
    kind: string;
  };
  firstVisualDifference?: ExternalCorpusReportRow['outputParity']['firstDifference'];
  firstStrategyLedgerDifference?: ExternalCorpusReportRow['strategyLedgerParity']['compiledAgainstInterpreter']['firstDifference'];
  compiledOutput: ExternalCorpusReportRow['output'];
  closureOutput: ExternalCorpusReportRow['closure']['output'];
}

const DEFAULT_SOURCE_REPORTS: SourceReportSpec[] = [
  { corpus: 'v1', path: 'reports/external-pine-corpus-v1.report.json' },
  { corpus: 'v2', path: 'reports/external-pine-corpus-v2.report.json' },
];
const DEFAULT_BAR_COUNTS = [1_000, 5_000, 20_000];
const DEFAULT_OUTPUT = 'reports/external-pine-long-bars.report.json';
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const corpora: LongBarCorpusParityCorpus[] = [];

  for (const source of options.sourceReports) {
    const sourceReport = await readJson<ExternalCorpusReport>(resolveReportPath(source.path));
    const dominated = sourceReport.rows.filter((row) => row.outcome === 'produced-output-compiled');
    const selected = selectDominatedRows(dominated, options.maxPerCorpus);
    const localPaths = new Set(selected.map((row) => row.localPath));
    const runs: LongBarCorpusParityRun[] = [];

    for (const barCount of options.barCounts) {
      const bars = createPlausibleLongBars(barCount);
      process.stdout.write(
        `[${source.corpus}] ${barCount} bars over ${localPaths.size}/${dominated.length} dominated scripts\n`,
      );
      const report = await runExternalPineCorpus({
        inputDir: sourceReport.inputDir,
        bars,
        localPaths,
      });
      runs.push(summarizeRun(barCount, bars, report.rows, report));
    }

    corpora.push({
      corpus: source.corpus,
      inputDir: sourceReport.inputDir,
      sourceReport: source.path,
      dominatedScripts: dominated.length,
      measuredScripts: localPaths.size,
      runs,
    });
  }

  const report: LongBarCorpusParityReport = {
    schemaVersion: LONG_BAR_CORPUS_PARITY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sourceReports: options.sourceReports.map((source) => `${source.corpus}:${source.path}`),
    barCounts: options.barCounts,
    selection: options.maxPerCorpus
      ? {
          kind: 'deterministic-dominated-subset',
          maxPerCorpus: options.maxPerCorpus,
          note: 'All dominated strategy rows are retained first, then the remaining dominated rows are sampled evenly by corpus order. Use no --max-per-corpus for the full dominated set.',
        }
      : {
          kind: 'full-dominated-set',
          note: 'Every row whose current source report outcome is produced-output-compiled is re-run at each bar count.',
        },
    generator: {
      name: 'plausible-long-bars-v1',
      note: 'Deterministic bounded OHLC series with slow trend, cyclical regimes, sane high/low envelopes, and positive volume. Used for long-bar correctness so 20k bars do not inherit the original 160-bar generator linear price drift.',
    },
    corpora,
  };

  const outputPath = resolveReportPath(options.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(summarizeReport(report), null, 2)}\n`);
}

function selectDominatedRows(rows: ExternalCorpusReportRow[], maxPerCorpus: number | undefined): ExternalCorpusReportRow[] {
  if (!maxPerCorpus || rows.length <= maxPerCorpus) return rows;
  const selected = new Map<string, ExternalCorpusReportRow>();
  for (const row of rows.filter((entry) => entry.declarationKind === 'strategy')) {
    selected.set(row.localPath, row);
  }
  const remainingSlots = Math.max(0, maxPerCorpus - selected.size);
  const nonStrategies = rows.filter((entry) => entry.declarationKind !== 'strategy');
  for (const row of evenlySpacedSample(nonStrategies, remainingSlots)) {
    selected.set(row.localPath, row);
  }
  return rows.filter((row) => selected.has(row.localPath));
}

function evenlySpacedSample<T>(values: T[], count: number): T[] {
  if (count <= 0) return [];
  if (values.length <= count) return values;
  if (count === 1) return [values[0]!];
  const selected: T[] = [];
  const lastIndex = values.length - 1;
  for (let index = 0; index < count; index += 1) {
    selected.push(values[Math.round((index * lastIndex) / (count - 1))]!);
  }
  return selected;
}

function summarizeRun(
  barCount: number,
  bars: Bar[],
  rows: ExternalCorpusReportRow[],
  report: ExternalCorpusReport,
): LongBarCorpusParityRun {
  const exceptions = rows.map(rowException).filter((entry): entry is LongBarCorpusParityException => Boolean(entry));
  const strategyRows = rows.filter((row) => row.declarationKind === 'strategy');
  const strategyLedgerStatuses = strategyRows.map(strategyLedgerStatus);
  return {
    barCount,
    bars: summarizeBars(bars),
    summary: {
      scripts: rows.length,
      visualAllThreeMatched: rows.filter((row) => visualStatus(row) === 'matched').length,
      visualMismatched: rows.filter((row) => visualStatus(row) === 'mismatched').length,
      visualFailedOrNoOutput: rows.filter((row) => visualStatus(row) === 'failed-or-no-output').length,
      strategyRows: strategyRows.length,
      strategyLedgerAllThreeMatched: strategyLedgerStatuses.filter((status) => status === 'matched').length,
      strategyLedgerMismatched: strategyLedgerStatuses.filter((status) => status === 'mismatched').length,
      strategyLedgerNotRun: strategyLedgerStatuses.filter((status) => status === 'not-run').length,
      swallowedErrors: report.summary.swallowedErrors,
      compiledBarErrors: report.summary.compiledBarErrors,
      outputParityDifferenceKinds: report.summary.outputParityDifferenceKinds,
      strategyLedgerDifferenceKinds: report.summary.strategyLedgerParity.differenceKinds,
      exceptionDifferenceKinds: countBy(exceptions, (entry) => entry.firstDifference?.kind ?? 'unclassified'),
      exceptionDimensions: countBy(exceptions, (entry) => entry.firstDifference?.dimension ?? 'unclassified'),
      exceptionBackendPairs: countBy(exceptions, (entry) => entry.firstDifference?.backendPair ?? 'unclassified'),
    },
    exceptions,
  };
}

function rowException(row: ExternalCorpusReportRow): LongBarCorpusParityException | null {
  const visual = visualStatus(row);
  const ledger = strategyLedgerStatus(row);
  if (visual === 'matched' && ledger !== 'mismatched') return null;
  const firstDifference = firstLongBarDifference(row);
  return {
    id: row.id,
    localPath: row.localPath,
    outcome: row.outcome,
    declarationKind: row.declarationKind,
    visualStatus: visual,
    strategyLedgerStatus: ledger,
    firstDifference,
    firstVisualDifference:
      row.outputParity.firstDifference
      ?? row.closure.parityAgainstInterpreter.firstDifference
      ?? row.closure.parityAgainstCompiled.firstDifference,
    firstStrategyLedgerDifference:
      row.strategyLedgerParity.compiledAgainstInterpreter.firstDifference
      ?? row.strategyLedgerParity.closureAgainstInterpreter.firstDifference
      ?? row.strategyLedgerParity.closureAgainstCompiled.firstDifference,
    compiledOutput: row.output,
    closureOutput: row.closure.output,
  };
}

function firstLongBarDifference(row: ExternalCorpusReportRow): LongBarCorpusParityException['firstDifference'] {
  const candidates = [
    {
      dimension: 'visual-output' as const,
      backendPair: 'compiled/interpreter' as const,
      analysis: row.outputParity,
    },
    {
      dimension: 'visual-output' as const,
      backendPair: 'closure/interpreter' as const,
      analysis: row.closure.parityAgainstInterpreter,
    },
    {
      dimension: 'visual-output' as const,
      backendPair: 'closure/compiled' as const,
      analysis: row.closure.parityAgainstCompiled,
    },
    {
      dimension: 'strategy-ledger' as const,
      backendPair: 'compiled/interpreter' as const,
      analysis: row.strategyLedgerParity.compiledAgainstInterpreter,
    },
    {
      dimension: 'strategy-ledger' as const,
      backendPair: 'closure/interpreter' as const,
      analysis: row.strategyLedgerParity.closureAgainstInterpreter,
    },
    {
      dimension: 'strategy-ledger' as const,
      backendPair: 'closure/compiled' as const,
      analysis: row.strategyLedgerParity.closureAgainstCompiled,
    },
  ];
  const first = candidates.find((candidate) => candidate.analysis.status === 'mismatched' && candidate.analysis.firstDifference);
  if (!first?.analysis.firstDifference) return undefined;
  return {
    dimension: first.dimension,
    backendPair: first.backendPair,
    path: first.analysis.firstDifference.path,
    kind: first.analysis.firstDifference.kind,
  };
}

function visualStatus(row: ExternalCorpusReportRow): LongBarCorpusParityException['visualStatus'] {
  if (!row.output.produced || !row.closure.output.produced) return 'failed-or-no-output';
  if (
    row.outputParity.status === 'matched'
    && row.closure.parityAgainstInterpreter.status === 'matched'
    && row.closure.parityAgainstCompiled.status === 'matched'
  ) {
    return 'matched';
  }
  return 'mismatched';
}

function strategyLedgerStatus(row: ExternalCorpusReportRow): LongBarCorpusParityException['strategyLedgerStatus'] {
  if (row.declarationKind !== 'strategy') return 'not-run';
  const parity = row.strategyLedgerParity;
  if (
    parity.compiledAgainstInterpreter.status === 'matched'
    && parity.closureAgainstInterpreter.status === 'matched'
    && parity.closureAgainstCompiled.status === 'matched'
  ) {
    return 'matched';
  }
  if (
    parity.compiledAgainstInterpreter.status === 'mismatched'
    || parity.closureAgainstInterpreter.status === 'mismatched'
    || parity.closureAgainstCompiled.status === 'mismatched'
  ) {
    return 'mismatched';
  }
  return 'not-run';
}

function summarizeBars(bars: Bar[]): LongBarCorpusParityRun['bars'] {
  return {
    count: bars.length,
    firstTime: bars[0]?.time ?? 0,
    lastTime: bars.at(-1)?.time ?? 0,
    minLow: round(Math.min(...bars.map((bar) => bar.low))),
    maxHigh: round(Math.max(...bars.map((bar) => bar.high))),
    minClose: round(Math.min(...bars.map((bar) => bar.close))),
    maxClose: round(Math.max(...bars.map((bar) => bar.close))),
  };
}

export function createPlausibleLongBars(count: number): Bar[] {
  const start = Date.UTC(2024, 0, 1);
  const bars: Bar[] = [];
  let close = 100;
  for (let index = 0; index < count; index += 1) {
    const regime = Math.sin(index / 233) * 0.035 + Math.sin(index / 1_597) * 0.05;
    const impulse = Math.sin(index / 17) * 0.28 + Math.cos(index / 43) * 0.16;
    const drift = (105 - close) * 0.0015 + regime;
    const nextClose = Math.max(15, close + drift + impulse);
    const open = close;
    const spread = 0.45 + Math.abs(Math.sin(index / 29)) * 0.75 + (index % 11) * 0.015;
    const high = Math.max(open, nextClose) + spread;
    const low = Math.max(0.01, Math.min(open, nextClose) - spread * 0.9);
    bars.push({
      time: start + index * 60_000,
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(nextClose),
      volume: round(1_000 + 220 * Math.sin(index / 31) + 90 * Math.cos(index / 13) + (index % 97) * 3),
    });
    close = nextClose;
  }
  return bars;
}

function summarizeReport(report: LongBarCorpusParityReport): unknown {
  return {
    barCounts: report.barCounts,
    corpora: report.corpora.map((corpus) => ({
      corpus: corpus.corpus,
      dominatedScripts: corpus.dominatedScripts,
      measuredScripts: corpus.measuredScripts,
      runs: corpus.runs.map((run) => ({
        barCount: run.barCount,
        visual: `${run.summary.visualAllThreeMatched}/${run.summary.scripts}`,
        strategyLedger: `${run.summary.strategyLedgerAllThreeMatched}/${run.summary.strategyRows}`,
        exceptions: run.exceptions.length,
        exceptionKinds: countBy(run.exceptions, (entry) => entry.firstDifference?.kind ?? 'unclassified'),
        swallowedErrors: run.summary.swallowedErrors.totalErrors,
        compiledBarErrors: run.summary.compiledBarErrors.totalErrors,
        firstException: run.exceptions[0],
      })),
    })),
  };
}

function countBy<T>(values: T[], keyForValue: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = keyForValue(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function parseArgs(args: string[]): {
  output: string;
  sourceReports: SourceReportSpec[];
  barCounts: number[];
  maxPerCorpus: number | undefined;
} {
  let output = DEFAULT_OUTPUT;
  let sourceReports = DEFAULT_SOURCE_REPORTS;
  let barCounts = DEFAULT_BAR_COUNTS;
  let maxPerCorpus: number | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--output') {
      output = args[++index] ?? '';
    } else if (arg === '--reports') {
      const values: string[] = [];
      while (args[index + 1] && !args[index + 1]!.startsWith('--')) values.push(args[++index]!);
      sourceReports = values.map(parseSourceReportSpec);
    } else if (arg === '--bar-counts') {
      barCounts = (args[++index] ?? '').split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0);
    } else if (arg === '--max-per-corpus') {
      const value = Number(args[++index] ?? '');
      if (!Number.isInteger(value) || value <= 0) throw new Error('--max-per-corpus requires a positive integer');
      maxPerCorpus = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!output) throw new Error('--output requires a path');
  if (sourceReports.length === 0) throw new Error('--reports requires at least one corpus:path entry');
  if (barCounts.length === 0) throw new Error('--bar-counts requires at least one positive integer');
  return { output, sourceReports, barCounts, maxPerCorpus };
}

function parseSourceReportSpec(value: string): SourceReportSpec {
  const separator = value.indexOf(':');
  if (separator === -1) throw new Error(`Invalid report spec ${value}; expected corpus:path`);
  const corpus = value.slice(0, separator);
  const path = value.slice(separator + 1);
  if (!corpus || !path) throw new Error(`Invalid report spec ${value}; expected corpus:path`);
  return { corpus, path };
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function resolveReportPath(path: string): string {
  const resolved = path.startsWith('packages/')
    ? resolve(REPO_ROOT, path)
    : resolve(PACKAGE_ROOT, path);
  const nestedPackagePath = resolve(PACKAGE_ROOT, 'packages');
  if (resolved === nestedPackagePath || resolved.startsWith(`${nestedPackagePath}/`)) {
    throw new Error(
      `Refusing to write long-bar report under ${relative(REPO_ROOT, nestedPackagePath)}; ` +
      'when using yarn workspace, pass reports/... or a repo-relative packages/tealscript/reports/... path.',
    );
  }
  return resolved;
}

function round(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
