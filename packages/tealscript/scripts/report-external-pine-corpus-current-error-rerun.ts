#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';

interface CorpusSpec {
  corpus: 'v5' | 'v6' | 'v7';
  previousSha: string;
  currentSha: string;
  previousReport: string;
  currentReport: string;
}

interface RowMovement {
  row: string;
  cause: string;
  diagnostic: string;
  previousStage: string | null;
  previousOutcome: string;
  currentStage: string | null;
  currentOutcome: string;
}

interface CorpusComparison {
  corpus: string;
  previousSha: string;
  currentSha: string;
  previousReport: string;
  currentReport: string;
  previous: CorpusFigures;
  current: CorpusFigures;
  deltas: {
    rawOutput: number;
    achievableOutput: number;
    achievableDenominator: number;
  };
  previousSilentNoErrorRows: number;
  previouslySilentNoErrorNowSevenErrors: RowMovement[];
  previouslySilentNoErrorNowTaLength: RowMovement[];
  producedOutputDropsToSevenErrors: RowMovement[];
  producedOutputDropsToTaLength: RowMovement[];
  producedOutputGains: RowMovement[];
}

interface CorpusFigures {
  rawOutput: number;
  rawTotal: number;
  achievableOutput: number;
  achievableDenominator: number;
  outcomes: Record<string, number>;
  outputSilence: Record<string, number>;
}

interface ComparisonReport {
  schemaVersion: 1;
  generatedAt: string;
  measurementCommit: string;
  headline: {
    previousSilentNoErrorRows: number;
    previouslySilentNoErrorNowSevenErrors: number;
    previouslySilentNoErrorNowTaLength: number;
    producedOutputDropsToSevenErrors: number;
    producedOutputDropsToTaLength: number;
    producedOutputGains: number;
    rawOutputDelta: number;
    achievableOutputDelta: number;
  };
  sevenErrorPatterns: string[];
  taLengthPattern: string;
  comparisons: CorpusComparison[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const DEFAULT_OUTPUT_BASE = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-current-error-rerun-v1');

const CORPORA: CorpusSpec[] = [
  {
    corpus: 'v5',
    previousSha: 'a75ebd88d7',
    currentSha: '7c08371da1',
    previousReport: 'reports/external-pine-corpus-v5.daily-rerun-a75ebd88d7.json',
    currentReport: 'reports/external-pine-corpus-v5.daily-rerun-7c08371da1.json',
  },
  {
    corpus: 'v6',
    previousSha: 'a75ebd88d7',
    currentSha: '7c08371da1',
    previousReport: 'reports/external-pine-corpus-v6.daily-rerun-a75ebd88d7.json',
    currentReport: 'reports/external-pine-corpus-v6.daily-rerun-7c08371da1.json',
  },
  {
    corpus: 'v7',
    previousSha: 'bbcbf3d220',
    currentSha: '7c08371da1',
    previousReport:
      '.cache/tealscript/pine-corpus-v7-20260911/fixture-profiles-current-2e05553bda/external-pine-corpus-v7-daily-standard.json',
    currentReport: 'reports/external-pine-corpus-v7.daily-rerun-7c08371da1.json',
  },
];

const SEVEN_ERROR_PATTERNS: Array<{ cause: string; pattern: RegExp; label: string }> = [
  {
    cause: 'array-slice-descending',
    pattern: /Index 'from' should be less than index 'to'/,
    label: "Index 'from' should be less than index 'to'",
  },
  {
    cause: 'map-size-limit',
    pattern: /Map cannot contain more than 50000 key-value pairs/,
    label: 'Map cannot contain more than 50000 key-value pairs',
  },
  {
    cause: 'table-cell-limit',
    pattern: /Too many table cells: maximum is 10000/,
    label: 'Too many table cells: maximum is 10000',
  },
  {
    cause: 'table-coordinates',
    pattern: /Table cell coordinates out of bounds/,
    label: 'Table cell coordinates out of bounds',
  },
  {
    cause: 'table-merge-overlap',
    pattern: /Table merged cell range overlaps existing merged cells/,
    label: 'Table merged cell range overlaps existing merged cells',
  },
  {
    cause: 'matrix-vector-size',
    pattern: /Matrix-vector multiplication requires matrix columns to match array size/,
    label: 'Matrix-vector multiplication requires matrix columns to match array size',
  },
  {
    cause: 'plot-output-limit',
    pattern: /Too many plot outputs: maximum is 64/,
    label: 'Too many plot outputs: maximum is 64',
  },
];

const TA_LENGTH_PATTERN = /TA length must be a positive integer|ta\.change length must be a positive integer/;

function currentCommit(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(PACKAGE_ROOT, path), 'utf8')) as T;
}

function rowDiagnostic(row: ExternalCorpusReportRow): string {
  return row.firstFailedStage ? row.stages[row.firstFailedStage]?.diagnostic ?? '' : '';
}

function noErrorSilent(row: ExternalCorpusReportRow): boolean {
  return (
    row.outcome === 'no-output-compiled'
    && !row.compiledBarErrors
    && !(row.swallowedErrors && row.swallowedErrors.length > 0)
  );
}

function sevenErrorCause(diagnostic: string): string | undefined {
  return SEVEN_ERROR_PATTERNS.find((entry) => entry.pattern.test(diagnostic))?.cause;
}

function figures(report: ExternalCorpusReport): CorpusFigures {
  return {
    rawOutput: report.summary.funnel.output.count,
    rawTotal: report.summary.total,
    achievableOutput: report.summary.achievableCeiling.funnel.output.count,
    achievableDenominator: report.summary.achievableCeiling.denominator,
    outcomes: report.summary.outcomes,
    outputSilence: report.summary.outputSilence,
  };
}

function movement(previous: ExternalCorpusReportRow, current: ExternalCorpusReportRow, cause: string): RowMovement {
  return {
    row: current.localPath,
    cause,
    diagnostic: rowDiagnostic(current),
    previousStage: previous.firstFailedStage,
    previousOutcome: previous.outcome,
    currentStage: current.firstFailedStage,
    currentOutcome: current.outcome,
  };
}

async function compareCorpus(spec: CorpusSpec): Promise<CorpusComparison> {
  const previous = await readJson<ExternalCorpusReport>(spec.previousReport);
  const current = await readJson<ExternalCorpusReport>(spec.currentReport);
  const previousRows = new Map(previous.rows.map((row) => [row.localPath, row]));
  const previousSilentNoErrorRows = previous.rows.filter(noErrorSilent);
  const previouslySilentNoErrorNowSevenErrors: RowMovement[] = [];
  const previouslySilentNoErrorNowTaLength: RowMovement[] = [];
  const producedOutputDropsToSevenErrors: RowMovement[] = [];
  const producedOutputDropsToTaLength: RowMovement[] = [];
  const producedOutputGains: RowMovement[] = [];

  for (const currentRow of current.rows) {
    const previousRow = previousRows.get(currentRow.localPath);
    if (!previousRow) continue;
    const diagnostic = rowDiagnostic(currentRow);
    const sevenCause = sevenErrorCause(diagnostic);
    const taCause = TA_LENGTH_PATTERN.test(diagnostic) ? 'ta-invalid-length' : undefined;

    if (noErrorSilent(previousRow) && currentRow.firstFailedStage === 'execute' && sevenCause) {
      previouslySilentNoErrorNowSevenErrors.push(movement(previousRow, currentRow, sevenCause));
    }
    if (noErrorSilent(previousRow) && currentRow.firstFailedStage === 'execute' && taCause) {
      previouslySilentNoErrorNowTaLength.push(movement(previousRow, currentRow, taCause));
    }
    if (previousRow.outcome === 'produced-output-compiled' && currentRow.outcome !== 'produced-output-compiled' && sevenCause) {
      producedOutputDropsToSevenErrors.push(movement(previousRow, currentRow, sevenCause));
    }
    if (previousRow.outcome === 'produced-output-compiled' && currentRow.outcome !== 'produced-output-compiled' && taCause) {
      producedOutputDropsToTaLength.push(movement(previousRow, currentRow, taCause));
    }
    if (previousRow.outcome !== 'produced-output-compiled' && currentRow.outcome === 'produced-output-compiled') {
      producedOutputGains.push(movement(previousRow, currentRow, 'now-produces-output'));
    }
  }

  const previousFigures = figures(previous);
  const currentFigures = figures(current);
  return {
    corpus: spec.corpus,
    previousSha: spec.previousSha,
    currentSha: spec.currentSha,
    previousReport: spec.previousReport,
    currentReport: spec.currentReport,
    previous: previousFigures,
    current: currentFigures,
    deltas: {
      rawOutput: currentFigures.rawOutput - previousFigures.rawOutput,
      achievableOutput: currentFigures.achievableOutput - previousFigures.achievableOutput,
      achievableDenominator: currentFigures.achievableDenominator - previousFigures.achievableDenominator,
    },
    previousSilentNoErrorRows: previousSilentNoErrorRows.length,
    previouslySilentNoErrorNowSevenErrors,
    previouslySilentNoErrorNowTaLength,
    producedOutputDropsToSevenErrors,
    producedOutputDropsToTaLength,
    producedOutputGains,
  };
}

function sum(comparisons: CorpusComparison[], key: (comparison: CorpusComparison) => number): number {
  return comparisons.reduce((total, comparison) => total + key(comparison), 0);
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report: ComparisonReport, jsonPath: string): string {
  const lines: string[] = [];
  lines.push('# External Pine Corpus Current Error Rerun v1');
  lines.push('');
  lines.push('Date: 2026-09-11');
  lines.push(`Measurement commit: \`${report.measurementCommit}\``);
  lines.push(`Machine-readable companion: \`${jsonPath}\``);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(
    `Across v5/v6/v7, ${report.headline.previouslySilentNoErrorNowSevenErrors} previously silent/no-error rows now emit one of the seven newly propagated Pine runtime errors.`,
  );
  lines.push('');
  lines.push(
    `Separately, ${report.headline.previouslySilentNoErrorNowTaLength} previously silent/no-error rows now emit the stricter TA-length refusal, ${report.headline.producedOutputDropsToSevenErrors} formerly producing rows now stop on one of the seven propagated errors, and ${report.headline.producedOutputDropsToTaLength} formerly producing rows now stop on invalid TA lengths.`,
  );
  lines.push('');
  lines.push(
    `Net raw output movement is ${signed(report.headline.rawOutputDelta)} rows. Net achievable output movement is ${signed(report.headline.achievableOutputDelta)} rows.`,
  );
  lines.push('');
  lines.push('## Corpus Movement');
  lines.push('');
  lines.push(
    markdownTable(
      ['Corpus', 'Previous', 'Current', 'Raw output', 'Achievable output', 'Old silent/no-error', 'Silent -> seven errors', 'Silent -> TA length', 'Output -> seven errors', 'Output -> TA length', 'Output gains'],
      report.comparisons.map((comparison) => [
        comparison.corpus,
        comparison.previousSha,
        comparison.currentSha,
        `${comparison.previous.rawOutput}/${comparison.previous.rawTotal} -> ${comparison.current.rawOutput}/${comparison.current.rawTotal} (${signed(comparison.deltas.rawOutput)})`,
        `${comparison.previous.achievableOutput}/${comparison.previous.achievableDenominator} -> ${comparison.current.achievableOutput}/${comparison.current.achievableDenominator} (${signed(comparison.deltas.achievableOutput)})`,
        String(comparison.previousSilentNoErrorRows),
        String(comparison.previouslySilentNoErrorNowSevenErrors.length),
        String(comparison.previouslySilentNoErrorNowTaLength.length),
        String(comparison.producedOutputDropsToSevenErrors.length),
        String(comparison.producedOutputDropsToTaLength.length),
        String(comparison.producedOutputGains.length),
      ]),
    ),
  );
  lines.push('');
  lines.push('## Silent Rows Now Seven Errors');
  lines.push('');
  const silentSeven = report.comparisons.flatMap((comparison) =>
    comparison.previouslySilentNoErrorNowSevenErrors.map((row) => [comparison.corpus, row.row, row.cause, row.diagnostic]),
  );
  lines.push(silentSeven.length === 0 ? 'None.' : markdownTable(['Corpus', 'Row', 'Cause', 'Diagnostic'], silentSeven));
  lines.push('');
  lines.push('## Silent Rows Now TA-Length Refusals');
  lines.push('');
  const silentTa = report.comparisons.flatMap((comparison) =>
    comparison.previouslySilentNoErrorNowTaLength.map((row) => [comparison.corpus, row.row, row.cause, row.diagnostic]),
  );
  lines.push(silentTa.length === 0 ? 'None.' : markdownTable(['Corpus', 'Row', 'Cause', 'Diagnostic'], silentTa));
  lines.push('');
  lines.push('## Produced Rows Now Seven Errors');
  lines.push('');
  const outputSeven = report.comparisons.flatMap((comparison) =>
    comparison.producedOutputDropsToSevenErrors.map((row) => [comparison.corpus, row.row, row.cause, row.diagnostic]),
  );
  lines.push(outputSeven.length === 0 ? 'None.' : markdownTable(['Corpus', 'Row', 'Cause', 'Diagnostic'], outputSeven));
  lines.push('');
  lines.push('## Produced Rows Now TA-Length Refusals');
  lines.push('');
  const outputTa = report.comparisons.flatMap((comparison) =>
    comparison.producedOutputDropsToTaLength.map((row) => [comparison.corpus, row.row, row.cause, row.diagnostic]),
  );
  lines.push(outputTa.length === 0 ? 'None.' : markdownTable(['Corpus', 'Row', 'Cause', 'Diagnostic'], outputTa));
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push('- Re-ran v5, v6, and v7 daily-profile corpora at the current merge commit.');
  lines.push('- Compared each current row to the prior daily-profile report by `localPath`.');
  lines.push('- The seven-error question only counts rows whose previous outcome was `no-output-compiled` and had neither `compiledBarErrors` nor `swallowedErrors`.');
  lines.push('- TA invalid-length refusals are reported separately because commit `39757006c2` intentionally changed zero, negative, fractional, and non-finite TA lengths from silent coercion to Pine-style runtime refusal.');
  lines.push('- Output gains are listed only as a balancing term for the headline movement; they are not attributed to the swallowed-error or TA-length changes.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

async function main(): Promise<void> {
  const outputBase = resolve(process.argv[2] ?? DEFAULT_OUTPUT_BASE);
  const comparisons = await Promise.all(CORPORA.map(compareCorpus));
  const report: ComparisonReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measurementCommit: currentCommit(),
    headline: {
      previousSilentNoErrorRows: sum(comparisons, (comparison) => comparison.previousSilentNoErrorRows),
      previouslySilentNoErrorNowSevenErrors: sum(comparisons, (comparison) => comparison.previouslySilentNoErrorNowSevenErrors.length),
      previouslySilentNoErrorNowTaLength: sum(comparisons, (comparison) => comparison.previouslySilentNoErrorNowTaLength.length),
      producedOutputDropsToSevenErrors: sum(comparisons, (comparison) => comparison.producedOutputDropsToSevenErrors.length),
      producedOutputDropsToTaLength: sum(comparisons, (comparison) => comparison.producedOutputDropsToTaLength.length),
      producedOutputGains: sum(comparisons, (comparison) => comparison.producedOutputGains.length),
      rawOutputDelta: sum(comparisons, (comparison) => comparison.deltas.rawOutput),
      achievableOutputDelta: sum(comparisons, (comparison) => comparison.deltas.achievableOutput),
    },
    sevenErrorPatterns: SEVEN_ERROR_PATTERNS.map((entry) => entry.label),
    taLengthPattern: TA_LENGTH_PATTERN.source,
    comparisons,
  };

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(
    `${outputBase}.md`,
    buildMarkdown(report, `${outputBase.replace(`${PACKAGE_ROOT}/`, '')}.json`),
    'utf8',
  );
  process.stdout.write(`${JSON.stringify(report.headline, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
