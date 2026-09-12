#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Program } from '../src/parser/ast.ts';
import { parse } from '../src/parser/parser.ts';
import type { Bar, PlotOutput } from '../src/runtime/context.ts';
import type { ExecutionResult } from '../src/runtime/types.ts';
import { executeScript } from '../src/runtime/compiledOnly.ts';
import { getOfficialTradingViewLibrary } from '../src/officialTradingViewLibraries.ts';
import { checkProgram } from '../src/semantic/checker.ts';
import {
  createStandardCorpusBars,
  SyntheticExternalCorpusRequestDatafeed,
  visiblePlotsForCorpus,
  type ExternalCorpusReport,
  type ExternalCorpusReportRow,
} from './run-external-pine-corpus.ts';

type PropertyKind = 'all-na' | 'constant-finite';
type AuditStatus = 'audited' | 'rerun-failed';

interface SourceReportSpec {
  corpus: 'v5' | 'v6' | 'v7';
  path: string;
  expectedProduced: number;
}

interface PlotSeries {
  field: string;
  values: (number | null)[];
}

interface Finding {
  corpus: string;
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  declaredVersion?: number;
  declarationKind?: string;
  kind: PropertyKind;
  severity: 'defect-candidate' | 'suspicious';
  plotIndex: number;
  plotType: PlotOutput['type'];
  plotTitle: string;
  field: string;
  detail: string;
  finiteValues: number;
  totalValues: number;
  value?: number | null;
}

interface AuditRow {
  corpus: string;
  localPath: string;
  status: AuditStatus;
  diagnostic?: string;
  visiblePlots?: number;
  findings: Finding[];
}

interface AuditReport {
  schemaVersion: 1;
  generatedAt: string;
  commitSha: string;
  bars: {
    count: number;
    firstTime: number;
    lastTime: number;
    minClose: number;
    maxClose: number;
    sourceVaries: boolean;
  };
  sourceReports: SourceReportSpec[];
  denominators: {
    producedOutputRows: number;
    expectedProducedOutputRows: number;
    byCorpus: Record<string, number>;
  };
  summary: {
    rowsAudited: number;
    rerunFailures: number;
    rowsWithFindings: number;
    findings: number;
    byKind: Record<string, number>;
    rowsByKind: Record<string, number>;
    byCorpus: Record<string, number>;
  };
  findings: Finding[];
  rows: AuditRow[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const DEFAULT_OUTPUT_BASE = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-output-reference-free-v2');
const EPSILON = 1e-10;
const MIN_CONSTANT_FINITE_VALUES = 1_500;

const SOURCE_REPORTS: SourceReportSpec[] = [
  {
    corpus: 'v5',
    path: 'reports/external-pine-corpus-v5.daily-rerun-7c08371da1.json',
    expectedProduced: 855,
  },
  {
    corpus: 'v6',
    path: 'reports/external-pine-corpus-v6.daily-rerun-7c08371da1.json',
    expectedProduced: 777,
  },
  {
    corpus: 'v7',
    path: 'reports/external-pine-corpus-v7.daily-rerun-7c08371da1.json',
    expectedProduced: 304,
  },
];

function currentCommit(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function reportPath(spec: SourceReportSpec): string {
  return resolve(PACKAGE_ROOT, spec.path);
}

function buildHostLibraryRegistry(ast: Program): Map<string, Program> {
  const libraries = new Map<string, Program>();
  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') continue;
    const library = getOfficialTradingViewLibrary(statement.path);
    if (library?.program) libraries.set(statement.path, library.program);
  }
  return libraries;
}

function firstSemanticError(ast: Program, libraries: Map<string, Program>): string | undefined {
  const semantic = checkProgram(ast, { libraries });
  const diagnostic = semantic.diagnostics.find((item) => item.severity === 'error');
  if (!diagnostic) return undefined;
  const location =
    diagnostic.line !== undefined && diagnostic.column !== undefined
      ? `${diagnostic.line}:${diagnostic.column}: `
      : '';
  return `${location}${diagnostic.code ? `${diagnostic.code}: ` : ''}${diagnostic.message}`;
}

async function auditRow(
  corpus: string,
  sourceReportRow: ExternalCorpusReportRow,
  inputDir: string,
  bars: Bar[],
): Promise<AuditRow> {
  const source = await readFile(resolve(inputDir, sourceReportRow.localPath), 'utf8');
  let ast: Program;
  try {
    ast = parse(source, { grammarSource: sourceReportRow.localPath });
  } catch (error) {
    return rerunFailure(corpus, sourceReportRow, `parse: ${errorMessage(error)}`);
  }

  const libraries = buildHostLibraryRegistry(ast);
  const semanticError = firstSemanticError(ast, libraries);
  if (semanticError) return rerunFailure(corpus, sourceReportRow, `semantic: ${semanticError}`);

  let result: ExecutionResult;
  try {
    result = executeScript(ast, bars, undefined, {
      requestDatafeed: new SyntheticExternalCorpusRequestDatafeed(bars),
      libraries,
    });
  } catch (error) {
    return rerunFailure(corpus, sourceReportRow, `execute: ${errorMessage(error)}`);
  }

  const plots = visiblePlotsForCorpus(result.plots);
  return {
    corpus,
    localPath: sourceReportRow.localPath,
    status: 'audited',
    visiblePlots: plots.length,
    findings: auditPlots(corpus, sourceReportRow, plots),
  };
}

function rerunFailure(corpus: string, row: ExternalCorpusReportRow, diagnostic: string): AuditRow {
  return {
    corpus,
    localPath: row.localPath,
    status: 'rerun-failed',
    diagnostic,
    findings: [],
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function auditPlots(corpus: string, row: ExternalCorpusReportRow, plots: PlotOutput[]): Finding[] {
  const findings: Finding[] = [];
  for (let plotIndex = 0; plotIndex < plots.length; plotIndex += 1) {
    const plot = plots[plotIndex]!;
    if (!isAuditableNumericPlot(plot)) continue;
    for (const series of plotSeries(plot)) {
      const finite = series.values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      if (series.values.length > 0 && finite.length === 0) {
        findings.push(
          finding(
            corpus,
            row,
            'all-na',
            'defect-candidate',
            plotIndex,
            plot,
            series,
            'Every sampled value in this visible numeric plot field is na.',
            finite.length,
          ),
        );
      }

      if (finite.length >= MIN_CONSTANT_FINITE_VALUES && allClose(finite, finite[0]!)) {
        findings.push(
          finding(
            corpus,
            row,
            'constant-finite',
            'suspicious',
            plotIndex,
            plot,
            series,
            `All ${finite.length} finite values are ${formatNumber(finite[0]!)} across volatile ${series.values.length}-bar input.`,
            finite.length,
            finite[0],
          ),
        );
      }
    }
  }
  return findings;
}

function isAuditableNumericPlot(plot: PlotOutput): boolean {
  return ['plot', 'plotbar', 'plotcandle'].includes(plot.type);
}

function plotSeries(plot: PlotOutput): PlotSeries[] {
  if (plot.type === 'plot') return [{ field: 'values', values: plot.values }];
  const fields: PlotSeries[] = [];
  if (plot.openValues) fields.push({ field: 'openValues', values: plot.openValues });
  if (plot.highValues) fields.push({ field: 'highValues', values: plot.highValues });
  if (plot.lowValues) fields.push({ field: 'lowValues', values: plot.lowValues });
  if (plot.closeValues) fields.push({ field: 'closeValues', values: plot.closeValues });
  return fields;
}

function allClose(values: number[], expected: number): boolean {
  return values.every((value) => Math.abs(value - expected) <= EPSILON);
}

function finding(
  corpus: string,
  row: ExternalCorpusReportRow,
  kind: PropertyKind,
  severity: Finding['severity'],
  plotIndex: number,
  plot: PlotOutput,
  series: PlotSeries,
  detail: string,
  finiteValues: number,
  value?: number | null,
): Finding {
  return {
    corpus,
    localPath: row.localPath,
    sourceRepoUrl: row.sourceRepoUrl,
    sourceFilePath: row.sourceFilePath,
    commitSha: row.commitSha,
    declaredVersion: typeof row.declaredVersion === 'number' ? row.declaredVersion : undefined,
    declarationKind: row.declarationKind,
    kind,
    severity,
    plotIndex,
    plotType: plot.type,
    plotTitle: plot.title,
    field: series.field,
    detail,
    finiteValues,
    totalValues: series.values.length,
    value,
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toPrecision(12);
}

function barsSummary(bars: Bar[]): AuditReport['bars'] {
  const closes = bars.map((bar) => bar.close);
  return {
    count: bars.length,
    firstTime: bars[0]?.time ?? 0,
    lastTime: bars.at(-1)?.time ?? 0,
    minClose: Math.min(...closes),
    maxClose: Math.max(...closes),
    sourceVaries: new Set(closes.map((value) => value.toFixed(8))).size > 1,
  };
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function rowsByKind(findings: Finding[]): Record<string, number> {
  const grouped = new Map<string, Set<string>>();
  for (const finding of findings) {
    const existing = grouped.get(finding.kind) ?? new Set<string>();
    existing.add(`${finding.corpus}/${finding.localPath}`);
    grouped.set(finding.kind, existing);
  }
  const counts: Array<[string, number]> = [...grouped.entries()].map(([kind, rows]) => [
    kind,
    rows.size,
  ]);
  return Object.fromEntries(counts.sort(([left], [right]) => left.localeCompare(right)));
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report: AuditReport, jsonPath: string): string {
  const lines: string[] = [];
  lines.push('# External Pine Corpus Output Reference-Free Audit v2');
  lines.push('');
  lines.push('Date: 2026-09-11');
  lines.push(`Measurement commit: \`${report.commitSha}\``);
  lines.push(`Machine-readable companion: \`${jsonPath}\``);
  lines.push('');
  lines.push(
    'This pass intentionally uses no member property map and no value oracle. It re-executes the 1936 scripts that already produced output in the current v5, v6, and v7 daily-profile reports, then inspects only the emitted visible numeric plot payloads for all-NaN and constant finite series.',
  );
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(
    `Reference-free audit completed for ${report.summary.rowsAudited}/${report.denominators.producedOutputRows} produced-output rows with ${report.summary.rerunFailures} rerun failures. It found ${report.summary.byKind['all-na'] ?? 0} all-NaN plot fields across ${report.summary.rowsByKind['all-na'] ?? 0} scripts and ${report.summary.byKind['constant-finite'] ?? 0} constant finite plot fields across ${report.summary.rowsByKind['constant-finite'] ?? 0} scripts.`,
  );
  lines.push('');
  lines.push(
    'The property-map pass is deliberately not included here. `pine-member-property-map-v3.json` is the single source for rule-driven checks, but fires from rules not yet exercised against known-good outputs must stay tagged as leads until source-read validation promotes them.',
  );
  lines.push('');
  lines.push(
    'V7 comparison retained for the record: v5+v6 were 2000 mostly random scripts and left 1 real current gap between them; v7 was 456 targeted scripts and yielded 19 real gaps before routing.',
  );
  lines.push('');
  lines.push('## Denominator');
  lines.push('');
  lines.push(
    markdownTable(
      ['Corpus', 'Produced-output rows'],
      Object.entries(report.denominators.byCorpus).map(([corpus, count]) => [corpus, String(count)]),
    ),
  );
  lines.push('');
  lines.push('## Finding Counts');
  lines.push('');
  lines.push(
    markdownTable(
      ['Kind', 'Findings', 'Scripts'],
      Object.entries(report.summary.byKind).map(([kind, count]) => [
        kind,
        String(count),
        String(report.summary.rowsByKind[kind] ?? 0),
      ]),
    ),
  );
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  lines.push(
    report.findings.length === 0
      ? 'No all-NaN or long constant finite visible numeric plot fields fired.'
      : markdownTable(
          ['Corpus', 'Row', 'Kind', 'Severity', 'Plot', 'Field', 'Finite/Total', 'Detail'],
          report.findings.map((finding) => [
            finding.corpus,
            finding.localPath,
            finding.kind,
            finding.severity,
            `${finding.plotIndex}: ${finding.plotTitle}`,
            finding.field,
            `${finding.finiteValues}/${finding.totalValues}`,
            finding.detail,
          ]),
        ),
  );
  lines.push('');
  lines.push('## Rerun Failures');
  lines.push('');
  const failures = report.rows.filter((row) => row.status === 'rerun-failed');
  lines.push(
    failures.length === 0
      ? 'None.'
      : markdownTable(
          ['Corpus', 'Row', 'Diagnostic'],
          failures.map((row) => [row.corpus, row.localPath, row.diagnostic ?? '']),
        ),
  );
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push(
    '- Source reports are the current daily produced-output denominators at `7c08371da1`: v5 855, v6 777, v7 304.',
  );
  lines.push(
    '- Re-execution uses `createStandardCorpusBars()` from the external corpus runner: 1600 volatile daily bars with varied close and volume.',
  );
  lines.push(
    '- Audited plot payloads are visible numeric `plot`, `plotbar`, and `plotcandle` fields only. Fills, hlines, bgcolor/barcolor, plotshape, plotchar, and plotarrow are excluded from this first pass because static masks, levels, colors, and sparse event markers are common intentional outputs.',
  );
  lines.push(
    '- All-NaN fires when every sampled value in an audited visible plot field is `na`/null.',
  );
  lines.push(
    `- Constant finite fires when at least ${MIN_CONSTANT_FINITE_VALUES} finite values in an audited plot field are identical over the volatile 1600-bar input.`,
  );
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const outputBase = resolve(process.argv[2] ?? DEFAULT_OUTPUT_BASE);
  const bars = createStandardCorpusBars();
  const rows: AuditRow[] = [];
  const denominatorsByCorpus: Record<string, number> = {};
  const expectedTotal = SOURCE_REPORTS.reduce((sum, item) => sum + item.expectedProduced, 0);

  for (const spec of SOURCE_REPORTS) {
    const sourceReport = await readJson<ExternalCorpusReport>(reportPath(spec));
    const produced = sourceReport.rows.filter((row) => row.outcome === 'produced-output-compiled');
    denominatorsByCorpus[spec.corpus] = produced.length;
    if (produced.length !== spec.expectedProduced) {
      throw new Error(`${spec.corpus} expected ${spec.expectedProduced} produced-output rows, got ${produced.length}`);
    }
    for (const row of produced) {
      if ((rows.length + 1) % 100 === 0) process.stderr.write(`Audited ${rows.length + 1}/${expectedTotal}\n`);
      rows.push(await auditRow(spec.corpus, row, sourceReport.inputDir, bars));
    }
  }

  const findings = rows.flatMap((row) => row.findings);
  const report: AuditReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    commitSha: currentCommit(),
    bars: barsSummary(bars),
    sourceReports: SOURCE_REPORTS,
    denominators: {
      producedOutputRows: Object.values(denominatorsByCorpus).reduce((sum, count) => sum + count, 0),
      expectedProducedOutputRows: expectedTotal,
      byCorpus: denominatorsByCorpus,
    },
    summary: {
      rowsAudited: rows.filter((row) => row.status === 'audited').length,
      rerunFailures: rows.filter((row) => row.status === 'rerun-failed').length,
      rowsWithFindings: rows.filter((row) => row.findings.length > 0).length,
      findings: findings.length,
      byKind: countBy(findings, (finding) => finding.kind),
      rowsByKind: rowsByKind(findings),
      byCorpus: countBy(findings, (finding) => finding.corpus),
    },
    findings,
    rows,
  };

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(
    `${outputBase}.md`,
    buildMarkdown(report, `${outputBase.replace(`${PACKAGE_ROOT}/`, '')}.json`),
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
