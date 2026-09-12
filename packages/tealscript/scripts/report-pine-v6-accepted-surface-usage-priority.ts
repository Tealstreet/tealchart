#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import inversion from '../reports/pine-v6-accepted-surface-inversion-v1.json' with { type: 'json' };
import memberDepth from '../reports/pine-corpus-vector-depth-gap-v1.json' with { type: 'json' };
import optionalArgumentUsage from '../reports/pine-corpus-optional-argument-usage-v1.json' with { type: 'json' };

interface InversionRow {
  kind: 'extra-param' | 'extra-alias' | 'callable-without-reference-signature' | 'member-absent-from-manual';
  member: string;
  accepted: string;
  canonical?: string;
  verdict: 'matches-manual' | 'labelled-local-extension' | 'needs-compile-evidence' | 'unlabelled-overacceptance-risk';
  evidence: string;
}

interface MemberDepthRow {
  member: string;
  namespace: string;
  corpusScriptCount: number;
  corpusReferenceCount: number;
  corpusCallSiteCount: number;
  corpusArgumentShapes: string[];
  sampleCorpusHits: string[];
}

interface SlotUsageRow {
  member: string;
  param: string;
  slot: string;
  hitCount: number;
  scriptCount: number;
  forms: Record<string, number>;
  sampleHits: unknown[];
}

interface PriorityRow extends InversionRow {
  corpusScriptCount: number;
  corpusHitCount: number;
  exposureKind: 'member-reference' | 'exact-argument-slot' | 'argument-shape-proxy';
  sampleCorpusHits: unknown[];
  corpusArgumentShapes: string[];
}

const packageRoot = resolve(dirname(dirname(fileURLToPath(import.meta.url))));
const outJson = join(packageRoot, 'reports/pine-v6-accepted-surface-usage-priority-v1.json');
const outMd = join(packageRoot, 'reports/pine-v6-accepted-surface-usage-priority-v1.md');

const memberRows = (memberDepth as unknown as { rankedRows: MemberDepthRow[] }).rankedRows;
const slotRows = (optionalArgumentUsage as unknown as { rankedSlots: SlotUsageRow[] }).rankedSlots;
const memberByName = new Map(memberRows.map((row) => [row.member, row]));
const slotByName = new Map(slotRows.map((row) => [row.slot, row]));

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { cwd: packageRoot, encoding: 'utf8' }).trim();
}

function argumentShapeMentions(shapes: readonly string[], param: string): string[] {
  return shapes.filter((shape) => {
    const named = shape.match(/(?:^|;)named=([^;]*)/)?.[1];
    if (!named) return false;
    return named.split(',').includes(param);
  });
}

function priorityRow(row: InversionRow): PriorityRow | undefined {
  const member = memberByName.get(row.member);
  const slot = slotByName.get(`${row.member}:${row.accepted}`);
  const shapes = member ? argumentShapeMentions(member.corpusArgumentShapes ?? [], row.accepted) : [];

  if (row.kind === 'extra-alias') {
    if (slot && slot.scriptCount > 0) {
      return {
        ...row,
        corpusScriptCount: slot.scriptCount,
        corpusHitCount: slot.hitCount,
        exposureKind: 'exact-argument-slot',
        sampleCorpusHits: slot.sampleHits,
        corpusArgumentShapes: shapes,
      };
    }
    if (member && shapes.length > 0) {
      return {
        ...row,
        corpusScriptCount: member.corpusScriptCount,
        corpusHitCount: member.corpusReferenceCount,
        exposureKind: 'argument-shape-proxy',
        sampleCorpusHits: member.sampleCorpusHits,
        corpusArgumentShapes: shapes,
      };
    }
    return undefined;
  }

  if (!member || member.corpusScriptCount <= 0) return undefined;
  return {
    ...row,
    corpusScriptCount: member.corpusScriptCount,
    corpusHitCount: member.corpusCallSiteCount || member.corpusReferenceCount,
    exposureKind: 'member-reference',
    sampleCorpusHits: member.sampleCorpusHits,
    corpusArgumentShapes: member.corpusArgumentShapes,
  };
}

function rows(): PriorityRow[] {
  return (inversion as { rows: InversionRow[] }).rows
    .filter((row) => row.verdict === 'needs-compile-evidence')
    .map(priorityRow)
    .filter((row): row is PriorityRow => !!row)
    .sort((left, right) =>
      right.corpusScriptCount - left.corpusScriptCount
        || right.corpusHitCount - left.corpusHitCount
        || left.member.localeCompare(right.member)
        || left.accepted.localeCompare(right.accepted),
    );
}

function renderMarkdown(priorityRows: PriorityRow[], commit: string): string {
  const sourceRows = (inversion as { rows: InversionRow[] }).rows.filter((row) => row.verdict === 'needs-compile-evidence');
  const exact = priorityRows.filter((row) => row.exposureKind === 'exact-argument-slot').length;
  const proxy = priorityRows.filter((row) => row.exposureKind === 'argument-shape-proxy').length;
  const member = priorityRows.filter((row) => row.exposureKind === 'member-reference').length;
  const lines = [
    '# Pine v6 Accepted Surface Usage Priority V1',
    '',
    `Generated at ${new Date().toISOString()}. Measured at commit \`${commit}\`.`,
    '',
    '## Headline',
    '',
    `${priorityRows.length} of ${sourceRows.length} accepted-surface compile-evidence rows are exercised by the 2,506-script corpus.`,
    '',
    `Survivors by exposure source: ${member} member-reference rows, ${exact} exact argument-slot rows, ${proxy} argument-shape proxy rows.`,
    '',
    'This is not a small handful: most compile-evidence rows survive the corpus filter. That means the committed v6 manual signature snapshot is materially thinner than the accepted language surface real scripts touch. Manual-derived oracles remain useful, but absence from the signature snapshot should route to compiler evidence before it becomes a rejection rule.',
    '',
    '## Ranked Used Rows',
    '',
    '| Rank | Row | Kind | Corpus scripts | Hits | Exposure | Sample evidence |',
    '| --- | --- | --- | ---: | ---: | --- | --- |',
  ];

  priorityRows.forEach((row, index) => {
    const rowName = row.kind === 'extra-alias'
      ? `\`${row.member}:${row.accepted}\` -> \`${row.canonical}\``
      : `\`${row.member}\``;
    const sample = row.exposureKind === 'argument-shape-proxy'
      ? row.corpusArgumentShapes.slice(0, 2).join('<br>')
      : row.sampleCorpusHits.slice(0, 2).map(String).join('<br>');
    lines.push(`| ${index + 1} | ${rowName} | ${row.kind} | ${row.corpusScriptCount} | ${row.corpusHitCount} | ${row.exposureKind} | ${sample.replaceAll('|', '\\|')} |`);
  });

  const unused = sourceRows.length - priorityRows.length;
  lines.push(
    '',
    '## Filtered Out',
    '',
    `${unused} compile-evidence rows had no corpus usage in the committed member/argument reports and are intentionally not added to the paste-test request yet.`,
  );

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const commit = currentCommit();
  const priorityRows = rows();
  await writeFile(outJson, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), measuredCommit: commit, rows: priorityRows }, null, 2)}\n`);
  await writeFile(outMd, renderMarkdown(priorityRows, commit));
  console.log(`accepted-surface usage priority: ${priorityRows.length}/${(inversion as { rows: InversionRow[] }).rows.filter((row) => row.verdict === 'needs-compile-evidence').length} rows used by corpus`);
}

void main();
