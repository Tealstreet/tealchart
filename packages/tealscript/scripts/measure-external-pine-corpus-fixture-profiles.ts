import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Bar } from '../src/runtime/context.ts';
import {
  createStandardCorpusBars,
  EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION,
  runExternalPineCorpus,
  summarizeExternalPineCorpus,
  type ExternalCorpusReport,
  type ExternalCorpusReportRow,
} from './run-external-pine-corpus.ts';

interface FixtureProfileRun {
  name: string;
  description: string;
  bars: Bar[];
  report: ExternalCorpusReport;
  reportPath: string;
}

interface RowDelta {
  localPath: string;
  before: string;
  after: string;
  dependencyClasses: string[];
}

interface DependencyClass {
  name: string;
  pattern: RegExp;
}

interface CorpusManifest {
  scripts: Array<{
    localPath: string;
    sourceRepoUrl?: string;
    sourceFilePath?: string;
    commitSha?: string;
    sourceSha256?: string;
  }>;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, '..');

const DEPENDENCY_CLASSES: DependencyClass[] = [
  { name: 'drawing_objects_limits', pattern: /\b(?:max_(?:lines|labels|boxes|polylines)_count|(?:line|label|box|polyline|linefill)\.new)\b/ },
  { name: 'barstate_realtime_or_lastbar', pattern: /\bbarstate\.(?:isrealtime|isconfirmed|islast|isnew|ishistory|islastconfirmedhistory|isfirst)\b/ },
  { name: 'timeframe_identity', pattern: /\btimeframe\.(?:period|multiplier|in_seconds|from_seconds|is(?:intraday|daily|weekly|monthly|seconds|minutes))\b|\binput\.timeframe\b/ },
  { name: 'volume_dependent', pattern: /\bvolume\b|\bta\.(?:vwap|vwma|mfi|obv|pvi|nvi|pvt)\b/ },
  { name: 'request_timeframes', pattern: /\brequest\.(?:security|security_lower_tf)\b/ },
  { name: 'symbol_metadata', pattern: /\bsyminfo\.(?:ticker|tickerid|main_tickerid|prefix|root|description|type|session|timezone)\b/ },
  { name: 'tick_precision_contract', pattern: /\bsyminfo\.(?:mintick|minmove|pricescale|pointvalue)\b/ },
  { name: 'explicit_long_history', pattern: /\bmax_bars_back\b|\[[1-9]\d{2,}\]|\binput\.(?:int|float)\([^)]*defval\s*=\s*[1-9]\d{2,}/ },
  { name: 'higher_timeframe_literals', pattern: /\b(?:request\.security|input\.timeframe|time|time_close)\([^)]*["'](?:[1-9]\d*)?[DWM]["']/ },
  { name: 'intraday_clock_calendar', pattern: /\b(?:hour|minute|second|dayofweek|dayofmonth|month|year|weekofyear)\b/ },
  { name: 'session_windows', pattern: /\b(?:input\.session|session\.|time(?:_close)?\([^)]*["'][0-2]\d[0-5]\d-[0-2]\d[0-5]\d)/ },
  { name: 'currency_metadata', pattern: /\b(?:currency\.|syminfo\.(?:currency|basecurrency)|request\.currency_rate)\b/ },
  { name: 'twentyfour_seven_or_weekend', pattern: /\b(?:0000-23(?:45|59)|24x7|24\/7|session\.extended|ticker\.modify\([^)]*session\s*=)\b/i },
  { name: 'fundamental_macro_requests', pattern: /\brequest\.(?:financial|economic|quandl|seed)\b/ },
  { name: 'corporate_actions', pattern: /\brequest\.(?:dividends|splits|earnings)\b/ },
];
const KNOWN_TIMEOUT_ROWS = new Set(['sources/0930__helenananaa-pine-compat-runtime__deep_expression_limit.pine']);
const KNOWN_TIMEOUT_PROFILE_ROWS = new Set(['context-stress\u0000sources/0387__GoDevun-Devuns-Trades__aio-v2.pine']);
const TARGETED_FIXTURE_ROWS = [
  'sources/0219__utamons-pine__levels.pine',
  'sources/0577__deepentropy-lightweight-charts-indicators__Breakouts-with-Tests-Retests-LuxAlgo-.pine',
  'sources/0578__deepentropy-oakscriptJS__Breakouts-with-Tests-Retests-LuxAlgo-.pine',
  'sources/0623__AubakirovArman-SaltanatbotV2__5-ict-killzones-pivots.pine',
  'sources/0699__studiomicro-strategies__bullish_engulfing.pine',
  'sources/0717__dipayansamanta172-lgtm-tradingbot__main.pine',
  'sources/0731__alireza-hme-algo-trading__HW1-strategy.pine',
  'sources/0767__agentiayoung-agent-trader-framework__range_breakout.pine',
  'sources/0809__pineforge-4pass-pineforge-corpus__strategy.pine',
  'sources/0858__deepentropy-lightweight-charts-indicators__Momentum-Strategy.pine',
  'sources/0927__pineforge-4pass-pineforge-codegen-oss__validation__order-dual-stop-open-high-first-path-01.pine',
  'sources/0935__deepentropy-oakscriptJS__Momentum-Strategy.pine',
];

function createContextStressBars(count = 5_200): Bar[] {
  const start = Date.UTC(2018, 0, 1);
  const weekdayMinutes = [
    4 * 60,
    8 * 60 + 45,
    9 * 60 + 30,
    12 * 60,
    15 * 60 + 55,
    16 * 60 + 30,
  ];
  const weekendMinutes = [0, 12 * 60];
  const bars: Bar[] = [];
  let day = 0;
  let lastClose = 100;
  const dailyTail = createStandardCorpusBars();
  const mixedBodyCount = Math.max(0, count - dailyTail.length);
  while (bars.length < mixedBodyCount) {
    const date = new Date(start + day * 86_400_000);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const minutes = isWeekend ? weekendMinutes : weekdayMinutes;
    for (const minuteOfDay of minutes) {
      if (bars.length >= count) break;
      const index = bars.length;
      const phase = Math.floor(index / 260) % 4;
      const trend = phase === 0 ? 0.32 : phase === 1 ? -0.24 : phase === 2 ? 0.08 : -0.04;
      const cyclic = Math.sin(index / 6) * 3.8 + Math.sin(index / 29) * 7.5;
      const impulse = index % 97 === 0 ? (index % 194 === 0 ? 18 : -16) : 0;
      const gap = minuteOfDay === 9 * 60 + 30 ? (index % 41 === 0 ? 9 : index % 43 === 0 ? -7 : 0) : 0;
      const weekendDrift = isWeekend ? Math.sin(index / 3) * 0.9 : 0;
      const open = Math.max(1, lastClose + gap + weekendDrift);
      const close = Math.max(1, open + trend + cyclic * 0.22 + impulse);
      const sessionPad = minuteOfDay === 9 * 60 + 30 || minuteOfDay === 15 * 60 + 55 ? 3.8 : isWeekend ? 1.2 : 2.2;
      const volatilityPad = sessionPad + (index % 11) * 0.28 + (index % 149 === 0 ? 12 : 0);
      const high = Math.max(open, close) + volatilityPad;
      const low = Math.max(0.01, Math.min(open, close) - volatilityPad * (0.65 + (index % 5) * 0.12));
      const volumeBase = isWeekend ? 22_000 : minuteOfDay < 9 * 60 + 30 || minuteOfDay > 16 * 60 ? 48_000 : 185_000;
      const volumeCycle = (index % 34) * (isWeekend ? 900 : 4_200);
      const volumeSpike = index % 53 === 0 ? 1_200_000 : index % 71 === 0 ? 520_000 : 0;
      const time = start + day * 86_400_000 + minuteOfDay * 60_000;
      bars.push({ time, open, high, low, close, volume: volumeBase + volumeCycle + volumeSpike });
      lastClose = close;
    }
    day += 1;
  }
  const lastMixedBar = bars.at(-1);
  const firstTailBar = dailyTail[0];
  if (!lastMixedBar || !firstTailBar) return bars.slice(0, count);

  const week = 7 * 86_400_000;
  const minOffset = lastMixedBar.time + 86_400_000 - firstTailBar.time;
  const timeOffset = Math.ceil(minOffset / week) * week;
  const priceOffset = lastMixedBar.close - firstTailBar.open;
  for (const bar of dailyTail) {
    if (bars.length >= count) break;
    bars.push({
      time: bar.time + timeOffset,
      open: Math.max(1, bar.open + priceOffset),
      high: Math.max(1, bar.high + priceOffset),
      low: Math.max(0.01, bar.low + priceOffset),
      close: Math.max(1, bar.close + priceOffset),
      volume: bar.volume,
    });
  }
  return bars;
}

function createTargetedTriggerBars(count = 8_000): Bar[] {
  const start = Date.UTC(2023, 8, 1);
  const weekdayMinutes = [
    0,
    2 * 60,
    2 * 60 + 45,
    4 * 60,
    8 * 60,
    8 * 60 + 45,
    9 * 60 + 30,
    10 * 60 + 15,
    12 * 60,
    14 * 60 + 45,
    15 * 60 + 55,
    16 * 60 + 30,
  ];
  const bars: Bar[] = [];
  let day = 0;
  let lastClose = 112;
  while (bars.length < count) {
    const date = new Date(start + day * 86_400_000);
    const weekday = date.getUTCDay();
    day += 1;
    if (weekday === 0 || weekday === 6) continue;

    for (const minuteOfDay of weekdayMinutes) {
      if (bars.length >= count) break;
      const index = bars.length;
      const slot = index % weekdayMinutes.length;
      const cycle = index % 96;
      const direction = Math.floor(index / 48) % 2 === 0 ? 1 : -1;
      const swing = Math.sin(index / 3) * 5.2 + Math.sin(index / 13) * 9.5;
      const trend = direction * 0.58;
      const breakout = cycle === 31 ? 18 : cycle === 63 ? -17 : 0;
      const retest = cycle === 35 ? -8 : cycle === 67 ? 7 : 0;
      const fairValueGap = cycle === 12 ? 14 : cycle === 44 ? -13 : 0;
      const open = Math.max(1, lastClose + fairValueGap + retest);
      let close = Math.max(1, open + trend + swing * 0.18 + breakout);
      if (cycle === 20) close = Math.max(1, open - 8);
      if (cycle === 21) close = open + 13;
      if (cycle === 52) close = open + 9;
      if (cycle === 53) close = Math.max(1, open - 14);

      const repeatedLevel = Math.floor(index / 144) % 2 === 0 ? 128 : 92;
      const forceRepeatedHigh = cycle === 5 || cycle === 23 || cycle === 41;
      const forceRepeatedLow = cycle === 55 || cycle === 73 || cycle === 91;
      const rangePad = 2.8 + (slot % 4) * 0.9 + (cycle % 17 === 0 ? 9 : 0);
      let high = Math.max(open, close) + rangePad;
      let low = Math.max(0.01, Math.min(open, close) - rangePad * (0.8 + (cycle % 5) * 0.12));
      if (forceRepeatedHigh) high = Math.max(high, repeatedLevel);
      if (forceRepeatedLow) low = Math.min(low, repeatedLevel);
      if (cycle === 12) {
        low = Math.max(low, lastClose + 9);
        high = Math.max(high, low + 7);
      }
      if (cycle === 44) {
        high = Math.min(high, Math.max(1, lastClose - 8));
        low = Math.max(0.01, high - 7);
      }

      const sessionBoost = minuteOfDay === 2 * 60 + 45 || minuteOfDay === 8 * 60 + 45 || minuteOfDay === 9 * 60 + 30 ? 220_000 : 0;
      const volumeSpike = cycle === 21 || cycle === 31 || cycle === 63 ? 1_750_000 : cycle % 29 === 0 ? 680_000 : 0;
      const volume = 95_000 + slot * 12_000 + (index % 37) * 4_300 + sessionBoost + volumeSpike;
      const time = start + (day - 1) * 86_400_000 + minuteOfDay * 60_000;
      bars.push({ time, open, high: Math.max(high, low + 0.01), low, close, volume });
      lastClose = close;
    }
  }
  return bars;
}

function stripComments(source: string): string {
  let out = '';
  let inString: '"' | "'" | null = null;
  let inBlock = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index]!;
    const next = source[index + 1];
    if (inBlock) {
      if (current === '*' && next === '/') {
        inBlock = false;
        index += 1;
      } else if (current === '\n') {
        out += '\n';
      }
      continue;
    }
    if (inString) {
      out += current;
      if (current === '\\' && next !== undefined) {
        out += next;
        index += 1;
      } else if (current === inString) {
        inString = null;
      }
      continue;
    }
    if (current === '"' || current === "'") {
      inString = current;
      out += current;
      continue;
    }
    if (current === '/' && next === '*') {
      inBlock = true;
      index += 1;
      continue;
    }
    if (current === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      out += '\n';
      continue;
    }
    out += current;
  }
  return out;
}

function rowSignature(row: ExternalCorpusReportRow): string {
  return JSON.stringify({
    validity: row.validity.bucket,
    firstFailedStage: row.firstFailedStage,
    outcome: row.outcome,
    stages: row.stages,
    output: row.output,
    outputSilence: row.outputSilence
      ? {
          bucket: row.outputSilence.bucket,
          cause: row.outputSilence.cause,
        }
      : undefined,
    outputParity: {
      status: row.outputParity.status,
      kind: row.outputParity.firstDifference?.kind,
      path: row.outputParity.firstDifference?.path,
    },
    strategyLedgerParity: {
      status: row.strategyLedgerParity.compiledLedger.status,
      kind: row.strategyLedgerParity.compiledLedger.firstDifference?.kind,
      path: row.strategyLedgerParity.compiledLedger.firstDifference?.path,
      comparedStrategy: row.strategyLedgerParity.compiledLedger.comparedStrategy,
    },
    compiledBarErrors: row.compiledBarErrors,
    swallowedErrors: row.swallowedErrors,
  });
}

function classifySource(source: string): string[] {
  const stripped = stripComments(source);
  return DEPENDENCY_CLASSES
    .filter((entry) => entry.pattern.test(stripped))
    .map((entry) => entry.name);
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function digestBars(bars: Bar[]): string {
  return createHash('sha256').update(JSON.stringify(bars)).digest('hex').slice(0, 16);
}

async function rowDependencies(inputDir: string, rows: ExternalCorpusReportRow[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const source = await readFile(resolve(inputDir, row.localPath), 'utf8');
    map.set(row.localPath, classifySource(source));
  }
  return map;
}

function summarizeProfile(report: ExternalCorpusReport): string {
  const achievable = report.summary.achievableCeiling;
  return [
    `${report.summary.funnel.output.count}/${report.summary.total} raw output (${report.summary.funnel.output.percent}%)`,
    `${achievable.funnel.output.count}/${achievable.denominator} achievable output (${achievable.funnel.output.percent}%)`,
    `validity ${JSON.stringify(report.summary.validity)}`,
  ].join('; ');
}

function rowLabel(row: ExternalCorpusReportRow): string {
  const diagnostic = row.firstFailedStage ? row.stages[row.firstFailedStage].diagnostic : undefined;
  return [
    row.validity.bucket,
    row.firstFailedStage ?? 'pass',
    row.outcome,
    diagnostic ? diagnostic.replace(/\s+/g, ' ').slice(0, 140) : '',
  ].filter(Boolean).join(' | ');
}

function buildDelta(daily: ExternalCorpusReport, context: ExternalCorpusReport, dependencies: Map<string, string[]>): RowDelta[] {
  const contextRows = new Map(context.rows.map((row) => [row.localPath, row]));
  return daily.rows.flatMap((dailyRow) => {
    const contextRow = contextRows.get(dailyRow.localPath);
    if (!contextRow) {
      return [{
        localPath: dailyRow.localPath,
        before: rowLabel(dailyRow),
        after: 'missing-row',
        dependencyClasses: dependencies.get(dailyRow.localPath) ?? [],
      }];
    }
    if (rowSignature(dailyRow) === rowSignature(contextRow)) return [];
    return [{
      localPath: dailyRow.localPath,
      before: rowLabel(dailyRow),
      after: rowLabel(contextRow),
      dependencyClasses: dependencies.get(dailyRow.localPath) ?? [],
    }];
  });
}

function rowByPath(report: ExternalCorpusReport): Map<string, ExternalCorpusReportRow> {
  return new Map(report.rows.map((row) => [row.localPath, row]));
}

function markdownTable(rows: string[][]): string {
  return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

async function runProfile(inputDir: string, outputDir: string, corpusLabel: string, name: string, description: string, bars: Bar[], resume: boolean): Promise<FixtureProfileRun> {
  const reportPath = resolve(outputDir, `external-pine-corpus-${corpusLabel}-${name}.json`);
  const report = await runExternalPineCorpusBatched(inputDir, reportPath, bars, name, resume);
  return { name, description, bars, report, reportPath };
}

async function runExternalPineCorpusBatched(inputDir: string, outputPath: string, bars: Bar[], profileName: string, resume: boolean): Promise<ExternalCorpusReport> {
  const manifest = JSON.parse(await readFile(resolve(inputDir, 'manifest.json'), 'utf8')) as CorpusManifest;
  const batchSize = 1;
  const rows = resume ? await readExistingRows(outputPath) : [];
  for (let start = 0; start < manifest.scripts.length; start += batchSize) {
    if (start < rows.length) continue;
    const batch = manifest.scripts.slice(start, start + batchSize);
    const entry = batch[0];
    process.stderr.write(`[${profileName}] row ${start + 1} of ${manifest.scripts.length}: ${entry?.localPath ?? 'unknown'}\n`);
    if (entry && (KNOWN_TIMEOUT_ROWS.has(entry.localPath) || KNOWN_TIMEOUT_PROFILE_ROWS.has(`${profileName}\u0000${entry.localPath}`))) {
      rows.push(await timeoutRow(inputDir, entry));
      await writeMergedReport(outputPath, inputDir, bars, rows);
      continue;
    }
    const partial = await runExternalPineCorpus({
      inputDir,
      bars,
      localPaths: new Set(batch.map((entry) => entry.localPath)),
    });
    rows.push(...partial.rows);
    await writeMergedReport(outputPath, inputDir, bars, rows);
  }
  return writeMergedReport(outputPath, inputDir, bars, rows);
}

async function readExistingRows(outputPath: string): Promise<ExternalCorpusReportRow[]> {
  try {
    const report = JSON.parse(await readFile(outputPath, 'utf8')) as ExternalCorpusReport;
    return Array.isArray(report.rows) ? report.rows : [];
  } catch {
    return [];
  }
}

async function timeoutRow(inputDir: string, entry: CorpusManifest['scripts'][number]): Promise<ExternalCorpusReportRow> {
  const source = await readFile(resolve(inputDir, entry.localPath), 'utf8');
  return {
    id: `${entry.localPath}:${entry.commitSha ?? createHash('sha1').update(source).digest('hex')}`,
    localPath: entry.localPath,
    ...(entry.sourceRepoUrl ? { sourceRepoUrl: entry.sourceRepoUrl } : {}),
    ...(entry.sourceFilePath ? { sourceFilePath: entry.sourceFilePath } : {}),
    ...(entry.commitSha ? { commitSha: entry.commitSha } : {}),
    ...(entry.sourceSha256 ? { sourceSha256: entry.sourceSha256 } : {}),
    sourceHasElidedMarker: false,
    declaredVersion: Number(source.match(/\/\/@version=(\d+)/)?.[1] ?? 5),
    declarationKind: /\bstrategy\s*\(/.test(source) ? 'strategy' : /\bindicator\s*\(/.test(source) ? 'indicator' : /\bstudy\s*\(/.test(source) ? 'study' : 'unknown',
    byteSize: Buffer.byteLength(source, 'utf8'),
    validity: {
      bucket: 'tealscript-gap',
      reason: 'Fixture-profile runner carried forward the known isolated-row timeout for this deep-expression stress script so one pathological row does not block profile comparison.',
    },
    firstFailedStage: 'execute',
    outcome: 'failed',
    executionMode: 'not-run',
    fallbackReasons: [],
    output: { produced: false, plots: 0, drawings: 0, alerts: 0, logs: 0 },
    outputParity: { status: 'not-run' },
    strategyLedgerParity: { compiledLedger: { status: 'not-run' } },
    stages: {
      parse: { status: 'not-run' },
      semantic: { status: 'not-run' },
      compile: { status: 'not-run' },
      execute: { status: 'failed', diagnostic: 'external corpus classifier timeout after 45s on isolated row' },
      output: { status: 'not-run' },
    },
  };
}

async function writeMergedReport(outputPath: string, inputDir: string, bars: Bar[], rows: ExternalCorpusReportRow[]): Promise<ExternalCorpusReport> {
  const report: ExternalCorpusReport = {
    schemaVersion: EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    inputDir,
    bars: {
      count: bars.length,
      firstTime: bars[0]?.time ?? 0,
      lastTime: bars.at(-1)?.time ?? 0,
    },
    summary: summarizeExternalPineCorpus(rows),
    rows,
  };
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

function parseArgs(args: string[]): { inputDir: string; outputPath: string; cacheDir: string; corpusLabel: string; reportVersion: string; includeTargetedTrigger: boolean; resume: boolean } {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg.startsWith('--') && (args[index + 1]?.startsWith('--') ?? true)) {
      flags.add(arg);
      continue;
    }
    values.set(arg, args[index + 1] ?? '');
    index += 1;
  }
  const inputDir = values.get('--input') ?? '';
  const outputPath = values.get('--output') ?? '';
  const corpusLabel = values.get('--corpus-label') ?? 'v5';
  const reportVersion = values.get('--report-version') ?? 'v3';
  const cacheDir = values.get('--cache-dir') ?? resolve(PACKAGE_ROOT, '.cache/tealscript/pine-corpus-v5-20260910/fixture-profiles');
  const includeTargetedTrigger = flags.has('--include-targeted-trigger');
  const resume = flags.has('--resume');
  if (!inputDir || !outputPath) {
    throw new Error('Usage: tsx scripts/measure-external-pine-corpus-fixture-profiles.ts --input <corpus> --output <report.md> [--cache-dir <dir>] [--corpus-label v5] [--report-version v3] [--include-targeted-trigger] [--resume]');
  }
  return { inputDir: resolve(inputDir), outputPath: resolve(outputPath), cacheDir: resolve(cacheDir), corpusLabel, reportVersion, includeTargetedTrigger, resume };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(args.cacheDir, { recursive: true });
  const daily = await runProfile(
    args.inputDir,
    args.cacheDir,
    args.corpusLabel,
    'daily-standard',
    '1,600 volatile weekday daily bars',
    createStandardCorpusBars(),
    args.resume,
  );
  const context = await runProfile(
    args.inputDir,
    args.cacheDir,
    args.corpusLabel,
    'context-stress',
    '5,200 bars: mixed intraday/session and 24/7 body, daily-compatible volatile final window',
    createContextStressBars(),
    args.resume,
  );
  const targeted = args.includeTargetedTrigger ? await runProfile(
      args.inputDir,
      args.cacheDir,
      args.corpusLabel,
      'targeted-trigger',
      '8,000 bars: 15m session windows, killzones, volatility spikes, repeated levels, fair-value gaps, pivots, breakouts, and retests',
      createTargetedTriggerBars(),
      args.resume,
    ) : null;
  const dependencies = await rowDependencies(args.inputDir, daily.report.rows);
  const deltas = buildDelta(daily.report, context.report, dependencies);
  const targetedDeltas = targeted ? buildDelta(daily.report, targeted.report, dependencies) : [];
  const changedByValidity = countBy(deltas, (delta) => `${delta.before.split(' | ')[0]} -> ${delta.after.split(' | ')[0]}`);
  const changedByStage = countBy(deltas, (delta) => `${delta.before.split(' | ')[1]} -> ${delta.after.split(' | ')[1]}`);
  const changedByDependency = countBy(
    deltas.flatMap((delta) => delta.dependencyClasses.length > 0 ? delta.dependencyClasses : ['no-scanned-dependency']),
    (entry) => entry,
  );
  const improved = deltas.filter((delta) => (
    !delta.before.includes('supported | pass') && delta.after.includes('supported | pass')
  ));
  const regressed = deltas.filter((delta) => (
    delta.before.includes('supported | pass') && !delta.after.includes('supported | pass')
  ));
  const dailyRows = rowByPath(daily.report);
  const contextRows = rowByPath(context.report);
  const targetedRows = targeted ? rowByPath(targeted.report) : new Map<string, ExternalCorpusReportRow>();
  const targetedFixtureRows = TARGETED_FIXTURE_ROWS.map((localPath) => ({
    localPath,
    daily: dailyRows.get(localPath),
    context: contextRows.get(localPath),
    targeted: targetedRows.get(localPath),
  }));
  const targetedRecovered = targeted ? targetedFixtureRows.filter((row) => row.targeted && rowLabel(row.targeted).includes('supported | pass')) : [];
  const lines = [
    `# External Pine Corpus ${args.corpusLabel.toUpperCase()} Fixture Profile Delta ${args.reportVersion}`,
    '',
    '## Basis',
    '',
    `- Corpus: \`${args.inputDir}\`.`,
    `- Daily report: \`${daily.reportPath}\`.`,
    `- Context-stress report: \`${context.reportPath}\`.`,
    ...(targeted ? [`- Targeted-trigger report: \`${targeted.reportPath}\`.`] : []),
    `- Daily bars: ${daily.bars.length}, ${daily.description}, sha256 ${digestBars(daily.bars)}.`,
    `- Context-stress bars: ${context.bars.length}, ${context.description}, sha256 ${digestBars(context.bars)}.`,
    ...(targeted ? [`- Targeted-trigger bars: ${targeted.bars.length}, ${targeted.description}, sha256 ${digestBars(targeted.bars)}.`] : []),
    '- Method: same corpus runner, same source files, same engine tree, different synthetic fixture profile.',
    '- Limit: this compares support/output payloads under two synthetic chart contexts. It is not TradingView ground truth.',
    '',
    '## Headline',
    '',
    `- Daily profile: ${summarizeProfile(daily.report)}.`,
    `- Context-stress profile: ${summarizeProfile(context.report)}.`,
    ...(targeted ? [`- Targeted-trigger profile: ${summarizeProfile(targeted.report)}.`] : []),
    `- Rows with changed payload or classification: ${deltas.length}/${daily.report.summary.total}.`,
    `- Rows improving to supported output: ${improved.length}.`,
    `- Rows regressing from supported output: ${regressed.length}.`,
    ...(targeted ? [
      `- Rows with changed payload or classification under targeted-trigger versus daily: ${targetedDeltas.length}/${daily.report.summary.total}.`,
      `- Previously fixture-fixable v6 rows recovered under targeted-trigger: ${targetedRecovered.length}/${targetedFixtureRows.length}.`,
    ] : []),
    '',
    '## Changed Rows By Validity',
    '',
    markdownTable([
      ['Transition', 'Rows'],
      ['---', '---:'],
      ...Object.entries(changedByValidity).map(([name, count]) => [name, String(count)]),
    ]),
    '',
    '## Changed Rows By Stage',
    '',
    markdownTable([
      ['Transition', 'Rows'],
      ['---', '---:'],
      ...Object.entries(changedByStage).map(([name, count]) => [name, String(count)]),
    ]),
    '',
    '## Changed Rows By Dependency Class',
    '',
    markdownTable([
      ['Dependency class', 'Changed rows'],
      ['---', '---:'],
      ...Object.entries(changedByDependency).map(([name, count]) => [name, String(count)]),
    ]),
    '',
    '## Changed Row Sample',
    '',
    markdownTable([
      ['Row', 'Daily', 'Context-stress', 'Dependency classes'],
      ['---', '---', '---', '---'],
      ...deltas.slice(0, 40).map((delta) => [
        `\`${delta.localPath}\``,
        delta.before.replaceAll('|', '\\|'),
        delta.after.replaceAll('|', '\\|'),
        delta.dependencyClasses.join(', ') || 'none scanned',
      ]),
    ]),
    '',
    ...(targeted ? [
      '## Targeted Fixture-Fixable Rows',
      '',
      markdownTable([
        ['Row', 'Daily', 'Context-stress', 'Targeted-trigger'],
        ['---', '---', '---', '---'],
        ...targetedFixtureRows.map((row) => [
          `\`${row.localPath}\``,
          row.daily ? rowLabel(row.daily).replaceAll('|', '\\|') : 'missing',
          row.context ? rowLabel(row.context).replaceAll('|', '\\|') : 'missing',
          row.targeted ? rowLabel(row.targeted).replaceAll('|', '\\|') : 'missing',
        ]),
      ]),
      '',
      '## Targeted-Trigger Changed Row Sample',
      '',
      markdownTable([
        ['Row', 'Daily', 'Targeted-trigger', 'Dependency classes'],
        ['---', '---', '---', '---'],
        ...targetedDeltas.slice(0, 40).map((delta) => [
          `\`${delta.localPath}\``,
          delta.before.replaceAll('|', '\\|'),
          delta.after.replaceAll('|', '\\|'),
          delta.dependencyClasses.join(', ') || 'none scanned',
        ]),
      ]),
      '',
    ] : []),
    '## Synthesizable Blind Spots Covered',
    '',
    '- Intraday/session timing: context-stress bars include premarket, regular open, midday, regular close, and postmarket timestamps instead of one daily timestamp per trading day.',
    '- 24/7 and weekend behavior: context-stress bars include weekend bars instead of skipping Saturday and Sunday.',
    '- Volume regimes: context-stress bars include session-dependent volume, sustained lower weekend/pre/post volume, and deterministic spikes.',
    '- Long history: context-stress bars cover 5,200 bars across multi-year history, enough to exercise multi-year state and weekly/monthly aggregation paths that a short tame window cannot reach.',
    '- Request timeframe mapping: the same bars feed the synthetic request datafeed, so request-backed branches see the richer context profile instead of the daily-only stream.',
    ...(targeted ? ['- Targeted market conditions: targeted-trigger adds deterministic repeated levels, gap bars, engulfing candles, volume spikes, breakout/retest sequences, and explicit killzone times so data-gated scripts can execute real branches without per-row fixtures.'] : []),
    '',
    '## Blind Spots Still Trace-Only Or Host-Dependent',
    '',
    '- Realtime semantics: a historical fixture cannot prove `barstate.isrealtime`, unconfirmed-bar replacement, live rollback, or alert/order timing under ticks. Those remain realtime-trace or realtime-harness surfaces.',
    '- Symbol metadata truth: `syminfo.type`, exchange timezone, point value, currency, base currency, and tick size can be synthesized as profiles, but correctness for real symbols still requires host metadata or traces.',
    '- Corporate actions, fundamentals, economic data, Quandl, and seed requests: OHLCV bars cannot prove event-backed request values. These need explicit host-provided event feeds or TradingView traces.',
    '- Exact exchange sessions and extended-hours calendars: synthetic sessions can exercise branches, but exchange holidays, half-days, DST boundaries, and per-symbol sessions require host calendar data.',
    '',
    '## Conclusion',
    '',
    'The daily fixture and context-stress fixture disagree on the rows listed above. Those rows depend on chart context, not just language/runtime support. The remaining trace-only list is narrower: realtime tick behavior, real symbol metadata, event-backed request feeds, and exact exchange calendars.',
    '',
  ];
  await writeFile(args.outputPath, `${lines.join('\n')}`, 'utf8');
  process.stdout.write(`${JSON.stringify({
    daily: daily.report.summary.funnel.output,
    contextStress: context.report.summary.funnel.output,
    ...(targeted ? { targetedTrigger: targeted.report.summary.funnel.output } : {}),
    changedRows: deltas.length,
    improved: improved.length,
    regressed: regressed.length,
    ...(targeted ? {
      targetedChangedRows: targetedDeltas.length,
      targetedRecoveredRows: targetedRecovered.length,
    } : {}),
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
