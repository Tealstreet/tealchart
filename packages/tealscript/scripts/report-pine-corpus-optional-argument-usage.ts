#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import { parse } from '../src/parser/parser.ts';
import { PINE_V6_REFERENCE_SIGNATURES } from '../src/compat/pineV6BuiltinSignatures.ts';
import vectorDepth from '../reports/pine-value-vector-depth-v12.json' with { type: 'json' };
import v5Manifest from '../reports/external-pine-corpus-v5.manifest.json' with { type: 'json' };
import v6Manifest from '../reports/external-pine-corpus-v6.manifest.json' with { type: 'json' };
import v7Manifest from '../reports/external-pine-corpus-v7.manifest.json' with { type: 'json' };
import recoveryManifest from '../reports/external-pine-corpus-v7-size-recovery.manifest.json' with { type: 'json' };

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
}

interface SignatureRow {
  member: string;
  params: readonly string[];
  minArgs: number;
  overloads: readonly (readonly string[])[];
}

interface SlotHit {
  corpus: string;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  line?: number;
  form: 'named' | 'positional' | 'declaration';
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const v5Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v5-20260910');
const v6Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v6-20260911');
const v7Corpus = join(packageRoot, '.cache/tealscript/pine-corpus-v7-20260911');
const recoveryCorpus = join(packageRoot, '.cache/tealscript/pine-corpus-v7-size-recovery-20260911');
const outJson = join(packageRoot, 'reports/pine-corpus-optional-argument-usage-v1.json');
const outMd = join(packageRoot, 'reports/pine-corpus-optional-argument-usage-v1.md');
const expectedCorpusScripts: Record<string, number> = { v5: 1000, v6: 1000, v7: 456, 'v7-size-recovery': 50 };

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function overloadLists(member: string, params: readonly string[], overloads: readonly (readonly string[])[]): readonly (readonly string[])[] {
  if (member === 'input.int' || member === 'input.float') return overloads;
  return [params, ...overloads];
}

function flattenSignatures(): Map<string, SignatureRow> {
  const rows = new Map<string, SignatureRow>();
  for (const namespace of Object.values(PINE_V6_REFERENCE_SIGNATURES)) {
    for (const [member, signature] of Object.entries(namespace)) {
      const overloads = signature.overloads
        ? overloadLists(member, signature.params, signature.overloads)
        : [signature.params];
      rows.set(member, {
        member,
        params: signature.params,
        minArgs: signature.minArgs ?? signature.requiredParams?.length ?? 0,
        overloads,
      });
    }
  }
  return rows;
}

function optionalParams(signature: SignatureRow): readonly string[] {
  const required = new Set(signature.params.slice(0, signature.minArgs));
  return signature.params.filter((param) => !required.has(param));
}

function slotKey(member: string, param: string): string {
  return `${member}:${param}`;
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

function declarationMember(node: any): string | null {
  if (node.type === 'IndicatorDeclaration') return node.declarationKind ?? node.sourceDeclarationKind ?? 'indicator';
  if (node.type === 'LibraryDeclaration') return 'library';
  return null;
}

function addHit(map: Map<string, SlotHit[]>, key: string, hit: SlotHit): void {
  const hits = map.get(key) ?? [];
  hits.push(hit);
  map.set(key, hits);
}

function collectNodeHits(
  node: any,
  signatures: Map<string, SignatureRow>,
  targetSlots: Set<string>,
  hitBase: Omit<SlotHit, 'line' | 'form'>,
  hits: Map<string, SlotHit[]>,
): void {
  const declaredMember = declarationMember(node);
  if (declaredMember && signatures.has(declaredMember)) {
    const signature = signatures.get(declaredMember)!;
    for (const param of optionalParams(signature)) {
      if (node[param] === undefined || node[param] === null) continue;
      const key = slotKey(declaredMember, param);
      if (targetSlots.has(key)) addHit(hits, key, { ...hitBase, line: node.loc?.start?.line, form: 'declaration' });
    }
    return;
  }

  if (node.type !== 'CallExpression') return;
  const member = calleeName(node.callee);
  if (!member || !signatures.has(member)) return;
  const signature = signatures.get(member)!;
  const optional = new Set(optionalParams(signature));
  const positional = node.arguments.filter((argument: any) => !argument.name);
  positional.forEach((argument: any, index: number) => {
    const param = signature.params[index];
    if (!param || !optional.has(param)) return;
    const key = slotKey(member, param);
    if (targetSlots.has(key)) addHit(hits, key, { ...hitBase, line: argument.loc?.start?.line ?? node.loc?.start?.line, form: 'positional' });
  });
  for (const argument of node.arguments) {
    const param = argument.name?.name;
    if (!param || !optional.has(param)) continue;
    const key = slotKey(member, param);
    if (targetSlots.has(key)) addHit(hits, key, { ...hitBase, line: argument.loc?.start?.line ?? node.loc?.start?.line, form: 'named' });
  }
}

async function scanCorpus(
  corpus: string,
  corpusRoot: string,
  scripts: readonly ManifestScript[],
  signatures: Map<string, SignatureRow>,
  targetSlots: Set<string>,
  hits: Map<string, SlotHit[]>,
): Promise<{ scripts: number; parsed: number; parseFailed: number; parseFailures: SlotHit[] }> {
  const expected = expectedCorpusScripts[corpus];
  if (scripts.length !== expected) {
    throw new Error(`${corpus} expected ${expected} manifest rows, got ${scripts.length}`);
  }
  let parsed = 0;
  const parseFailures: SlotHit[] = [];
  for (const script of scripts) {
    const source = await readFile(join(corpusRoot, script.localPath), 'utf8');
    const hitBase = {
      corpus,
      localPath: script.localPath,
      sourceRepoUrl: script.sourceRepoUrl,
      sourceFilePath: script.sourceFilePath,
      commitSha: script.commitSha,
    };
    let ast: any;
    try {
      ast = parse(source);
      parsed += 1;
    } catch {
      parseFailures.push({ ...hitBase, form: 'positional' });
      continue;
    }
    visit(ast, (node) => collectNodeHits(node, signatures, targetSlots, hitBase, hits));
  }
  return { scripts: scripts.length, parsed, parseFailed: parseFailures.length, parseFailures };
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function namespaceOf(slot: string): string {
  const member = slot.slice(0, slot.indexOf(':'));
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
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

async function main(): Promise<void> {
  const signatures = flattenSignatures();
  const untouchedSlots = ((vectorDepth as any).untouchedOptionalSlots as { member: string; param: string }[])
    .map((slot) => ({ ...slot, key: slotKey(slot.member, slot.param) }))
    .sort((left, right) => left.key.localeCompare(right.key));
  const targetSlotKeys = new Set(untouchedSlots.map((slot) => slot.key));
  const hits = new Map<string, SlotHit[]>();
  const corpusStats = [
    await scanCorpus('v5', v5Corpus, (v5Manifest as any).scripts, signatures, targetSlotKeys, hits),
    await scanCorpus('v6', v6Corpus, (v6Manifest as any).scripts, signatures, targetSlotKeys, hits),
    await scanCorpus('v7', v7Corpus, (v7Manifest as any).scripts, signatures, targetSlotKeys, hits),
    await scanCorpus('v7-size-recovery', recoveryCorpus, (recoveryManifest as any).scripts, signatures, targetSlotKeys, hits),
  ];

  const rankedSlots = untouchedSlots.map((slot) => {
    const slotHits = hits.get(slot.key) ?? [];
    const uniqueScripts = new Map(slotHits.map((hit) => [`${hit.corpus}\u0000${hit.localPath}`, hit]));
    return {
      member: slot.member,
      param: slot.param,
      slot: slot.key,
      hitCount: slotHits.length,
      scriptCount: uniqueScripts.size,
      corpora: [...new Set(slotHits.map((hit) => hit.corpus))].sort(),
      forms: countBy(slotHits, (hit) => hit.form),
      sampleHits: [...uniqueScripts.values()].slice(0, 8),
    };
  }).sort((left, right) => right.scriptCount - left.scriptCount || right.hitCount - left.hitCount || left.slot.localeCompare(right.slot));
  const exercisedSlots = rankedSlots.filter((slot) => slot.scriptCount > 0);
  const unexercisedSlots = rankedSlots.filter((slot) => slot.scriptCount === 0);
  const highPriority = exercisedSlots.filter((slot) => slot.scriptCount >= 25);

  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    basis: {
      vectorDepthReport: 'pine-value-vector-depth-v12.json',
      vectorUntestedOptionalSlots: untouchedSlots.length,
      corpusScripts: corpusStats.reduce((sum, stat) => sum + stat.scripts, 0),
      parsedScripts: corpusStats.reduce((sum, stat) => sum + stat.parsed, 0),
      parseFailedScripts: corpusStats.reduce((sum, stat) => sum + stat.parseFailed, 0),
      method: 'Parse each pinned source, count an optional slot only when that parameter is explicitly supplied by name or by a positional argument at that parameter index. Defaults are not counted.',
      caveats: [
        'This is a syntax-level slot census using the same flattened reference signatures as pine-value-vector-depth-v12. It does not run semantic overload resolution.',
        'Receiver-method calls whose receiver type is not visible syntactically may be undercounted when the callee name is not the documented namespace member.',
        'Declaration slots are counted from parsed declaration fields, which are present only when explicitly supplied by source.',
      ],
      corpusRoots: { v5Corpus, v6Corpus, v7Corpus, recoveryCorpus },
    },
    headline: {
      vectorUntestedOptionalSlots: untouchedSlots.length,
      corpusExercisedUntestedSlots: exercisedSlots.length,
      corpusExercisedUntestedPercent: percent(exercisedSlots.length, untouchedSlots.length),
      corpusUnexercisedUntestedSlots: unexercisedSlots.length,
      highPrioritySlotsAt25Scripts: highPriority.length,
      highestScriptCount: rankedSlots[0]?.scriptCount ?? 0,
      conclusion: highPriority.length > 0
        ? 'The corpus finds real optional-argument holes left by vectors; prioritize the ranked high-use slots before treating the vector stop as complete.'
        : 'The corpus does not find high-use optional-argument holes left by vectors; the skipped slots are mostly low-use or unused in real scripts.',
    },
    byNamespace: {
      exercised: countBy(exercisedSlots, (slot) => namespaceOf(slot.slot)),
      unexercised: countBy(unexercisedSlots, (slot) => namespaceOf(slot.slot)),
      highPriority: countBy(highPriority, (slot) => namespaceOf(slot.slot)),
    },
    corpusStats,
    rankedSlots,
    highPrioritySlots: highPriority,
    unexercisedSlots,
  };

  const topRows = rankedSlots.slice(0, 60).map((slot) => [
    slot.slot,
    String(slot.scriptCount),
    String(slot.hitCount),
    slot.corpora.join(', '),
    Object.entries(slot.forms).map(([key, value]) => `${key} ${value}`).join(', '),
    slot.sampleHits.slice(0, 3).map((hit) => `${hit.corpus}:${hit.localPath}${hit.line ? `:${hit.line}` : ''}`).join('<br>'),
  ]);
  const highRows = highPriority.map((slot) => [
    slot.slot,
    String(slot.scriptCount),
    String(slot.hitCount),
    slot.corpora.join(', '),
    Object.entries(slot.forms).map(([key, value]) => `${key} ${value}`).join(', '),
  ]);
  const highNamespaceSummary = Object.entries(json.byNamespace.highPriority)
    .map(([namespace, count]) => `${namespace} ${count}`)
    .join(', ');

  const md = [
    '# Pine Corpus Optional Argument Usage V1',
    '',
    `Generated at ${json.generatedAt}. Measured at commit \`${json.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `Of the ${json.headline.vectorUntestedOptionalSlots} optional argument slots not covered by value vectors, the 2,506-script corpus explicitly passes ${json.headline.corpusExercisedUntestedSlots} (${json.headline.corpusExercisedUntestedPercent}).`,
    '',
    `${json.headline.highPrioritySlotsAt25Scripts} slots are used by at least 25 scripts. Highest-use slot: ${rankedSlots[0]?.slot ?? 'none'} in ${json.headline.highestScriptCount} scripts.`,
    '',
    json.headline.conclusion,
    '',
    `High-use slots by namespace: ${highNamespaceSummary}. The original judgement that the skipped remainder was dominated by low-value \`input\` and \`strategy\` slots is only half right: those namespaces dominate, but many of their slots are heavily and explicitly used by real scripts.`,
    '',
    '## Basis',
    '',
    `- Vector untested slot source: \`${json.basis.vectorDepthReport}\` (${json.basis.vectorUntestedOptionalSlots} slots).`,
    `- Corpus scripts scanned: ${json.basis.corpusScripts}; parsed: ${json.basis.parsedScripts}; parse failures skipped: ${json.basis.parseFailedScripts}.`,
    `- Method: ${json.basis.method}`,
    ...json.basis.caveats.map((caveat) => `- Caveat: ${caveat}`),
    '',
    '## High-Use Slots',
    '',
    highRows.length > 0
      ? table(['Slot', 'Scripts', 'Hits', 'Corpora', 'Forms'], highRows)
      : 'No vector-untested optional slot is explicitly used by at least 25 corpus scripts.',
    '',
    '## Ranked Slots',
    '',
    table(['Slot', 'Scripts', 'Hits', 'Corpora', 'Forms', 'Samples'], topRows),
    '',
    '## Namespace Summary',
    '',
    table(
      ['Namespace', 'Exercised slots', 'Unexercised slots', 'High-use slots'],
      [...new Set([...Object.keys(json.byNamespace.exercised), ...Object.keys(json.byNamespace.unexercised), ...Object.keys(json.byNamespace.highPriority)])]
        .sort()
        .map((namespace) => [
          namespace,
          String(json.byNamespace.exercised[namespace] ?? 0),
          String(json.byNamespace.unexercised[namespace] ?? 0),
          String(json.byNamespace.highPriority[namespace] ?? 0),
        ]),
    ),
    '',
    '## Unexercised Slots',
    '',
    unexercisedSlots.map((slot) => `- \`${slot.slot}\``).join('\n') || '- none',
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
