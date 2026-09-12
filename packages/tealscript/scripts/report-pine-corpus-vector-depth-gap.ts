#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import { parse } from '../src/parser/parser.ts';
import { PINE_V6_REFERENCE_SIGNATURES } from '../src/compat/pineV6BuiltinSignatures.ts';
import vectorMemberMap from '../reports/pine-value-vector-member-map-v29.json' with { type: 'json' };
import assertionQuality from '../reports/pine-value-vector-assertion-quality-v8.json' with { type: 'json' };
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };
import { CASES, officialMembersForValueVectorCase } from './run-pine-value-vectors.ts';

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
}

interface MemberStats {
  member: string;
  corpusScriptKeys: Set<string>;
  corpusReferenceCount: number;
  corpusCallSiteCount: number;
  corpusArgumentShapes: Set<string>;
  sampleCorpusHits: string[];
  vectorCases: Set<string>;
  vectorCallShapes: Set<string>;
  quality: 'value' | 'property' | 'ran-only' | 'uncovered';
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const v5Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v5-20260910');
const v6Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v6-20260911');
const v7Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v7-20260911');
const recoveryCorpus = join(packageRoot, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
const outJson = join(packageRoot, 'reports/pine-corpus-vector-depth-gap-v1.json');
const outMd = join(packageRoot, 'reports/pine-corpus-vector-depth-gap-v1.md');
const expectedCorpusScripts: Record<string, number> = { v5: 1000, v6: 1000, v7: 456, 'v7-size-recovery': 50 };

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function flattenSignatureMembers(): Set<string> {
  const members = new Set<string>();
  for (const namespace of Object.values(PINE_V6_REFERENCE_SIGNATURES)) {
    for (const member of Object.keys(namespace)) members.add(member);
  }
  return members;
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
  const suffix = member.includes('.') ? '(?![A-Za-z0-9_])' : '(?![A-Za-z0-9_]|\\s*\\.)';
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}${suffix}`, 'g');
}

function calleeName(callee: any): string | null {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    const object = calleeName(callee.object);
    const property = calleeName(callee.property);
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}

function declarationMember(node: any): string | null {
  if (node.type === 'IndicatorDeclaration') return node.declarationKind ?? node.sourceDeclarationKind ?? 'indicator';
  if (node.type === 'LibraryDeclaration') return 'library';
  return null;
}

function visit(node: any, fn: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, fn);
    } else if (value && typeof value === 'object') {
      visit(value, fn);
    }
  }
}

function callShape(node: any): string {
  if (declarationMember(node)) {
    const names = Object.entries(node)
      .filter(([key, value]) => !['type', 'loc', 'declarationKind', 'sourceDeclarationKind'].includes(key) && value !== undefined && value !== null)
      .map(([key]) => key)
      .sort();
    return `declaration:${names.join(',')}`;
  }
  const positionalCount = node.arguments.filter((argument: any) => !argument.name).length;
  const named = node.arguments
    .map((argument: any) => argument.name?.name)
    .filter((name: string | undefined): name is string => Boolean(name))
    .sort();
  return `positional=${positionalCount};named=${named.join(',')}`;
}

function emptyStats(member: string): MemberStats {
  return {
    member,
    corpusScriptKeys: new Set(),
    corpusReferenceCount: 0,
    corpusCallSiteCount: 0,
    corpusArgumentShapes: new Set(),
    sampleCorpusHits: [],
    vectorCases: new Set(),
    vectorCallShapes: new Set(),
    quality: 'uncovered',
  };
}

function namespaceOf(member: string): string {
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function recordCall(stats: MemberStats, node: any): void {
  stats.corpusCallSiteCount += 1;
  stats.corpusArgumentShapes.add(callShape(node));
}

async function scanCorpus(
  corpus: string,
  corpusRoot: string,
  scripts: readonly ManifestScript[],
  members: readonly string[],
  patterns: ReadonlyMap<string, RegExp>,
  callableMembers: ReadonlySet<string>,
  stats: Map<string, MemberStats>,
): Promise<{ corpus: string; scripts: number; parsed: number; parseFailed: number }> {
  const expected = expectedCorpusScripts[corpus];
  if (scripts.length !== expected) {
    throw new Error(`${corpus} expected ${expected} manifest rows, got ${scripts.length}`);
  }
  let parsed = 0;
  let parseFailed = 0;
  for (const script of scripts) {
    const scriptKey = `${corpus}:${script.localPath}`;
    const source = await readFile(join(corpusRoot, script.localPath), 'utf8');
    const stripped = stripPineLiteralsAndComments(source);
    for (const member of members) {
      const matches = stripped.match(patterns.get(member)!);
      if (!matches?.length) continue;
      const row = stats.get(member)!;
      row.corpusScriptKeys.add(scriptKey);
      row.corpusReferenceCount += matches.length;
      if (row.sampleCorpusHits.length < 5) row.sampleCorpusHits.push(`${scriptKey}`);
    }
    try {
      const ast = parse(source);
      parsed += 1;
      visit(ast, (node) => {
        const declaration = declarationMember(node);
        if (declaration && stats.has(declaration)) {
          recordCall(stats.get(declaration)!, node);
          return;
        }
        if (node.type !== 'CallExpression') return;
        const member = calleeName(node.callee);
        if (!member || !callableMembers.has(member) || !stats.has(member)) return;
        recordCall(stats.get(member)!, node);
      });
    } catch {
      parseFailed += 1;
    }
  }
  return { corpus, scripts: scripts.length, parsed, parseFailed };
}

function assignQuality(stats: Map<string, MemberStats>): void {
  for (const row of (assertionQuality as any).valueChecked) stats.get(row.member)!.quality = 'value';
  for (const row of (assertionQuality as any).propertyCheckedOnly) stats.get(row.member)!.quality = 'property';
  for (const row of (assertionQuality as any).ranOnly) stats.get(row.member)!.quality = 'ran-only';
}

function scanVectorDepth(stats: Map<string, MemberStats>, callableMembers: ReadonlySet<string>): void {
  for (const testCase of CASES) {
    const members = officialMembersForValueVectorCase(testCase);
    for (const member of members) stats.get(member)?.vectorCases.add(testCase.id);
    let ast: any;
    try {
      ast = parse(testCase.pine);
    } catch {
      continue;
    }
    visit(ast, (node) => {
      const declaration = declarationMember(node);
      if (declaration && stats.has(declaration) && members.includes(declaration)) {
        stats.get(declaration)!.vectorCallShapes.add(callShape(node));
        return;
      }
      if (node.type !== 'CallExpression') return;
      const member = calleeName(node.callee);
      if (!member || !callableMembers.has(member) || !stats.has(member) || !members.includes(member)) return;
      stats.get(member)!.vectorCallShapes.add(callShape(node));
    });
  }
}

async function main(): Promise<void> {
  const officialMembers = [
    ...new Set([
      ...(vectorMemberMap as any).coveredMembers,
      ...(vectorMemberMap as any).verifiableWithoutTraces.map((row: any) => row.member),
      ...(vectorMemberMap as any).traceOrHostRequired.map((row: any) => row.member),
    ]),
  ].sort((left, right) => left.localeCompare(right));
  const callableMembers = flattenSignatureMembers();
  const patterns = new Map(officialMembers.map((member) => [member, memberPattern(member)]));
  const stats = new Map(officialMembers.map((member) => [member, emptyStats(member)]));
  assignQuality(stats);
  scanVectorDepth(stats, callableMembers);

  const corpusStats = [
    await scanCorpus('v5', v5Corpus, (v5Manifest as any).scripts, officialMembers, patterns, callableMembers, stats),
    await scanCorpus('v6', v6Corpus, (v6Manifest as any).scripts, officialMembers, patterns, callableMembers, stats),
    await scanCorpus('v7', v7Corpus, (v7Manifest as any).scripts, officialMembers, patterns, callableMembers, stats),
    await scanCorpus('v7-size-recovery', recoveryCorpus, (recoveryManifest as any).scripts, officialMembers, patterns, callableMembers, stats),
  ];

  const rows = [...stats.values()].map((row) => {
    const vectorCaseCount = row.vectorCases.size;
    const vectorShapeCount = row.vectorCallShapes.size;
    const corpusScriptCount = row.corpusScriptKeys.size;
    const corpusShapeCount = row.corpusArgumentShapes.size;
    const thinVector = vectorCaseCount <= 1 || (row.corpusCallSiteCount > 0 && vectorShapeCount <= 1);
    const depthGapScore = corpusScriptCount / Math.max(1, vectorCaseCount) + row.corpusCallSiteCount / Math.max(1, vectorShapeCount);
    return {
      member: row.member,
      namespace: namespaceOf(row.member),
      quality: row.quality,
      callableOrDeclaration: callableMembers.has(row.member) || row.member === 'indicator' || row.member === 'strategy' || row.member === 'library',
      corpusScriptCount,
      corpusReferenceCount: row.corpusReferenceCount,
      corpusCallSiteCount: row.corpusCallSiteCount,
      corpusArgumentShapeCount: corpusShapeCount,
      vectorCaseCount,
      vectorArgumentShapeCount: vectorShapeCount,
      thinVector,
      depthGapScore: Number(depthGapScore.toFixed(2)),
      sampleCorpusHits: row.sampleCorpusHits,
      sampleVectorCases: [...row.vectorCases].sort().slice(0, 8),
      corpusArgumentShapes: [...row.corpusArgumentShapes].sort().slice(0, 20),
      vectorArgumentShapes: [...row.vectorCallShapes].sort().slice(0, 20),
    };
  }).sort((left, right) =>
    Number(right.thinVector) - Number(left.thinVector)
    || right.depthGapScore - left.depthGapScore
    || right.corpusScriptCount - left.corpusScriptCount
    || left.member.localeCompare(right.member),
  );

  const exposedThinRows = rows.filter((row) => row.corpusScriptCount > 0 && row.thinVector);
  const highUseThinRows = exposedThinRows.filter((row) => row.corpusScriptCount >= 100);
  const callableHighUseThinRows = highUseThinRows.filter((row) => row.callableOrDeclaration);
  const unvectorCoveredCorpusMembers = rows.filter((row) => row.corpusScriptCount > 0 && row.vectorCaseCount === 0);

  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    basis: {
      vectorMemberMap: 'pine-value-vector-member-map-v29.json',
      assertionQuality: 'pine-value-vector-assertion-quality-v8.json',
      corpusScripts: corpusStats.reduce((sum, row) => sum + row.scripts, 0),
      parsedScripts: corpusStats.reduce((sum, row) => sum + row.parsed, 0),
      parseFailedScripts: corpusStats.reduce((sum, row) => sum + row.parseFailed, 0),
      method: 'Source-reference frequency is counted for all official members after stripping comments and double-quoted strings. Call-site and argument-shape depth are counted from parsed call/declaration AST nodes for documented callable/declaration members. Vector depth is unique value-vector cases per member plus distinct parsed vector call/declaration shapes.',
      caveats: [
        'This is a structural depth ranking. It does not prove value correctness or semantic binding of every corpus call.',
        'Receiver-method calls are counted only when the documented namespace member is syntactically visible.',
        'Vector case count follows officialMembersForValueVectorCase, so scaffold members such as indicator/plot can have many ran-only cases without exact value assertions.',
      ],
    },
    headline: {
      officialMembers: officialMembers.length,
      vectorCoveredMembers: (vectorMemberMap as any).coveredMembers.length,
      corpusReferencedMembers: rows.filter((row) => row.corpusScriptCount > 0).length,
      corpusReferencedVectorCoveredMembers: rows.filter((row) => row.corpusScriptCount > 0 && row.vectorCaseCount > 0).length,
      exposedThinMembers: exposedThinRows.length,
      highUseThinMembersAt100Scripts: highUseThinRows.length,
      callableHighUseThinMembersAt100Scripts: callableHighUseThinRows.length,
      unvectorCoveredCorpusMembers: unvectorCoveredCorpusMembers.length,
      conclusion: highUseThinRows.length > 0
        ? 'High-use thinly tested members exist. The vector suite is broad, but its one-case/member headline hides shallow depth for common corpus surfaces.'
        : 'The heavily used corpus members are also deeply tested by vectors; the vector suite grew in the right places.',
    },
    byNamespace: {
      highUseThin: countBy(highUseThinRows, (row) => row.namespace),
      callableHighUseThin: countBy(callableHighUseThinRows, (row) => row.namespace),
      exposedThin: countBy(exposedThinRows, (row) => row.namespace),
    },
    corpusStats,
    rankedRows: rows,
    highUseThinRows,
    callableHighUseThinRows,
    unvectorCoveredCorpusMembers,
  };

  const rankedTable = rows.slice(0, 80).map((row) => [
    row.member,
    row.quality,
    String(row.corpusScriptCount),
    String(row.corpusCallSiteCount || row.corpusReferenceCount),
    String(row.corpusArgumentShapeCount),
    String(row.vectorCaseCount),
    String(row.vectorArgumentShapeCount),
    String(row.depthGapScore),
    row.sampleVectorCases.slice(0, 4).join('<br>'),
  ]);
  const highUseTable = highUseThinRows.slice(0, 60).map((row) => [
    row.member,
    row.quality,
    String(row.corpusScriptCount),
    String(row.corpusCallSiteCount || row.corpusReferenceCount),
    String(row.corpusArgumentShapeCount),
    String(row.vectorCaseCount),
    String(row.vectorArgumentShapeCount),
    row.sampleCorpusHits.slice(0, 3).join('<br>'),
  ]);

  const md = [
    '# Pine Corpus Vector Depth Gap V1',
    '',
    `Generated at ${json.generatedAt}. Measured at commit \`${json.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `Across ${json.basis.corpusScripts} corpus scripts, ${json.headline.highUseThinMembersAt100Scripts} members are both high-use (>=100 corpus scripts) and thinly vector-tested (one vector case, or <=1 vector argument shape for callable/declaration members).`,
    '',
    `${json.headline.callableHighUseThinMembersAt100Scripts} of those high-use thin members are callable/declaration surfaces with parsed corpus call-site depth.`,
    '',
    json.headline.conclusion,
    '',
    'This is the same lesson as the optional-slot report: headline member coverage is real, but it is not depth. The ranking below is the actionable artifact.',
    '',
    '## Basis',
    '',
    `- Vector member map: \`${json.basis.vectorMemberMap}\` (${json.headline.vectorCoveredMembers} covered members).`,
    `- Assertion quality: \`${json.basis.assertionQuality}\`.`,
    `- Corpus scripts scanned: ${json.basis.corpusScripts}; parsed: ${json.basis.parsedScripts}; parse failures skipped for call-shape depth: ${json.basis.parseFailedScripts}.`,
    `- Method: ${json.basis.method}`,
    ...json.basis.caveats.map((caveat) => `- Caveat: ${caveat}`),
    '',
    '## High-Use Thin Members',
    '',
    table(['Member', 'Quality', 'Corpus scripts', 'Corpus uses', 'Corpus shapes', 'Vector cases', 'Vector shapes', 'Samples'], highUseTable),
    '',
    '## Ranked Depth Gaps',
    '',
    table(['Member', 'Quality', 'Corpus scripts', 'Corpus uses', 'Corpus shapes', 'Vector cases', 'Vector shapes', 'Gap score', 'Vector samples'], rankedTable),
    '',
    '## Namespace Summary',
    '',
    table(
      ['Namespace', 'High-use thin', 'Callable high-use thin', 'Exposed thin'],
      [...new Set([...Object.keys(json.byNamespace.highUseThin), ...Object.keys(json.byNamespace.callableHighUseThin), ...Object.keys(json.byNamespace.exposedThin)])]
        .sort()
        .map((namespace) => [
          namespace,
          String(json.byNamespace.highUseThin[namespace] ?? 0),
          String(json.byNamespace.callableHighUseThin[namespace] ?? 0),
          String(json.byNamespace.exposedThin[namespace] ?? 0),
        ]),
    ),
    '',
  ].join('\n');

  await writeFile(outJson, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(outMd, md, 'utf8');
  process.stdout.write(`${JSON.stringify(json.headline, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
