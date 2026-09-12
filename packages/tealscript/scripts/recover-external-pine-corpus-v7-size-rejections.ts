#!/usr/bin/env tsx

import { basename, dirname, join, resolve } from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';

import rejectionAudit from '../reports/external-pine-corpus-v7.rejection-audit-v1.json' with { type: 'json' };
import { hashSource, normalizeHarvestedPineSource } from './refetch-external-pine-corpus.ts';
import type { ExternalCorpusManifest } from './run-external-pine-corpus.ts';

type SizeReason = 'too-small' | 'too-large';
type DeclarationKind = 'indicator' | 'strategy' | 'study' | 'library' | 'unknown';

interface RejectedCandidate {
  repo: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
  bytes: number;
  declarationKind: DeclarationKind;
  declaredVersion: number;
  matchedUntouchedMembers: string[];
  reason: SizeReason;
  member: string;
  query: string;
}

type ExternalCorpusScript = ExternalCorpusManifest['scripts'][number];

interface RecoveredScript extends ExternalCorpusScript {
  declarationKind: DeclarationKind;
  declaredVersion: number;
  matchedUntouchedMembers: string[];
  recoveryReason: SizeReason;
  recoveryClass: 'undersized' | 'oversized';
  originalBytes: number;
  recoverySearchMember: string;
  recoverySearchQuery: string;
}

const root = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const defaultOutputDir = join(root, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
const defaultManifestCopy = join(root, 'reports/external-pine-corpus-v7-size-recovery.manifest.json');

function parseArgs(args: string[]): { outputDir: string; manifestCopy: string } {
  let outputDir = defaultOutputDir;
  let manifestCopy = defaultManifestCopy;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const value = args[++index] ?? '';
    if (arg === '--output') outputDir = value;
    else if (arg === '--manifest-copy') manifestCopy = value;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { outputDir: resolve(outputDir), manifestCopy: resolve(manifestCopy) };
}

function encodedPath(filePath: string): string {
  return filePath.split('/').map(encodeURIComponent).join('/');
}

async function fetchRaw(repo: string, filePath: string, commitSha: string): Promise<string> {
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commitSha}/${encodedPath(filePath)}`);
  if (!response.ok) throw new Error(`raw fetch failed ${response.status} for ${repo}/${filePath}@${commitSha}`);
  return response.text();
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'source';
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const candidates = ((rejectionAudit as any).suspectRejectedCandidates as RejectedCandidate[])
    .filter((candidate) => candidate.reason === 'too-small' || candidate.reason === 'too-large')
    .sort((left, right) => left.reason.localeCompare(right.reason) || left.sourceRepoUrl.localeCompare(right.sourceRepoUrl) || left.sourceFilePath.localeCompare(right.sourceFilePath));

  await rm(options.outputDir, { recursive: true, force: true });
  await mkdir(join(options.outputDir, 'sources'), { recursive: true });

  const scripts: RecoveredScript[] = [];
  for (const candidate of candidates) {
    const raw = await fetchRaw(candidate.repo, candidate.sourceFilePath, candidate.commitSha);
    const normalized = normalizeHarvestedPineSource(raw);
    const source = normalized.source;
    const actualHash = hashSource(source);
    const actualBytes = Buffer.byteLength(source, 'utf8');
    if (actualHash !== candidate.sourceSha256) {
      throw new Error(`hash mismatch for ${candidate.sourceRepoUrl}/${candidate.sourceFilePath}: ${actualHash} !== ${candidate.sourceSha256}`);
    }
    if (actualBytes !== candidate.bytes) {
      throw new Error(`byte count mismatch for ${candidate.sourceRepoUrl}/${candidate.sourceFilePath}: ${actualBytes} !== ${candidate.bytes}`);
    }

    const recoveryClass = candidate.reason === 'too-large' ? 'oversized' : 'undersized';
    const index = scripts.length + 1;
    const localPath = `sources/${recoveryClass}/${String(index).padStart(4, '0')}__${safeSegment(candidate.repo)}__${safeSegment(basename(candidate.sourceFilePath))}`;
    await mkdir(dirname(join(options.outputDir, localPath)), { recursive: true });
    await writeFile(join(options.outputDir, localPath), source, 'utf8');
    scripts.push({
      localPath,
      sourceRepoUrl: candidate.sourceRepoUrl,
      sourceFilePath: candidate.sourceFilePath,
      commitSha: candidate.commitSha,
      sourceSha256: candidate.sourceSha256,
      sourceTransform: normalized.transform,
      declarationKind: candidate.declarationKind,
      declaredVersion: candidate.declaredVersion,
      matchedUntouchedMembers: candidate.matchedUntouchedMembers,
      recoveryReason: candidate.reason,
      recoveryClass,
      originalBytes: candidate.bytes,
      recoverySearchMember: candidate.member,
      recoverySearchQuery: candidate.query,
    });
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceAudit: 'external-pine-corpus-v7.rejection-audit-v1.json',
    recoveryMethod: 'Pinned raw fetch of the 50 v7 candidates rejected only by byte-size thresholds; source hashes and byte counts are re-verified before writing.',
    summary: {
      scripts: scripts.length,
      oversized: scripts.filter((script) => script.recoveryClass === 'oversized').length,
      undersized: scripts.filter((script) => script.recoveryClass === 'undersized').length,
      byVersion: countBy(scripts, (script) => String(script.declaredVersion)),
      byDeclarationKind: countBy(scripts, (script) => script.declarationKind),
      targetedUntouchedMembers: [...new Set(scripts.flatMap((script) => script.matchedUntouchedMembers))].sort().length,
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
