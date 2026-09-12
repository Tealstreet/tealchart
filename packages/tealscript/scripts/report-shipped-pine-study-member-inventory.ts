import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

interface ShippedPineSource {
  id: string;
  surface: string;
  localPath: string;
  declaredVersion: string;
  code: string;
}

interface MemberHit {
  member: string;
  count: number;
  versions: string[];
  sources: Array<{ id: string; surface: string; localPath: string; count: number }>;
}

type NaExposureKind = 'cannot-be-na' | 'leading-warmup-only' | 'interior-hole';

interface UnsettledNaCallExposure {
  member: string;
  sourceId: string;
  expression: string;
  sourceArgument: string;
  exposure: NaExposureKind;
  reason: string;
}

interface TraceRequiredRow {
  member: string;
  reason: string;
}

interface AssertionQualityRow {
  member: string;
  reason: string;
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(dirname(PACKAGE_ROOT));
const DEFAULT_OUTPUT_BASE = join(PACKAGE_ROOT, 'reports/shipped-pine-study-member-inventory-v1');

const SOURCE_FILES = [
  {
    surface: 'tealchart_builtin_indicator',
    localPath: 'packages/tealchart/src/indicators/builtinIndicators.ts',
    extract: extractBuiltinIndicatorSources,
  },
  {
    surface: 'web_custom_study_page_default',
    localPath: 'apps/web/src/custom-chart-study-page-components/defaultChartStudy.ts',
    extract: (text: string, localPath: string, surface: string) =>
      extractNamedTemplateSource(text, localPath, surface, 'defaultChartStudyCode'),
  },
  {
    surface: 'web_in_chart_editor_default',
    localPath: 'apps/web/src/atoms/tealscriptEditor.atoms.ts',
    extract: (text: string, localPath: string, surface: string) =>
      extractNamedTemplateSource(text, localPath, surface, 'DEFAULT_TEALSCRIPT_EDITOR_CODE'),
  },
];

const UNSETTLED_NA_CALL_EXPOSURES: UnsettledNaCallExposure[] = [
  {
    member: 'ta.hma',
    sourceId: 'hma',
    expression: 'ta.hma(close, length)',
    sourceArgument: 'close',
    exposure: 'cannot-be-na',
    reason: 'direct chart close has no interior holes and is not a derived warm-up series',
  },
  {
    member: 'ta.supertrend',
    sourceId: 'supertrend',
    expression: 'ta.supertrend(factor, atrLength)',
    sourceArgument: 'implicit high/low/close',
    exposure: 'cannot-be-na',
    reason: 'uses direct chart OHLC and no request, conditional-na, collection read, or explicit na source',
  },
  {
    member: 'ta.vwap',
    sourceId: 'vwap',
    expression: 'ta.vwap()',
    sourceArgument: 'implicit hlc3/volume',
    exposure: 'cannot-be-na',
    reason: 'default source is direct chart hlc3/volume with no request gaps or conditional-na source',
  },
  {
    member: 'ta.rsi',
    sourceId: 'rsi',
    expression: 'ta.rsi(close, length)',
    sourceArgument: 'close',
    exposure: 'cannot-be-na',
    reason: 'direct chart close has no interior holes and is not a derived warm-up series',
  },
  {
    member: 'ta.macd',
    sourceId: 'macd',
    expression: 'ta.macd(close, fastLen, slowLen, signalLen)',
    sourceArgument: 'close',
    exposure: 'cannot-be-na',
    reason: 'direct chart close has no interior holes and is not a derived warm-up series',
  },
  {
    member: 'ta.stoch',
    sourceId: 'stochastic',
    expression: 'ta.stoch(close, high, low, kLength)',
    sourceArgument: 'close/high/low',
    exposure: 'cannot-be-na',
    reason: 'direct chart OHLC has no interior holes and is not a derived warm-up series',
  },
  {
    member: 'ta.dmi',
    sourceId: 'adx',
    expression: 'ta.dmi(length, adxSmoothing)',
    sourceArgument: 'implicit high/low/close',
    exposure: 'cannot-be-na',
    reason: 'uses direct chart OHLC and no request, conditional-na, collection read, or explicit na source',
  },
  {
    member: 'ta.sar',
    sourceId: 'sar',
    expression: 'ta.sar(start, increment, maximum)',
    sourceArgument: 'implicit high/low/close',
    exposure: 'cannot-be-na',
    reason: 'uses direct chart OHLC and no request, conditional-na, collection read, or explicit na source',
  },
  {
    member: 'ta.rsi',
    sourceId: 'rsi-signals',
    expression: 'ta.rsi(close, length)',
    sourceArgument: 'close',
    exposure: 'cannot-be-na',
    reason: 'direct chart close has no interior holes and is not a derived warm-up series',
  },
  {
    member: 'ta.crossunder',
    sourceId: 'rsi-signals',
    expression: 'ta.crossunder(rsiValue, overbought)',
    sourceArgument: 'rsiValue = ta.rsi(close, length)',
    exposure: 'leading-warmup-only',
    reason: 'the first argument is a derived RSI series; its source is direct close, so only leading warm-up na is reachable',
  },
  {
    member: 'ta.crossover',
    sourceId: 'rsi-signals',
    expression: 'ta.crossover(rsiValue, oversold)',
    sourceArgument: 'rsiValue = ta.rsi(close, length)',
    exposure: 'leading-warmup-only',
    reason: 'the first argument is a derived RSI series; its source is direct close, so only leading warm-up na is reachable',
  },
  {
    member: 'ta.macd',
    sourceId: 'macd-signals',
    expression: 'ta.macd(close, fastLen, slowLen, signalLen)',
    sourceArgument: 'close',
    exposure: 'cannot-be-na',
    reason: 'direct chart close has no interior holes and is not a derived warm-up series',
  },
  {
    member: 'ta.crossover',
    sourceId: 'macd-signals',
    expression: 'ta.crossover(macdLine, signalLine)',
    sourceArgument: '[macdLine, signalLine] = ta.macd(close, ...)',
    exposure: 'leading-warmup-only',
    reason: 'both arguments are derived MACD tuple members; their source is direct close, so only leading warm-up na is reachable',
  },
  {
    member: 'ta.crossunder',
    sourceId: 'macd-signals',
    expression: 'ta.crossunder(macdLine, signalLine)',
    sourceArgument: '[macdLine, signalLine] = ta.macd(close, ...)',
    exposure: 'leading-warmup-only',
    reason: 'both arguments are derived MACD tuple members; their source is direct close, so only leading warm-up na is reachable',
  },
  {
    member: 'ta.crossover',
    sourceId: 'ma-cross-signals',
    expression: 'ta.crossover(fastMA, slowMA)',
    sourceArgument: 'fastMA/slowMA = ta.ema(close, ...)',
    exposure: 'cannot-be-na',
    reason: 'EMA seeds from direct close and does not create leading warm-up holes in the settled vectors',
  },
  {
    member: 'ta.crossunder',
    sourceId: 'ma-cross-signals',
    expression: 'ta.crossunder(fastMA, slowMA)',
    sourceArgument: 'fastMA/slowMA = ta.ema(close, ...)',
    exposure: 'cannot-be-na',
    reason: 'EMA seeds from direct close and does not create leading warm-up holes in the settled vectors',
  },
];

const EXPOSURE_RANK: Record<NaExposureKind, number> = {
  'cannot-be-na': 0,
  'leading-warmup-only': 1,
  'interior-hole': 2,
};

function stripPineLiteralsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

function memberPattern(member: string): RegExp {
  const escaped = member
    .split('.')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s*\\.\\s*');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'g');
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function extractTemplateAfter(text: string, markerIndex: number): string | null {
  const start = text.indexOf('`', markerIndex);
  if (start === -1) return null;
  let output = '';
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\') {
      output += char;
      index += 1;
      if (index < text.length) output += text[index];
      continue;
    }
    if (char === '`') return output;
    output += char;
  }
  return null;
}

function extractBuiltinIndicatorSources(text: string, localPath: string, surface: string): ShippedPineSource[] {
  const sources: ShippedPineSource[] = [];
  const entryPattern = /code:\s*`/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(text))) {
    const id = nearestPrecedingIndicatorId(text, match.index);
    const code = extractTemplateAfter(text, match.index);
    if (!code || !looksLikePineSource(code)) continue;
    sources.push({
      id,
      surface,
      localPath,
      declaredVersion: declaredVersionFor(code),
      code,
    });
  }
  return sources;
}

function nearestPrecedingIndicatorId(text: string, index: number): string {
  const prefix = text.slice(Math.max(0, index - 1200), index);
  const matches = [...prefix.matchAll(/id:\s*'([^']+)'/g)];
  return matches.at(-1)?.[1] ?? `code@${index}`;
}

function extractNamedTemplateSource(text: string, localPath: string, surface: string, id: string): ShippedPineSource[] {
  const markerIndex = text.indexOf(id);
  if (markerIndex === -1) return [];
  const code = extractTemplateAfter(text, markerIndex);
  if (!code || !looksLikePineSource(code)) return [];
  return [{
    id,
    surface,
    localPath,
    declaredVersion: declaredVersionFor(code),
    code,
  }];
}

function looksLikePineSource(code: string): boolean {
  return /(?:^|\n)\s*(?:\/\/@version=\d+\s*)?(?:indicator|strategy|study)\s*\(/.test(code);
}

function declaredVersionFor(code: string): string {
  return code.match(/\/\/@version\s*=\s*(\d+)/)?.[1] ?? 'unspecified';
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

function memberHitList(values: readonly MemberHit[]): string {
  if (values.length === 0) return '- none';
  return values
    .map((hit) => {
      const sourceIds = hit.sources.map((source) => source.id).join(', ');
      return `- \`${hit.member}\` - ${hit.count} references across ${hit.sources.length} sources (${sourceIds})`;
    })
    .join('\n');
}

function exposureLabel(exposure: NaExposureKind): string {
  if (exposure === 'cannot-be-na') return 'source cannot be na';
  if (exposure === 'leading-warmup-only') return 'leading warm-up na only';
  return 'interior hole possible';
}

function exposureSummary(exposures: readonly UnsettledNaCallExposure[]): Record<NaExposureKind, number> {
  return exposures.reduce<Record<NaExposureKind, number>>((counts, exposure) => {
    counts[exposure.exposure] += 1;
    return counts;
  }, { 'cannot-be-na': 0, 'leading-warmup-only': 0, 'interior-hole': 0 });
}

function memberExposureSummary(exposuresByMember: Record<string, NaExposureKind>): Record<NaExposureKind, number> {
  return Object.values(exposuresByMember).reduce<Record<NaExposureKind, number>>((counts, exposure) => {
    counts[exposure] += 1;
    return counts;
  }, { 'cannot-be-na': 0, 'leading-warmup-only': 0, 'interior-hole': 0 });
}

function worstExposureByMember(exposures: readonly UnsettledNaCallExposure[]): Record<string, NaExposureKind> {
  const result: Record<string, NaExposureKind> = {};
  for (const exposure of exposures) {
    const current = result[exposure.member];
    if (!current || EXPOSURE_RANK[exposure.exposure] > EXPOSURE_RANK[current]) result[exposure.member] = exposure.exposure;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function exposureRows(exposures: readonly UnsettledNaCallExposure[]): string[] {
  if (exposures.length === 0) return ['| none | none | none | none | none |',];
  return exposures.map((exposure) =>
    `| \`${exposure.member}\` | \`${exposure.sourceId}\` | \`${exposure.expression}\` | ${exposureLabel(exposure.exposure)} | ${exposure.reason} |`,
  );
}

function extractUnsettledNaMembers(markdown: string): string[] {
  const section = markdown.split('## Genuinely Primitive Or Incomplete')[1]?.split('## Invariant Coverage')[0] ?? '';
  return [...section.matchAll(/\|\s*`([^`]+)`\s*\|/g)]
    .map((match) => match[1])
    .filter((member, index, members) => members.indexOf(member) === index)
    .sort((left, right) => left.localeCompare(right));
}

function collectHits(sources: readonly ShippedPineSource[], officialMembers: readonly string[]): MemberHit[] {
  const hits = new Map<string, MemberHit>();
  for (const source of sources) {
    const stripped = stripPineLiteralsAndComments(source.code);
    for (const member of officialMembers) {
      const matches = stripped.match(memberPattern(member));
      if (!matches) continue;
      const hit = hits.get(member) ?? { member, count: 0, versions: [], sources: [] };
      hit.count += matches.length;
      if (!hit.versions.includes(source.declaredVersion)) hit.versions.push(source.declaredVersion);
      hit.sources.push({ id: source.id, surface: source.surface, localPath: source.localPath, count: matches.length });
      hits.set(member, hit);
    }
  }
  return [...hits.values()].sort((left, right) => right.count - left.count || left.member.localeCompare(right.member));
}

async function buildReport(outputBase: string): Promise<void> {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const sources: ShippedPineSource[] = [];
  for (const sourceFile of SOURCE_FILES) {
    const text = await readFile(join(REPO_ROOT, sourceFile.localPath), 'utf8');
    sources.push(...sourceFile.extract(text, sourceFile.localPath, sourceFile.surface));
  }

  const memberHits = collectHits(sources, officialMembers);
  const hitByMember = new Map(memberHits.map((hit) => [hit.member, hit]));
  const memberMap = JSON.parse(await readFile(join(PACKAGE_ROOT, 'reports/pine-value-vector-member-map-v23.json'), 'utf8')) as {
    traceOrHostRequired: TraceRequiredRow[];
  };
  const assertionQuality = JSON.parse(await readFile(join(PACKAGE_ROOT, 'reports/pine-value-vector-assertion-quality-v2.json'), 'utf8')) as {
    propertyCheckedOnly: AssertionQualityRow[];
    ranOnly: AssertionQualityRow[];
  };
  const traceMarkdown = await readFile(join(PACKAGE_ROOT, 'PINE_TRACE_REQUIRED_v2.md'), 'utf8');
  const unsettledNaMembers = extractUnsettledNaMembers(traceMarkdown);

  const traceRequiredHits = memberMap.traceOrHostRequired
    .map((row) => hitByMember.get(row.member))
    .filter((row): row is MemberHit => Boolean(row));
  const unsettledNaHits = unsettledNaMembers
    .map((member) => hitByMember.get(member))
    .filter((row): row is MemberHit => Boolean(row));
  const propertyOnlyHits = assertionQuality.propertyCheckedOnly
    .map((row) => hitByMember.get(row.member))
    .filter((row): row is MemberHit => Boolean(row));
  const ranOnlyHits = assertionQuality.ranOnly
    .map((row) => hitByMember.get(row.member))
    .filter((row): row is MemberHit => Boolean(row));
  const unsettledExposureMembers = new Set(UNSETTLED_NA_CALL_EXPOSURES.map((exposure) => exposure.member));
  const unsettledNaHitsWithoutExposure = unsettledNaHits
    .map((hit) => hit.member)
    .filter((member) => !unsettledExposureMembers.has(member));
  const naExposureSummary = exposureSummary(UNSETTLED_NA_CALL_EXPOSURES);
  const naExposureByMember = worstExposureByMember(UNSETTLED_NA_CALL_EXPOSURES);
  const naExposureMemberSummary = memberExposureSummary(naExposureByMember);
  const versionCounts = sources.reduce<Record<string, number>>((counts, source) => {
    counts[source.declaredVersion] = (counts[source.declaredVersion] ?? 0) + 1;
    return counts;
  }, {});

  const json = {
    schemaVersion: 1,
    generatedAtCommit: process.env.GIT_COMMIT ?? 'unknown',
    basis: {
      shippedPineSources: sources.length,
      officialMemberDenominator: officialMembers.length,
      sourceFiles: SOURCE_FILES.map(({ localPath, surface }) => ({ localPath, surface })),
      excludedSurfaces: [
        {
          localPath: 'packages/studies/src',
          reason: 'public package studies are PineJS/TypeScript canvas studies or empty jailbreak entries, not checked-in Pine source strings',
        },
      ],
    },
    summary: {
      declaredVersions: versionCounts,
      referencedOfficialMembers: memberHits.length,
      referencedOfficialMemberPercent: percent(memberHits.length, officialMembers.length),
      traceOrHostRequiredMembersUsed: traceRequiredHits.length,
      unsettledNaPolicyMembersUsed: unsettledNaHits.length,
      propertyOnlyMembersUsed: propertyOnlyHits.length,
      ranOnlyMembersUsed: ranOnlyHits.length,
      unsettledNaCallSites: UNSETTLED_NA_CALL_EXPOSURES.length,
      unsettledNaCallSitesByExposure: naExposureSummary,
      unsettledNaMembersByWorstExposure: naExposureByMember,
      unsettledNaMembersByExposure: naExposureMemberSummary,
      unsettledNaInteriorHoleMembers: Object.entries(naExposureByMember)
        .filter(([, exposure]) => exposure === 'interior-hole')
        .map(([member]) => member),
      dependsOnUnsettledBehavior: traceRequiredHits.length + unsettledNaHits.length + propertyOnlyHits.length + ranOnlyHits.length > 0,
    },
    sources: sources.map(({ code: _code, ...source }) => source),
    memberHits,
    intersections: {
      traceOrHostRequired: traceRequiredHits,
      unsettledNaPolicy: unsettledNaHits,
      unsettledNaPolicyCallExposure: UNSETTLED_NA_CALL_EXPOSURES,
      unsettledNaHitsWithoutExposure,
      propertyOnly: propertyOnlyHits,
      ranOnly: ranOnlyHits,
    },
    byNamespace: byNamespace(memberHits.map((hit) => hit.member)),
  };

  const markdown = [
    '# Shipped Pine Study Member Inventory V2',
    '',
    '## Basis',
    '',
    `- Measurement SHA: \`${process.env.GIT_COMMIT ?? 'unknown'}\`.`,
    '- Scope: checked-in Pine source strings shipped by Tealchart and apps/web defaults.',
    '- Included: `packages/tealchart/src/indicators/builtinIndicators.ts` Pine `code` entries, the custom-study-page default, and the in-chart editor default.',
    '- Excluded: `packages/studies/src` public studies are PineJS/TypeScript canvas studies or empty jailbreak entries, not Pine source strings.',
    '- Limit: this measures the Pine source Tealstreet ships in the repo, not Pine scripts users write or persist outside the repo.',
    '- Method: source text is stripped of comments and string literals, then matched against the 861-name official Pine v6 manual snapshot.',
    '',
    '## Headline',
    '',
    `- Shipped Pine sources: ${sources.length}.`,
    `- Declared versions: ${Object.entries(versionCounts).map(([version, count]) => `${version}=${count}`).join(', ')}.`,
    `- Official members referenced: ${memberHits.length}/${officialMembers.length} (${percent(memberHits.length, officialMembers.length)}).`,
    `- Trace/host-required members used: ${traceRequiredHits.length}.`,
    `- Unsettled TA missing-value policy members used: ${unsettledNaHits.length}.`,
    `- Member exposure split: ${naExposureMemberSummary['cannot-be-na']} source-cannot-be-\`na\`, ${naExposureMemberSummary['leading-warmup-only']} leading-warm-up-only, ${naExposureMemberSummary['interior-hole']} interior-hole.`,
    `- Unsettled TA call sites checked for source holes: ${UNSETTLED_NA_CALL_EXPOSURES.length}.`,
    `- Source cannot be \`na\`: ${naExposureSummary['cannot-be-na']} call sites.`,
    `- Leading warm-up \`na\` only: ${naExposureSummary['leading-warmup-only']} call sites.`,
    `- Interior hole possible: ${naExposureSummary['interior-hole']} call sites.`,
    `- Property-only assertion members used: ${propertyOnlyHits.length}.`,
    `- Ran-only assertion members used: ${ranOnlyHits.length}.`,
    `- Answer: ${traceRequiredHits.length + unsettledNaHits.length + propertyOnlyHits.length + ranOnlyHits.length > 0 ? 'yes, shipped Pine sources depend on unsettled value behavior' : 'no, shipped Pine sources do not reference unsettled or trace-required behavior'}.`,
    '',
    '## Trace Or Host Required Intersections',
    '',
    memberHitList(traceRequiredHits),
    '',
    '## Unsettled TA Missing-Value Policy Intersections',
    '',
    memberHitList(unsettledNaHits),
    '',
    '## Unsettled TA Call-Site `na` Exposure',
    '',
    '| Member | Source | Expression | Exposure | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...exposureRows(UNSETTLED_NA_CALL_EXPOSURES),
    '',
    '## Unsettled TA Members Without Call-Site Exposure Classification',
    '',
    markdownList(unsettledNaHitsWithoutExposure),
    '',
    '## Property-Only Assertion Intersections',
    '',
    memberHitList(propertyOnlyHits),
    '',
    '## Ran-Only Assertion Intersections',
    '',
    memberHitList(ranOnlyHits),
    '',
    '## Referenced Official Members By Frequency',
    '',
    memberHitList(memberHits),
    '',
    '## Shipped Pine Sources',
    '',
    ...sources.map((source) => `- \`${source.id}\` - ${source.surface}, version ${source.declaredVersion}, ${source.localPath}`),
    '',
    '## Unreferenced Trace/Host Required Members',
    '',
    markdownList(memberMap.traceOrHostRequired.map((row) => row.member).filter((member) => !hitByMember.has(member))),
    '',
  ].join('\n');

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, `${markdown}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(json.summary, null, 2)}\n`);
}

const outputBase = process.argv[2] ?? DEFAULT_OUTPUT_BASE;
buildReport(outputBase).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
