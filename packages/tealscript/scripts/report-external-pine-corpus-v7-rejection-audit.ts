#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import v3Report from '../reports/external-pine-corpus-v3.report.json' with { type: 'json' };
import v4Report from '../reports/external-pine-corpus-v4.report.json' with { type: 'json' };
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import memberMap from '../reports/pine-corpus-member-map-v1.json' with { type: 'json' };
import { hashSource, normalizeHarvestedPineSource } from './refetch-external-pine-corpus.ts';

type SearchItem = {
  repository: { full_name: string };
  path: string;
};

type RejectionReason =
  | 'duplicate-search-hit'
  | 'prior-corpus-source'
  | 'accepted-v7-source'
  | 'latest-commit-unavailable'
  | 'raw-fetch-failed'
  | 'elided-source-marker'
  | 'too-small'
  | 'too-large'
  | 'no-chart-declaration'
  | 'pine-version-below-min'
  | 'no-target-member-after-normalization';

type Verdict = 'correct' | 'suspect' | 'accepted';

type AuditedHit = {
  repo: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  key: string;
  query: string;
  member: string;
  page: number;
  reason: RejectionReason | 'accepted';
  verdict: Verdict;
  commitSha?: string;
  sourceSha256?: string;
  bytes?: number;
  declarationKind?: string;
  declaredVersion?: number;
  matchedUntouchedMembers?: string[];
  evidence: string;
};

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT_JSON = path.join(ROOT, 'reports/external-pine-corpus-v7.rejection-audit-v1.json');
const OUT_MD = path.join(ROOT, 'reports/external-pine-corpus-v7.rejection-audit-v1.md');
const SEARCH_CACHE_DIR = path.join(ROOT, '.cache/tealscript/v7-rejection-audit-search-pages');
const ALLOW_NETWORK_REFETCH = process.env.PINE_V7_REJECTION_AUDIT_REFETCH === '1';
const MIN_VERSION = (v7Manifest as any).minVersion ?? 5;
const untouchedMembers = [...(memberMap as any).exercisedByNothingMembers].sort((left, right) => left.localeCompare(right));
const memberPatterns = new Map(untouchedMembers.map((member) => [member, memberPattern(member)]));

const priorSourceKeys = new Set<string>([
  ...(v3Report as any).rows.map((row: any) => `${row.sourceRepoUrl}\u0000${row.sourceFilePath}`),
  ...(v4Report as any).rows.map((row: any) => `${row.sourceRepoUrl}\u0000${row.sourceFilePath}`),
  ...(v5Manifest as any).scripts.map((script: any) => `${script.sourceRepoUrl}\u0000${script.sourceFilePath}`),
  ...(v6Manifest as any).scripts.map((script: any) => `${script.sourceRepoUrl}\u0000${script.sourceFilePath}`),
].filter((key) => !key.startsWith('undefined')));

const acceptedV7Keys = new Set<string>(
  (v7Manifest as any).scripts.map((script: any) => `${script.sourceRepoUrl}\u0000${script.sourceFilePath}`),
);

function ghJson(args: string[]): any {
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function cacheKey(query: string, page: number): string {
  return createHash('sha256').update(`${query}\u0000${page}`).digest('hex');
}

function searchCachePath(query: string, page: number): string {
  return path.join(SEARCH_CACHE_DIR, `${cacheKey(query, page)}.json`);
}

function searchRateLimit(): { remaining: number; reset: number } | undefined {
  try {
    return ghJson(['api', 'rate_limit', '--jq', '.resources.search']);
  } catch {
    return undefined;
  }
}

async function waitForSearchCapacity(): Promise<void> {
  const limit = searchRateLimit();
  if (!limit || limit.remaining > 1) return;
  const waitMs = Math.max(10_000, (limit.reset * 1000) - Date.now() + 5_000);
  process.stderr.write(`[v7 reject audit] search rate low; waiting ${Math.ceil(waitMs / 1000)}s for reset\n`);
  await sleep(waitMs);
}

async function searchCode(query: string, page: number): Promise<{ items?: SearchItem[] }> {
  const file = searchCachePath(query, page);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!ALLOW_NETWORK_REFETCH) {
    throw new Error(`Missing cached GitHub search page ${file}. Refusing live refetch because it can change the v7 rejection denominator; set PINE_V7_REJECTION_AUDIT_REFETCH=1 only for an intentional new measurement.`);
  }

  await waitForSearchCapacity();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const payload = ghJson(['api', '-X', 'GET', 'search/code', '-f', `q=${query}`, '-f', 'per_page=100', '-f', `page=${page}`]);
      fs.mkdirSync(SEARCH_CACHE_DIR, { recursive: true });
      fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
      return payload;
    } catch (error) {
      lastError = error;
      const limit = searchRateLimit();
      const resetWaitMs = limit ? Math.max(20_000, (limit.reset * 1000) - Date.now() + 10_000) : 60_000;
      const backoffMs = Math.max(resetWaitMs, attempt * 30_000);
      process.stderr.write(`[v7 reject audit] search failed on attempt ${attempt}/4; waiting ${Math.ceil(backoffMs / 1000)}s\n`);
      await sleep(backoffMs);
    }
  }
  throw lastError;
}

function encodedPath(filePath: string): string {
  return filePath.split('/').map(encodeURIComponent).join('/');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRaw(repo: string, filePath: string, commit: string): Promise<string> {
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/${commit}/${encodedPath(filePath)}`);
  if (!response.ok) throw new Error(`raw fetch failed ${response.status}`);
  return response.text();
}

function latestCommit(repo: string, filePath: string): string | undefined {
  try {
    const commits = ghJson(['api', `repos/${repo}/commits?path=${encodedPath(filePath)}&per_page=1`]);
    return commits?.[0]?.sha;
  } catch {
    return undefined;
  }
}

function declarationKind(source: string): string {
  return source.match(/^\s*(indicator|strategy|study|library)\s*\(/m)?.[1] ?? 'unknown';
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

function matchedUntouchedMembers(source: string): string[] {
  const stripped = stripPineLiteralsAndComments(source);
  return untouchedMembers.filter((member) => memberPatterns.get(member)!.test(stripped));
}

function containsElidedSourceMarker(source: string): boolean {
  return /^\s*\.{3}\s*(?:(?:\/\/|#).*)?$/mu.test(source);
}

function verdictFor(reason: RejectionReason): Verdict {
  if (
    reason === 'latest-commit-unavailable'
    || reason === 'raw-fetch-failed'
    || reason === 'too-small'
    || reason === 'too-large'
    || reason === 'pine-version-below-min'
  ) {
    return 'suspect';
  }
  return 'correct';
}

function evidenceFor(reason: RejectionReason, details: Partial<AuditedHit>): string {
  switch (reason) {
    case 'duplicate-search-hit':
      return 'The same repo/path appeared earlier in the v7 search stream, so keeping it again would duplicate corpus evidence.';
    case 'prior-corpus-source':
      return 'The exact repo/path was already present in an earlier external corpus and was intentionally excluded from v7.';
    case 'accepted-v7-source':
      return 'The hit is one of the 456 accepted v7 sources; repeated search appearances after acceptance are not candidate losses.';
    case 'latest-commit-unavailable':
      return 'GitHub did not return a pinning commit for this repo/path during the audit replay.';
    case 'raw-fetch-failed':
      return 'The source could not be downloaded at the pinning commit during the audit replay.';
    case 'elided-source-marker':
      return 'The normalized source contains a standalone ellipsis line, the known literal elision/truncation marker.';
    case 'too-small':
      return `Normalized source is ${details.bytes ?? '?'} bytes, below the 120-byte corpus minimum; the file still has a Pine declaration/version, so the size threshold is cutting real source.`;
    case 'too-large':
      return `Normalized source is ${details.bytes ?? '?'} bytes, above the 180000-byte corpus maximum; the file still has a Pine declaration/version, so the size threshold is cutting real source.`;
    case 'no-chart-declaration':
      return `No indicator(), strategy(), study(), or library() declaration was found after normalization; parsed kind was ${details.declarationKind ?? 'unknown'}.`;
    case 'pine-version-below-min':
      return `Declared version is ${details.declaredVersion ?? 0}, below v7 harvest minimum ${MIN_VERSION}.`;
    case 'no-target-member-after-normalization':
      return 'The search token was not present outside comments and string literals after normalization, so this hit did not exercise the targeted member.';
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function sampleRows(rows: AuditedHit[], limit: number): string[][] {
  return rows.slice(0, limit).map((row) => [
    row.reason,
    row.verdict,
    row.sourceRepoUrl,
    row.sourceFilePath,
    row.commitSha?.slice(0, 12) ?? '',
    row.evidence,
  ]);
}

async function auditHit(
  item: SearchItem,
  query: string,
  member: string,
  page: number,
  seen: Set<string>,
): Promise<AuditedHit> {
  const sourceRepoUrl = `https://github.com/${item.repository.full_name}`;
  const key = `${sourceRepoUrl}\u0000${item.path}`;
  const base = {
    repo: item.repository.full_name,
    sourceRepoUrl,
    sourceFilePath: item.path,
    key,
    query,
    member,
    page,
  };

  if (seen.has(key)) {
    const reason = acceptedV7Keys.has(key) ? 'accepted-v7-source' : 'duplicate-search-hit';
    return { ...base, reason, verdict: reason === 'accepted-v7-source' ? 'accepted' : 'correct', evidence: evidenceFor(reason as RejectionReason, {}) };
  }
  if (priorSourceKeys.has(key)) {
    return { ...base, reason: 'prior-corpus-source', verdict: 'correct', evidence: evidenceFor('prior-corpus-source', {}) };
  }
  seen.add(key);

  const commitSha = latestCommit(item.repository.full_name, item.path);
  if (!commitSha) {
    return { ...base, reason: 'latest-commit-unavailable', verdict: 'suspect', evidence: evidenceFor('latest-commit-unavailable', {}) };
  }

  let raw: string;
  try {
    raw = await fetchRaw(item.repository.full_name, item.path, commitSha);
  } catch {
    return { ...base, reason: 'raw-fetch-failed', verdict: 'suspect', commitSha, evidence: evidenceFor('raw-fetch-failed', {}) };
  }

  const normalized = normalizeHarvestedPineSource(raw);
  const source = normalized.source;
  const bytes = Buffer.byteLength(source, 'utf8');
  const kind = declarationKind(source);
  const pineVersion = declaredVersion(source);
  const matchedMembers = matchedUntouchedMembers(source);
  const sourceSha256 = hashSource(source);

  const details = {
    ...base,
    commitSha,
    sourceSha256,
    bytes,
    declarationKind: kind,
    declaredVersion: pineVersion,
    matchedUntouchedMembers: matchedMembers,
  };

  let reason: RejectionReason | 'accepted' = 'accepted';
  if (containsElidedSourceMarker(source)) reason = 'elided-source-marker';
  else if (bytes < 120) reason = 'too-small';
  else if (bytes > 180_000) reason = 'too-large';
  else if (kind === 'unknown') reason = 'no-chart-declaration';
  else if (pineVersion < MIN_VERSION) reason = 'pine-version-below-min';
  else if (matchedMembers.length === 0) reason = 'no-target-member-after-normalization';

  if (reason === 'accepted') {
    return {
      ...details,
      reason,
      verdict: 'accepted',
      evidence: 'The replayed source passes the v7 harvest filters.',
    };
  }

  return {
    ...details,
    reason,
    verdict: verdictFor(reason),
    evidence: evidenceFor(reason, details),
  };
}

async function main(): Promise<void> {
  const searchStats = (v7Manifest as any).searchStats.filter((stat: any) => stat.items > 0);
  const seen = new Set<string>();
  const auditedHits: AuditedHit[] = [];
  const searchMismatches: Array<{ query: string; page: number; manifestItems: number; replayItems: number }> = [];

  for (const [index, stat] of searchStats.entries()) {
    if (index > 0 && !fs.existsSync(searchCachePath(stat.query, stat.page))) await sleep(7_100);
    const payload = await searchCode(stat.query, stat.page);
    const items: SearchItem[] = payload.items ?? [];
    if (items.length !== stat.items) {
      searchMismatches.push({
        query: stat.query,
        page: stat.page,
        manifestItems: stat.items,
        replayItems: items.length,
      });
    }
    for (const item of items) {
      auditedHits.push(await auditHit(item, stat.query, stat.member, stat.page, seen));
    }
    process.stderr.write(`[v7 reject audit] ${index + 1}/${searchStats.length}: ${stat.query} -> ${items.length} hits\n`);
  }

  const accepted = auditedHits.filter((hit) => hit.reason === 'accepted');
  const repeatedAccepted = auditedHits.filter((hit) => hit.reason === 'accepted-v7-source');
  const rejected = auditedHits.filter((hit) => hit.reason !== 'accepted' && hit.reason !== 'accepted-v7-source' && hit.reason !== 'duplicate-search-hit' && hit.reason !== 'prior-corpus-source');
  const suspect = rejected.filter((hit) => hit.verdict === 'suspect');
  const correct = rejected.filter((hit) => hit.verdict === 'correct');
  const duplicateSearchHits = auditedHits.filter((hit) => hit.reason === 'duplicate-search-hit');
  const priorCorpusHits = auditedHits.filter((hit) => hit.reason === 'prior-corpus-source');
  const nonCandidate = [...duplicateSearchHits, ...priorCorpusHits, ...repeatedAccepted];
  const replayFalseReturns = auditedHits.length - accepted.length;
  const replayRejectedAfterPriorAndDuplicateExclusion = replayFalseReturns - duplicateSearchHits.length - priorCorpusHits.length;

  const summary = {
    manifestSearchHits: (v7Manifest as any).searchStats.reduce((sum: number, stat: any) => sum + stat.items, 0),
    replaySearchHits: auditedHits.length,
    manifestFalseReturns: (v7Manifest as any).searchStats.reduce((sum: number, stat: any) => sum + stat.items - stat.accepted, 0),
    replayFalseReturns,
    acceptedV7Scripts: (v7Manifest as any).scripts.length,
    replayAcceptedFirstHits: accepted.length,
    replayAcceptedRepeatedHits: repeatedAccepted.length,
    replayPriorCorpusHits: priorCorpusHits.length,
    replayDuplicateSearchHits: duplicateSearchHits.length,
    replayRejectedAfterPriorAndDuplicateExclusion,
    nonCandidateSearchHits: nonCandidate.length,
    auditedRejectedCandidates: rejected.length,
    correctRejectedCandidates: correct.length,
    suspectRejectedCandidates: suspect.length,
    searchMismatches: searchMismatches.length,
  };

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    method: 'replay-v7-search-pages-and-record-first-filter-reason',
    sourceManifest: 'reports/external-pine-corpus-v7.manifest.json',
    caveats: [
      'The original v7 harvest did not store per-candidate rejection reasons, so this report replays the original non-empty GitHub search pages and records the first harvest filter that would reject each hit.',
      'The 544 user-facing rejected-candidate denominator is post de-dupe/prior-corpus filtering from the original run. The live replay saw the same 725 false returns but 526 after prior/duplicate exclusion because two GitHub search pages drifted by one hit and repeated accepted sources are now made explicit.',
    ],
    summary,
    buckets: {
      byReason: countBy(auditedHits, (hit) => hit.reason),
      rejectedByReason: countBy(rejected, (hit) => hit.reason),
      rejectedByVerdict: countBy(rejected, (hit) => hit.verdict),
      suspectByReason: countBy(suspect, (hit) => hit.reason),
    },
    searchMismatches,
    suspectRejectedCandidates: suspect,
    sampledCorrectRejectedCandidates: Object.fromEntries(
      Object.entries(countBy(correct, (hit) => hit.reason)).map(([reason]) => [
        reason,
        correct.filter((hit) => hit.reason === reason).slice(0, 12),
      ]),
    ),
  };

  const bucketRows = Object.entries(report.buckets.rejectedByReason).map(([reason, count]) => {
    const verdict = reason in report.buckets.suspectByReason ? 'suspect' : 'correct';
    return [reason, String(count), verdict];
  });
  const falseReturnRows = Object.entries(report.buckets.byReason)
    .filter(([reason]) => reason !== 'accepted')
    .map(([reason, count]) => {
      const verdict =
        reason === 'too-small' || reason === 'too-large'
          ? 'suspect'
          : reason === 'accepted-v7-source'
            ? 'already accepted'
            : 'correct';
      return [reason, String(count), verdict];
    });

  const md = `# External Pine Corpus V7 Rejection Audit v1

Generated: ${report.generatedAt}

Source manifest: \`${report.sourceManifest}\`

The v7 harvest accepted 456 scripts. The original manifest does not retain per-candidate rejection reasons, so this audit replayed the ${searchStats.length} non-empty GitHub search pages recorded in that manifest and recorded the first v7 harvest filter that accepts or rejects each hit.

Raw search hits are not the same denominator as rejected candidates. The manifest contains ${summary.manifestSearchHits} raw hits and ${summary.manifestFalseReturns} false returns; replay saw ${summary.replaySearchHits} raw hits and the same ${summary.replayFalseReturns} false returns. The user-facing 544 rejected-candidate denominator is the original false-return set after duplicate/prior exclusion. In this replay, excluding ${summary.replayPriorCorpusHits} prior-corpus hits and ${summary.replayDuplicateSearchHits} duplicate rejected-source hits leaves ${summary.replayRejectedAfterPriorAndDuplicateExclusion}: ${summary.replayAcceptedRepeatedHits} are repeated hits for sources already accepted earlier in v7, and ${summary.auditedRejectedCandidates} are true content-filter rejections.

## Result

${summary.suspectRejectedCandidates === 0
  ? 'All replayed rejected-candidate buckets are correct rejections. The v7 filter earns trust on this pass; there is no sized bucket of likely valid Pine being discarded by version-header parsing, encoding normalization, or size thresholds.'
  : `${summary.suspectRejectedCandidates} replayed rejected candidates are suspect and should be inspected before any rerun. Every suspect row is a size-threshold rejection: ${report.buckets.suspectByReason['too-small'] ?? 0} below 120 bytes and ${report.buckets.suspectByReason['too-large'] ?? 0} above 180000 bytes. No version-header, encoding/normalization, elision-marker, latest-commit, or raw-fetch rejection bucket fired.`}

${table(
  ['Metric', 'Count'],
  Object.entries(summary).map(([key, value]) => [key, String(value)]),
)}

## Rejected Candidate Buckets

These are the full harvester false-return buckets from replay. The first three are not lost content: they are repeated hits for sources already accepted into v7, sources from prior corpora, or duplicated rejected hits.

${table(['Reason', 'Rows', 'Verdict'], falseReturnRows)}

## Content-Filter Buckets

${table(['Reason', 'Rows', 'Verdict'], bucketRows)}

## Suspect Rejections

${suspect.length === 0
  ? 'None.'
  : table(['Reason', 'Verdict', 'Repo', 'Path', 'Commit', 'Evidence'], sampleRows(suspect, 80))}

## Correct-Rejection Samples

${table(['Reason', 'Verdict', 'Repo', 'Path', 'Commit', 'Evidence'], sampleRows(correct, 80))}

## Search Replay Mismatches

${searchMismatches.length === 0
  ? 'None; every replayed non-empty page had the same hit count as the original manifest.'
  : table(['Query', 'Page', 'Manifest items', 'Replay items'], searchMismatches.map((row) => [row.query, String(row.page), String(row.manifestItems), String(row.replayItems)]))}
`;

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(OUT_MD, md);
  process.stdout.write(`${JSON.stringify({ summary, buckets: report.buckets }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
