import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { summarizeExternalPineCorpus } from './run-external-pine-corpus.ts';
import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';

export interface PinnedReport extends ExternalCorpusReport {
  measurementCommitSha: string;
  measurementSource: 'git-archive';
  measurementShard?: {
    index: number;
    count: number;
  };
}

interface ManifestEntry {
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceTransform?: PinnedReport['rows'][number]['sourceTransform'];
}

async function load(path: string): Promise<PinnedReport> {
  return JSON.parse(await readFile(path, 'utf8')) as PinnedReport;
}

export function mergePinnedCorpusReports(reports: PinnedReport[], timeoutRows: PinnedReport['rows'] = []): PinnedReport {
  if (reports.length === 0) throw new Error('At least one pinned report is required');
  const commits = new Set(reports.map((report) => report.measurementCommitSha));
  if (commits.size !== 1) throw new Error(`All shard reports must use one commit: ${[...commits].join(', ')}`);
  const rows = [...reports.flatMap((report) => report.rows), ...timeoutRows];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.localPath)) throw new Error(`Duplicate corpus row across shard reports: ${row.localPath}`);
    seen.add(row.localPath);
  }
  rows.sort((left, right) => left.localPath.localeCompare(right.localPath));
  const mergedBase = { ...reports[0]! };
  delete mergedBase.measurementShard;
  return {
    ...mergedBase,
    generatedAt: new Date().toISOString(),
    inputDir: reports[0]!.inputDir,
    rows,
    summary: summarizeExternalPineCorpus(rows),
  };
}

function parseArgs(args: string[]): { inputs: string[]; output: string; timeoutRows: string[] } {
  const inputs: string[] = [];
  const timeoutRows: string[] = [];
  let output = '';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--input') inputs.push(args[++index] ?? '');
    else if (arg === '--output') output = args[++index] ?? '';
    else if (arg === '--timeout-row') timeoutRows.push(args[++index] ?? '');
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (inputs.length === 0 || inputs.some((input) => !input) || !output) {
    throw new Error('Usage: pine:external-corpus:merge-pinned --input shard.json [--input shard.json ...] --output report.json');
  }
  return { inputs, output, timeoutRows };
}

async function buildTimeoutRows(report: PinnedReport, localPaths: string[]): Promise<PinnedReport['rows']> {
  if (localPaths.length === 0) return [];
  const manifest = JSON.parse(await readFile(join(report.inputDir, 'manifest.json'), 'utf8')) as { scripts: ManifestEntry[] };
  const byPath = new Map(manifest.scripts.map((entry) => [entry.localPath, entry]));
  return Promise.all(localPaths.map(async (localPath) => {
    const entry = byPath.get(localPath);
    if (!entry) throw new Error(`Timeout row is absent from pinned manifest: ${localPath}`);
    const source = await readFile(join(report.inputDir, localPath), 'utf8');
    const version = Number(source.match(/\/\/\s*@version\s*=\s*(\d+)/)?.[1] ?? 0);
    const declaration = source.match(/^\s*(indicator|strategy|study|library)\s*\(/m)?.[1];
    const stage = { status: 'not-run' as const };
    return {
      id: `${localPath}:${entry.commitSha ?? 'unknown'}`,
      localPath,
      sourceRepoUrl: entry.sourceRepoUrl,
      sourceFilePath: entry.sourceFilePath,
      commitSha: entry.commitSha,
      sourceTransform: entry.sourceTransform,
      declaredVersion: version || 'unknown',
      declarationKind: (declaration ?? 'unknown') as PinnedReport['rows'][number]['declarationKind'],
      byteSize: Buffer.byteLength(source, 'utf8'),
      validity: {
        bucket: 'tealscript-gap' as const,
        reason: 'The pinned classifier timed out during execution after a 45s isolated-row limit; parser and execution scale require follow-up.',
      },
      firstFailedStage: 'execute' as const,
      outcome: 'failed' as const,
      executionMode: 'not-run' as const,
      fallbackReasons: [],
      output: { produced: false, plots: 0, drawings: 0, alerts: 0, logs: 0 },
      outputParity: { status: 'not-run' as const },
      strategyLedgerParity: { compiledLedger: { status: 'not-run' as const } },
      stages: {
        parse: stage,
        semantic: stage,
        compile: stage,
        execute: { status: 'failed' as const, diagnostic: 'external corpus classifier timeout after 45s on isolated row' },
        output: stage,
      },
    };
  }));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const reports = await Promise.all(args.inputs.map(load));
  const timeoutRows = await buildTimeoutRows(reports[0]!, args.timeoutRows);
  const merged = mergePinnedCorpusReports(reports, timeoutRows);
  await writeFile(args.output, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ measurementCommitSha: merged.measurementCommitSha, rows: merged.rows.length, summary: merged.summary })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
