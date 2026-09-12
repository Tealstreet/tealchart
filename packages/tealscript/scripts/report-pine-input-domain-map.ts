import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  CASES,
  EXPECTED_VALUE_VECTOR_FAILURES,
  validateValueVectorGate,
} from './run-pine-value-vectors.ts';
import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

type DomainStatus =
  | 'vector-covered-green'
  | 'expected-red-runtime-gap'
  | 'semantic-blocked'
  | 'runtime-loud'
  | 'trace-or-host-required'
  | 'no-documented-domain-in-audit';

interface DomainEntry {
  id: string;
  members: string[];
  status: DomainStatus;
  domain: string;
  behavior: string;
  consequence: 'plausible-wrong-value' | 'loud-error' | 'metadata-only' | 'host-dependent' | 'none-found';
  citation: string;
  vectorCases?: string[];
}

const REFERENCE = 'https://www.tradingview.com/pine-script-reference/v6/';
const DOCS = {
  arrays: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
  colors: 'https://www.tradingview.com/pine-script-docs/visuals/colors/',
  declarations: 'https://www.tradingview.com/pine-script-docs/language/script-structure/',
  inputs: 'https://www.tradingview.com/pine-script-docs/concepts/inputs/',
  matrices: 'https://www.tradingview.com/pine-script-docs/language/matrices/',
  otherTimeframes: 'https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
  strategies: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
  time: 'https://www.tradingview.com/pine-script-docs/concepts/time/',
  visuals: 'https://www.tradingview.com/pine-script-docs/visuals/plots/',
  taFaq: 'https://www.tradingview.com/pine-script-docs/faq/functions/',
} as const;

const TA_LENGTH_MEMBERS = [
  'ta.adx', 'ta.alma', 'ta.atr', 'ta.bb', 'ta.bbw', 'ta.cci', 'ta.change', 'ta.cmo', 'ta.cog',
  'ta.correlation', 'ta.covariance', 'ta.dema', 'ta.dev', 'ta.dmi', 'ta.ema', 'ta.falling',
  'ta.highest', 'ta.highestbars', 'ta.hma', 'ta.kc', 'ta.kcw', 'ta.kst', 'ta.linreg',
  'ta.lowest', 'ta.lowestbars', 'ta.median', 'ta.mfi', 'ta.mode', 'ta.mom',
  'ta.percentile_linear_interpolation', 'ta.percentile_nearest_rank', 'ta.percentrank',
  'ta.range', 'ta.rci', 'ta.rising', 'ta.rma', 'ta.roc', 'ta.rsi', 'ta.sma', 'ta.smma',
  'ta.stdev', 'ta.stoch', 'ta.sum', 'ta.supertrend', 'ta.tema', 'ta.tsi', 'ta.variance',
  'ta.vwma', 'ta.wma', 'ta.wpr',
];

const DOMAIN_ENTRIES: DomainEntry[] = [
  {
    id: 'ta-positive-integer-lengths',
    members: TA_LENGTH_MEMBERS,
    status: 'vector-covered-green',
    domain: 'Documented TA length parameters must be positive integer values; zero, negative, fractional and non-finite values are invalid.',
    behavior: '244 rejection vectors cover 61 length slots and both compiled entry points reject with a positive-integer diagnostic.',
    consequence: 'plausible-wrong-value',
    citation: `${DOCS.taFaq} ${REFERENCE}`,
    vectorCases: CASES.filter((testCase) => testCase.id.startsWith('ta.invalid-length.')).map((testCase) => testCase.id),
  },
  {
    id: 'color-rgb-components',
    members: ['color.rgb'],
    status: 'trace-or-host-required',
    domain: 'RGB components are defined in the 0-255 range.',
    behavior: 'Current runtime accepts dynamic out-of-domain components and clamps while surfacing the approximation. TradingView documents the valid domain, but not the runtime consequence for dynamic invalid inputs, so this is trace-undetermined rather than a reference-backed expected-red.',
    consequence: 'plausible-wrong-value',
    citation: DOCS.colors,
  },
  {
    id: 'color-transparency',
    members: ['color.new', 'color.rgb'],
    status: 'semantic-blocked',
    domain: 'Transparency is defined in the 0-100 range.',
    behavior: 'Semantic checking already rejects out-of-domain `transp` for color constructors, so no runtime vector is added.',
    consequence: 'plausible-wrong-value',
    citation: DOCS.colors,
  },
  {
    id: 'legacy-bgcolor-transparency',
    members: ['bgcolor'],
    status: 'trace-or-host-required',
    domain: 'Transparency is defined in the 0-100 range.',
    behavior: 'Current runtime accepts dynamic out-of-domain legacy `bgcolor(transp=...)` and applies its compatibility path. TradingView documents the valid domain, but not the runtime consequence for dynamic invalid inputs, so this is trace-undetermined rather than a reference-backed expected-red.',
    consequence: 'plausible-wrong-value',
    citation: DOCS.colors,
  },
  {
    id: 'visual-positive-integer-sizes',
    members: ['plot', 'hline', 'plotarrow'],
    status: 'semantic-blocked',
    domain: 'Line widths and plotarrow min/max heights must be positive integer visual sizes.',
    behavior: 'Semantic checking already rejects non-positive and fractional values for v6, so no runtime vector is added.',
    consequence: 'plausible-wrong-value',
    citation: DOCS.visuals,
  },
  {
    id: 'declaration-counts-and-precision',
    members: ['indicator', 'strategy', 'library', 'max_bars_back'],
    status: 'semantic-blocked',
    domain: 'Declaration counts, precision and max_bars_back/calc_bars_count fields are documented numeric domains.',
    behavior: 'Semantic checking already rejects negative, non-integer or wrongly typed declaration values.',
    consequence: 'metadata-only',
    citation: `${DOCS.declarations} ${REFERENCE}`,
  },
  {
    id: 'input-ranges-and-options',
    members: ['input', 'input.float', 'input.int', 'input.string', 'input.enum', 'input.timeframe'],
    status: 'semantic-blocked',
    domain: 'Input defval must match range/options overload domains when those domains are supplied.',
    behavior: 'Semantic checking already rejects defval outside min/max, defval outside options, mixed option types and options combined with minval/maxval/step.',
    consequence: 'metadata-only',
    citation: DOCS.inputs,
  },
  {
    id: 'request-calc-bars-and-const-routing',
    members: [
      'request.security', 'request.security_lower_tf', 'request.seed', 'request.dividends',
      'request.earnings', 'request.financial', 'request.economic', 'request.quandl',
    ],
    status: 'semantic-blocked',
    domain: 'Request calc_bars_count must be a valid count and routing enums such as gaps/lookahead must be allowed constants, not runtime values.',
    behavior: 'Semantic checking already rejects invalid calc_bars_count and non-const routing values.',
    consequence: 'host-dependent',
    citation: DOCS.otherTimeframes,
  },
  {
    id: 'time-bars-back-window',
    members: ['time', 'time_close'],
    status: 'semantic-blocked',
    domain: 'bars_back/timeframe_bars_back are documented bounded integer offsets.',
    behavior: 'Semantic checking already rejects non-integer and out-of-window offsets.',
    consequence: 'plausible-wrong-value',
    citation: DOCS.time,
  },
  {
    id: 'strategy-declaration-and-order-domains',
    members: ['strategy', 'strategy.entry', 'strategy.order', 'strategy.exit', 'strategy.close', 'strategy.close_all'],
    status: 'semantic-blocked',
    domain: 'Strategy declaration/order numeric, boolean, string and enum arguments have documented type/range domains.',
    behavior: 'Semantic checking rejects invalid literal numeric ranges and argument types; exact broker/provider semantics remain separate trace-required surfaces.',
    consequence: 'plausible-wrong-value',
    citation: DOCS.strategies,
  },
  {
    id: 'array-index-and-empty-operations',
    members: [
      'array.get', 'array.set', 'array.remove', 'array.insert', 'array.pop', 'array.shift',
      'array.first', 'array.last', 'array.slice', 'array.percentrank',
    ],
    status: 'runtime-loud',
    domain: 'Collection indices must address existing elements, empty pop/shift/first/last operations are invalid, and slices use half-open index ranges.',
    behavior: 'Operations fail loudly at runtime, including `array.slice(from > to)` during global initialization.',
    consequence: 'loud-error',
    citation: `${DOCS.arrays} ${REFERENCE}`,
    vectorCases: ['domain.array-slice-descending-range-rejection'],
  },
  {
    id: 'matrix-index-and-shape-domains',
    members: [
      'matrix.get', 'matrix.set', 'matrix.remove_row', 'matrix.remove_col', 'matrix.fill',
      'matrix.row', 'matrix.col', 'matrix.submatrix', 'matrix.reshape',
    ],
    status: 'runtime-loud',
    domain: 'Matrix row/column indices and ranges must fit the matrix shape.',
    behavior: 'Runtime already fails loudly for out-of-bounds rows, columns and ranges in the probed accessors.',
    consequence: 'loud-error',
    citation: `${DOCS.matrices} ${REFERENCE}`,
  },
];

function namespaceOf(member: string): string {
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function countsByStatus(rows: readonly { status: DomainStatus }[]): Record<DomainStatus, number> {
  const statuses: DomainStatus[] = [
    'vector-covered-green',
    'expected-red-runtime-gap',
    'semantic-blocked',
    'runtime-loud',
    'trace-or-host-required',
    'no-documented-domain-in-audit',
  ];
  return Object.fromEntries(statuses.map((status) => [status, rows.filter((row) => row.status === status).length])) as Record<DomainStatus, number>;
}

function markdownList(values: readonly string[]): string {
  if (values.length === 0) return '- none';
  return values.map((value) => `- \`${value}\``).join('\n');
}

function expandEntries() {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const byMember = new Map<string, DomainEntry[]>();
  for (const entry of DOMAIN_ENTRIES) {
    for (const member of entry.members) {
      byMember.set(member, [...(byMember.get(member) ?? []), entry]);
    }
  }

  return officialMembers.map((member) => {
    const entries = byMember.get(member) ?? [];
    if (entries.length === 0) {
      return {
        member,
        namespace: namespaceOf(member),
        status: 'no-documented-domain-in-audit' as DomainStatus,
        domains: [],
      };
    }
    return {
      member,
      namespace: namespaceOf(member),
      status: entries.some((entry) => entry.status === 'expected-red-runtime-gap')
        ? 'expected-red-runtime-gap' as DomainStatus
        : entries.some((entry) => entry.status === 'trace-or-host-required')
          ? 'trace-or-host-required' as DomainStatus
        : entries.some((entry) => entry.status === 'vector-covered-green')
          ? 'vector-covered-green' as DomainStatus
          : entries.some((entry) => entry.status === 'runtime-loud')
            ? 'runtime-loud' as DomainStatus
            : entries[0]!.status,
      domains: entries.map((entry) => entry.id),
    };
  });
}

export function buildPineInputDomainMapReport(): { json: unknown; markdown: string } {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const memberRows = expandEntries();
  const gate = validateValueVectorGate();
  const domainVectorCases = CASES.filter((testCase) => testCase.id.startsWith('ta.invalid-length.') || testCase.id.startsWith('domain.'));
  const domainExpectedRedCases = Object.keys(EXPECTED_VALUE_VECTOR_FAILURES).filter((id) => id.startsWith('domain.'));
  const statusCounts = countsByStatus(memberRows);
  const domainEntriesByConsequence = [...DOMAIN_ENTRIES].sort((left, right) => {
    const rank = {
      'plausible-wrong-value': 0,
      'host-dependent': 1,
      'loud-error': 2,
      'metadata-only': 3,
      'none-found': 4,
    };
    return rank[left.consequence] - rank[right.consequence] || left.id.localeCompare(right.id);
  });

  const json = {
    schemaVersion: 1,
    basis: {
      officialMembers: officialMembers.length,
      source: 'Committed Pine v6 manual member index plus TradingView reference/manual pages cited per domain group.',
      vectorReport: 'pine-value-vectors-coverage-v117.json',
      rule: 'A domain enters the map only when the reference states it. If semantic checking already refuses it, the map records semantic-blocked and no runtime vector is added. A documented valid range does not by itself settle the runtime consequence of dynamic invalid inputs.',
    },
    summary: {
      documentedDomainGroups: DOMAIN_ENTRIES.length,
      membersWithDocumentedDomains: memberRows.filter((row) => row.domains.length > 0).length,
      membersWithoutDocumentedDomainInAudit: statusCounts['no-documented-domain-in-audit'],
      domainVectorCases: domainVectorCases.length,
      taLengthRejectionCases: domainVectorCases.filter((testCase) => testCase.id.startsWith('ta.invalid-length.')).length,
      expectedRedDomainCases: domainExpectedRedCases.length,
      unexpectedDomainFailures: gate.unexpectedFailures.filter((result) => result.id.startsWith('domain.') || result.id.startsWith('ta.invalid-length.')).map((result) => result.id),
      unexpectedDomainPasses: gate.unexpectedPasses.filter((result) => result.id.startsWith('domain.') || result.id.startsWith('ta.invalid-length.')).map((result) => result.id),
      statusCounts,
    },
    domainEntries: DOMAIN_ENTRIES,
    memberRows,
  };

  const markdown = [
    '# Pine Input Domain Map V1',
    '',
    '## Basis',
    '',
    '- Denominator: 861 official names from the committed Pine v6 manual index.',
    '- Rule: a domain is included only when TradingView documentation states a bound, set, qualifier, range, or invalid operation.',
    '- Rule: if semantic checking already refuses the invalid input, the entry is recorded as `semantic-blocked` and no runtime vector is added.',
    '- Rule: runtime vectors are reserved for reachable invalid inputs with consequence, especially plausible wrong values.',
    '- Rule: a documented valid input range is not treated as a documented invalid-input consequence. Dynamic out-of-range color/transparency behavior is trace-undetermined until TradingView evidence settles whether clamp, rejection, or another behavior is correct.',
    '',
    '## Summary',
    '',
    `- Documented domain groups: ${DOMAIN_ENTRIES.length}.`,
    `- Members with a documented domain in this audit: ${memberRows.filter((row) => row.domains.length > 0).length}/${officialMembers.length} (${percent(memberRows.filter((row) => row.domains.length > 0).length, officialMembers.length)}).`,
    `- Members with no documented invalid-input domain in this audit: ${statusCounts['no-documented-domain-in-audit']}/${officialMembers.length} (${percent(statusCounts['no-documented-domain-in-audit'], officialMembers.length)}). Most Pine members do not specify bad-input behavior in the audited reference surface.`,
    `- Domain vectors: ${domainVectorCases.length}; TA length rejection vectors: ${domainVectorCases.filter((testCase) => testCase.id.startsWith('ta.invalid-length.')).length}; expected-red runtime-domain vectors: ${domainExpectedRedCases.length}.`,
    '- Expected-red domain vectors are diagnostic known gaps, not regressions. They are kept red by case id so fixes produce explicit unexpected-pass signals.',
    `- Unexpected domain failures: ${json.summary.unexpectedDomainFailures.length}.`,
    `- Unexpected domain passes: ${json.summary.unexpectedDomainPasses.length}.`,
    '',
    '| Status | Members |',
    '| --- | ---: |',
    ...Object.entries(statusCounts).map(([status, count]) => `| \`${status}\` | ${count} |`),
    '',
    '## Consequence-Ranked Domains',
    '',
    '| Domain | Members | Status | Consequence | Behavior |',
    '| --- | --- | --- | --- | --- |',
    ...domainEntriesByConsequence.map((entry) => `| \`${entry.id}\` | ${entry.members.map((member) => `\`${member}\``).join(', ')} | \`${entry.status}\` | \`${entry.consequence}\` | ${entry.behavior} |`),
    '',
    '## Expected-Red Runtime-Domain Cases',
    '',
    markdownList(domainExpectedRedCases),
    '',
    '## Member Rows',
    '',
    ...memberRows.map((row) => `- \`${row.member}\`: \`${row.status}\`${row.domains.length ? ` (${row.domains.map((domain) => `\`${domain}\``).join(', ')})` : ''}`),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'reports/pine-input-domain-map-v1';
  const { json, markdown } = buildPineInputDomainMapReport();
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
