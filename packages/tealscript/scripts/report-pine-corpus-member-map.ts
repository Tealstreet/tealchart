import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ClassifiedMember {
  member: string;
  reason: string;
}

interface ValueVectorMemberMap {
  coveredMembers: string[];
  verifiableWithoutTraces: ClassifiedMember[];
  traceOrHostRequired: ClassifiedMember[];
}

interface CorpusHit {
  corpus: string;
  localPath: string;
}

interface MemberCorpusCoverage {
  member: string;
  corpora: string[];
  hitCount: number;
  sampleHits: CorpusHit[];
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DEFAULT_V5_CORPUS = join(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v5-20260910');
const DEFAULT_V6_CORPUS = join(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v6-20260911');
const DEFAULT_VALUE_MAP = join(PACKAGE_ROOT, 'reports/pine-value-vector-member-map-v1.json');
const DEFAULT_OUTPUT_BASE = join(PACKAGE_ROOT, 'reports/pine-corpus-member-map-v1');
const EXPECTED_SOURCE_FILES: Record<string, number> = { v5: 1000, v6: 1000 };

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

function byNamespace(members: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    const namespace = namespaceOf(member);
    counts[namespace] = (counts[namespace] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function listMembers(members: readonly string[]): string {
  if (members.length === 0) return '- none';
  return members.map((member) => `- \`${member}\``).join('\n');
}

function tableByNamespace(
  officialMembers: readonly string[],
  corpusMembers: readonly string[],
  vectorOnlyMembers: readonly string[],
  nothingMembers: readonly string[],
): string[] {
  const official = byNamespace(officialMembers);
  const corpus = byNamespace(corpusMembers);
  const vectorOnly = byNamespace(vectorOnlyMembers);
  const nothing = byNamespace(nothingMembers);
  return [
    '| Namespace | Official | Corpus-exercised | Vector-only | Exercised by nothing |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...Object.keys(official).map((namespace) =>
      `| \`${namespace}\` | ${official[namespace] ?? 0} | ${corpus[namespace] ?? 0} | ${vectorOnly[namespace] ?? 0} | ${nothing[namespace] ?? 0} |`,
    ),
  ];
}

async function pineFiles(corpusRoot: string): Promise<string[]> {
  const sourceRoot = join(corpusRoot, 'sources');
  let names: string[];
  try {
    names = await readdir(sourceRoot);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Missing pinned corpus source cache at ${sourceRoot}. Restore the cache or pass PINE_CORPUS_V5/PINE_CORPUS_V6 intentionally; refusing to measure a partial corpus. (${detail})`);
  }
  return names
    .filter((name) => /\.pine$/i.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => join(sourceRoot, name));
}

async function scanCorpus(
  corpusName: string,
  corpusRoot: string,
  officialMembers: readonly string[],
  patterns: ReadonlyMap<string, RegExp>,
): Promise<{ sourceFiles: number; hits: Map<string, CorpusHit[]> }> {
  const files = await pineFiles(corpusRoot);
  const expected = EXPECTED_SOURCE_FILES[corpusName];
  if (files.length !== expected) {
    throw new Error(`${corpusName} expected ${expected} pinned .pine files under ${corpusRoot}/sources, got ${files.length}`);
  }
  const hits = new Map<string, CorpusHit[]>();
  for (const file of files) {
    const source = stripPineLiteralsAndComments(await readFile(file, 'utf8'));
    const localPath = `sources/${file.split('/sources/')[1]}`;
    for (const member of officialMembers) {
      if (!patterns.get(member)!.test(source)) continue;
      const memberHits = hits.get(member) ?? [];
      memberHits.push({ corpus: corpusName, localPath });
      hits.set(member, memberHits);
    }
  }
  return { sourceFiles: files.length, hits };
}

export async function buildPineCorpusMemberMapReport(options: {
  v5Corpus: string;
  v6Corpus: string;
  valueMapPath: string;
}): Promise<{ json: unknown; markdown: string }> {
  const valueMap = JSON.parse(await readFile(options.valueMapPath, 'utf8')) as ValueVectorMemberMap;
  const vectorMembers = [...valueMap.coveredMembers].sort((left, right) => left.localeCompare(right));
  const officialMembers = [
    ...new Set([
      ...vectorMembers,
      ...valueMap.verifiableWithoutTraces.map((row) => row.member),
      ...valueMap.traceOrHostRequired.map((row) => row.member),
    ]),
  ].sort((left, right) => left.localeCompare(right));
  const patterns = new Map(officialMembers.map((member) => [member, memberPattern(member)]));

  const v5 = await scanCorpus('v5', options.v5Corpus, officialMembers, patterns);
  const v6 = await scanCorpus('v6', options.v6Corpus, officialMembers, patterns);
  const corpusHitMap = new Map<string, CorpusHit[]>();
  for (const member of officialMembers) {
    const hits = [...(v5.hits.get(member) ?? []), ...(v6.hits.get(member) ?? [])];
    if (hits.length > 0) corpusHitMap.set(member, hits);
  }

  const corpusMembers = [...corpusHitMap.keys()].sort((left, right) => left.localeCompare(right));
  const corpusMemberSet = new Set(corpusMembers);
  const vectorMemberSet = new Set(vectorMembers);
  const vectorOnlyMembers = vectorMembers.filter((member) => !corpusMemberSet.has(member));
  const nothingMembers = officialMembers.filter((member) => !corpusMemberSet.has(member) && !vectorMemberSet.has(member));
  const corpusOnlyMembers = corpusMembers.filter((member) => !vectorMemberSet.has(member));
  const bothMembers = corpusMembers.filter((member) => vectorMemberSet.has(member));
  const memberCoverage: MemberCorpusCoverage[] = corpusMembers.map((member) => {
    const hits = corpusHitMap.get(member) ?? [];
    return {
      member,
      corpora: [...new Set(hits.map((hit) => hit.corpus))].sort(),
      hitCount: hits.length,
      sampleHits: hits.slice(0, 5),
    };
  });
  const topV7Namespaces = Object.entries(byNamespace(nothingMembers))
    .sort(([leftNs, leftCount], [rightNs, rightCount]) => {
      return rightCount - leftCount || leftNs.localeCompare(rightNs);
    })
    .slice(0, 12);

  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    basis: {
      valueMapPath: options.valueMapPath,
      v5Corpus: options.v5Corpus,
      v6Corpus: options.v6Corpus,
      v5SourceFiles: v5.sourceFiles,
      v6SourceFiles: v6.sourceFiles,
      officialMemberDenominator: officialMembers.length,
      method: 'Explicit source references after stripping comments and double-quoted strings; this is structural source coverage, not runtime reachability or value parity.',
    },
    coverage: {
      corpusExercisedMembers: corpusMembers.length,
      corpusExercisedPercent: percent(corpusMembers.length, officialMembers.length),
      vectorExercisedMembers: vectorMembers.length,
      vectorExercisedPercent: percent(vectorMembers.length, officialMembers.length),
      corpusAndVectorMembers: bothMembers.length,
      corpusOnlyMembers: corpusOnlyMembers.length,
      vectorOnlyMembers: vectorOnlyMembers.length,
      exercisedByNothingMembers: nothingMembers.length,
      exercisedByNothingPercent: percent(nothingMembers.length, officialMembers.length),
      exercisedByEitherCorpusOrVectors: officialMembers.length - nothingMembers.length,
      exercisedByEitherCorpusOrVectorsPercent: percent(officialMembers.length - nothingMembers.length, officialMembers.length),
    },
    byNamespace: {
      official: byNamespace(officialMembers),
      corpusExercised: byNamespace(corpusMembers),
      vectorOnly: byNamespace(vectorOnlyMembers),
      exercisedByNothing: byNamespace(nothingMembers),
    },
    corpusMembers: memberCoverage,
    vectorOnlyMembers,
    exercisedByNothingMembers: nothingMembers,
    corpusOnlyMembers,
  };

  const markdown = [
    '# Pine Corpus Member Map V1',
    '',
    'Date: 2026-09-11',
    '',
    '## Basis',
    '',
    `- Official denominator: ${officialMembers.length} names from \`pine-value-vector-member-map-v1.json\`.`,
    `- Value-vector covered members: ${vectorMembers.length}.`,
    `- V5 corpus: \`${options.v5Corpus}\` (${v5.sourceFiles} source files).`,
    `- V6 corpus: \`${options.v6Corpus}\` (${v6.sourceFiles} source files).`,
    '- Method: explicit official member references in source text after stripping `//` comments and double-quoted strings.',
    '- Limit: this is structural source coverage only. It does not prove the member is reached at runtime, value-asserted, or semantically bound through every method-receiver form.',
    '',
    '## Headline',
    '',
    `- Exercised by either corpus: ${corpusMembers.length}/${officialMembers.length} (${percent(corpusMembers.length, officialMembers.length)}).`,
    `- Exercised only by value vectors: ${vectorOnlyMembers.length}.`,
    `- Exercised by nothing: ${nothingMembers.length}/${officialMembers.length} (${percent(nothingMembers.length, officialMembers.length)}).`,
    `- Exercised by both corpus and vectors: ${bothMembers.length}.`,
    `- Exercised only by corpus: ${corpusOnlyMembers.length}.`,
    `- Exercised by either corpus or vectors: ${officialMembers.length - nothingMembers.length}/${officialMembers.length} (${percent(officialMembers.length - nothingMembers.length, officialMembers.length)}).`,
    '',
    '## Namespace Counts',
    '',
    ...tableByNamespace(officialMembers, corpusMembers, vectorOnlyMembers, nothingMembers),
    '',
    '## V7 Harvest Targets',
    '',
    'Largest/most useful namespaces among members exercised by nothing:',
    '',
    '| Namespace | Untouched members |',
    '| --- | ---: |',
    ...topV7Namespaces.map(([namespace, count]) => `| \`${namespace}\` | ${count} |`),
    '',
    '## Exercised Only By Value Vectors',
    '',
    listMembers(vectorOnlyMembers),
    '',
    '## Exercised By Nothing',
    '',
    listMembers(nothingMembers),
    '',
    '## Corpus-Only Members',
    '',
    listMembers(corpusOnlyMembers),
    '',
    '## Corpus Member Hit Map',
    '',
    ...memberCoverage.map((row) => {
      const samples = row.sampleHits.map((hit) => `${hit.corpus}:${hit.localPath}`).join(', ');
      return `- \`${row.member}\`: ${row.hitCount} hits across ${row.corpora.join('+')}; samples: ${samples}`;
    }),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? DEFAULT_OUTPUT_BASE;
  const { json, markdown } = await buildPineCorpusMemberMapReport({
    v5Corpus: process.env.PINE_CORPUS_V5 ?? DEFAULT_V5_CORPUS,
    v6Corpus: process.env.PINE_CORPUS_V6 ?? DEFAULT_V6_CORPUS,
    valueMapPath: process.env.PINE_VALUE_MEMBER_MAP ?? DEFAULT_VALUE_MAP,
  });
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, markdown, 'utf8');
  process.stdout.write(`${JSON.stringify((json as { coverage: unknown }).coverage, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
