import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import corpusV1Report from '../reports/external-pine-corpus-v1.report.json' with { type: 'json' };
import type { ExternalCorpusManifest, ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);

interface RefetchOptions {
  reportPath?: string;
  outputDir: string;
}

interface RefetchSummary {
  outputDir: string;
  scripts: number;
  repositories: number;
  bytesMatched: number;
  manifestPath: string;
}

export async function refetchExternalPineCorpus(options: RefetchOptions): Promise<RefetchSummary> {
  const outputDir = resolve(options.outputDir);
  const report = options.reportPath ? await readReport(resolveInputPath(options.reportPath)) : corpusV1Report as unknown as ExternalCorpusReport;
  const sourcesDir = join(outputDir, 'sources');

  await rm(sourcesDir, { force: true, recursive: true });
  await mkdir(sourcesDir, { recursive: true });

  const scripts: ExternalCorpusManifest['scripts'] = [];
  let bytesMatched = 0;
  for (const row of report.rows) {
    const sourceRepoUrl = requireField(row, 'sourceRepoUrl');
    const sourceFilePath = requireField(row, 'sourceFilePath');
    const commitSha = requireField(row, 'commitSha');
    const source = await fetchRawGithubSource(sourceRepoUrl, sourceFilePath, commitSha);
    const byteSize = Buffer.byteLength(source, 'utf8');
    if (byteSize !== row.byteSize) {
      throw new Error(`${row.localPath} byte-size mismatch: expected ${row.byteSize}, got ${byteSize}`);
    }

    const localPath = row.localPath;
    await mkdir(dirname(join(outputDir, localPath)), { recursive: true });
    await writeFile(join(outputDir, localPath), source, 'utf8');
    scripts.push({ localPath, sourceRepoUrl, sourceFilePath, commitSha });
    bytesMatched += 1;
  }

  const manifest: ExternalCorpusManifest & { schemaVersion: number; generatedAt: string; refetchedFromReport: string } = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    refetchedFromReport: options.reportPath ?? 'packages/tealscript/reports/external-pine-corpus-v1.report.json',
    scripts,
  };
  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    outputDir,
    scripts: scripts.length,
    repositories: new Set(scripts.map((script) => script.sourceRepoUrl)).size,
    bytesMatched,
    manifestPath,
  };
}

function requireField(row: ExternalCorpusReportRow, field: 'sourceRepoUrl' | 'sourceFilePath' | 'commitSha'): string {
  const value = row[field];
  if (!value) throw new Error(`${row.localPath} is missing ${field}`);
  return value;
}

async function readReport(path: string): Promise<ExternalCorpusReport> {
  const mod = await import(pathToFileURL(path).href, { with: { type: 'json' } });
  return mod.default as ExternalCorpusReport;
}

function resolveInputPath(path: string): string {
  return path.startsWith('/') ? path : resolve(repoRoot, path);
}

async function fetchRawGithubSource(repoUrl: string, filePath: string, commitSha: string): Promise<string> {
  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (!match) throw new Error(`Unsupported GitHub repository URL: ${repoUrl}`);
  const [, owner, repo] = match;
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commitSha}/${encodedPath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseArgs(args: string[]): RefetchOptions {
  let reportPath: string | undefined;
  let outputDir = '/tmp/pine-corpus-v1';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--report') {
      reportPath = args[++index];
    } else if (arg === '--output') {
      outputDir = args[++index] ?? '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!outputDir) throw new Error('Missing --output directory');
  return { reportPath, outputDir };
}

async function main(): Promise<void> {
  const summary = await refetchExternalPineCorpus(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
