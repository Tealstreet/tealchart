import { execFileSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

import v3Report from '../reports/external-pine-corpus-v3.report.json' with { type: 'json' };
import v4Report from '../reports/external-pine-corpus-v4.report.json' with { type: 'json' };
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import memberMap from '../reports/pine-corpus-member-map-v1.json' with { type: 'json' };
import { hashSource, normalizeHarvestedPineSource } from './refetch-external-pine-corpus.ts';
import type { ExternalCorpusManifest } from './run-external-pine-corpus.ts';

type SearchItem = { repository: { full_name: string }; path: string };
type DeclarationKind = 'indicator' | 'strategy' | 'study' | 'library' | 'unknown';

interface HarvestedScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
  sourceTransform?: NonNullable<ExternalCorpusManifest['scripts'][number]['sourceTransform']>;
  declarationKind: DeclarationKind;
  declaredVersion: number;
  matchedUntouchedMembers: string[];
}

interface SearchStat {
  member: string;
  query: string;
  page: number;
  items: number;
  accepted: number;
  error?: string;
}

const defaultOutputDir = resolve(dirname(dirname(new URL(import.meta.url).pathname)), '.cache/tealscript/pine-corpus-v7-20260911');
const defaultManifestCopy = resolve(dirname(dirname(new URL(import.meta.url).pathname)), 'reports/external-pine-corpus-v7.manifest.json');
const defaultTargetScripts = 1000;
const untouchedMembers = [...(memberMap as any).exercisedByNothingMembers].sort((left, right) => left.localeCompare(right));
const priorSourceKeys = new Set<string>([
  ...(v3Report as any).rows.map((row: any) => `${row.sourceRepoUrl}\u0000${row.sourceFilePath}`),
  ...(v4Report as any).rows.map((row: any) => `${row.sourceRepoUrl}\u0000${row.sourceFilePath}`),
  ...(v5Manifest as any).scripts.map((script: any) => `${script.sourceRepoUrl}\u0000${script.sourceFilePath}`),
  ...(v6Manifest as any).scripts.map((script: any) => `${script.sourceRepoUrl}\u0000${script.sourceFilePath}`),
].filter((key) => !key.startsWith('undefined')));

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

function declarationKind(source: string): DeclarationKind {
  const match = source.match(/^\s*(indicator|strategy|study|library)\s*\(/m);
  return (match?.[1] as DeclarationKind | undefined) ?? 'unknown';
}

function declaredVersion(source: string): number {
  return Number(source.match(/\/\/\s*@version\s*=\s*(\d+)/)?.[1] ?? 0);
}

function stripPineLiteralsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function memberPattern(member: string): RegExp {
  const escaped = member
    .split('.')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*\\.\\s*');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`);
}

const memberPatterns = new Map(untouchedMembers.map((member) => [member, memberPattern(member)]));

function matchedUntouchedMembers(source: string): string[] {
  const stripped = stripPineLiteralsAndComments(source);
  return untouchedMembers.filter((member) => memberPatterns.get(member)!.test(stripped));
}

function containsElidedSourceMarker(source: string): boolean {
  return /^\s*\.{3}\s*(?:(?:\/\/|#).*)?$/mu.test(source);
}

function queriesFor(member: string): string[] {
  return [
    `"${member}" "@version=6" extension:pine`,
    `"${member}" "@version=5" extension:pine`,
    `"${member}" "@version=6" extension:pinescript`,
    `"${member}" "@version=5" extension:pinescript`,
  ];
}

async function maybeAcceptItem(
  item: SearchItem,
  outputDir: string,
  scripts: HarvestedScript[],
  seen: Set<string>,
  minVersion: number,
): Promise<boolean> {
  const repoUrl = `https://github.com/${item.repository.full_name}`;
  const key = `${repoUrl}\u0000${item.path}`;
  if (seen.has(key) || priorSourceKeys.has(key)) return false;
  seen.add(key);

  const commitSha = latestCommit(item.repository.full_name, item.path);
  if (!commitSha) return false;

  let raw: string;
  try {
    raw = await fetchRaw(item.repository.full_name, item.path, commitSha);
  } catch {
    return false;
  }

  const normalized = normalizeHarvestedPineSource(raw);
  const source = normalized.source;
  if (containsElidedSourceMarker(source)) return false;

  const kind = declarationKind(source);
  const pineVersion = declaredVersion(source);
  const matchedMembers = matchedUntouchedMembers(source);
  if (kind === 'unknown' || pineVersion < minVersion || matchedMembers.length === 0) {
    return false;
  }

  const index = scripts.length + 1;
  const localPath = `sources/${String(index).padStart(4, '0')}__${safeSegment(item.repository.full_name)}__${safeSegment(basename(item.path))}`;
  await mkdir(dirname(join(outputDir, localPath)), { recursive: true });
  await writeFile(join(outputDir, localPath), source, 'utf8');
  scripts.push({
    localPath,
    sourceRepoUrl: repoUrl,
    sourceFilePath: item.path,
    commitSha,
    sourceSha256: hashSource(source),
    sourceTransform: normalized.transform,
    declarationKind: kind,
    declaredVersion: pineVersion,
    matchedUntouchedMembers: matchedMembers,
  });
  return true;
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function parseArgs(args: string[]): {
  outputDir: string;
  manifestCopy: string;
  targetScripts: number;
  minVersion: number;
  maxPagesPerQuery: number;
  delayMs: number;
} {
  let outputDir = defaultOutputDir;
  let manifestCopy = defaultManifestCopy;
  let targetScripts = defaultTargetScripts;
  let minVersion = 5;
  let maxPagesPerQuery = 1;
  let delayMs = 7_000;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const value = args[++index] ?? '';
    if (arg === '--output') outputDir = value;
    else if (arg === '--manifest-copy') manifestCopy = value;
    else if (arg === '--target') targetScripts = Number(value);
    else if (arg === '--min-version') minVersion = Number(value);
    else if (arg === '--max-pages-per-query') maxPagesPerQuery = Number(value);
    else if (arg === '--delay-ms') delayMs = Number(value);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!outputDir || !manifestCopy || !Number.isInteger(targetScripts) || targetScripts <= 0) throw new Error('Invalid output, manifest, or target');
  return {
    outputDir: resolve(outputDir),
    manifestCopy: resolve(manifestCopy),
    targetScripts,
    minVersion,
    maxPagesPerQuery,
    delayMs,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await rm(options.outputDir, { recursive: true, force: true });
  await mkdir(join(options.outputDir, 'sources'), { recursive: true });

  const seen = new Set<string>();
  const scripts: HarvestedScript[] = [];
  const searchStats: SearchStat[] = [];
  let searched = 0;

  for (const member of untouchedMembers) {
    if (scripts.length >= options.targetScripts) break;
    for (const query of queriesFor(member)) {
      if (scripts.length >= options.targetScripts) break;
      for (let page = 1; page <= options.maxPagesPerQuery && scripts.length < options.targetScripts; page += 1) {
        searched += 1;
        if (searched > 1) await sleep(options.delayMs);
        let payload: { items?: SearchItem[] };
        try {
          payload = ghJson(['api', '-X', 'GET', 'search/code', '-f', `q=${query}`, '-f', 'per_page=100', '-f', `page=${page}`]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write(`search failed for ${query} page ${page}: ${message}\n`);
          searchStats.push({ member, query, page, items: 0, accepted: 0, error: message });
          break;
        }
        const items = payload.items ?? [];
        let accepted = 0;
        for (const item of items) {
          if (scripts.length >= options.targetScripts) break;
          if (await maybeAcceptItem(item, options.outputDir, scripts, seen, options.minVersion)) accepted += 1;
        }
        searchStats.push({ member, query, page, items: items.length, accepted });
        process.stderr.write(`[v7 harvest] ${member} page ${page}: ${items.length} search hits, ${accepted} accepted, ${scripts.length} total\n`);
        if (items.length === 0) break;
      }
    }
  }

  const reachedUntouchedMembers = [...new Set(scripts.flatMap((script) => script.matchedUntouchedMembers))].sort((left, right) => left.localeCompare(right));
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    method: 'github-code-search-v7-targeted-untouched-members',
    targetScripts: options.targetScripts,
    priorExcludedSourceCount: priorSourceKeys.size,
    minVersion: options.minVersion,
    untouchedMembersTargeted: untouchedMembers,
    reachedUntouchedMembers,
    stillUntouchedMembers: untouchedMembers.filter((member) => !reachedUntouchedMembers.includes(member)),
    searchStats,
    summary: {
      scripts: scripts.length,
      repositories: new Set(scripts.map((script) => script.sourceRepoUrl)).size,
      byVersion: countBy(scripts, (script) => String(script.declaredVersion)),
      byDeclarationKind: countBy(scripts, (script) => script.declarationKind),
      reachedUntouchedMembers: reachedUntouchedMembers.length,
      stillUntouchedMembers: untouchedMembers.length - reachedUntouchedMembers.length,
    },
    scripts,
  };
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(join(options.outputDir, 'manifest.json'), json, 'utf8');
  await mkdir(dirname(options.manifestCopy), { recursive: true });
  await writeFile(options.manifestCopy, json, 'utf8');
  process.stdout.write(`${JSON.stringify(manifest.summary, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
