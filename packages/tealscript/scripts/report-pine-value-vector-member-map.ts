import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  CASES,
  officialMembersForValueVectorCase,
  validateValueVectorGate,
} from './run-pine-value-vectors.ts';
import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

interface ClassifiedMember {
  member: string;
  reason: string;
}

const TRACE_REQUIRED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^(request\.(dividends|earnings|financial|economic|footprint|quandl|seed)|dividends\.|earnings\.|financial\.|economic\.)/, reason: 'provider-backed event, seed, footprint, or fundamental data' },
  { pattern: /^(request\.currency_rate|currency\.)/, reason: 'host/provider currency conversion data' },
  { pattern: /^(footprint\.|volume_row\.)/, reason: 'provider footprint row data' },
  { pattern: /^session\.(isfirstbar|islastbar|ismarket)$/, reason: 'exchange session calendar data' },
  { pattern: /^barstate\.(isrealtime|isnew|islastconfirmedhistory)$/, reason: 'live realtime event stream semantics' },
  { pattern: /^timenow$/, reason: 'wall-clock execution time' },
  { pattern: /^(ask|bid)$/, reason: 'live quote fields supplied by the host data stream' },
  { pattern: /^library$/, reason: 'declaration form, not an executable value member' },
  { pattern: /^math\.random$/, reason: 'TradingView pseudo-random sequence needs trace parity rather than a guessed oracle' },
  { pattern: /^runtime\.error$/, reason: 'intentional runtime exception surface, not a successful value-output member' },
  { pattern: /^syminfo\.(country|sector|industry|isin|current_contract|timezone|volumetype|recommendations_)/, reason: 'host/exchange symbol metadata' },
  { pattern: /^strategy\.margin_liquidation_price$/, reason: 'exact margin liquidation timing needs TradingView broker-emulator traces' },
  { pattern: /^strategy\.risk\.(max_cons_loss_days|max_drawdown|max_intraday_filled_orders|max_intraday_loss)$/, reason: 'exact strategy risk halt and forced-exit timing needs TradingView broker-emulator/session traces' },
];

function classifyUnmappedMember(member: string): ClassifiedMember {
  const traceRequired = TRACE_REQUIRED_PATTERNS.find(({ pattern }) => pattern.test(member));
  if (traceRequired) return { member, reason: traceRequired.reason };
  return { member, reason: 'locally verifiable with deterministic bars, inputs, object state, or synthetic host metadata' };
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function byNamespace(members: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    const namespace = member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
    counts[namespace] = (counts[namespace] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function markdownList(values: readonly string[]): string {
  if (values.length === 0) return '- none';
  return values.map((value) => `- \`${value}\``).join('\n');
}

function classifiedMarkdownList(values: readonly ClassifiedMember[]): string {
  if (values.length === 0) return '- none';
  return values.map(({ member, reason }) => `- \`${member}\` - ${reason}`).join('\n');
}

export function buildPineValueVectorMemberCoverageReport(): { json: unknown; markdown: string } {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const gate = validateValueVectorGate();
  const caseMap = CASES.map((testCase) => ({
    id: testCase.id,
    namespace: testCase.namespace,
    officialMembers: officialMembersForValueVectorCase(testCase),
  }));
  const coveredMembers = [...new Set(caseMap.flatMap((row) => row.officialMembers))]
    .sort((left, right) => left.localeCompare(right));
  const coveredSet = new Set(coveredMembers);
  const unmappedMembers = officialMembers.filter((member) => !coveredSet.has(member));
  const traceRequired = unmappedMembers
    .map(classifyUnmappedMember)
    .filter((row) => row.reason !== 'locally verifiable with deterministic bars, inputs, object state, or synthetic host metadata');
  const verifiableWithoutTraces = unmappedMembers
    .map(classifyUnmappedMember)
    .filter((row) => row.reason === 'locally verifiable with deterministic bars, inputs, object state, or synthetic host metadata');
  const passingCaseIds = gate.results
    .filter((result) => result.compiledMatches && result.publicPathMatches)
    .map((result) => result.id);
  const expectedRedCaseIds = Object.keys(gate.expectedFailures);

  const json = {
    schemaVersion: 1,
    basis: {
      officialMemberDenominator: officialMembers.length,
      vectorCases: CASES.length,
      passingCases: passingCaseIds.length,
      expectedRedCases: expectedRedCaseIds,
    },
    coverage: {
      coveredMembers: coveredMembers.length,
      coveredPercent: percent(coveredMembers.length, officialMembers.length),
      unmappedMembers: unmappedMembers.length,
      verifiableWithoutTraces: verifiableWithoutTraces.length,
      traceOrHostRequired: traceRequired.length,
      practicalNoTraceDenominator: officialMembers.length - traceRequired.length,
      practicalNoTraceCovered: coveredMembers.length,
      practicalNoTraceCoveredPercent: percent(coveredMembers.length, officialMembers.length - traceRequired.length),
    },
    byNamespace: {
      official: byNamespace(officialMembers),
      covered: byNamespace(coveredMembers),
      unmapped: byNamespace(unmappedMembers),
      verifiableWithoutTraces: byNamespace(verifiableWithoutTraces.map((row) => row.member)),
      traceOrHostRequired: byNamespace(traceRequired.map((row) => row.member)),
    },
    caseMap,
    coveredMembers,
    verifiableWithoutTraces,
    traceOrHostRequired: traceRequired,
  };

  const markdown = [
    '# Pine Value Vector Member Map V1',
    '',
    '## Basis',
    '',
    '- Source: `packages/tealscript/scripts/run-pine-value-vectors.ts` at current HEAD.',
    '- Denominator: 861 names from the committed TradingView Pine v6 reference manual index snapshot.',
    '- Method: each vector case is mapped to the official members used by its Pine source; harness scaffolding such as `indicator()` and `plot()` is counted because it is executed and asserted when the case checks output metadata.',
    '- Limit: member execution is not the same as exhaustive argument/value coverage for every overload.',
    '',
    '## Headline',
    '',
    `- Vector cases: ${CASES.length}; passing ${passingCaseIds.length}; expected-red ${expectedRedCaseIds.length}.`,
    `- Official members covered by at least one vector case: ${coveredMembers.length}/${officialMembers.length} (${percent(coveredMembers.length, officialMembers.length)}).`,
    `- Unmapped official members: ${unmappedMembers.length}.`,
    `- Unmapped but locally verifiable without TradingView traces: ${verifiableWithoutTraces.length}.`,
    `- Unmapped trace/host-required: ${traceRequired.length}.`,
    `- Practical no-trace coverage: ${coveredMembers.length}/${officialMembers.length - traceRequired.length} (${percent(coveredMembers.length, officialMembers.length - traceRequired.length)}).`,
    '',
    '## Namespace Counts',
    '',
    '| Namespace | Official | Covered | Unmapped |',
    '| --- | ---: | ---: | ---: |',
    ...Object.keys(byNamespace(officialMembers)).map((namespace) =>
      `| \`${namespace}\` | ${byNamespace(officialMembers)[namespace] ?? 0} | ${byNamespace(coveredMembers)[namespace] ?? 0} | ${byNamespace(unmappedMembers)[namespace] ?? 0} |`,
    ),
    '',
    '## Trace Or Host Required Unmapped Members',
    '',
    classifiedMarkdownList(traceRequired),
    '',
    '## Locally Verifiable Unmapped Members',
    '',
    markdownList(verifiableWithoutTraces.map((row) => row.member)),
    '',
    '## Expected-Red Cases',
    '',
    markdownList(expectedRedCaseIds),
    '',
    '## Case Member Map',
    '',
    ...caseMap.map((row) => `- \`${row.id}\`: ${row.officialMembers.map((member) => `\`${member}\``).join(', ') || 'none'}`),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-value-vector-member-map-v1';
  const { json, markdown } = buildPineValueVectorMemberCoverageReport();
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
