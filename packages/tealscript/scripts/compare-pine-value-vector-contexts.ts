import { writeFile } from 'node:fs/promises';

import type { Bar } from '../src/runtime/context.ts';
import type { TealscriptExecutionOptions } from '../src/runtime/types.ts';
import { BARS, CASES, runCase, type ValueVectorCase, type ValueVectorResult } from './run-pine-value-vectors.ts';

type ContextClass =
  | 'intraday_time_session'
  | 'twentyfour_seven_weekend'
  | 'tick_precision_symbol'
  | 'volume_regime'
  | 'request_context'
  | 'bar_count_long_history'
  | 'realtime_only';

interface ContextVectorRow {
  id: string;
  namespace: string;
  classes: ContextClass[];
  shouldChange: boolean;
  changed: boolean;
  bucket: 'changed-and-should-have' | 'unchanged-and-should-have' | 'changed-when-should-not-have' | 'unchanged-and-should-not-have' | 'not-comparable';
  reason: string;
  baselineBars: number;
  contextBars: number;
  firstDifference?: {
    plot: number;
    bar: number;
    baseline: number | null | undefined;
    context: number | null | undefined;
  };
  baselineDiagnostics: string[];
  contextDiagnostics: string[];
}

const CONTEXT_CLASS_PATTERNS: Array<{ name: ContextClass; pattern: RegExp }> = [
  { name: 'intraday_time_session', pattern: /\b(?:time\b|time\(|timestamp\(|hour|minute|second|dayofweek|dayofmonth|month|year|weekofyear|session\.|timeframe\.(?:is(?:intraday|daily|weekly|monthly|seconds|minutes)|period|multiplier|in_seconds|from_seconds)|input\.session)\b/ },
  { name: 'twentyfour_seven_weekend', pattern: /\b(?:session\.ismarket|session\.ispremarket|session\.ispostmarket|session\.extended|24x7|ticker\.modify)/ },
  { name: 'tick_precision_symbol', pattern: /\b(?:syminfo\.(?:mintick|minmove|pricescale|pointvalue|ticker|tickerid|type|session|timezone|currency|basecurrency|prefix|root|description)|ticker\.)\b/ },
  { name: 'volume_regime', pattern: /\b(?:volume|ta\.(?:vwma|vwap|mfi|obv|pvi|nvi|pvt|accdist|wad|iii|wvad))\b/ },
  { name: 'request_context', pattern: /\brequest\./ },
  { name: 'bar_count_long_history', pattern: /\b(?:LONG_BARS|DAILY_BARS|STRATEGY_ACCESSOR_BARS|\[[1-9]\d{2,}\]|ta\.(?:dema|tema|hma|tsi|smma|mfi|cog|percentrank|rci|kcw))\b/ },
  { name: 'realtime_only', pattern: /\b(?:barstate\.isrealtime|barstate\.isnew|varip|calc_on_every_tick)\b/ },
];

const SHOULD_CHANGE_CLASSES = new Set<ContextClass>([
  'intraday_time_session',
  'twentyfour_seven_weekend',
  'tick_precision_symbol',
  'request_context',
]);

const TOLERANCE = 1e-9;

function caseClasses(testCase: ValueVectorCase): ContextClass[] {
  const pine = stripStringsAndComments(testCase.pine);
  const blob = [
    testCase.id,
    testCase.namespace,
    pine,
    testCase.bars ? 'CUSTOM_BARS' : 'BARS',
    testCase.options ? 'OPTIONS' : '',
  ].join('\n');
  const classes = CONTEXT_CLASS_PATTERNS
    .filter((entry) => entry.pattern.test(blob))
    .map((entry) => entry.name);
  if ((testCase.bars?.length ?? BARS.length) >= 128 && !classes.includes('bar_count_long_history')) {
    classes.push('bar_count_long_history');
  }
  return classes;
}

function stripStringsAndComments(source: string): string {
  return source
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

function contextBars(baseBars: Bar[]): Bar[] {
  const start = Date.UTC(2024, 0, 1);
  return baseBars.map((bar, index) => ({
    ...bar,
    time: start + index * 15 * 60_000,
    volume: bar.volume * (index % 19 === 0 ? 8 : index % 7 === 0 ? 0.35 : 1.5 + (index % 5) * 0.25),
  }));
}

function contextOptions(testCase: ValueVectorCase): TealscriptExecutionOptions {
  const original = testCase.options?.() ?? {};
  return {
    ...original,
    runtime: {
      ...original.runtime,
      syminfo: {
        ...original.runtime?.syminfo,
        ticker: 'NASDAQ:AAPL',
        tickerid: 'NASDAQ:AAPL',
        prefix: 'NASDAQ',
        root: 'AAPL',
        description: 'Apple Inc.',
        type: 'stock',
        session: '24x7',
        timezone: 'Etc/UTC',
        currency: 'USD',
        basecurrency: 'USD',
        mintick: 0.01,
        pricescale: 100,
        pointvalue: 1,
      },
      timeframe: {
        ...original.runtime?.timeframe,
        period: '15',
        multiplier: 15,
        isminutes: true,
        isintraday: true,
        isdaily: false,
        isweekly: false,
        ismonthly: false,
        isseconds: false,
        isticks: false,
      },
      session: {
        regular: '0000-2359',
        premarket: '0000-0000',
        postmarket: '0000-0000',
        timezone: 'Etc/UTC',
      },
    },
  };
}

function valueMatches(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left === null || right === null || left === undefined || right === undefined) return left === right;
  return Math.abs(left - right) <= TOLERANCE * Math.max(1, Math.abs(left), Math.abs(right));
}

function firstDifference(
  baseline: ValueVectorResult,
  context: ValueVectorResult,
): ContextVectorRow['firstDifference'] {
  const baselineOutputs = baseline.compiledOutputs;
  const contextOutputs = context.compiledOutputs;
  if (!baselineOutputs || !contextOutputs) return { plot: 0, bar: 0, baseline: undefined, context: undefined };
  const plotCount = Math.max(baselineOutputs.length, contextOutputs.length);
  for (let plot = 0; plot < plotCount; plot += 1) {
    const baselinePlot = baselineOutputs[plot];
    const contextPlot = contextOutputs[plot];
    const barCount = Math.max(baselinePlot?.length ?? 0, contextPlot?.length ?? 0);
    for (let bar = 0; bar < barCount; bar += 1) {
      if (!valueMatches(baselinePlot?.[bar], contextPlot?.[bar])) {
        return { plot, bar, baseline: baselinePlot?.[bar], context: contextPlot?.[bar] };
      }
    }
  }
  return undefined;
}

function outputsChanged(baseline: ValueVectorResult, context: ValueVectorResult): boolean {
  return firstDifference(baseline, context) !== undefined;
}

function expectedOutputsChanged(baseline: ValueVectorResult, context: ValueVectorResult): boolean {
  return firstDifference(
    { ...baseline, compiledOutputs: baseline.expectedOutputs ?? null },
    { ...context, compiledOutputs: context.expectedOutputs ?? null },
  ) !== undefined;
}

function classifyRow(testCase: ValueVectorCase): ContextVectorRow | null {
  const classes = caseClasses(testCase);
  if (classes.length === 0) return null;
  const baseBars = testCase.bars ?? BARS;
  const baseline = runCase(testCase);
  const context = runCase(testCase, { bars: contextBars(baseBars), options: contextOptions(testCase) });
  const forcedContextChange = classes.some((entry) => SHOULD_CHANGE_CLASSES.has(entry));
  const shouldChange = forcedContextChange || expectedOutputsChanged(baseline, context);
  const changed = outputsChanged(baseline, context);
  const notComparable = baseline.compiledOutputs === null || context.compiledOutputs === null;
  const bucket = notComparable
    ? 'not-comparable'
    : changed && shouldChange
      ? 'changed-and-should-have'
      : !changed && shouldChange
        ? 'unchanged-and-should-have'
        : changed
          ? 'changed-when-should-not-have'
          : 'unchanged-and-should-not-have';
  return {
    id: testCase.id,
    namespace: testCase.namespace,
    classes,
    shouldChange,
    changed,
    bucket,
    reason: reasonFor(classes, shouldChange),
    baselineBars: baseline.bars,
    contextBars: context.bars,
    firstDifference: firstDifference(baseline, context),
    baselineDiagnostics: baseline.diagnostics,
    contextDiagnostics: context.diagnostics,
  };
}

function reasonFor(classes: ContextClass[], shouldChange: boolean): string {
  if (shouldChange) {
    const exposed = classes.filter((entry) => SHOULD_CHANGE_CLASSES.has(entry));
    if (exposed.length > 0) {
      return `Pine exposes ${exposed.join(', ')} as chart/input data, so the alternate intraday 24/7 metadata context can legitimately change this vector.`;
    }
    return 'The independent expected series changes under the alternate OHLCV context, so the vector should change by its documented formula.';
  }
  return 'This vector is long-history, bar-count, or historical varip sensitive but does not read the altered timestamp, symbol, tick, volume, or request context; changing only those context axes should not change its values.';
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function markdownTable(rows: string[][]): string {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

async function main(): Promise<void> {
  const rows = CASES.map(classifyRow).filter((row): row is ContextVectorRow => row !== null);
  const outputPath = process.argv[2] ?? 'reports/pine-value-vector-context-comparison-v1.md';
  const bucketCounts = countBy(rows, (row) => row.bucket);
  const classCounts = countBy(rows.flatMap((row) => row.classes), (entry) => entry);
  const lines = [
    '# Pine Value Vector Context Comparison v1',
    '',
    '## Basis',
    '',
    '- Source cases: `scripts/run-pine-value-vectors.ts`.',
    '- Baseline context: each vector uses its committed bars and options.',
    '- Alternate context: same OHLC sequence and bar count, intraday 15-minute continuous 24/7 timestamps, different symbol/tick metadata, and varied volume regimes.',
    '- Method: run the same case definitions through `runCase()` twice and compare compiled plot outputs with the existing value-vector numeric tolerance.',
    '',
    '## Split',
    '',
    markdownTable([
      ['Bucket', 'Rows'],
      ['---', '---:'],
      ...Object.entries(bucketCounts).map(([bucket, count]) => [bucket, String(count)]),
    ]),
    '',
    '## Context Classes',
    '',
    markdownTable([
      ['Context class', 'Rows'],
      ['---', '---:'],
      ...Object.entries(classCounts).map(([name, count]) => [name, String(count)]),
    ]),
    '',
    '## Rows',
    '',
    markdownTable([
      ['Case', 'Classes', 'Expected', 'Actual', 'First difference'],
      ['---', '---', '---', '---', '---'],
      ...rows.map((row) => [
        `\`${row.id}\``,
        row.classes.join(', '),
        row.shouldChange ? 'should change' : 'should not change',
        row.changed ? 'changed' : 'unchanged',
        row.firstDifference ? `plot ${row.firstDifference.plot}, bar ${row.firstDifference.bar}: ${String(row.firstDifference.baseline)} -> ${String(row.firstDifference.context)}` : '',
      ]),
    ]),
    '',
    '## Finding',
    '',
    `- Changed and should have: ${bucketCounts['changed-and-should-have'] ?? 0}.`,
    `- Unchanged and should have: ${bucketCounts['unchanged-and-should-have'] ?? 0}.`,
    `- Changed when should not have: ${bucketCounts['changed-when-should-not-have'] ?? 0}.`,
    `- Unchanged and should not have: ${bucketCounts['unchanged-and-should-not-have'] ?? 0}.`,
    `- Not comparable: ${bucketCounts['not-comparable'] ?? 0}.`,
    '',
  ];
  await writeFile(outputPath, `${lines.join('\n')}`, 'utf8');
  process.stdout.write(`${JSON.stringify({ total: rows.length, buckets: bucketCounts, classes: classCounts }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
