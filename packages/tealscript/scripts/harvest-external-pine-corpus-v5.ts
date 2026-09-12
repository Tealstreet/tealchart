import { execFileSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import v3Report from '../reports/external-pine-corpus-v3.report.json' with { type: 'json' };
import v4Report from '../reports/external-pine-corpus-v4.report.json' with { type: 'json' };
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import { hashSource, normalizeHarvestedPineSource } from './refetch-external-pine-corpus.ts';

type SearchItem = { repository: { full_name: string }; path: string };

const defaultOutputDir = '/tmp/pine-corpus-v5';
const defaultTargetScripts = 1000;
const baseExcludedSourceKeys = new Set<string>([
  ...(v3Report as any).rows.map((row: any) => `${row.sourceRepoUrl}\u0000${row.sourceFilePath}`),
  ...(v4Report as any).rows.map((row: any) => `${row.sourceRepoUrl}\u0000${row.sourceFilePath}`),
].filter((key) => !key.startsWith('undefined')));
const v5ExcludedSourceKeys = new Set<string>(
  (v5Manifest as any).scripts
    .map((script: any) => `${script.sourceRepoUrl}\u0000${script.sourceFilePath}`)
    .filter((key: string) => !key.startsWith('undefined')),
);
const queries = [
  '"indicator(" "@version=6" extension:pine',
  '"indicator(" "@version=5" extension:pine',
  '"strategy(" "@version=6" extension:pine',
  '"strategy(" "@version=5" extension:pine',
  '"library(" "@version=6" extension:pine',
  '"library(" "@version=5" extension:pine',
  '"indicator(" "@version=6" extension:pinescript',
  '"indicator(" "@version=5" extension:pinescript',
  '"strategy(" "@version=6" extension:pinescript',
  '"strategy(" "@version=5" extension:pinescript',
  '"//@version=6" indicator extension:pine',
  '"//@version=5" indicator extension:pine',
  '"//@version=6" strategy extension:pine',
  '"//@version=5" strategy extension:pine',
  '"//@version=6" library extension:pine',
  '"//@version=5" library extension:pine',
  '"//@version=6" request.security extension:pine',
  '"//@version=5" request.security extension:pine',
  '"//@version=6" ta. extension:pine',
  '"//@version=5" ta. extension:pine',
  '"PineScript code:" indicator extension:txt',
  '"PineScript code:" strategy extension:txt',
];

interface SeedSpec {
  root: string;
  repoUrl: string;
}

function ghJson(args: string[]): any {
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'source';
}

function encodedPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

async function fetchRaw(repo: string, path: string, commit: string): Promise<string> {
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${encodedPath(path)}`);
  if (!response.ok) throw new Error(`raw fetch failed ${response.status}`);
  return response.text();
}

function latestCommit(repo: string, path: string): string | undefined {
  try {
    const commits = ghJson(['api', `repos/${repo}/commits?path=${encodedPath(path)}&per_page=1`]);
    return commits?.[0]?.sha;
  } catch {
    return undefined;
  }
}

function declarationKind(source: string): 'indicator' | 'strategy' | 'study' | 'library' | 'unknown' {
  const match = source.match(/^\s*(indicator|strategy|study|library)\s*\(/m);
  return (match?.[1] as 'indicator' | 'strategy' | 'study' | 'library' | undefined) ?? 'unknown';
}

function version(source: string): number {
  return Number(source.match(/\/\/\s*@version\s*=\s*(\d+)/)?.[1] ?? 0);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const outputDir = options.outputDir;
  const targetScripts = options.targetScripts;
  const minVersion = options.minVersion;
  const excludedSourceKeys = new Set<string>([
    ...baseExcludedSourceKeys,
    ...(options.excludeV5 ? [...v5ExcludedSourceKeys] : []),
  ]);
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(join(outputDir, 'sources'), { recursive: true });

  const seen = new Set<string>();
  const scripts: any[] = [];
  let index = 0;
  for (const seed of options.seeds) {
    const commitSha = execFileSync('git', ['-C', seed.root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const files = execFileSync('git', ['-C', seed.root, 'ls-files', '-z', '--', '*.pine'], { encoding: 'utf8' })
      .split('\0').filter(Boolean);
    for (const sourceFilePath of files) {
      if (scripts.length >= targetScripts) break;
      const key = `${seed.repoUrl}\u0000${sourceFilePath}`;
      if (seen.has(key) || excludedSourceKeys.has(key)) continue;
      seen.add(key);
      const raw = await readFile(join(seed.root, sourceFilePath), 'utf8');
      const normalized = normalizeHarvestedPineSource(raw);
      const source = normalized.source;
      if (containsElidedSourceMarker(source)) continue;
      const bytes = Buffer.byteLength(source, 'utf8');
      const kind = declarationKind(source);
      const pineVersion = version(source);
      if (bytes < 120 || bytes > 180_000 || kind === 'unknown' || pineVersion < minVersion) continue;
      if (isKindCapReached(kind, scripts, options.kindCaps)) continue;
      index += 1;
      const localPath = `sources/${String(index).padStart(4, '0')}__${safeSegment(seed.repoUrl.replace('https://github.com/', ''))}__${safeSegment(basename(sourceFilePath))}`;
      await mkdir(dirname(join(outputDir, localPath)), { recursive: true });
      await writeFile(join(outputDir, localPath), source, 'utf8');
      scripts.push({ localPath, sourceRepoUrl: seed.repoUrl, sourceFilePath, commitSha, sourceSha256: hashSource(source), sourceTransform: normalized.transform, declarationKind: kind, declaredVersion: pineVersion });
    }
  }
  for (const query of queries) {
    for (let page = 1; page <= 10 && scripts.length < targetScripts; page += 1) {
      let payload: { items?: SearchItem[] };
      try {
        if (page > 1 || scripts.length > 0) await sleep(7_000);
        payload = ghJson(['api', '-X', 'GET', 'search/code', '-f', `q=${query}`, '-f', 'per_page=100', '-f', `page=${page}`]);
      } catch (error) {
        process.stderr.write(`search failed for ${query} page ${page}: ${String(error)}\n`);
        break;
      }
      const items = payload.items ?? [];
      if (items.length === 0) break;
      for (const item of items) {
        if (scripts.length >= targetScripts) break;
        const repoUrl = `https://github.com/${item.repository.full_name}`;
        const key = `${repoUrl}\u0000${item.path}`;
        if (seen.has(key) || excludedSourceKeys.has(key)) continue;
        seen.add(key);
        const commitSha = latestCommit(item.repository.full_name, item.path);
        if (!commitSha) continue;
        let raw: string;
        try {
          raw = await fetchRaw(item.repository.full_name, item.path, commitSha);
        } catch {
          continue;
        }
        const normalized = normalizeHarvestedPineSource(raw);
        const source = normalized.source;
        if (containsElidedSourceMarker(source)) continue;
        const bytes = Buffer.byteLength(source, 'utf8');
        const kind = declarationKind(source);
        const pineVersion = version(source);
        if (bytes < 120 || bytes > 180_000 || kind === 'unknown' || pineVersion < minVersion) continue;
        if (isKindCapReached(kind, scripts, options.kindCaps)) continue;
        index += 1;
        const localPath = `sources/${String(index).padStart(4, '0')}__${safeSegment(item.repository.full_name)}__${safeSegment(basename(item.path))}`;
        await mkdir(dirname(join(outputDir, localPath)), { recursive: true });
        await writeFile(join(outputDir, localPath), source, 'utf8');
        scripts.push({ localPath, sourceRepoUrl: repoUrl, sourceFilePath: item.path, commitSha, sourceSha256: hashSource(source), sourceTransform: normalized.transform, declarationKind: kind, declaredVersion: pineVersion });
      }
    }
  }

  await writeFile(join(outputDir, 'manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    method: options.method,
    targetScripts,
    excludedSourceCount: excludedSourceKeys.size,
    minVersion,
    scripts,
  }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    outputDir,
    scripts: scripts.length,
    repositories: new Set(scripts.map((script: any) => script.sourceRepoUrl)).size,
  }, null, 2)}\n`);
}

function parseArgs(args: string[]): { outputDir: string; targetScripts: number; seeds: SeedSpec[]; excludeV5: boolean; minVersion: number; method: string; kindCaps: Map<string, number> } {
  let outputDir = defaultOutputDir;
  let targetScripts = defaultTargetScripts;
  let excludeV5 = false;
  let minVersion = 4;
  let method = 'github-code-search-v5';
  const kindCaps = new Map<string, number>();
  const seeds: SeedSpec[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--exclude-v5') {
      excludeV5 = true;
      continue;
    }
    const value = args[++index] ?? '';
    if (arg === '--output') outputDir = value;
    else if (arg === '--target') targetScripts = Number(value);
    else if (arg === '--min-version') minVersion = Number(value);
    else if (arg === '--method') method = value;
    else if (arg === '--max-kind') {
      const separator = value.indexOf('=');
      const kind = value.slice(0, separator);
      const cap = Number(value.slice(separator + 1));
      if (separator <= 0 || !Number.isInteger(cap) || cap < 0) throw new Error('--max-kind expects kind=count');
      kindCaps.set(kind, cap);
    }
    else if (arg === '--seed') {
      const separator = value.indexOf('=');
      if (separator <= 0 || separator === value.length - 1) throw new Error('--seed expects repo-url=local-repository-path');
      seeds.push({ repoUrl: value.slice(0, separator), root: value.slice(separator + 1) });
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!outputDir || !Number.isInteger(targetScripts) || targetScripts <= 0 || !Number.isInteger(minVersion) || minVersion < 1) throw new Error('Invalid output, target, or min version');
  return { outputDir, targetScripts, seeds, excludeV5, minVersion, method, kindCaps };
}

function containsElidedSourceMarker(source: string): boolean {
  return /^\s*\.{3}\s*(?:(?:\/\/|#).*)?$/mu.test(source);
}

function isKindCapReached(kind: string, scripts: any[], kindCaps: Map<string, number>): boolean {
  const cap = kindCaps.get(kind);
  if (cap === undefined) return false;
  return scripts.filter((script: any) => script.declarationKind === kind).length >= cap;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
