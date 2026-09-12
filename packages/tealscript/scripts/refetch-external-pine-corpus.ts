import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashSource, normalizeHarvestedPineSource } from '../src/compat/externalCorpusSource.ts';

import type { ExternalCorpusManifest, ExternalCorpusReport } from './run-external-pine-corpus.ts';

export { hashSource, normalizeHarvestedPineSource };

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);

interface RefetchOptions {
  reportPath?: string;
  manifestPath?: string;
  outputDir: string;
}

interface RefetchSummary {
  outputDir: string;
  scripts: number;
  repositories: number;
  bytesMatched?: number;
  hashesMatched: number;
  manifestPath: string;
  refetchedFrom: string;
}

interface ManifestRefetchRow {
  localPath: string;
  sourceRepoUrl?: string;
  sourceFilePath?: string;
  commitSha?: string;
  sourceSha256?: string;
  sourceTransform?: ExternalCorpusManifest['scripts'][number]['sourceTransform'];
  byteSize?: number;
}

export async function refetchExternalPineCorpus(options: RefetchOptions): Promise<RefetchSummary> {
  const outputDir = resolveOutputPath(options.outputDir);
  if (options.reportPath && options.manifestPath) throw new Error('Use either --report or --manifest, not both');
  const rows = await readRefetchRows(options);
  const refetchedFrom = options.manifestPath
    ? resolveInputPath(options.manifestPath)
    : options.reportPath
      ? resolveInputPath(options.reportPath)
      : 'packages/tealscript/reports/external-pine-corpus-v1.report.json';
  const sourcesDir = join(outputDir, 'sources');

  await rm(sourcesDir, { force: true, recursive: true });
  await mkdir(sourcesDir, { recursive: true });

  const scripts: ExternalCorpusManifest['scripts'] = [];
  let bytesMatched = 0;
  let hashesMatched = 0;
  for (const row of rows) {
    const sourceRepoUrl = requireField(row, 'sourceRepoUrl');
    const sourceFilePath = requireField(row, 'sourceFilePath');
    const commitSha = requireField(row, 'commitSha');
    const rawSource = await fetchRawGithubSource(sourceRepoUrl, sourceFilePath, commitSha);
    const normalized = normalizeHarvestedPineSource(rawSource);
    const source = normalized.source;
    const byteSize = Buffer.byteLength(source, 'utf8');
    if (row.byteSize !== undefined && byteSize !== row.byteSize) {
      throw new Error(`${row.localPath} byte-size mismatch: expected ${row.byteSize}, got ${byteSize}`);
    }
    const sourceSha256 = hashSource(source);
    if (row.sourceSha256 && sourceSha256 !== row.sourceSha256) {
      throw new Error(`${row.localPath} sha256 mismatch: expected ${row.sourceSha256}, got ${sourceSha256}`);
    }

    const localPath = row.localPath;
    await mkdir(dirname(join(outputDir, localPath)), { recursive: true });
    await writeFile(join(outputDir, localPath), source, 'utf8');
    scripts.push({ localPath, sourceRepoUrl, sourceFilePath, commitSha, sourceSha256, sourceTransform: normalized.transform ?? row.sourceTransform });
    if (row.byteSize !== undefined) bytesMatched += 1;
    if (row.sourceSha256) hashesMatched += 1;
  }

  const manifest: ExternalCorpusManifest & { schemaVersion: number; generatedAt: string; refetchedFromReport: string } = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    refetchedFromReport: refetchedFrom,
    scripts,
  };
  const manifestPath = join(outputDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    outputDir,
    scripts: scripts.length,
    repositories: new Set(scripts.map((script) => script.sourceRepoUrl)).size,
    bytesMatched: rows.some((row) => row.byteSize !== undefined) ? bytesMatched : undefined,
    hashesMatched,
    manifestPath,
    refetchedFrom,
  };
}


function requireField(row: ManifestRefetchRow, field: 'sourceRepoUrl' | 'sourceFilePath' | 'commitSha'): string {
  const value = row[field];
  if (!value) throw new Error(`${row.localPath} is missing ${field}`);
  return value;
}

async function readRefetchRows(options: RefetchOptions): Promise<ManifestRefetchRow[]> {
  if (options.manifestPath) {
    const manifest = await readManifest(resolveInputPath(options.manifestPath));
    return manifest.scripts;
  }
  // `reports/` is generated output and not tracked, so there is no committed
  // default to import. An absent report throws here, which is the honest
  // failure: run the corpus first.
  const report = await readReport(resolveInputPath(options.reportPath ?? 'packages/tealscript/reports/external-pine-corpus-v1.report.json'));
  return report.rows;
}

async function readReport(path: string): Promise<ExternalCorpusReport> {
  const mod = await import(pathToFileURL(path).href, { with: { type: 'json' } });
  return mod.default as ExternalCorpusReport;
}

async function readManifest(path: string): Promise<ExternalCorpusManifest> {
  const mod = await import(pathToFileURL(path).href, { with: { type: 'json' } });
  return mod.default as ExternalCorpusManifest;
}

function resolveInputPath(path: string): string {
  return path.startsWith('/') ? path : resolve(repoRoot, path);
}

function resolveOutputPath(path: string): string {
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
  let manifestPath: string | undefined;
  let outputDir = '/tmp/pine-corpus-v1';
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--report') {
      reportPath = args[++index];
    } else if (arg === '--manifest') {
      manifestPath = args[++index];
    } else if (arg === '--output') {
      outputDir = args[++index] ?? '';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!outputDir) throw new Error('Missing --output directory');
  return { reportPath, manifestPath, outputDir };
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
