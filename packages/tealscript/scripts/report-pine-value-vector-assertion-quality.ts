import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  CASES,
  officialMembersForValueVectorCase,
  validateValueVectorGate,
} from './run-pine-value-vectors.ts';
import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

type AssertionQuality = 'value' | 'property' | 'ran-only';

interface MemberQuality {
  member: string;
  quality: AssertionQuality;
  valueCases: string[];
  propertyCases: string[];
  ranOnlyCases: string[];
  reason: string;
}

const TRACE_REQUIRED_TA_MEMBERS = new Set([
  'ta.accdist',
  'ta.adx',
  'ta.alma',
  'ta.bar_index',
  'ta.bb',
  'ta.bbw',
  'ta.cmo',
  'ta.cross',
  'ta.crossover',
  'ta.crossunder',
  'ta.cum',
  'ta.dema',
  'ta.dmi',
  'ta.hma',
  'ta.kc',
  'ta.kcw',
  'ta.kst',
  'ta.macd',
  'ta.mfi',
  'ta.pivot_point_levels',
  'ta.pivothigh',
  'ta.pivotlow',
  'ta.rci',
  'ta.rsi',
  'ta.sar',
  'ta.stoch',
  'ta.supertrend',
  'ta.swma',
  'ta.tema',
  'ta.tsi',
  'ta.vwap',
  'ta.wpr',
]);

const BROAD_VALUE_CASE_PREFIXES = [
  'array.',
  'matrix.',
  'map.',
  'visual.',
  'runtime.',
  'output.',
  'drawing.',
  'strategy.',
  'request.',
];

const BROAD_VALUE_NAMESPACES = new Set([
  'alert',
  'box',
  'chart.point',
  'label',
  'line',
  'linefill',
  'log',
  'polyline',
  'table',
  'ticker',
]);

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function namespaceOf(member: string): string {
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
}

function markdownList(values: readonly string[]): string {
  if (values.length === 0) return '- none';
  return values.map((value) => `- \`${value}\``).join('\n');
}

function reportVersionFromOutputBase(outputBase: string): number {
  const match = /-v(\d+)$/.exec(outputBase);
  return match ? Number(match[1]) : 1;
}

function byNamespace(rows: readonly MemberQuality[]): Record<string, { value: number; property: number; ranOnly: number; total: number }> {
  const counts: Record<string, { value: number; property: number; ranOnly: number; total: number }> = {};
  for (const row of rows) {
    const namespace = namespaceOf(row.member);
    counts[namespace] ??= { value: 0, property: 0, ranOnly: 0, total: 0 };
    counts[namespace].total += 1;
    if (row.quality === 'value') counts[namespace].value += 1;
    if (row.quality === 'property') counts[namespace].property += 1;
    if (row.quality === 'ran-only') counts[namespace].ranOnly += 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function primaryTargetsForCase(testCase: (typeof CASES)[number], officialMembers: readonly string[], officialSet: ReadonlySet<string>): Set<string> {
  const targets = new Set<string>();
  if (testCase.id.startsWith('invariant.')) {
    for (const member of officialMembers) {
      if (member.startsWith('ta.')) targets.add(member);
    }
    return targets;
  }

  if (BROAD_VALUE_CASE_PREFIXES.some((prefix) => testCase.id.startsWith(prefix)) || BROAD_VALUE_NAMESPACES.has(testCase.namespace)) {
    for (const member of officialMembers) {
      if (member !== 'indicator') targets.add(member);
    }
    return targets;
  }

  if (testCase.id.startsWith('hostile.')) {
    const [, name] = testCase.id.split('.');
    const target = `ta.${name}`;
    if (officialSet.has(target)) targets.add(target);
    return targets;
  }

  const [namespace, name] = testCase.id.split('.');
  if (namespace && name) {
    const target = `${namespace}.${name}`;
    if (officialSet.has(target)) targets.add(target);
  }
  if (testCase.id === 'language.strategy-declaration-value-inputs') {
    targets.add('strategy.equity');
    targets.add('strategy.initial_capital');
  }
  if (testCase.id === 'language.udt-collection-copy-identity') {
    targets.add('array.new');
  }
  return targets;
}

function reasonFor(row: Omit<MemberQuality, 'quality' | 'reason'>, quality: AssertionQuality): string {
  if (quality === 'value') return `direct exact-value or payload assertion in ${row.valueCases[0]}`;
  if (quality === 'property') return `derived invariant assertion in ${row.propertyCases[0]}; exact seed/hole/recovery remains trace-required`;
  return row.ranOnlyCases.length > 0
    ? `appears only as scaffolding, dependency, or trace-required exact-value placeholder; first seen in ${row.ranOnlyCases[0]}`
    : 'covered member has no load-bearing assertion';
}

export function buildPineValueVectorAssertionQualityReport(version = 1): { json: unknown; markdown: string } {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const officialSet = new Set(officialMembers);
  const gate = validateValueVectorGate();
  const rows = new Map<string, Omit<MemberQuality, 'quality' | 'reason'>>();
  for (const member of officialMembers) {
    rows.set(member, { member, valueCases: [], propertyCases: [], ranOnlyCases: [] });
  }

  for (const testCase of CASES) {
    const members = officialMembersForValueVectorCase(testCase);
    const targets = primaryTargetsForCase(testCase, members, officialSet);
    for (const member of members) {
      const row = rows.get(member);
      if (!row) continue;
      const isTarget = targets.has(member);
      const exactValueCounts = isTarget && !testCase.id.startsWith('invariant.') && !TRACE_REQUIRED_TA_MEMBERS.has(member);
      const propertyCounts = isTarget && testCase.id.startsWith('invariant.');
      if (exactValueCounts) row.valueCases.push(testCase.id);
      else if (propertyCounts) row.propertyCases.push(testCase.id);
      else row.ranOnlyCases.push(testCase.id);
    }
  }

  const coveredRows = [...rows.values()]
    .filter((row) => row.valueCases.length > 0 || row.propertyCases.length > 0 || row.ranOnlyCases.length > 0)
    .map((row): MemberQuality => {
      const quality: AssertionQuality = row.valueCases.length > 0
        ? 'value'
        : row.propertyCases.length > 0
          ? 'property'
          : 'ran-only';
      return { ...row, quality, reason: reasonFor(row, quality) };
    })
    .sort((left, right) => left.member.localeCompare(right.member));

  const valueRows = coveredRows.filter((row) => row.quality === 'value');
  const propertyRows = coveredRows.filter((row) => row.quality === 'property');
  const ranOnlyRows = coveredRows.filter((row) => row.quality === 'ran-only');
  const namespaceCounts = byNamespace(coveredRows);

  const json = {
    schemaVersion: 1,
    basis: {
      officialMemberDenominator: officialMembers.length,
      coveredMembers: coveredRows.length,
      vectorCases: CASES.length,
      expectedRedCases: Object.keys(gate.expectedFailures),
      rule: 'A member is value-checked only when it is the target of an exact-value or payload assertion and is not in the trace-required TA missing-value register. A member is property-checked when it is the target of a derived invariant case. Incidental scaffolding and trace-required exact-value placeholders count as ran-only.',
    },
    summary: {
      valueChecked: valueRows.length,
      valueCheckedPercentOfCovered: percent(valueRows.length, coveredRows.length),
      propertyCheckedOnly: propertyRows.length,
      propertyCheckedOnlyPercentOfCovered: percent(propertyRows.length, coveredRows.length),
      ranOnly: ranOnlyRows.length,
      ranOnlyPercentOfCovered: percent(ranOnlyRows.length, coveredRows.length),
    },
    byNamespace: namespaceCounts,
    valueChecked: valueRows,
    propertyCheckedOnly: propertyRows,
    ranOnly: ranOnlyRows,
  };

  const markdown = [
    `# Pine Value Vector Assertion Quality V${version}`,
    '',
    '## Basis',
    '',
    '- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.',
    `- Member denominator: the 811 official names already covered by at least one vector case in \`pine-value-vector-member-map-v${version + 21}\`.`,
    '- Rule: value-checked means the member is the target of an exact-value or payload assertion.',
    '- Rule: property-checked means the member is the target of a derived invariant assertion.',
    '- Rule: ran-only means the member appears only as scaffolding, a dependency, or a trace-required exact-value placeholder.',
    '- Trace-required TA exact series do not count as value coverage because `PINE_TRACE_REQUIRED_v2.md` says their seed, hole, and recovery values remain unsettled.',
    '',
    '## Headline',
    '',
    `- Covered official members: ${coveredRows.length}.`,
    `- Value-checked: ${valueRows.length}/${coveredRows.length} (${percent(valueRows.length, coveredRows.length)}).`,
    `- Property-checked only: ${propertyRows.length}/${coveredRows.length} (${percent(propertyRows.length, coveredRows.length)}).`,
    `- Ran-only: ${ranOnlyRows.length}/${coveredRows.length} (${percent(ranOnlyRows.length, coveredRows.length)}).`,
    '',
    '## Namespace Counts',
    '',
    '| Namespace | Total | Value | Property only | Ran-only |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...Object.entries(namespaceCounts).map(([namespace, counts]) =>
      `| \`${namespace}\` | ${counts.total} | ${counts.value} | ${counts.property} | ${counts.ranOnly} |`,
    ),
    '',
    '## Property-Checked Only Members',
    '',
    markdownList(propertyRows.map((row) => `${row.member} - ${row.reason}`)),
    '',
    '## Ran-Only Members',
    '',
    markdownList(ranOnlyRows.map((row) => `${row.member} - ${row.reason}`)),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-value-vector-assertion-quality-v1';
  const { json, markdown } = buildPineValueVectorAssertionQualityReport(reportVersionFromOutputBase(outputBase));
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, markdown, 'utf8');
  process.stdout.write(`${JSON.stringify((json as { summary: unknown }).summary, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
