import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';

export const CLOSURE_CUTOVER_GATE_SCHEMA_VERSION = 2;

export interface ClosureCutoverGateScript {
  id: string;
  localPath: string;
  agreement?: string;
  firstDifference?: {
    path: string;
    kind: string;
  };
  closureStatus?: string;
}

export interface ClosureCutoverGateCorpus {
  corpus: string;
  dominated: {
    count: number;
    exceptions: ClosureCutoverGateScript[];
  };
  corroboratedGain: {
    count: number;
    scripts: ClosureCutoverGateScript[];
  };
  uncorroboratedClosureOutput: {
    count: number;
    scripts: ClosureCutoverGateScript[];
  };
  errorBackedClosureOutput: {
    count: number;
    scripts: ClosureCutoverGateScript[];
  };
}

export interface ClosureCutoverGateReport {
  schemaVersion: number;
  sourceReports: string[];
  corpora: ClosureCutoverGateCorpus[];
}

const DEFAULT_SOURCE_REPORTS = [
  'reports/external-pine-corpus-v1.report.json',
  'reports/external-pine-corpus-v2.report.json',
];
const DEFAULT_OUTPUT = 'reports/closure-cutover-gate.report.json';
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');

export function buildClosureCutoverGateReport(
  reports: Array<{ corpus: string; path: string; report: ExternalCorpusReport }>,
): ClosureCutoverGateReport {
  return {
    schemaVersion: CLOSURE_CUTOVER_GATE_SCHEMA_VERSION,
    sourceReports: reports.map((entry) => entry.path),
    corpora: reports.map((entry) => summarizeCorpus(entry.corpus, entry.report)),
  };
}

function summarizeCorpus(corpus: string, report: ExternalCorpusReport): ClosureCutoverGateCorpus {
  const dominated = report.rows.filter((row) => row.outcome === 'produced-output-compiled');
  const dominatedExceptions = dominated
    .filter((row) => row.closure.parityAgainstCompiled.status !== 'matched' || !row.closure.output.produced)
    .map(scriptSummary);
  const nonDominatedClosureOutput = report.rows.filter(
    (row) => row.outcome !== 'produced-output-compiled' && row.closure.output.produced,
  );
  const errorBackedClosureOutput = nonDominatedClosureOutput
    .filter((row) => row.closure.output.errors > 0)
    .map(scriptSummary);
  const cleanNonDominatedClosureOutput = nonDominatedClosureOutput
    .filter((row) => row.closure.output.errors === 0);
  const corroboratedGain = cleanNonDominatedClosureOutput
    .filter((row) => row.closure.parityAgainstInterpreter.status === 'matched')
    .map(scriptSummary);
  const uncorroboratedClosureOutput = cleanNonDominatedClosureOutput
    .filter((row) => row.closure.parityAgainstInterpreter.status !== 'matched')
    .map(scriptSummary);

  return {
    corpus,
    dominated: {
      count: dominated.length,
      exceptions: dominatedExceptions,
    },
    corroboratedGain: {
      count: corroboratedGain.length,
      scripts: corroboratedGain,
    },
    uncorroboratedClosureOutput: {
      count: uncorroboratedClosureOutput.length,
      scripts: uncorroboratedClosureOutput,
    },
    errorBackedClosureOutput: {
      count: errorBackedClosureOutput.length,
      scripts: errorBackedClosureOutput,
    },
  };
}

function scriptSummary(row: ExternalCorpusReportRow): ClosureCutoverGateScript {
  return {
    id: row.id,
    localPath: row.localPath,
    agreement: row.closure.agreement,
    closureStatus: row.closure.parityAgainstCompiled.status,
    firstDifference:
      row.closure.parityAgainstCompiled.firstDifference
      ?? row.closure.parityAgainstInterpreter.firstDifference,
  };
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function readReport(path: string): Promise<ExternalCorpusReport> {
  return readJson<ExternalCorpusReport>(resolveReportPath(path));
}

function resolveReportPath(path: string): string {
  const resolved = path.startsWith('packages/')
    ? resolve(REPO_ROOT, path)
    : resolve(PACKAGE_ROOT, path);
  const nestedPackagePath = resolve(PACKAGE_ROOT, 'packages');
  if (resolved === nestedPackagePath || resolved.startsWith(`${nestedPackagePath}/`)) {
    throw new Error(
      `Refusing to write cutover report under ${relative(REPO_ROOT, nestedPackagePath)}; ` +
      'when using yarn workspace, pass reports/... or a repo-relative packages/tealscript/reports/... path.',
    );
  }
  return resolved;
}

function parseArgs(argv: string[]): { check: boolean; output: string; sourceReports: Array<{ corpus: string; path: string }> } {
  const args = [...argv];
  const check = args.includes('--check');
  const outputIndex = args.indexOf('--output');
  const output = outputIndex === -1 ? DEFAULT_OUTPUT : args[outputIndex + 1];
  if (!output) throw new Error('--output requires a path');
  const reportsIndex = args.indexOf('--reports');
  const sourceReports = reportsIndex === -1
    ? DEFAULT_SOURCE_REPORTS.map((path, index) => ({ corpus: index === 0 ? 'v1' : 'v2', path }))
    : parseSourceReports(valuesAfterArg(args, reportsIndex));
  if (sourceReports.length < 1) throw new Error('Expected at least one source report');
  return { check, output, sourceReports };
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

async function main(): Promise<void> {
  const { check, output, sourceReports } = parseArgs(process.argv.slice(2));
  const outputPath = resolveReportPath(output);
  const report = buildClosureCutoverGateReport(await Promise.all(sourceReports.map(async (source) => ({
    corpus: source.corpus,
    path: source.path,
    report: await readReport(source.path),
  }))));
  const serialized = `${JSON.stringify(report, null, 2)}\n`;

  if (check) {
    const current = await readFile(outputPath, 'utf8');
    if (current !== serialized) {
      process.stderr.write(
        `Closure cutover gate report is stale. Run yarn workspace @tealstreet/tealscript pine:closure:cutover.\n`,
      );
      process.exitCode = 1;
    }
    return;
  }

  await writeFile(outputPath, serialized, 'utf8');
}

function parseSourceReports(values: string[]): Array<{ corpus: string; path: string }> {
  const reports: Array<{ corpus: string; path: string }> = [];
  for (const value of values) {
    if (value.startsWith('--')) break;
    const separator = value.indexOf(':');
    if (separator === -1) {
      reports.push({ corpus: reports.length === 0 ? 'v1' : `corpus-${reports.length + 1}`, path: value });
      continue;
    }
    const corpus = value.slice(0, separator);
    const path = value.slice(separator + 1);
    if (!corpus || !path) throw new Error(`Invalid --reports entry: ${value}`);
    reports.push({ corpus, path });
  }
  return reports;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
