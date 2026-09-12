#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface Finding {
  corpus: string;
  localPath: string;
  kind: 'all-na' | 'constant-finite';
  plotIndex: number;
  plotTitle: string;
  field: string;
  detail: string;
}

interface AuditRow {
  corpus: string;
  localPath: string;
  status: 'audited' | 'rerun-failed';
  visiblePlots?: number;
  findings: Finding[];
}

interface ReferenceFreeReport {
  commitSha: string;
  denominators: {
    producedOutputRows: number;
    byCorpus: Record<string, number>;
  };
  summary: {
    rowsAudited: number;
    findings: number;
    byKind: Record<string, number>;
    rowsByKind: Record<string, number>;
  };
  rows: AuditRow[];
}

interface RowSlice {
  corpus: string;
  localPath: string;
  visiblePlots: number;
  allNaFields: number;
  constantFields: number;
  findingPlotIndexes: number;
  allNaPlotIndexes: number;
  allNaFieldsWithProducingSibling: number;
  constantFieldsWithVaryingSibling: number;
  exampleFindings: Array<Pick<Finding, 'kind' | 'plotIndex' | 'plotTitle' | 'field' | 'detail'>>;
}

interface ResliceReport {
  schemaVersion: 1;
  generatedAt: string;
  commitSha: string;
  sourceReport: string;
  sourceMeasurementCommit: string;
  denominator: {
    producedOutputRows: number;
    byCorpus: Record<string, number>;
  };
  summary: {
    allNaFields: number;
    allNaRows: number;
    allNaFieldsWithProducingSiblingLowerBound: number;
    allNaRowsWithProducingSiblingLowerBound: number;
    constantFields: number;
    constantRows: number;
    constantFieldsWithVaryingSiblingLowerBound: number;
    constantRowsWithVaryingSiblingLowerBound: number;
  };
  rowsWithAllNaProducingSibling: RowSlice[];
  rowsWithConstantVaryingSibling: RowSlice[];
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const SOURCE_REPORT = 'reports/external-pine-corpus-output-reference-free-v2.json';
const DEFAULT_OUTPUT_BASE = resolve(PACKAGE_ROOT, 'reports/external-pine-corpus-output-asymmetry-reslice-v1');
const EXPECTED_SOURCE_SUMMARY = {
  rowsAudited: 1936,
  findings: 2142,
  allNaFields: 1230,
  constantFields: 912,
};

function currentCommit(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(PACKAGE_ROOT, path), 'utf8')) as T;
}

function sliceRow(row: AuditRow): RowSlice {
  const allNa = row.findings.filter((finding) => finding.kind === 'all-na');
  const constants = row.findings.filter((finding) => finding.kind === 'constant-finite');
  const findingPlotIndexes = new Set(row.findings.map((finding) => finding.plotIndex));
  const allNaPlotIndexes = new Set(allNa.map((finding) => finding.plotIndex));
  const visiblePlots = row.visiblePlots ?? 0;
  const hasProducingSibling = visiblePlots > allNaPlotIndexes.size;
  const hasVaryingSibling = visiblePlots > findingPlotIndexes.size;

  return {
    corpus: row.corpus,
    localPath: row.localPath,
    visiblePlots,
    allNaFields: allNa.length,
    constantFields: constants.length,
    findingPlotIndexes: findingPlotIndexes.size,
    allNaPlotIndexes: allNaPlotIndexes.size,
    allNaFieldsWithProducingSibling: hasProducingSibling ? allNa.length : 0,
    constantFieldsWithVaryingSibling: hasVaryingSibling ? constants.length : 0,
    exampleFindings: row.findings.slice(0, 6).map((finding) => ({
      kind: finding.kind,
      plotIndex: finding.plotIndex,
      plotTitle: finding.plotTitle,
      field: finding.field,
      detail: finding.detail,
    })),
  };
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report: ResliceReport, jsonPath: string): string {
  const lines: string[] = [];
  lines.push('# External Pine Corpus Output Asymmetry Reslice v1');
  lines.push('');
  lines.push('Date: 2026-09-11');
  lines.push(`Generated at commit: \`${report.commitSha}\``);
  lines.push(`Source measurement commit: \`${report.sourceMeasurementCommit}\``);
  lines.push(`Source report: \`${report.sourceReport}\``);
  lines.push(`Machine-readable companion: \`${jsonPath}\``);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(
    'The output-property line is closed on this corpus set: the reference-free payload audit did not produce a discriminating defect queue, the v2 member-property audit fired zero validated findings and zero unvalidated leads across 658 applied rules, and this sibling-asymmetry reslice is common enough to be non-discriminating.',
  );
  lines.push('');
  lines.push(
    `The asymmetry is common, not rare. At least ${report.summary.allNaFieldsWithProducingSiblingLowerBound}/${report.summary.allNaFields} all-NaN fields sit in scripts with a producing sibling plot, across ${report.summary.allNaRowsWithProducingSiblingLowerBound}/${report.summary.allNaRows} all-NaN scripts.`,
  );
  lines.push('');
  lines.push(
    `At least ${report.summary.constantFieldsWithVaryingSiblingLowerBound}/${report.summary.constantFields} constant-finite fields sit in scripts with a varying sibling plot, across ${report.summary.constantRowsWithVaryingSiblingLowerBound}/${report.summary.constantRows} constant-field scripts.`,
  );
  lines.push('');
  lines.push('These are lower bounds from the saved reference-free report. The report persisted fired fields and visible plot counts, not every non-firing sibling payload, so plotbar/plotcandle field-level siblings can only increase these numbers.');
  lines.push('');
  lines.push('## Denominator');
  lines.push('');
  lines.push(
    markdownTable(
      ['Corpus', 'Produced-output rows'],
      Object.entries(report.denominator.byCorpus).map(([corpus, count]) => [corpus, String(count)]),
    ),
  );
  lines.push('');
  lines.push('## Reslice Counts');
  lines.push('');
  lines.push(
    markdownTable(
      ['Slice', 'Fields', 'Scripts'],
      [
        ['all-NaN fields', String(report.summary.allNaFields), String(report.summary.allNaRows)],
        [
          'all-NaN fields with producing sibling lower bound',
          String(report.summary.allNaFieldsWithProducingSiblingLowerBound),
          String(report.summary.allNaRowsWithProducingSiblingLowerBound),
        ],
        ['constant-finite fields', String(report.summary.constantFields), String(report.summary.constantRows)],
        [
          'constant-finite fields with varying sibling lower bound',
          String(report.summary.constantFieldsWithVaryingSiblingLowerBound),
          String(report.summary.constantRowsWithVaryingSiblingLowerBound),
        ],
      ],
    ),
  );
  lines.push('');
  lines.push('## Representative All-NaN Asymmetry Rows');
  lines.push('');
  lines.push(rowTable(report.rowsWithAllNaProducingSibling.slice(0, 40)));
  lines.push('');
  lines.push('## Representative Constant Asymmetry Rows');
  lines.push('');
  lines.push(rowTable(report.rowsWithConstantVaryingSibling.slice(0, 40)));
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push('- No corpus scripts were re-executed for this report.');
  lines.push('- A producing sibling lower bound is counted when a script has more visible plots than plot indexes that fired all-NaN.');
  lines.push('- A varying sibling lower bound is counted when a script has more visible plots than plot indexes with any all-NaN or constant-finite fire.');
  lines.push('- This deliberately avoids classifying these asymmetries as engine defects. The result is that asymmetry is a common corpus shape, so it is not by itself discriminating enough to route rows.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function rowTable(rows: RowSlice[]): string {
  if (rows.length === 0) return 'None.';
  return markdownTable(
    ['Corpus', 'Row', 'Visible plots', 'All-NaN', 'Constant', 'Finding plot indexes', 'Examples'],
    rows.map((row) => [
      row.corpus,
      row.localPath,
      String(row.visiblePlots),
      String(row.allNaFields),
      String(row.constantFields),
      String(row.findingPlotIndexes),
      row.exampleFindings
        .map((finding) => `${finding.kind} ${finding.plotIndex}:${finding.plotTitle}.${finding.field}`)
        .join('; '),
    ]),
  );
}

async function main(): Promise<void> {
  const outputBase = resolve(process.argv[2] ?? DEFAULT_OUTPUT_BASE);
  const source = await readJson<ReferenceFreeReport>(SOURCE_REPORT);
  const summaryFailures = [
    source.summary.rowsAudited === EXPECTED_SOURCE_SUMMARY.rowsAudited ? null : `expected ${EXPECTED_SOURCE_SUMMARY.rowsAudited} audited rows, got ${source.summary.rowsAudited}`,
    source.summary.findings === EXPECTED_SOURCE_SUMMARY.findings ? null : `expected ${EXPECTED_SOURCE_SUMMARY.findings} findings, got ${source.summary.findings}`,
    (source.summary.byKind['all-na'] ?? 0) === EXPECTED_SOURCE_SUMMARY.allNaFields ? null : `expected ${EXPECTED_SOURCE_SUMMARY.allNaFields} all-NaN fields, got ${source.summary.byKind['all-na'] ?? 0}`,
    (source.summary.byKind['constant-finite'] ?? 0) === EXPECTED_SOURCE_SUMMARY.constantFields ? null : `expected ${EXPECTED_SOURCE_SUMMARY.constantFields} constant-finite fields, got ${source.summary.byKind['constant-finite'] ?? 0}`,
  ].filter(Boolean);
  if (summaryFailures.length > 0) {
    throw new Error(`Source report ${SOURCE_REPORT} no longer matches the asymmetry reslice contract:\n- ${summaryFailures.join('\n- ')}`);
  }
  const slices = source.rows.filter((row) => row.status === 'audited' && row.findings.length > 0).map(sliceRow);
  const allNaRows = slices.filter((row) => row.allNaFields > 0);
  const constantRows = slices.filter((row) => row.constantFields > 0);
  const rowsWithAllNaProducingSibling = allNaRows.filter((row) => row.allNaFieldsWithProducingSibling > 0);
  const rowsWithConstantVaryingSibling = constantRows.filter((row) => row.constantFieldsWithVaryingSibling > 0);
  const report: ResliceReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    commitSha: currentCommit(),
    sourceReport: SOURCE_REPORT,
    sourceMeasurementCommit: source.commitSha,
    denominator: {
      producedOutputRows: source.denominators.producedOutputRows,
      byCorpus: source.denominators.byCorpus,
    },
    summary: {
      allNaFields: source.summary.byKind['all-na'] ?? 0,
      allNaRows: source.summary.rowsByKind['all-na'] ?? 0,
      allNaFieldsWithProducingSiblingLowerBound: rowsWithAllNaProducingSibling.reduce((sum, row) => sum + row.allNaFieldsWithProducingSibling, 0),
      allNaRowsWithProducingSiblingLowerBound: rowsWithAllNaProducingSibling.length,
      constantFields: source.summary.byKind['constant-finite'] ?? 0,
      constantRows: source.summary.rowsByKind['constant-finite'] ?? 0,
      constantFieldsWithVaryingSiblingLowerBound: rowsWithConstantVaryingSibling.reduce((sum, row) => sum + row.constantFieldsWithVaryingSibling, 0),
      constantRowsWithVaryingSiblingLowerBound: rowsWithConstantVaryingSibling.length,
    },
    rowsWithAllNaProducingSibling,
    rowsWithConstantVaryingSibling,
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
