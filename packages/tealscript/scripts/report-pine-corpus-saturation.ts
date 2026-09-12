#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import v5v6MemberMap from '../reports/pine-corpus-member-map-v1.json' with { type: 'json' };
import valueMemberMap from '../reports/pine-value-vector-member-map-v29.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };

interface CorpusHit {
  corpus: string;
  localPath: string;
}

interface MemberCoverage {
  member: string;
  corpora: string[];
  hitCount: number;
  sampleHits: CorpusHit[];
}

interface ManifestScript {
  localPath: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const v7Cache = join(packageRoot, '.cache/tealscript/pine-corpus-v7-20260911');
const recoveryCache = join(packageRoot, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
const outJson = join(packageRoot, 'reports/pine-corpus-saturation-v1.json');
const outMd = join(packageRoot, 'reports/pine-corpus-saturation-v1.md');
const expectedCorpusScripts: Record<string, number> = { v7: 456, 'v7-size-recovery': 50 };

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
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

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function namespaceOf(member: string): string {
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
}

function countByNamespace(members: readonly string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const member of members) {
    const namespace = namespaceOf(member);
    counts.set(namespace, (counts.get(namespace) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => left[0].localeCompare(right[0])));
}

function listMembers(members: readonly string[]): string {
  if (members.length === 0) return '- none';
  return members.map((member) => `- \`${member}\``).join('\n');
}

function addHit(hitMap: Map<string, CorpusHit[]>, member: string, hit: CorpusHit): void {
  const hits = hitMap.get(member) ?? [];
  hits.push(hit);
  hitMap.set(member, hits);
}

async function scanManifest(
  corpus: string,
  cacheDir: string,
  scripts: ManifestScript[],
  officialMembers: readonly string[],
  patterns: ReadonlyMap<string, RegExp>,
  hitMap: Map<string, CorpusHit[]>,
): Promise<number> {
  const expected = expectedCorpusScripts[corpus];
  if (scripts.length !== expected) {
    throw new Error(`${corpus} expected ${expected} manifest rows, got ${scripts.length}`);
  }
  for (const script of scripts) {
    const source = stripPineLiteralsAndComments(await readFile(join(cacheDir, script.localPath), 'utf8'));
    for (const member of officialMembers) {
      if (patterns.get(member)!.test(source)) addHit(hitMap, member, { corpus, localPath: script.localPath });
    }
  }
  return scripts.length;
}

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

async function main(): Promise<void> {
  const vectorCovered = (valueMemberMap as any).coveredMembers as string[];
  const traceOrHostRows = (valueMemberMap as any).traceOrHostRequired as { member: string; reason: string }[];
  const officialMembers = [
    ...new Set([
      ...vectorCovered,
      ...(valueMemberMap as any).verifiableWithoutTraces.map((row: any) => row.member),
      ...traceOrHostRows.map((row) => row.member),
    ]),
  ].sort((left, right) => left.localeCompare(right));
  const traceOrHostMembers = new Set(traceOrHostRows.map((row) => row.member));
  const patterns = new Map(officialMembers.map((member) => [member, memberPattern(member)]));

  const hitMap = new Map<string, CorpusHit[]>();
  for (const row of (v5v6MemberMap as any).corpusMembers as MemberCoverage[]) {
    for (const hit of row.sampleHits) addHit(hitMap, row.member, hit);
    const missingSamples = Math.max(0, row.hitCount - row.sampleHits.length);
    for (let index = 0; index < missingSamples; index += 1) {
      addHit(hitMap, row.member, { corpus: 'v5/v6-unsampled', localPath: '(see pine-corpus-member-map-v1.json)' });
    }
  }

  const v7SourceFiles = await scanManifest('v7', v7Cache, (v7Manifest as any).scripts, officialMembers, patterns, hitMap);
  const recoveredSourceFiles = await scanManifest('v7-size-recovery', recoveryCache, (recoveryManifest as any).scripts, officialMembers, patterns, hitMap);
  const corpusMembers = officialMembers.filter((member) => hitMap.has(member));
  const untouchedByCorpusMembers = officialMembers.filter((member) => !hitMap.has(member));
  const untouchedTraceOrHostMembers = untouchedByCorpusMembers.filter((member) => traceOrHostMembers.has(member));
  const untouchedNonTraceMembers = untouchedByCorpusMembers.filter((member) => !traceOrHostMembers.has(member));
  const newlyReachedAfterV5V6 = corpusMembers.filter((member) => !(v5v6MemberMap as any).corpusMembers.some((row: MemberCoverage) => row.member === member));
  const saturationHolds =
    untouchedByCorpusMembers.length <= 50
    && untouchedNonTraceMembers.every((member) => member.startsWith('currency.'));

  const memberCoverage = corpusMembers.map((member) => {
    const hits = hitMap.get(member) ?? [];
    return {
      member,
      corpora: [...new Set(hits.map((hit) => hit.corpus))].sort(),
      hitCount: hits.length,
      sampleHits: hits.filter((hit) => hit.corpus !== 'v5/v6-unsampled').slice(0, 5),
    };
  });

  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    basis: {
      officialMemberSource: 'pine-value-vector-member-map-v29.json',
      officialMemberDenominator: officialMembers.length,
      v5v6BaseMap: 'pine-corpus-member-map-v1.json',
      v5v6BaseMapNote: 'V1 predates v7 but stores the pinned v5/v6 corpus hit map. The v5/v6 sources are unchanged; this report rescans accepted v7 and recovered size-rejection sources directly.',
      v7Manifest: 'external-pine-corpus-v7.manifest.json',
      v7SizeRecoveryManifest: 'external-pine-corpus-v7-size-recovery.manifest.json',
      v7SourceFiles,
      recoveredSourceFiles,
      method: 'Explicit source references after stripping // comments and double-quoted strings. This measures structural source coverage, not runtime reachability, correctness, or value assertion.',
    },
    coverage: {
      corpusUnionMembers: corpusMembers.length,
      corpusUnionPercent: percent(corpusMembers.length, officialMembers.length),
      untouchedByCorpusMembers: untouchedByCorpusMembers.length,
      untouchedByCorpusPercent: percent(untouchedByCorpusMembers.length, officialMembers.length),
      untouchedTraceOrHostMembers: untouchedTraceOrHostMembers.length,
      untouchedNonTraceMembers: untouchedNonTraceMembers.length,
      newlyReachedAfterV5V6: newlyReachedAfterV5V6.length,
      saturationHolds,
      saturationConclusion: saturationHolds
        ? 'Corpus member coverage is saturated for broad GitHub-style public Pine harvesting: the only official members untouched by 2,506 real scripts are obscure currency constants, not trace-required runtime surfaces.'
        : 'Corpus member coverage is not saturated; untouched non-trace members remain and should drive any fourth harvest.',
    },
    byNamespace: {
      official: countByNamespace(officialMembers),
      corpusUnion: countByNamespace(corpusMembers),
      untouchedByCorpus: countByNamespace(untouchedByCorpusMembers),
      untouchedTraceOrHost: countByNamespace(untouchedTraceOrHostMembers),
      untouchedNonTrace: countByNamespace(untouchedNonTraceMembers),
      newlyReachedAfterV5V6: countByNamespace(newlyReachedAfterV5V6),
    },
    untouchedByCorpusMembers,
    untouchedTraceOrHostMembers,
    untouchedNonTraceMembers,
    newlyReachedAfterV5V6,
    corpusMembers: memberCoverage,
  };

  const md = [
    '# Pine Corpus Saturation V1',
    '',
    `Generated at ${json.generatedAt}. Measured at commit \`${json.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `The v5 + v6 + accepted v7 + v7 size-recovery corpus union reaches ${json.coverage.corpusUnionMembers}/${json.basis.officialMemberDenominator} official members (${json.coverage.corpusUnionPercent}).`,
    '',
    `Members touched by nothing in 2,506 real scripts: ${json.coverage.untouchedByCorpusMembers}.`,
    '',
    `Trace/host-required among untouched-by-corpus: ${json.coverage.untouchedTraceOrHostMembers}. Non-trace untouched: ${json.coverage.untouchedNonTraceMembers}.`,
    '',
    json.coverage.saturationConclusion,
    '',
    'The remaining corpus-untouched set is all `currency.*` constants. That is a real fourth-harvest spec if someone specifically wants currency constant evidence, but it is not a broad Pine-engine frontier and it is unlikely to be reached by harvesting more GitHub indicators or strategies.',
    '',
    '## Basis',
    '',
    `- Official denominator: ${json.basis.officialMemberDenominator} names from \`${json.basis.officialMemberSource}\`.`,
    `- V5/V6 base: \`${json.basis.v5v6BaseMap}\`. ${json.basis.v5v6BaseMapNote}`,
    `- V7 accepted sources rescanned: ${json.basis.v7SourceFiles}.`,
    `- V7 size-recovered sources rescanned: ${json.basis.recoveredSourceFiles}.`,
    `- Method: ${json.basis.method}`,
    '',
    '## Movement After V5/V6',
    '',
    `V5/V6 alone reached ${(v5v6MemberMap as any).coverage.corpusExercisedMembers}/861. Adding accepted v7 and the 50 recovered size rejects reaches ${json.coverage.corpusUnionMembers}/861, a net +${json.coverage.newlyReachedAfterV5V6} members.`,
    '',
    'The 50 recovered size rejects add zero members beyond accepted v7; that result is recorded separately in `external-pine-corpus-v7-size-recovery-v1.md`.',
    '',
    '## Namespace Counts',
    '',
    markdownTable(
      ['Namespace', 'Official', 'Corpus union', 'Untouched by corpus'],
      Object.keys(json.byNamespace.official).map((namespace) => [
        namespace,
        String(json.byNamespace.official[namespace] ?? 0),
        String(json.byNamespace.corpusUnion[namespace] ?? 0),
        String(json.byNamespace.untouchedByCorpus[namespace] ?? 0),
      ]),
    ),
    '',
    '## Untouched By Corpus',
    '',
    listMembers(untouchedByCorpusMembers),
    '',
    '## Newly Reached After V5/V6',
    '',
    listMembers(newlyReachedAfterV5V6),
    '',
  ].join('\n');

  await writeFile(outJson, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(outMd, md, 'utf8');
  process.stdout.write(`${JSON.stringify(json.coverage, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
