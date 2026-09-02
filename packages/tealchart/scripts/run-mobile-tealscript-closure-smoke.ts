import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type {
  DrawingOutput,
  ExecutionResult,
  PlotOutput,
} from '@tealstreet/tealscript';
import type {
  ExternalCorpusReport,
  ExternalCorpusReportRow,
} from '../../tealscript/scripts/run-external-pine-corpus.ts';
import type { ClosureCutoverGateReport } from '../../tealscript/scripts/update-closure-cutover-gate.ts';

import {
  executeSelectedTealscriptBackend,
  parse,
} from '@tealstreet/tealscript';
import {
  compareExecutionOutput,
  createSyntheticBars,
  SyntheticExternalCorpusRequestDatafeed,
} from '../../tealscript/scripts/run-external-pine-corpus.ts';
import { runMobileTealscriptClosureSmoke } from '../src/mobile/mobileTealscriptClosureSmoke';

interface CorpusConfig {
  corpus: 'v1' | 'v2';
  inputDir: string;
  reportPath: string;
}

interface CliOptions {
  corpora: CorpusConfig[];
  gateReportPath: string;
  outputPath: string;
  limitPerCorpus: number;
}

interface SmokeReportScript {
  corpus: 'v1' | 'v2';
  id: string;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  categories: string[];
  bars: number;
  webReferenceElapsedMs: number;
  mobileElapsedMs: number;
  mobileExecutionMode?: string;
  mobileSelectedBackend?: string;
  output: {
    plots: number;
    drawings: number;
  };
  status: 'matched' | 'mismatched' | 'failed';
  firstDifference?: string;
  firstError?: string;
  parityDiagnostic?: string;
}

interface SmokeReport {
  schemaVersion: 1;
  generatedAt: string;
  environment: {
    hermes: boolean;
    runtime: 'node' | 'hermes-or-mobile-host';
  };
  source: {
    gateReport: string;
    corpusReports: string[];
    corpusInputs: string[];
  };
  scope: string;
  limitations: string[];
  summary: {
    scripts: number;
    matched: number;
    mismatched: number;
    failed: number;
    medianMobileMicrosecondsPerBar: number;
    medianWebReferenceMicrosecondsPerBar: number;
  };
  scripts: SmokeReportScript[];
}

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageDir, '../..');
const tealscriptDir = resolve(repoRoot, 'packages/tealscript');
const defaultReportsDir = resolve(tealscriptDir, 'reports');

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const gateReport = await readJson<ClosureCutoverGateReport>(options.gateReportPath);
  const rowsByCorpus = new Map<'v1' | 'v2', ExternalCorpusReportRow[]>();

  for (const corpus of options.corpora) {
    const report = await readJson<ExternalCorpusReport>(corpus.reportPath);
    const gateCorpus = gateReport.corpora.find((entry) => entry.corpus === corpus.corpus);
    if (!gateCorpus) throw new Error(`Closure cutover gate report is missing ${corpus.corpus}`);
    if (gateCorpus.dominated.exceptions.length > 0) {
      throw new Error(`Closure cutover gate must be clean before mobile smoke for ${corpus.corpus}`);
    }
    const dominatedIds = new Set(report.rows.filter((row) => row.outcome === 'produced-output-compiled').map((row) => row.id));
    rowsByCorpus.set(
      corpus.corpus,
      report.rows.filter(
        (row) =>
          dominatedIds.has(row.id) &&
          row.closure.output.produced &&
          row.closure.output.alerts === 0 &&
          row.closure.output.logs === 0 &&
          (row.closure.output.plots > 0 || row.closure.output.drawings > 0),
      ),
    );
  }

  const scripts: SmokeReportScript[] = [];
  let hermes = false;
  for (const corpus of options.corpora) {
    const selected = await selectRepresentativeRows(rowsByCorpus.get(corpus.corpus) ?? [], corpus, options.limitPerCorpus);
    for (const selection of selected) {
      const result = await runScriptSelection(selection.row, selection.source, selection.categories);
      hermes = result.hermes;
      scripts.push({ corpus: corpus.corpus, ...result.script });
    }
  }

  const report: SmokeReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: {
      hermes,
      runtime: hermes ? 'hermes-or-mobile-host' : 'node',
    },
    source: {
      gateReport: options.gateReportPath,
      corpusReports: options.corpora.map((corpus) => corpus.reportPath),
      corpusInputs: options.corpora.map((corpus) => corpus.inputDir),
    },
    scope:
      'Deterministic subset of closure cutover dominated scripts with rendered plot or drawing output; mobile path is MobileIndicatorManager with closure forced, compared against direct web closure output on the same synthetic bars.',
    limitations: [
      'This package command runs under Node and proves the mobile manager path, not Hermes device execution.',
      'The consuming mobile app must run the same helper under Metro/Hermes to prove on-device execution and phone timing.',
      'MobileIndicatorManager exposes plots and drawings; this smoke selects scripts without alert/log output so the rendered-output comparison is like-for-like.',
      'The corpus source remains outside the repository; run the TealScript corpus refetch command first if /tmp/pine-corpus-v1 or /tmp/pine-corpus-v2 is absent.',
    ],
    summary: {
      scripts: scripts.length,
      matched: scripts.filter((script) => script.status === 'matched').length,
      mismatched: scripts.filter((script) => script.status === 'mismatched').length,
      failed: scripts.filter((script) => script.status === 'failed').length,
      medianMobileMicrosecondsPerBar: median(scripts.map((script) => (script.mobileElapsedMs / script.bars) * 1_000)),
      medianWebReferenceMicrosecondsPerBar: median(scripts.map((script) => (script.webReferenceElapsedMs / script.bars) * 1_000)),
    },
    scripts,
  };

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `Mobile closure smoke: ${report.summary.matched}/${report.summary.scripts} matched, ` +
      `${report.summary.failed} failed, ${report.summary.mismatched} mismatched. ` +
      `Report: ${options.outputPath}\n`,
  );

  if (report.summary.failed > 0 || report.summary.mismatched > 0) {
    process.exitCode = 1;
  }
}

async function runScriptSelection(
  row: ExternalCorpusReportRow,
  source: string,
  categories: string[],
): Promise<{ hermes: boolean; script: Omit<SmokeReportScript, 'corpus'> }> {
  const bars = createSyntheticBars(160);
  const ast = parse(source);
  const referenceStartedAt = performance.now();
  const reference = executeSelectedTealscriptBackend(ast, bars, undefined, {
    requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars),
    runtime: {
      backend: {
        executionBackendOverride: 'closure',
        defaultBackend: 'compiled',
      },
    },
  });
  const webReferenceElapsedMs = performance.now() - referenceStartedAt;
  const mobile = runMobileTealscriptClosureSmoke({
    cases: [
      {
        id: row.id,
        source,
        bars,
        expectedOutput: {
          plots: reference.plots,
          drawings: reference.drawings,
        },
      },
    ],
    getRequestDatafeed: (testCase) => new SyntheticExternalCorpusRequestDatafeed(testCase.bars),
  });
  const mobileResult = mobile.results[0]!;
  const parity = compareExecutionOutput(
    renderedOnlyExecutionResult(reference, mobileResult.plots, mobileResult.drawings),
    renderedOnlyExecutionResult(reference, reference.plots, reference.drawings),
    'mobile closure',
    'web closure',
  );

  const status =
    mobileResult.status !== 'matched'
      ? mobileResult.status
      : parity.status === 'matched'
        ? 'matched'
        : 'mismatched';

  return {
    hermes: mobile.environment.hermes,
    script: {
      id: row.id,
      localPath: row.localPath,
      sourceRepoUrl: row.sourceRepoUrl,
      sourceFilePath: row.sourceFilePath,
      categories,
      bars: bars.length,
      webReferenceElapsedMs,
      mobileElapsedMs: mobileResult.elapsedMs,
      mobileExecutionMode: mobileResult.executionMode,
      mobileSelectedBackend: mobileResult.selectedBackend,
      output: {
        plots: mobileResult.plots.length,
        drawings: mobileResult.drawings.length,
      },
      status,
      firstDifference: mobileResult.firstDifference ?? parity.firstDifference?.path,
      firstError: mobileResult.firstError,
      parityDiagnostic: parity.status === 'mismatched' ? parity.diagnostic : undefined,
    },
  };
}

function renderedOnlyExecutionResult(
  reference: ExecutionResult,
  plots: PlotOutput[],
  drawings: DrawingOutput[],
): ExecutionResult {
  return {
    ...reference,
    plots: plots.map((plot) => ({ ...plot, scriptId: undefined })),
    drawings: drawings.map((drawing) => ({ ...drawing, scriptId: undefined })),
    alerts: [],
    logs: [],
    errors: [],
  };
}

async function selectRepresentativeRows(
  rows: ExternalCorpusReportRow[],
  corpus: CorpusConfig,
  limit: number,
): Promise<Array<{ row: ExternalCorpusReportRow; source: string; categories: string[] }>> {
  const withSource = await Promise.all(
    rows.map(async (row) => ({
      row,
      source: await readFile(resolve(corpus.inputDir, row.localPath), 'utf8'),
    })),
  );
  const selected: Array<{ row: ExternalCorpusReportRow; source: string; categories: string[] }> = [];
  const addFirst = (category: string, predicate: (entry: { row: ExternalCorpusReportRow; source: string }) => boolean) => {
    const entry = withSource.find((candidate) => predicate(candidate) && !selected.some((item) => item.row.id === candidate.row.id));
    if (entry) selected.push({ ...entry, categories: [category] });
  };

  addFirst('request-backed', (entry) => /\brequest\./.test(entry.source));
  addFirst('drawing-output', (entry) => entry.row.closure.output.drawings > 0);
  addFirst('plot-output', (entry) => entry.row.closure.output.plots > 0);
  addFirst('strategy-source', (entry) => entry.row.declarationKind === 'strategy');

  for (const entry of withSource) {
    if (selected.length >= limit) break;
    if (selected.some((item) => item.row.id === entry.row.id)) continue;
    const categories = [
      entry.row.closure.output.drawings > 0 ? 'drawing-output' : undefined,
      entry.row.closure.output.plots > 0 ? 'plot-output' : undefined,
      /\brequest\./.test(entry.source) ? 'request-backed' : undefined,
      entry.row.declarationKind === 'strategy' ? 'strategy-source' : undefined,
    ].filter((category): category is string => !!category);
    selected.push({ ...entry, categories });
  }

  return selected.slice(0, limit);
}

function parseArgs(argv: string[]): CliOptions {
  const value = (name: string, fallback: string): string => {
    const index = argv.indexOf(name);
    return index === -1 ? fallback : argv[index + 1] ?? fallback;
  };
  const limitPerCorpus = Number(value('--limit-per-corpus', '8'));
  if (!Number.isInteger(limitPerCorpus) || limitPerCorpus <= 0) {
    throw new Error('--limit-per-corpus must be a positive integer');
  }

  return {
    corpora: [
      {
        corpus: 'v1',
        inputDir: value('--input-v1', '/tmp/pine-corpus-v1'),
        reportPath: value('--report-v1', resolve(defaultReportsDir, 'external-pine-corpus-v1.report.json')),
      },
      {
        corpus: 'v2',
        inputDir: value('--input-v2', '/tmp/pine-corpus-v2'),
        reportPath: value('--report-v2', resolve(defaultReportsDir, 'external-pine-corpus-v2.report.json')),
      },
    ],
    gateReportPath: value('--gate-report', resolve(defaultReportsDir, 'closure-cutover-gate.report.json')),
    outputPath: value('--output', '/tmp/mobile-tealscript-closure-smoke.json'),
    limitPerCorpus,
  };
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
