#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
}

interface CorpusManifest {
  scripts: ManifestScript[];
}

interface VerifyRow {
  corpus: string;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  expectedSha256: string;
  status: 'matched' | 'fetch-failed' | 'hash-mismatch';
  actualSha256?: string;
  byteSize?: number;
  diagnostic?: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const defaultOutputBase = join(packageRoot, 'reports/pine-corpus-manifest-reconstruction-check-v1');
const expectedRows: Record<string, number> = { v5: 1000, v6: 1000, v7: 456, 'v7-size-recovery': 50 };

const manifests: Array<{ corpus: string; manifest: CorpusManifest }> = [
  { corpus: 'v5', manifest: v5Manifest as CorpusManifest },
  { corpus: 'v6', manifest: v6Manifest as CorpusManifest },
  { corpus: 'v7', manifest: v7Manifest as CorpusManifest },
  { corpus: 'v7-size-recovery', manifest: recoveryManifest as CorpusManifest },
];

function hashSource(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function normalizeCopiedCodeSpaces(line: string): string {
  return line.replace(/[\u00a0\u2007\u202f\u2009\u200a\u200b\u2060]/gu, ' ');
}

function normalizeHarvestedPineSource(source: string): string {
  const lines = source.split(/\r?\n/);
  const markerLine = lines.findIndex((line) => line.trim() === 'PineScript code:');
  const startLine = lines.findIndex((line, index) => (
    index > markerLine
    && /^\s*(?:\/\/\s*@version\s*=|(?:indicator|strategy|study|library)\s*\()/u.test(normalizeCopiedCodeSpaces(line))
  ));
  if (markerLine === -1 || startLine === -1) return source;

  const bodyLines = lines.slice(startLine).map(normalizeCopiedCodeSpaces);
  const expandMarkerIndex = bodyLines.findIndex((line) => /^Expand \(\d+ lines\)\s*$/u.test(line.trim()));
  const sourceLines = expandMarkerIndex === -1 ? bodyLines : bodyLines.slice(0, expandMarkerIndex);
  return `${sourceLines.join('\n').trimEnd()}\n`;
}

function rawGithubUrl(row: ManifestScript): string {
  const match = row.sourceRepoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
  if (!match) throw new Error(`Unsupported GitHub repository URL: ${row.sourceRepoUrl}`);
  const [, owner, repo] = match;
  const encodedPath = row.sourceFilePath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${row.commitSha}/${encodedPath}`;
}

function deterministicSample(rows: ManifestScript[], sampleSize: number | 'all'): ManifestScript[] {
  if (sampleSize === 'all' || sampleSize >= rows.length) return rows;
  const sorted = [...rows].sort((left, right) => {
    const leftKey = hashSource(`${left.sourceRepoUrl}\u0000${left.sourceFilePath}\u0000${left.commitSha}`);
    const rightKey = hashSource(`${right.sourceRepoUrl}\u0000${right.sourceFilePath}\u0000${right.commitSha}`);
    return leftKey.localeCompare(rightKey);
  });
  return sorted.slice(0, sampleSize).sort((left, right) => left.localPath.localeCompare(right.localPath));
}

async function verifyRow(corpus: string, row: ManifestScript): Promise<VerifyRow> {
  let response: Response;
  try {
    response = await fetch(rawGithubUrl(row));
  } catch (error) {
    return {
      corpus,
      localPath: row.localPath,
      sourceRepoUrl: row.sourceRepoUrl,
      sourceFilePath: row.sourceFilePath,
      commitSha: row.commitSha,
      expectedSha256: row.sourceSha256,
      status: 'fetch-failed',
      diagnostic: error instanceof Error ? error.message : String(error),
    };
  }
  if (!response.ok) {
    return {
      corpus,
      localPath: row.localPath,
      sourceRepoUrl: row.sourceRepoUrl,
      sourceFilePath: row.sourceFilePath,
      commitSha: row.commitSha,
      expectedSha256: row.sourceSha256,
      status: 'fetch-failed',
      diagnostic: `${response.status} ${response.statusText}`,
    };
  }
  const source = normalizeHarvestedPineSource(await response.text());
  const actualSha256 = hashSource(source);
  const byteSize = Buffer.byteLength(source, 'utf8');
  return {
    corpus,
    localPath: row.localPath,
    sourceRepoUrl: row.sourceRepoUrl,
    sourceFilePath: row.sourceFilePath,
    commitSha: row.commitSha,
    expectedSha256: row.sourceSha256,
    status: actualSha256 === row.sourceSha256 ? 'matched' : 'hash-mismatch',
    actualSha256,
    byteSize,
    diagnostic: actualSha256 === row.sourceSha256 ? undefined : `expected ${row.sourceSha256}, got ${actualSha256}`,
  };
}

function parseArgs(args: string[]): { samplePerCorpus: number | 'all'; outputBase: string } {
  let samplePerCorpus: number | 'all' = 40;
  let outputBase = defaultOutputBase;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--sample-per-corpus') {
      const value = args[++index];
      if (!value) throw new Error('Missing value for --sample-per-corpus');
      samplePerCorpus = value === 'all' ? 'all' : Number(value);
      if (samplePerCorpus !== 'all' && (!Number.isInteger(samplePerCorpus) || samplePerCorpus <= 0)) {
        throw new Error('--sample-per-corpus must be a positive integer or all');
      }
    } else if (arg === '--output-base') {
      outputBase = resolve(args[++index] ?? '');
      if (!outputBase) throw new Error('Missing value for --output-base');
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { samplePerCorpus, outputBase };
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

async function main(): Promise<void> {
  const { samplePerCorpus, outputBase } = parseArgs(process.argv.slice(2));
  for (const { corpus, manifest } of manifests) {
    const expected = expectedRows[corpus];
    if (manifest.scripts.length !== expected) {
      throw new Error(`${corpus} expected ${expected} manifest rows, got ${manifest.scripts.length}`);
    }
    const missing = manifest.scripts.filter((row) => !row.sourceRepoUrl || !row.sourceFilePath || !row.commitSha || !row.sourceSha256);
    if (missing.length > 0) throw new Error(`${corpus} has ${missing.length} manifest rows missing repo/path/sha/hash`);
  }

  const rows: VerifyRow[] = [];
  for (const { corpus, manifest } of manifests) {
    const sample = deterministicSample(manifest.scripts, samplePerCorpus);
    for (const row of sample) rows.push(await verifyRow(corpus, row));
  }

  const failures = rows.filter((row) => row.status !== 'matched');
  const byCorpus = Object.fromEntries(manifests.map(({ corpus }) => {
    const corpusRows = rows.filter((row) => row.corpus === corpus);
    return [corpus, {
      sampled: corpusRows.length,
      matched: corpusRows.filter((row) => row.status === 'matched').length,
      fetchFailed: corpusRows.filter((row) => row.status === 'fetch-failed').length,
      hashMismatch: corpusRows.filter((row) => row.status === 'hash-mismatch').length,
    }];
  }));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    samplePerCorpus,
    manifests: Object.fromEntries(manifests.map(({ corpus, manifest }) => [corpus, {
      rows: manifest.scripts.length,
      requiredFieldsPresent: true,
    }])),
    summary: {
      sampledRows: rows.length,
      matchedRows: rows.length - failures.length,
      fetchFailedRows: rows.filter((row) => row.status === 'fetch-failed').length,
      hashMismatchRows: rows.filter((row) => row.status === 'hash-mismatch').length,
      attritionRate: rows.length === 0 ? '0.00%' : `${((failures.length / rows.length) * 100).toFixed(2)}%`,
      conclusion: failures.length === 0
        ? 'The committed manifests are sufficient reconstruction manifests for sampled rows: repo/path/commit/hash are present and sampled pinned raw sources still fetch with byte-identical hashes after the documented normalization.'
        : 'Some sampled pinned manifest rows no longer reconstruct. The corpus cache is partly unreproducible from pointers alone; publish content or investigate the failed rows before relying on pointer-only reconstruction.',
    },
    byCorpus,
    failures,
    rows,
  };

  const md = [
    '# Pine Corpus Manifest Reconstruction Check V1',
    '',
    `Generated at ${report.generatedAt}. Measured at commit \`${report.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `Committed manifests exist for v5, v6, v7, and v7 size recovery. All ${Object.values(expectedRows).reduce((sum, count) => sum + count, 0)} manifest rows have repo, path, commit SHA, and content hash fields.`,
    '',
    `Refetch sample: ${report.summary.sampledRows} rows (${samplePerCorpus} per corpus unless the corpus is smaller).`,
    '',
    `Matched: ${report.summary.matchedRows}. Fetch failures: ${report.summary.fetchFailedRows}. Hash mismatches: ${report.summary.hashMismatchRows}. Attrition: ${report.summary.attritionRate}.`,
    '',
    report.summary.conclusion,
    '',
    '## Corpus Summary',
    '',
    table(
      ['Corpus', 'Manifest rows', 'Sampled', 'Matched', 'Fetch failed', 'Hash mismatch'],
      Object.entries(byCorpus).map(([corpus, stats]) => [
        corpus,
        String(report.manifests[corpus].rows),
        String(stats.sampled),
        String(stats.matched),
        String(stats.fetchFailed),
        String(stats.hashMismatch),
      ]),
    ),
    '',
    '## Failures',
    '',
    failures.length === 0
      ? 'No sampled manifest rows failed to reconstruct.'
      : table(
        ['Corpus', 'Path', 'Repo', 'Commit', 'Status', 'Diagnostic'],
        failures.map((row) => [
          row.corpus,
          row.sourceFilePath,
          row.sourceRepoUrl,
          row.commitSha,
          row.status,
          row.diagnostic ?? '',
        ]),
      ),
    '',
    '## Method',
    '',
    '- Load the committed v5, v6, v7, and v7-size-recovery manifests.',
    '- Assert expected manifest denominators: v5 1000, v6 1000, v7 456, v7-size-recovery 50.',
    '- Assert every row has `sourceRepoUrl`, `sourceFilePath`, `commitSha`, and `sourceSha256`.',
    '- Deterministically sample rows by hashing repo/path/commit, then fetch `raw.githubusercontent.com/{owner}/{repo}/{commit}/{path}`.',
    '- Apply the same TradingView copied-code normalization used by the corpus refetcher before hashing.',
    '- Compare SHA-256 against the committed manifest hash.',
    '',
  ].join('\n');

  await writeFile(`${outputBase}.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, md, 'utf8');
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
