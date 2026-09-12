#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

type Stage = 'parse' | 'semantic' | 'execute' | 'output';
type Bucket = 'real-gap' | 'invalid-pine' | 'artifact' | 'trace-required' | 'unclassified';
type Confidence = 'high' | 'medium' | 'thin';

type StageResult = {
  diagnostic?: string;
};

type CorpusRow = {
  localPath: string;
  sourceRepoUrl: string;
  sourceFilePath: string;
  commitSha: string;
  sourceSha256: string;
  declaredVersion: number;
  declarationKind: string;
  firstFailedStage?: Stage | null;
  outcome?: string;
  output?: { produced?: boolean };
  validity: { bucket: string };
  stages: Partial<Record<Stage, StageResult>>;
};

type CorpusReport = {
  schemaVersion: number;
  generatedAt: string;
  inputDir: string;
  summary: {
    total: number;
    versionMix: Record<string, number>;
    declarationKinds: Record<string, number>;
    funnel: Record<string, { count: number; percent: number }>;
    achievableCeiling: {
      denominator: number;
      funnel: Record<string, { count: number; percent: number }>;
    };
    validity: Record<string, number>;
  };
  rows: CorpusRow[];
};

type Classification = {
  bucket: Bucket;
  owner: string;
  construct: string;
  evidence: string;
  confidence: Confidence;
  minimalRepro?: string;
};

const ROOT = path.resolve(import.meta.dirname, '..');
const INPUT_REPORT = path.join(
  ROOT,
  '.cache/tealscript/pine-corpus-v7-20260911/fixture-profiles-current-2e05553bda/external-pine-corpus-v7-daily-standard.json',
);
const OUT_MD = path.join(
  ROOT,
  'reports/external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.md',
);
const OUT_JSON = path.join(
  ROOT,
  'reports/external-pine-corpus-v7.current-gap-pool-bbcbf3d220-v1.json',
);

const MEASUREMENT_SHA = 'bbcbf3d22069bbddcce4a3a66c37821ac0fe33b4';
const PROFILE_SHA = '2e05553bda';
const EXPECTED_POOL_SIZE = 108;

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

function rowId(rowOrPath: CorpusRow | string): string {
  const localPath = typeof rowOrPath === 'string' ? rowOrPath : rowOrPath.localPath;
  return localPath.match(/sources\/(\d+)/)?.[1] ?? localPath;
}

function diagnostic(row: CorpusRow): string {
  const stage = row.firstFailedStage;
  return stage ? row.stages[stage]?.diagnostic ?? '' : '';
}

function shortDiagnostic(row: CorpusRow, max = 118): string {
  const text = diagnostic(row).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) =>
    value.replace(/\|/g, '\\|').replace(/\n/g, '<br>').replace(/\r/g, '');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function sortedCountRows(counts: Map<string, number>): string[][] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => [name, String(count)]);
}

const classifications = new Map<string, Classification>();

function classify(
  ids: string[],
  bucket: Bucket,
  owner: string,
  construct: string,
  evidence: string,
  confidence: Confidence = 'high',
  minimalRepro?: string,
): void {
  for (const id of ids) {
    if (classifications.has(id)) throw new Error(`Duplicate classification for ${id}`);
    classifications.set(id, { bucket, owner, construct, evidence, confidence, minimalRepro });
  }
}

classify(
  ['0008'],
  'real-gap',
  'runtime/output',
  'global visible output is declared but never emitted',
  'The measured v6 source reaches execution and contains a global visible output declaration; neither calibrated fixture path emits it.',
  'high',
  `//@version=6
indicator("global output after collection calls")
values = array.from(1.0, 2.0, 3.0)
plot(array.copy(values).get(0))`,
);

classify(
  ['0023'],
  'real-gap',
  'runtime',
  'array math receiver result loses length or contents',
  'The declared v5 fixture builds a three-element array, calls array.abs(), and then reads index 2; TealScript throws size 2.',
  'high',
  `//@version=5
indicator("array abs size")
signs = array.from(-2, 0, 3)
absolutes = signs.abs()
plot(absolutes.get(2))`,
);

classify(
  ['0078', '0079', '0080'],
  'real-gap',
  'parser',
  'v5 switch arm arrow after continuation line',
  'Published v5 sources use a switch case condition on one line and the => arm marker on the next indented line; the parser rejects the arm boundary.',
  'medium',
  `//@version=5
indicator("switch arrow continuation")
f(x) =>
    switch
        x > 0
            => 1
        => 0
plot(f(close))`,
);

classify(
  ['0101', '0102'],
  'real-gap',
  'parser',
  'v6 enum display strings',
  'The rows declare v6 enums with string display values such as On = "ON"; this is a v6 enum construct, not a numeric enum value artifact.',
  'high',
  `//@version=6
indicator("enum display string")
enum State
    On = "ON"
plot(State.On == State.On ? 1 : 0)`,
);

classify(
  ['0115', '0116'],
  'real-gap',
  'parser',
  'tuple declaration inside v5 switch arms',
  'Published v5 sources declare tuple locals inside switch arms; the parser rejects the block boundary rather than reaching semantic checks.',
  'medium',
  `//@version=5
indicator("tuple in switch arm")
pair() => [1, 2]
value = switch close > open
    true =>
        [a, b] = pair()
        a + b
    => 0
plot(value)`,
);

classify(
  ['0141', '0142', '0143', '0144', '0145', '0146', '0160'],
  'real-gap',
  'runtime',
  'matrix eigenvalues/eigenvectors with complex roots',
  'The rows reach matrix eigen decomposition on real matrices with complex eigenvalues; Pine has to return a representable series value instead of aborting the whole script before later output.',
  'medium',
  `//@version=6
indicator("complex eigenvalues")
m = matrix.new<float>(2, 2, 0.0)
m.set(0, 1, -1.0)
m.set(1, 0, 1.0)
plot(array.size(matrix.eigenvalues(m)))`,
);

classify(
  ['0153'],
  'real-gap',
  'semantic',
  'mixed int/float matrix.kron return type',
  'matrix.kron(int, float) should produce a float matrix; the checker binds the call as matrix<int> and rejects a later float fill.',
  'high',
  `//@version=6
indicator("mixed matrix kron")
ints = matrix.new<int>(1, 1, 1)
floats = matrix.new<float>(1, 1, 1.0)
matrix.fill(matrix.kron(ints, floats), 1.0)
plot(close)`,
);

classify(
  ['0249'],
  'real-gap',
  'semantic',
  'ticker.kagi two-argument overload',
  'Local signatures require three arguments, but a harvested published source in the same corpus uses ticker.kagi(syminfo.tickerid, kRev); published Pine evidence outranks the local doc reading. This handoff is thin until confirmed on TradingView.',
  'thin',
  `//@version=6
indicator("kagi two args")
k = ticker.kagi(syminfo.tickerid, 3)
plot(request.security(k, timeframe.period, close))`,
);

classify(
  ['0253'],
  'real-gap',
  'parser',
  'tuple declaration with equals on following continuation line',
  'The TealScript parser notes already record public corpus reliance on tuple declarations whose = starts on a following continuation line; this row is that construct.',
  'medium',
  `//@version=5
indicator("tuple continuation equals")
pair() => [1, 2]
[a,
 b]
 = pair()
plot(a + b)`,
);

classify(
  ['0002', '0004'],
  'invalid-pine',
  'none',
  'matrix.add_col dimension mismatch',
  'The source inserts a three-element column into a one-row matrix. That is a Pine runtime constraint, not an engine acceptance gap.',
);

classify(
  ['0003'],
  'invalid-pine',
  'none',
  'matrix value assigned to array variable',
  'Declared v6 source assigns matrix<float> into array<float>; the checker is refusing a real type mismatch.',
);

classify(
  ['0009', '0031', '0195'],
  'invalid-pine',
  'none',
  'Pine v6 bool cannot hold na',
  'These rows declare v6. The v6 migration removed implicit nullable bool use; judging them as v6 makes the diagnostics expected.',
);

classify(
  ['0010'],
  'invalid-pine',
  'none',
  'fill() missing required third argument',
  'Declared v6 source calls fill() with too few arguments.',
);

classify(
  ['0033'],
  'invalid-pine',
  'none',
  'function-call expressions used as tuple lvalues',
  'The row uses assignments such as [globals.get(...)] = ...; function calls are not assignable Pine lvalues.',
);

classify(
  ['0059'],
  'invalid-pine',
  'none',
  'array cleared before indexed access',
  'The script empties the array and then reads index 0, so TradingView would stop with the same bounds error.',
);

classify(
  ['0088', '0208'],
  'invalid-pine',
  'none',
  'hline price is not numeric',
  'The rows pass chart.point or matrix values where hline() requires a price value.',
);

classify(
  ['0103', '0227', '0239', '0248'],
  'invalid-pine',
  'none',
  'request.footprint arity/signature misuse',
  'The committed v6 signature requires ticks_per_row and va_percent before provider execution; these rows supply zero or one invalid argument.',
);

classify(
  ['0124'],
  'invalid-pine',
  'none',
  'strategy.close_all unknown when argument',
  'The declared v5 source uses the removed/unsupported when argument on strategy.close_all().',
);

classify(
  ['0139'],
  'invalid-pine',
  'none',
  'invalid trailing stop offset',
  'The strategy supplies a non-positive trailing stop offset, which Pine rejects.',
);

classify(
  ['0140'],
  'invalid-pine',
  'none',
  'unknown math.cbrt builtin',
  'math.cbrt is not in the committed v5/v6 member index.',
);

classify(
  ['0149'],
  'invalid-pine',
  'none',
  'matrix eigenvalues require a square matrix',
  'The source calls matrix.eigenvalues on a 2x3 matrix; Pine matrix algebra rejects non-square eigen decompositions.',
);

classify(
  ['0154', '0157', '0166'],
  'invalid-pine',
  'none',
  'fixture mixes incompatible matrix/array element types',
  'The generated fixtures fill numeric matrices with strings or push ints into string arrays; the type errors are source defects.',
);

classify(
  ['0155', '0167', '0168', '0201', '0202', '0203', '0204', '0205', '0206', '0207'],
  'invalid-pine',
  'none',
  'matrix.sum used as a zero/one-argument aggregate',
  'TradingView matrix.sum is matrix/scalar addition requiring id2, not a collection aggregate; these synthetic rows call the wrong API shape.',
);

classify(
  ['0159'],
  'invalid-pine',
  'none',
  'matrix.det requires square matrix',
  'The source calls matrix.det on a 4x2 matrix.',
);

classify(
  ['0162'],
  'invalid-pine',
  'none',
  'matrix.eigenvectors require square matrix',
  'The source calls matrix.eigenvectors on a 2x3 matrix.',
);

classify(
  ['0181'],
  'invalid-pine',
  'none',
  'comma-chained import statements',
  'The source chains import declarations with commas on one line. That syntax is not valid under the declared v5 grammar.',
);

classify(
  ['0192', '0213'],
  'invalid-pine',
  'none',
  'matrix column index out of bounds',
  'The script removes or swaps column 1 from a one-column matrix.',
);

classify(
  ['0193', '0214'],
  'invalid-pine',
  'none',
  'matrix column index is na',
  'The script passes na/NaN as a matrix column index.',
);

classify(
  ['0226'],
  'invalid-pine',
  'none',
  'missing source symbol',
  'The source references isBullishImbalance without declaring it.',
);

classify(
  ['0229', '0231', '0233', '0234'],
  'invalid-pine',
  'none',
  'numeric enum member values in v6',
  'Declared v6 enum members use numeric values such as Scalp = 3.0; v6 enum custom values are display strings, not numeric constants.',
);

classify(
  ['0243', '0441', '0442'],
  'invalid-pine',
  'none',
  'block-local variable used outside its scope',
  'The source reads variables that are only declared inside nested branches.',
);

classify(
  ['0282'],
  'invalid-pine',
  'none',
  'strategy.opentrades.capital_held called as function',
  'The committed official member surface exposes strategy.opentrades.capital_held as a bare variable, not a function taking a trade number.',
);

classify(
  ['0305'],
  'invalid-pine',
  'none',
  'missing MACD input symbols',
  'The v5 source references fastLength and related inputs that are not declared in the harvested file.',
);

classify(
  ['0360'],
  'invalid-pine',
  'none',
  'unknown table.cell text_wrap argument',
  'The committed v6 reference snapshot has box text_wrap members but no table.cell text_wrap parameter.',
);

classify(
  ['0362', '0364', '0371', '0372', '0373', '0374', '0375'],
  'invalid-pine',
  'none',
  'unknown table.cell_set_text_wrap member',
  'The committed v6 reference snapshot includes box.set_text_wrap but no table.cell_set_text_wrap member.',
);

classify(
  ['0368'],
  'invalid-pine',
  'none',
  'array<float> assigned into array<bool> field',
  'The declared v5 source assigns a float array where its UDT field requires an array<bool>.',
);

classify(
  ['0383'],
  'invalid-pine',
  'none',
  'missing source symbol',
  'The source references wActifLvl but never declares it.',
);

classify(
  ['0411', '0453'],
  'invalid-pine',
  'none',
  'float series assigned to bool',
  'Declared v5 sources assign close, a float series, into bool fields or variables.',
);

classify(
  ['0428'],
  'invalid-pine',
  'none',
  'generic input step argument under v5',
  'The current v5 checker rejects step on generic input(); this appears to be a v5 migration/source issue, but evidence is thin because public scripts used this shape.',
  'thin',
);

classify(
  ['0449'],
  'invalid-pine',
  'none',
  'time_close second positional argument has wrong type',
  'The source calls time_close("", 1); bars_back is named in adjacent source, while the second positional slot is session.',
);

classify(
  ['0100'],
  'trace-required',
  'trace/host',
  'earnings.future_time provider freshness',
  'The member exists in the v6 manual index but the audit marks future corporate-action fields as requiring provider trace semantics.',
);

classify(
  ['0281', '0293'],
  'trace-required',
  'trace/host',
  'request context limit',
  'The rows hit TradingView host limits for unique request.* contexts; the engine cannot judge them without host/request policy traces.',
);

classify(
  ['0285'],
  'trace-required',
  'trace/host',
  'strategy risk_free_rate report semantics',
  'The strategy option affects TradingView report metrics rather than chart output semantics and is already trace-host territory.',
);

classify(
  ['0310', '0385'],
  'trace-required',
  'trace/host',
  'strategy calc_on_order_fills',
  'The option changes strategy replay/fill timing and requires TradingView strategy-host traces.',
);

classify(
  ['0339', '0398'],
  'trace-required',
  'trace/host',
  'strategy fill_orders_on_standard_ohlc',
  'The strategy fill option is host/backtester timing behavior, not source validity.',
);

classify(
  ['0415', '0446', '0456'],
  'trace-required',
  'trace/host',
  'request.security_lower_tf chart timeframe requirement',
  'The rows require lower-timeframe provider/chart context than the calibrated daily chart profile supplies.',
);

classify(
  ['0030', '0043', '0212', '0279'],
  'artifact',
  'corpus',
  'source declares no chart output',
  'The measured source has no plot, drawing, alert, or strategy order call; no output is expected.',
);

classify(
  ['0074'],
  'artifact',
  'corpus/fixture',
  'conditional output did not trigger',
  'All visible output is gated by source conditions that neither calibrated synthetic profile satisfies. Evidence is thin because a different chart/session may trigger it.',
  'thin',
);

classify(
  ['0123'],
  'artifact',
  'corpus',
  'leading comma byte/prose artifact',
  'The harvested file starts with a leading comma after the indicator call; this is not a Pine construct.',
);

classify(
  ['0129', '0132', '0133', '0298', '0328'],
  'artifact',
  'corpus/fixture',
  'script-authored runtime.error guard',
  'The script itself calls runtime.error under the measured symbol/timeframe/data profile.',
);

classify(
  ['0250'],
  'artifact',
  'corpus/fixture',
  'strategy conditions did not place orders',
  'The v5 strategy has conditional strategy.entry calls but no plots; the calibrated bars did not satisfy its order conditions. Evidence is thin because market data can alter this.',
  'thin',
);

classify(
  ['0340'],
  'artifact',
  'corpus',
  'template placeholders harvested as source',
  'The file still contains template markers such as {{TITLE}} and {{OVERLAY}}.',
);

classify(
  ['0344'],
  'artifact',
  'corpus',
  'ellipsis placeholders harvested as source',
  'The file contains placeholder assignments such as longCondition = ... rather than complete Pine.',
);

classify(
  ['0378'],
  'unclassified',
  'unrouted',
  'public session/profile-dependent array bounds failure',
  'A large public TPO Market Profile script hits array index 0 on an empty array, but the source is session/profile-heavy and the measured row does not localize the failing site enough to defend invalid-source versus host/profile dependence.',
  'thin',
);

const report = readJson<CorpusReport>(INPUT_REPORT);
const rows = report.rows.filter(
  (row) =>
    row.output?.produced !== true &&
    !['invalid-pine', 'corpus-hygiene', 'unsupported-by-design'].includes(row.validity.bucket),
);

if (rows.length !== EXPECTED_POOL_SIZE) {
  throw new Error(`Expected ${EXPECTED_POOL_SIZE} current gap-pool rows, got ${rows.length}`);
}

const missing = rows.map(rowId).filter((id) => !classifications.has(id));
if (missing.length) throw new Error(`Missing classifications: ${missing.join(', ')}`);

const extra = [...classifications.keys()].filter((id) => !rows.some((row) => rowId(row) === id));
if (extra.length) throw new Error(`Classifications without measured row: ${extra.join(', ')}`);

const classified = rows
  .map((row) => {
    const classification = classifications.get(rowId(row));
    if (!classification) throw new Error(`Missing classification for ${rowId(row)}`);
    return { row, classification };
  })
  .sort((a, b) => rowId(a.row).localeCompare(rowId(b.row)));

const bucketCounts = countBy(classified, (item) => item.classification.bucket);
const stageCounts = countBy(classified, (item) => item.row.firstFailedStage ?? 'unknown');
const stageBucketCounts = new Map<string, number>();
for (const item of classified) {
  const stage = item.row.firstFailedStage ?? 'unknown';
  const key = `${stage}|${item.classification.bucket}`;
  stageBucketCounts.set(key, (stageBucketCounts.get(key) ?? 0) + 1);
}

const stages: Stage[] = ['parse', 'semantic', 'execute', 'output'];
const buckets: Bucket[] = ['real-gap', 'invalid-pine', 'artifact', 'trace-required', 'unclassified'];

const fullRows = classified.map(({ row, classification }) => ({
  id: rowId(row),
  declaredVersion: row.declaredVersion,
  declarationKind: row.declarationKind,
  stage: row.firstFailedStage ?? 'unknown',
  bucket: classification.bucket,
  owner: classification.owner,
  construct: classification.construct,
  confidence: classification.confidence,
  evidence: classification.evidence,
  diagnostic: shortDiagnostic(row),
  sourceRepoUrl: row.sourceRepoUrl,
  sourceFilePath: row.sourceFilePath,
  commitSha: row.commitSha,
  sourceSha256: row.sourceSha256,
}));

fs.writeFileSync(
  OUT_JSON,
  `${JSON.stringify(
    {
      measurementSha: MEASUREMENT_SHA,
      profileSha: PROFILE_SHA,
      inputReport: path.relative(ROOT, INPUT_REPORT),
      outputReport: path.relative(ROOT, OUT_MD),
      poolDefinition:
        "Rows from the V7 daily profile that did not produce output, excluding rows already bucketed invalid-pine, corpus-hygiene, or unsupported-by-design by the fixture profiler.",
      sourceSummary: report.summary,
      counts: {
        byBucket: Object.fromEntries(bucketCounts),
        byStage: Object.fromEntries(stageCounts),
        byStageAndBucket: Object.fromEntries(stageBucketCounts),
      },
      rows: fullRows,
    },
    null,
    2,
  )}\n`,
);

const lines: string[] = [];
lines.push('# External Pine Corpus v7 Current Gap Pool Audit v1');
lines.push('');
lines.push('Date: 2026-09-11');
lines.push(`Measurement commit: \`${MEASUREMENT_SHA}\``);
lines.push(`Fixture profile set: \`${PROFILE_SHA}\``);
lines.push(`Input profile: \`${path.relative(ROOT, INPUT_REPORT)}\``);
lines.push(`Machine-readable companion: \`${path.relative(ROOT, OUT_JSON)}\``);
lines.push('');
lines.push(
  'This classifies the 108 V7 daily-profile rows that are inside the achievable denominator but do not produce output at `bbcbf3d220`. It replaces the profiler validity buckets for this pool with source-audited routing buckets, judged against each row declared Pine version.',
);
lines.push('');
lines.push('## Headline');
lines.push('');
lines.push(
  `V7 found ${bucketCounts.get('real-gap') ?? 0} defensible real gaps in the hard-tail pool. Most rows are still not TealScript defects: ${bucketCounts.get('invalid-pine') ?? 0} invalid Pine, ${bucketCounts.get('artifact') ?? 0} corpus/chart artifacts, ${bucketCounts.get('trace-required') ?? 0} trace/host-required, and ${bucketCounts.get('unclassified') ?? 0} honestly unclassified.`,
);
lines.push('');
lines.push(
  `Daily profile headline at this commit remains ${report.summary.funnel.output.count}/${report.summary.total} raw output and ${report.summary.achievableCeiling.funnel.output.count}/${report.summary.achievableCeiling.denominator} achievable output. The audited pool is the ${EXPECTED_POOL_SIZE} achievable non-output rows behind that second denominator.`,
);
lines.push('');
lines.push('## Bucket Counts');
lines.push('');
lines.push(table(['Bucket', 'Rows'], sortedCountRows(bucketCounts)));
lines.push('');
lines.push('## Stage Counts');
lines.push('');
lines.push(table(['Stage', 'Rows'], sortedCountRows(stageCounts)));
lines.push('');
lines.push('## Stage By Bucket');
lines.push('');
lines.push(
  table(
    ['Stage', ...buckets, 'total'],
    stages.map((stage) => [
      stage,
      ...buckets.map((bucket) => String(stageBucketCounts.get(`${stage}|${bucket}`) ?? 0)),
      String(stageCounts.get(stage) ?? 0),
    ]),
  ),
);
lines.push('');
lines.push('## Real Gap Handoffs');
lines.push('');
lines.push(
  table(
    ['Row', 'Version', 'Stage', 'Owner', 'Construct', 'Confidence', 'Minimal repro / evidence'],
    classified
      .filter((item) => item.classification.bucket === 'real-gap')
      .map(({ row, classification }) => [
        rowId(row),
        `v${row.declaredVersion}`,
        row.firstFailedStage ?? 'unknown',
        classification.owner,
        classification.construct,
        classification.confidence,
        classification.minimalRepro
          ? `\`\`\`pine\n${classification.minimalRepro}\n\`\`\``
          : classification.evidence,
      ]),
  ),
);
lines.push('');
lines.push('## Thin Or Unclassified Evidence');
lines.push('');
lines.push(
  table(
    ['Row', 'Bucket', 'Stage', 'Owner', 'Construct', 'Why thin'],
    classified
      .filter(
        (item) =>
          item.classification.confidence === 'thin' ||
          item.classification.bucket === 'unclassified',
      )
      .map(({ row, classification }) => [
        rowId(row),
        classification.bucket,
        row.firstFailedStage ?? 'unknown',
        classification.owner,
        classification.construct,
        classification.evidence,
      ]),
  ),
);
lines.push('');
lines.push('## Trace/Host Rows');
lines.push('');
lines.push(
  table(
    ['Row', 'Version', 'Stage', 'Construct', 'Evidence'],
    classified
      .filter((item) => item.classification.bucket === 'trace-required')
      .map(({ row, classification }) => [
        rowId(row),
        `v${row.declaredVersion}`,
        row.firstFailedStage ?? 'unknown',
        classification.construct,
        classification.evidence,
      ]),
  ),
);
lines.push('');
lines.push('## Full Row Classification');
lines.push('');
lines.push(
  table(
    [
      'Row',
      'Version',
      'Kind',
      'Stage',
      'Bucket',
      'Owner',
      'Confidence',
      'Construct',
      'Evidence',
      'Diagnostic',
    ],
    classified.map(({ row, classification }) => [
      rowId(row),
      `v${row.declaredVersion}`,
      row.declarationKind,
      row.firstFailedStage ?? 'unknown',
      classification.bucket,
      classification.owner,
      classification.confidence,
      classification.construct,
      classification.evidence,
      shortDiagnostic(row),
    ]),
  ),
);
lines.push('');
lines.push('## References');
lines.push('');
lines.push('- V7 daily profile JSON named above, generated from the pinned V7 source manifest.');
lines.push(
  '- Committed v6 reference snapshot: `packages/tealscript/src/compat/pineV6ReferenceManualIndex.ts`.',
);
lines.push(
  '- Committed builtin signatures checked read-only: `packages/tealscript/src/compat/pineV6BuiltinSignatures.ts` and `packages/tealscript/src/semantic/checker.ts`.',
);
lines.push('- TradingView matrix language docs: https://www.tradingview.com/pine-script-docs/language/matrices/');
lines.push(
  '- TradingView footprint announcement: https://www.tradingview.com/blog/en/volume-footprints-are-now-available-in-pine-script-49308/',
);
lines.push('');

fs.writeFileSync(OUT_MD, `${lines.join('\n')}\n`);

console.log(`Wrote ${path.relative(process.cwd(), OUT_MD)}`);
console.log(`Wrote ${path.relative(process.cwd(), OUT_JSON)}`);
console.log('Bucket counts:', Object.fromEntries(bucketCounts));
console.log('Stage counts:', Object.fromEntries(stageCounts));
