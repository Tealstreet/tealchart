#!/usr/bin/env tsx

import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import memberDepth from '../reports/pine-corpus-vector-depth-gap-v1.json' with { type: 'json' };
import optionalArgumentUsage from '../reports/pine-corpus-optional-argument-usage-v1.json' with { type: 'json' };
import constructDepth from '../reports/pine-corpus-construct-depth-v1.json' with { type: 'json' };

interface QueueRow {
  target: string;
  targetKind: 'surface' | 'construct';
  axes: string[];
  score: number;
  memberScore: number;
  slotScore: number;
  constructScore: number;
  memberRows: unknown[];
  slotRows: unknown[];
  constructRows: unknown[];
  rationale: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const outJson = join(packageRoot, 'reports/pine-corpus-priority-queue-v1.json');
const outMd = join(packageRoot, 'reports/pine-corpus-priority-queue-v1.md');

const highUseThinMembers = (memberDepth as any).highUseThinRows as any[];
const highUseThinConstructs = (constructDepth as any).highUseThinRows as any[];
const slotRows = ((optionalArgumentUsage as any).rankedSlots as any[]).filter((row) => row.scriptCount > 0);
const highPrioritySlotKeys = new Set(((optionalArgumentUsage as any).highPrioritySlots as any[]).map((row) => row.slot));

const memberByName = new Map(highUseThinMembers.map((row) => [row.member, row]));
const slotsByMember = new Map<string, any[]>();
for (const row of slotRows) {
  const rows = slotsByMember.get(row.member) ?? [];
  rows.push(row);
  slotsByMember.set(row.member, rows);
}

const constructById = new Map(highUseThinConstructs.map((row) => [row.id, row]));

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function assertSourceReports(): void {
  const failures: string[] = [];
  if ((memberDepth as any).headline?.highUseThinMembersAt100Scripts !== 96) failures.push('pine-corpus-vector-depth-gap-v1 expected 96 high-use thin members');
  if (((memberDepth as any).callableHighUseThinRows as unknown[] | undefined)?.length !== 49) failures.push('pine-corpus-vector-depth-gap-v1 expected 49 callable high-use thin members');
  if ((optionalArgumentUsage as any).headline?.highPrioritySlotsAt25Scripts !== 75) failures.push('pine-corpus-optional-argument-usage-v1 expected 75 high-priority slots');
  if ((optionalArgumentUsage as any).headline?.corpusExercisedUntestedSlots !== 197) failures.push('pine-corpus-optional-argument-usage-v1 expected 197 corpus-exercised untested slots');
  if ((constructDepth as any).headline?.highUseThinGrammarRowsAt100Scripts !== 0) failures.push('pine-corpus-construct-depth-v1 expected 0 high-use thin constructs');
  if (failures.length > 0) throw new Error(`Priority queue input contract failed:\n- ${failures.join('\n- ')}`);
}

function rootNamespace(surface: string): string {
  return surface.includes('.') ? surface.slice(0, surface.indexOf('.')) : surface;
}

function relatedConstructIds(surface: string): string[] {
  const root = rootNamespace(surface);
  const ids = new Set<string>();

  if (surface === 'input' || root === 'input') {
    ids.add('variables.multi-declaration');
    ids.add('types.qualifier-annotation');
  }
  if (surface === 'strategy' || root === 'strategy') {
    ids.add('declarations.strategy');
  }
  if (root === 'array') {
    ids.add('arrays.array-literal');
    ids.add('operators.history-reference');
  }
  if (root === 'map' || root === 'matrix') {
    ids.add('operators.history-reference');
  }
  if (['box', 'label', 'line', 'linefill', 'polyline', 'table'].includes(root)) {
    ids.add('operators.drawing-receiver-method-call');
    ids.add('objects.field-assignment');
  }
  if (root === 'ta' || ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4', 'volume'].includes(surface)) {
    ids.add('operators.history-reference');
  }
  if (['plot', 'plotshape', 'plotchar', 'plotarrow', 'alertcondition', 'fill', 'bgcolor', 'barcolor'].includes(surface)) {
    ids.add('formatting.call-continuation');
  }
  if (surface === 'library') {
    ids.add('imports.explicit-alias');
    ids.add('functions.default-parameter');
  }

  return [...ids].filter((id) => constructById.has(id));
}

function memberPoints(row: any | undefined): number {
  if (!row) return 0;
  const uses = row.corpusCallSiteCount || row.corpusReferenceCount || 0;
  return row.corpusScriptCount + uses * 0.1;
}

function slotPoints(rows: any[]): number {
  return rows.reduce((sum, row) => {
    const highPriorityBonus = highPrioritySlotKeys.has(row.slot) ? 1.25 : 1;
    return sum + highPriorityBonus * (row.scriptCount + row.hitCount * 0.05);
  }, 0);
}

function constructPoints(rows: any[]): number {
  return rows.reduce((sum, row) => {
    const emptySnippetBonus = row.grammarSnippetCount === 0 ? 1.5 : 1;
    return sum + emptySnippetBonus * (row.corpusScriptCount + row.corpusHitCount * 0.025);
  }, 0);
}

function makeSurfaceRow(surface: string): QueueRow {
  const member = memberByName.get(surface);
  const slots = slotsByMember.get(surface) ?? [];
  const constructs = relatedConstructIds(surface).map((id) => constructById.get(id)!);
  const axes = [
    member ? 'member-depth' : null,
    slots.length > 0 ? 'argument-slots' : null,
    constructs.length > 0 ? 'construct-depth' : null,
  ].filter(Boolean) as string[];
  const m = memberPoints(member);
  const s = slotPoints(slots);
  const c = constructPoints(constructs);
  const overlapMultiplier = 1 + Math.max(0, axes.length - 1) * 0.25;
  const score = Number(((m + s + c) * overlapMultiplier).toFixed(2));
  const highSlots = slots.filter((row) => highPrioritySlotKeys.has(row.slot));
  return {
    target: surface,
    targetKind: 'surface',
    axes,
    score,
    memberScore: Number(m.toFixed(2)),
    slotScore: Number(s.toFixed(2)),
    constructScore: Number(c.toFixed(2)),
    memberRows: member ? [member] : [],
    slotRows: slots,
    constructRows: constructs,
    rationale: [
      member ? `high-use thin member in ${member.corpusScriptCount} scripts` : null,
      slots.length > 0 ? `${slots.length} corpus-exercised untested optional slots (${highSlots.length} at >=25 scripts)` : null,
      constructs.length > 0 ? `related high-use thin constructs: ${constructs.map((row) => row.id).join(', ')}` : null,
    ].filter(Boolean).join('; '),
  };
}

function makeConstructOnlyRow(construct: any): QueueRow {
  const c = constructPoints([construct]);
  return {
    target: construct.id,
    targetKind: 'construct',
    axes: ['construct-depth'],
    score: Number(c.toFixed(2)),
    memberScore: 0,
    slotScore: 0,
    constructScore: Number(c.toFixed(2)),
    memberRows: [],
    slotRows: [],
    constructRows: [construct],
    rationale: `high-use thin construct in ${construct.corpusScriptCount} scripts with ${construct.grammarSnippetCount} grammar snippets`,
  };
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function summarizeSlots(rows: any[], limit = 6): string {
  return rows
    .slice()
    .sort((left, right) => right.scriptCount - left.scriptCount || left.slot.localeCompare(right.slot))
    .slice(0, limit)
    .map((row) => `${row.slot} (${row.scriptCount})`)
    .join('<br>');
}

function summarizeConstructs(rows: any[], limit = 5): string {
  return rows
    .slice()
    .sort((left, right) => right.corpusScriptCount - left.corpusScriptCount || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((row) => `${row.id} (${row.corpusScriptCount}/${row.grammarSnippetCount})`)
    .join('<br>');
}

async function main(): Promise<void> {
  assertSourceReports();

  const targets = new Set<string>([
    ...highUseThinMembers.map((row) => row.member),
    ...slotRows.map((row) => row.member),
  ]);

  const surfaceRows = [...targets].map(makeSurfaceRow).filter((row) => row.axes.length > 0);
  const linkedConstructIds = new Set(surfaceRows.flatMap((row) => (row.constructRows as any[]).map((construct) => construct.id)));
  const constructOnlyRows = highUseThinConstructs
    .filter((construct) => !linkedConstructIds.has(construct.id))
    .map(makeConstructOnlyRow);

  const rows = [...surfaceRows, ...constructOnlyRows].sort((left, right) =>
    right.score - left.score
    || right.axes.length - left.axes.length
    || left.target.localeCompare(right.target),
  );

  const multiAxisRows = rows.filter((row) => row.axes.length >= 2);
  const tripleAxisRows = rows.filter((row) => row.axes.length >= 3);
  const highPriorityRows = rows.filter((row) => row.score >= 1000 || row.axes.length >= 2).slice(0, 60);
  const decorativeConstructs = (constructDepth as any).unreachedRows as any[];

  const json = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommit: currentCommit(),
    sourceReports: {
      memberDepth: {
        file: 'pine-corpus-vector-depth-gap-v1.json',
        measuredCommit: (memberDepth as any).measuredCommit,
        highUseThinMembers: highUseThinMembers.length,
        callableHighUseThinMembers: (memberDepth as any).callableHighUseThinRows.length,
      },
      optionalArgumentUsage: {
        file: 'pine-corpus-optional-argument-usage-v1.json',
        measuredCommit: (optionalArgumentUsage as any).measuredCommit,
        highPrioritySlotsAt25Scripts: (optionalArgumentUsage as any).headline.highPrioritySlotsAt25Scripts,
        corpusExercisedUntestedSlots: (optionalArgumentUsage as any).headline.corpusExercisedUntestedSlots,
      },
      constructDepth: {
        file: 'pine-corpus-construct-depth-v1.json',
        measuredCommit: (constructDepth as any).measuredCommit,
        highUseThinConstructs: highUseThinConstructs.length,
      },
    },
    scoring: {
      memberPoints: 'corpusScriptCount + 0.10 * corpusCallSiteCount/referenceCount for high-use thin member rows.',
      slotPoints: 'For corpus-exercised untested optional slots on the same surface: scriptCount + 0.05 * hitCount, multiplied by 1.25 when the slot is in the 75-slot >=25-script priority set.',
      constructPoints: 'For related high-use thin constructs: corpusScriptCount + 0.025 * corpusHitCount, multiplied by 1.5 when the construct has zero grammar snippets.',
      overlapMultiplier: 'Multiply the sum by 1 + 0.25 * (axisCount - 1), so two-axis and three-axis targets outrank equally exposed single-axis rows.',
      constructLinking: 'Construct links are conservative namespace/form heuristics: input surfaces link to declaration/qualifier rows, strategy surfaces to strategy declaration, drawing namespaces to drawing receiver/UDT field assignment, array/map/matrix to collection/history forms, TA/source series to history-reference, and visual/output calls to call-continuation.',
    },
    headline: {
      queueRows: rows.length,
      multiAxisRows: multiAxisRows.length,
      tripleAxisRows: tripleAxisRows.length,
      highPriorityRows: highPriorityRows.length,
      topTarget: rows[0]?.target ?? null,
      conclusion: tripleAxisRows.length > 0
        ? 'The actionable queue is not three competing lists: overlap targets exist, and they should be worked first because a single case can deepen member coverage, exercise explicit optional slots, and hit a thin construct.'
        : 'The three axes mostly do not overlap; prioritize by score within each single axis.',
    },
    decorativeOrLowReturnConstructs: decorativeConstructs.map((row) => ({
      id: row.id,
      name: row.name,
      corpusScriptCount: row.corpusScriptCount,
      grammarSnippetCount: row.grammarSnippetCount,
      reason: 'Unreached by the 2,506-script corpus; do not spend tomorrow on this before the exposed queue.',
    })),
    rows,
  };

  const topTable = rows.slice(0, 50).map((row, index) => [
    String(index + 1),
    row.target,
    row.targetKind,
    row.axes.join(', '),
    String(row.score),
    String(row.memberScore),
    String(row.slotScore),
    String(row.constructScore),
    summarizeSlots(row.slotRows as any[]),
    summarizeConstructs(row.constructRows as any[]),
  ]);

  const tripleTable = tripleAxisRows.map((row, index) => [
    String(index + 1),
    row.target,
    String(row.score),
    row.rationale,
    summarizeSlots(row.slotRows as any[]),
    summarizeConstructs(row.constructRows as any[]),
  ]);

  const md = [
    '# Pine Corpus Priority Queue V1',
    '',
    'Authoritative corpus priority route: start here when asking what corpus-driven',
    'Pine parity evidence to build next. This report synthesizes the member-depth,',
    'optional argument-slot, and construct-depth rankings; the component reports',
    'remain measurements, but this is the actionable queue.',
    '',
    `Generated at ${json.generatedAt}. Measured at commit \`${json.measuredCommit}\`.`,
    '',
    '## Headline',
    '',
    `${json.headline.tripleAxisRows} targets hit all three axes: high-use thin member, corpus-exercised untested optional slots, and related high-use thin constructs.`,
    '',
    `${json.headline.multiAxisRows} targets hit at least two axes. The ranked table is score-ordered; multi-axis rows get an explicit overlap multiplier because they are where one vector/parser case can pay twice or three times.`,
    '',
    json.headline.conclusion,
    '',
    '## Scoring',
    '',
    `- Member points: ${json.scoring.memberPoints}`,
    `- Slot points: ${json.scoring.slotPoints}`,
    `- Construct points: ${json.scoring.constructPoints}`,
    `- Overlap multiplier: ${json.scoring.overlapMultiplier}`,
    `- Construct linking: ${json.scoring.constructLinking}`,
    '',
    '## Source Reports',
    '',
    `- Member depth: \`${json.sourceReports.memberDepth.file}\`, commit \`${json.sourceReports.memberDepth.measuredCommit}\`, ${json.sourceReports.memberDepth.highUseThinMembers} high-use thin members.`,
    `- Optional argument usage: \`${json.sourceReports.optionalArgumentUsage.file}\`, commit \`${json.sourceReports.optionalArgumentUsage.measuredCommit}\`, ${json.sourceReports.optionalArgumentUsage.highPrioritySlotsAt25Scripts} high-use slots at >=25 scripts, ${json.sourceReports.optionalArgumentUsage.corpusExercisedUntestedSlots} corpus-exercised untested slots total.`,
    `- Construct depth: \`${json.sourceReports.constructDepth.file}\`, commit \`${json.sourceReports.constructDepth.measuredCommit}\`, ${json.sourceReports.constructDepth.highUseThinConstructs} high-use thin constructs.`,
    '',
    '## Triple-Axis Targets',
    '',
    tripleTable.length === 0
      ? 'No target hits all three axes.'
      : table(['Rank', 'Target', 'Score', 'Why', 'Untested slots', 'Thin constructs'], tripleTable),
    '',
    '## Ranked Queue',
    '',
    table(['Rank', 'Target', 'Kind', 'Axes', 'Score', 'Member', 'Slots', 'Constructs', 'Top slots', 'Thin constructs'], topTable),
    '',
    '## Low-Return Construct Negatives',
    '',
    'These are the construct rows that the 2,506-script corpus did not reach. They are useful precisely because they should not displace exposed work tomorrow.',
    '',
    table(
      ['Construct', 'Name', 'Corpus scripts', 'Grammar snippets'],
      json.decorativeOrLowReturnConstructs.map((row) => [
        row.id,
        row.name,
        String(row.corpusScriptCount),
        String(row.grammarSnippetCount),
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
