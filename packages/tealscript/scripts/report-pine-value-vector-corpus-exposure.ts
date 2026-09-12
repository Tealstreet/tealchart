import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ManifestScript {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  declaredVersion?: number;
}

interface Manifest {
  scripts: ManifestScript[];
}

interface MemberHit {
  member: string;
  count: number;
}

type ExposureKind = 'cannot-be-na' | 'leading-warmup-only' | 'interior-hole' | 'unknown';

interface UnsettledCallExposure {
  corpus: string;
  row: string;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  declaredVersion: string;
  member: string;
  expression: string;
  sourceArgument: string;
  exposure: ExposureKind;
  route: string;
}

interface CorpusScriptExposure {
  corpus: string;
  row: string;
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  declaredVersion: string;
  traceOrHostRequiredHits: MemberHit[];
  unsettledNaPolicyHits: MemberHit[];
  unsettledCallExposures: UnsettledCallExposure[];
}

const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_ROOT = dirname(dirname(PACKAGE_ROOT));
const DEFAULT_OUTPUT_BASE = join(PACKAGE_ROOT, 'reports/pine-value-vector-corpus-exposure-v1');

const CORPORA = [
  {
    name: 'v5',
    manifestPath: 'packages/tealscript/reports/external-pine-corpus-v5.manifest.json',
    sourceRoot: 'packages/tealscript/.cache/tealscript/pine-corpus-v5-20260910',
  },
  {
    name: 'v6',
    manifestPath: 'packages/tealscript/reports/external-pine-corpus-v6.manifest.json',
    sourceRoot: 'packages/tealscript/.cache/tealscript/pine-corpus-v6-20260911',
  },
];

const DIRECT_SERIES = new Set([
  'open',
  'high',
  'low',
  'close',
  'hl2',
  'hlc3',
  'ohlc4',
  'hlcc4',
  'volume',
]);

const WARMUP_ONLY_FUNCTIONS = new Set([
  'ta.atr',
  'ta.cci',
  'ta.change',
  'ta.correlation',
  'ta.covariance',
  'ta.dev',
  'ta.ema',
  'ta.highest',
  'ta.linreg',
  'ta.lowest',
  'ta.mom',
  'ta.percentrank',
  'ta.range',
  'ta.roc',
  'ta.sma',
  'ta.stdev',
  'ta.tr',
  'ta.variance',
  'ta.vwma',
  'ta.wma',
]);

const IMPLICIT_DIRECT_SOURCE = new Set([
  'ta.accdist',
  'ta.adx',
  'ta.bar_index',
  'ta.dmi',
  'ta.pivot_point_levels',
  'ta.sar',
]);

const UNSETTLED_SOURCE_ARG_INDEXES: Record<string, number[]> = {
  'ta.alma': [0],
  'ta.bb': [0],
  'ta.bbw': [0],
  'ta.cmo': [0],
  'ta.cross': [0, 1],
  'ta.crossover': [0, 1],
  'ta.crossunder': [0, 1],
  'ta.cum': [0],
  'ta.dema': [0],
  'ta.hma': [0],
  'ta.kc': [0],
  'ta.kcw': [0],
  'ta.kst': [0],
  'ta.macd': [0],
  'ta.mfi': [0],
  'ta.pivothigh': [0],
  'ta.pivotlow': [0],
  'ta.rci': [0],
  'ta.rsi': [0],
  'ta.stoch': [0, 1, 2],
  'ta.supertrend': [],
  'ta.swma': [0],
  'ta.tema': [0],
  'ta.tsi': [0],
  'ta.vwap': [0],
  'ta.wpr': [],
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

function declaredVersionFor(source: string, manifestVersion: number | undefined): string {
  return String(manifestVersion ?? source.match(/\/\/@version\s*=\s*(\d+)/)?.[1] ?? 'unspecified');
}

function rowId(localPath: string): string {
  return localPath.split('/').pop()?.slice(0, 4) ?? localPath;
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function countMemberHits(source: string, members: readonly string[]): MemberHit[] {
  const stripped = stripPineLiteralsAndComments(source);
  return members
    .map((member) => ({ member, count: stripped.match(memberPattern(member))?.length ?? 0 }))
    .filter((hit) => hit.count > 0)
    .sort((left, right) => right.count - left.count || left.member.localeCompare(right.member));
}

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitArguments(argumentText: string): string[] {
  const args: string[] = [];
  let start = 0;
  let paren = 0;
  let bracket = 0;
  let quote: string | null = null;
  for (let index = 0; index < argumentText.length; index += 1) {
    const char = argumentText[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') paren += 1;
    if (char === ')') paren -= 1;
    if (char === '[') bracket += 1;
    if (char === ']') bracket -= 1;
    if (char === ',' && paren === 0 && bracket === 0) {
      args.push(argumentText.slice(start, index).trim());
      start = index + 1;
    }
  }
  const tail = argumentText.slice(start).trim();
  if (tail.length > 0) args.push(tail);
  return args;
}

function findCalls(source: string, member: string): Array<{ expression: string; args: string[] }> {
  const calls: Array<{ expression: string; args: string[] }> = [];
  const pattern = memberPattern(member);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const openIndex = source.indexOf('(', match.index + match[0].length);
    if (openIndex === -1) continue;
    if (source.slice(match.index + match[0].length, openIndex).trim().length > 0) continue;
    const closeIndex = findMatchingParen(source, openIndex);
    if (closeIndex === -1) continue;
    const expression = source.slice(match.index, closeIndex + 1).replace(/\s+/g, ' ');
    calls.push({ expression, args: splitArguments(source.slice(openIndex + 1, closeIndex)) });
  }
  return calls;
}

function buildAssignmentMap(source: string): Map<string, string[]> {
  const assignments = new Map<string, string[]>();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    const simple = /^(?:varip\s+|var\s+)?(?:series\s+|simple\s+|input\s+|const\s+)?(?:float|int|bool|string|color|line|label|box|table|array<[^>]+>|matrix<[^>]+>|map<[^>]+>)?\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?::=|=)\s*(.+)$/.exec(trimmed);
    if (simple) {
      const [, name, expr] = simple;
      const current = assignments.get(name) ?? [];
      current.push(expr.trim());
      assignments.set(name, current);
    }
    const tuple = /^\[([^\]]+)\]\s*(?::=|=)\s*(.+)$/.exec(trimmed);
    if (tuple) {
      const names = tuple[1].split(',').map((part) => part.trim()).filter((part) => part && part !== '_');
      for (const name of names) {
        const current = assignments.get(name) ?? [];
        current.push(tuple[2].trim());
        assignments.set(name, current);
      }
    }
  }
  return assignments;
}

function classifyExpressionExposure(expression: string, assignments: Map<string, string[]>, seen = new Set<string>()): { exposure: ExposureKind; route: string } {
  const expr = expression.trim();
  if (expr.length === 0) return { exposure: 'cannot-be-na', route: 'implicit direct chart source' };
  if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(expr)) return { exposure: 'cannot-be-na', route: 'numeric literal' };
  if (/^(?:true|false)$/.test(expr)) return { exposure: 'cannot-be-na', route: 'boolean literal' };
  if (/^""$|^''$/.test(expr)) return { exposure: 'cannot-be-na', route: 'string literal' };
  if (/\binput\s*\./.test(expr) && !/\bna\b/.test(expr)) return { exposure: 'cannot-be-na', route: 'input default without na literal' };
  if (/\bbarmerge\s*\.\s*gaps_on\b/.test(expr) && /\brequest\s*\./.test(expr)) {
    return { exposure: 'interior-hole', route: 'request.* with barmerge.gaps_on' };
  }
  if (/\?\s*na\b|\bna\s*:|\bif\b[\s\S]*\bna\b|\belse\b[\s\S]*\bna\b/.test(expr)) {
    return { exposure: 'interior-hole', route: 'conditional branch yields na' };
  }
  if (/\bna\b/.test(expr) && !/\bna\s*\(/.test(expr)) return { exposure: 'interior-hole', route: 'explicit na literal in source expression' };
  if (/\b(?:array|matrix|map)\s*\.\s*get\s*\(/.test(expr) || /\.\s*get\s*\(/.test(expr)) {
    return { exposure: 'interior-hole', route: 'collection read can return or propagate missing data' };
  }
  if (/^(?:open|high|low|close|hl2|hlc3|ohlc4|hlcc4|volume)(?:\[[^\]]+\])?$/.test(expr)) {
    return { exposure: 'cannot-be-na', route: 'direct chart series' };
  }
  if (/\brequest\s*\.\s*security(?:_lower_tf)?\s*\(/.test(expr)) {
    return /\bbarmerge\s*\.\s*gaps_on\b/.test(expr)
      ? { exposure: 'interior-hole', route: 'request.security with barmerge.gaps_on' }
      : { exposure: 'leading-warmup-only', route: 'request.security without gaps_on can still warm up requested expression' };
  }
  for (const fn of WARMUP_ONLY_FUNCTIONS) {
    if (memberPattern(fn).test(expr)) return { exposure: 'leading-warmup-only', route: `derived ${fn} warm-up series` };
  }
  const identifiers = [...expr.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)]
    .map((match) => match[0])
    .filter((name) => !DIRECT_SERIES.has(name) && !['true', 'false', 'na', 'color', 'ta', 'math', 'str', 'request'].includes(name));
  let worst: { exposure: ExposureKind; route: string } | null = null;
  for (const identifier of identifiers) {
    if (seen.has(identifier)) continue;
    const deps = assignments.get(identifier);
    if (!deps) continue;
    seen.add(identifier);
    for (const dep of deps) {
      const classified = classifyExpressionExposure(dep, assignments, seen);
      if (!worst || exposureRank(classified.exposure) > exposureRank(worst.exposure)) {
        worst = { exposure: classified.exposure, route: `${identifier} <- ${classified.route}` };
      }
    }
  }
  if (!worst && identifiers.length === 0) return { exposure: 'cannot-be-na', route: 'direct chart series arithmetic or literal expression' };
  return worst ?? { exposure: 'unknown', route: 'source expression is computed through UDF/object state or unsupported static dependency shape' };
}

function exposureRank(exposure: ExposureKind): number {
  if (exposure === 'cannot-be-na') return 0;
  if (exposure === 'leading-warmup-only') return 1;
  if (exposure === 'unknown') return 2;
  return 3;
}

function worstExposure(exposures: readonly UnsettledCallExposure[]): ExposureKind {
  return exposures.reduce<ExposureKind>((worst, exposure) =>
    exposureRank(exposure.exposure) > exposureRank(worst) ? exposure.exposure : worst, 'cannot-be-na');
}

function unsettledCallExposuresForScript(source: string, unsettledMembers: readonly string[], base: Omit<UnsettledCallExposure, 'member' | 'expression' | 'sourceArgument' | 'exposure' | 'route'>): UnsettledCallExposure[] {
  const assignments = buildAssignmentMap(source);
  const exposures: UnsettledCallExposure[] = [];
  for (const member of unsettledMembers) {
    for (const call of findCalls(source, member)) {
      const sourceIndexes = UNSETTLED_SOURCE_ARG_INDEXES[member] ?? [0];
      const sourceArgs = IMPLICIT_DIRECT_SOURCE.has(member)
        ? ['implicit high/low/close']
        : sourceIndexes.length === 0
          ? ['implicit high/low/close']
          : sourceIndexes.map((index) => call.args[index]).filter((arg): arg is string => Boolean(arg));
      for (const sourceArgument of sourceArgs.length > 0 ? sourceArgs : ['implicit high/low/close']) {
        const classified = sourceArgument.startsWith('implicit ')
          ? { exposure: 'cannot-be-na' as const, route: 'implicit direct chart series' }
          : classifyExpressionExposure(sourceArgument, assignments);
        exposures.push({
          ...base,
          member,
          expression: call.expression,
          sourceArgument,
          exposure: classified.exposure,
          route: classified.route,
        });
      }
    }
  }
  return exposures;
}

function extractUnsettledNaMembers(markdown: string): string[] {
  const section = markdown.split('## Genuinely Primitive Or Incomplete')[1]?.split('## Invariant Coverage')[0] ?? '';
  return [...section.matchAll(/\|\s*`([^`]+)`\s*\|/g)]
    .map((match) => match[1])
    .filter((member, index, members) => members.indexOf(member) === index)
    .sort((left, right) => left.localeCompare(right));
}

function listRows(rows: readonly CorpusScriptExposure[]): string {
  if (rows.length === 0) return '- none';
  return rows.map((row) =>
    `- \`${row.corpus}/${row.row}\` ${row.sourceRepoUrl} ${row.sourceFilePath} @ \`${row.commitSha.slice(0, 12)}\``,
  ).join('\n');
}

function exposureList(rows: readonly UnsettledCallExposure[]): string {
  if (rows.length === 0) return '- none';
  return rows.slice(0, 80).map((row) =>
    `- \`${row.corpus}/${row.row}\` \`${row.member}\` via \`${row.sourceArgument}\` - ${row.exposure}, ${row.route} (${row.sourceRepoUrl} ${row.sourceFilePath})`,
  ).join('\n');
}

async function run(outputBase: string): Promise<void> {
  const memberMap = JSON.parse(await readFile(join(PACKAGE_ROOT, 'reports/pine-value-vector-member-map-v24.json'), 'utf8')) as {
    traceOrHostRequired: Array<{ member: string }>;
  };
  const traceMembers = memberMap.traceOrHostRequired.map((row) => row.member);
  const unsettledMembers = extractUnsettledNaMembers(await readFile(join(PACKAGE_ROOT, 'PINE_TRACE_REQUIRED_v2.md'), 'utf8'));
  const rows: CorpusScriptExposure[] = [];
  for (const corpus of CORPORA) {
    const manifest = JSON.parse(await readFile(join(REPO_ROOT, corpus.manifestPath), 'utf8')) as Manifest;
    for (const script of manifest.scripts) {
      const localPath = join(corpus.sourceRoot, script.localPath);
      const source = await readFile(join(REPO_ROOT, localPath), 'utf8');
      const declaredVersion = declaredVersionFor(source, script.declaredVersion);
      const base = {
        corpus: corpus.name,
        row: rowId(script.localPath),
        localPath,
        sourceRepoUrl: script.sourceRepoUrl,
        sourceFilePath: script.sourceFilePath,
        commitSha: script.commitSha,
        declaredVersion,
      };
      const traceOrHostRequiredHits = countMemberHits(source, traceMembers);
      const unsettledNaPolicyHits = countMemberHits(source, unsettledMembers);
      if (traceOrHostRequiredHits.length === 0 && unsettledNaPolicyHits.length === 0) continue;
      rows.push({
        ...base,
        traceOrHostRequiredHits,
        unsettledNaPolicyHits,
        unsettledCallExposures: unsettledCallExposuresForScript(source, unsettledMembers, base),
      });
    }
  }

  const rowsTouchingTrace = rows.filter((row) => row.traceOrHostRequiredHits.length > 0);
  const rowsTouchingUnsettled = rows.filter((row) => row.unsettledNaPolicyHits.length > 0);
  const rowsWithInterior = rows.filter((row) => row.unsettledCallExposures.some((exposure) => exposure.exposure === 'interior-hole'));
  const rowsWithUnknown = rows.filter((row) => row.unsettledCallExposures.some((exposure) => exposure.exposure === 'unknown'));
  const exposures = rows.flatMap((row) => row.unsettledCallExposures);
  const byWorstExposure = rowsTouchingUnsettled.reduce<Record<ExposureKind, number>>((counts, row) => {
    counts[worstExposure(row.unsettledCallExposures)] += 1;
    return counts;
  }, { 'cannot-be-na': 0, 'leading-warmup-only': 0, 'interior-hole': 0, unknown: 0 });
  const traceMemberCounts = new Map<string, number>();
  const unsettledMemberCounts = new Map<string, number>();
  for (const row of rows) {
    for (const hit of row.traceOrHostRequiredHits) traceMemberCounts.set(hit.member, (traceMemberCounts.get(hit.member) ?? 0) + 1);
    for (const hit of row.unsettledNaPolicyHits) unsettledMemberCounts.set(hit.member, (unsettledMemberCounts.get(hit.member) ?? 0) + 1);
  }
  const memberCounts = (counts: Map<string, number>) =>
    [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([member, count]) => ({ member, scripts: count }));

  const summary = {
    corpusScripts: 2000,
    rowsTouchingTraceOrUnsettled: rows.length,
    rowsTouchingTraceOrUnsettledPercent: percent(rows.length, 2000),
    rowsTouchingTraceOrHostRequired: rowsTouchingTrace.length,
    rowsTouchingUnsettledNaPolicy: rowsTouchingUnsettled.length,
    rowsTouchingBoth: rows.filter((row) => row.traceOrHostRequiredHits.length > 0 && row.unsettledNaPolicyHits.length > 0).length,
    unsettledRowsByWorstExposure: byWorstExposure,
    rowsWithInteriorHoleExposure: rowsWithInterior.length,
    rowsWithUnknownExposure: rowsWithUnknown.length,
    unsettledCallExposures: exposures.length,
  };
  const json = {
    schemaVersion: 1,
    measurementSha: process.env.GIT_COMMIT ?? 'unknown',
    basis: {
      corpora: CORPORA,
      traceOrHostRequiredMembers: traceMembers.length,
      unsettledNaPolicyMembers: unsettledMembers.length,
      method: 'Static source scan of pinned corpus cache files. It classifies explicit request.gaps_on, conditional/expression na, collection reads, and derived warm-up dependencies as source-exposure routes; unknown UDF/object dependency shapes are reported separately rather than treated as safe.',
    },
    summary,
    traceOrHostRequiredMemberCounts: memberCounts(traceMemberCounts),
    unsettledNaPolicyMemberCounts: memberCounts(unsettledMemberCounts),
    rows,
    rowsWithInteriorHoleExposure: rowsWithInterior,
    rowsWithUnknownExposure: rowsWithUnknown,
  };

  const markdown = [
    '# Pine Value Vector Corpus Exposure V1',
    '',
    '## Basis',
    '',
    `- Measurement SHA: \`${process.env.GIT_COMMIT ?? 'unknown'}\`.`,
    '- Scope: pinned v5 and v6 corpus cache sources, read-only.',
    '- Method: static source scan for the 50 trace/host-required members and the 32 unsettled TA missing-value policy members.',
    '- Exposure routes: `request.security`/request calls with `barmerge.gaps_on`, conditional or explicit `na`, collection reads, and derived warm-up series.',
    '- Limit: static analysis can under-resolve UDF/object-state dependencies; those are reported as `unknown`, not counted as safe.',
    '',
    '## Headline',
    '',
    `- Corpus scripts scanned: ${summary.corpusScripts}.`,
    `- Scripts touching trace/host-required or unsettled-NA members: ${summary.rowsTouchingTraceOrUnsettled} (${summary.rowsTouchingTraceOrUnsettledPercent}).`,
    `- Scripts touching trace/host-required members: ${summary.rowsTouchingTraceOrHostRequired}.`,
    `- Scripts touching unsettled TA missing-value policies: ${summary.rowsTouchingUnsettledNaPolicy}.`,
    `- Scripts touching both: ${summary.rowsTouchingBoth}.`,
    `- Unsettled-policy scripts by worst source exposure: ${Object.entries(summary.unsettledRowsByWorstExposure).map(([kind, count]) => `${kind}=${count}`).join(', ')}.`,
    `- Scripts with confirmed interior-hole exposure: ${summary.rowsWithInteriorHoleExposure}.`,
    `- Scripts with unresolved static dependency exposure: ${summary.rowsWithUnknownExposure}.`,
    '',
    '## Trace Or Host Required Members By Script Count',
    '',
    memberCounts(traceMemberCounts).map((row) => `- \`${row.member}\` - ${row.scripts}`).join('\n') || '- none',
    '',
    '## Unsettled TA Members By Script Count',
    '',
    memberCounts(unsettledMemberCounts).map((row) => `- \`${row.member}\` - ${row.scripts}`).join('\n') || '- none',
    '',
    '## Confirmed Interior-Hole Exposure',
    '',
    exposureList(rowsWithInterior.flatMap((row) => row.unsettledCallExposures.filter((exposure) => exposure.exposure === 'interior-hole'))),
    '',
    '## Unknown Static Exposure',
    '',
    exposureList(rowsWithUnknown.flatMap((row) => row.unsettledCallExposures.filter((exposure) => exposure.exposure === 'unknown'))),
    '',
    '## Rows Touching Trace Or Host Required Members',
    '',
    listRows(rowsTouchingTrace),
    '',
  ].join('\n');

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, `${markdown}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

run(process.argv[2] ?? DEFAULT_OUTPUT_BASE).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
