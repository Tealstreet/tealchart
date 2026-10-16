import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

interface Frontier {
  csv: string;
  sha256: string;
  rows: number;
  closedRows: number;
  fields: Record<string, { columnOrdinal: number; firstRaw: string; lastRaw: string }>;
}
interface Binding {
  path: string;
  sha256: string;
  rows: number;
  headers: string[];
  executedSourceSha256: string;
  observedAtUtc: string;
  closureMask: string;
}
interface Observation {
  status: string;
  sourceSha256: string;
  saveCompilerSuccess: boolean;
  addCompilerSuccess: boolean;
  markerChannelStatus: string;
  studyInstanceId: null;
  immediateMarkers: null;
  settledMarkers: null;
  actualContext: { symbol: string; interval: string; chartTimezone: string; exchangeTimezone: null };
}
interface Provenance {
  csv: string;
  sha256: string;
  rowOrdinal?: number;
  rowOrdinalRangeInclusive?: [number, number];
  columnOrdinals: number[];
  closedEligible: boolean;
}
interface DailyTable {
  symbol: string;
  requestedInterval: string;
  closedProviderDailyKeyCount: number;
  observationCutoffMs: number;
  closedDailyKeysWithMultipleRawOhlcvVariants: string[];
  allProviderAttemptCommonClosedW: { rows: number; firstTimeRaw: string; lastTimeRaw: string };
  fullHistorySupplementaryCohortClosedW: { rows: number; firstTimeRaw: string; lastTimeRaw: string };
  days: { requestedDayTimeMsRaw: string; closedVariantCount: number; variants: { ohlcvRaw: string[]; provenance: Provenance[] }[] }[];
  limitations: string[];
}
const base = 'v90/captures/v90';
const read = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const json = <T,>(path: string): T => JSON.parse(read(path)) as T;
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const numeric = (value: string): number => value === '' ? NaN : Number(value);
const frontiers = json<{ frontiers: Frontier[] }>(`${base}/daily-frontiers-v1.json`).frontiers;
const dailyTable = json<DailyTable>(`${base}/daily-provider-table-v1.json`);
function csv(path: string) {
  const [header, ...lines] = read(path).trimEnd().split(/\r?\n/);
  return { headers: header.split(','), rows: lines.map(line => line.split(',')) };
}
function load(root: string) {
  const binding = json<Binding>(`${root}/column-bindings-v1.json`);
  const source = read(`${root}/executed-v1.pine`);
  const observation = json<Observation>(`${root}/observation-v1.json`);
  const data = csv(binding.path);
  const mask = csv(binding.closureMask);
  const eligibleColumn = mask.headers.indexOf('closed_eligible');
  const closed = mask.rows.flatMap((row, index) => row[eligibleColumn] === '1' ? [index] : []);
  return { root, binding, source, observation, ...data, mask, closed };
}
type Capture = ReturnType<typeof load>;
const chart = frontiers.map(frontier => load(frontier.csv.slice(0, frontier.csv.lastIndexOf('/'))));
const providers = [5, 6].flatMap(version => [1, 2, 3, 4].map(attempt => load(`${base}/v90-daily-provider-v${version}/attempt-v${attempt}`)));
const captures = [...chart, ...providers];
function bar(row: string[]): Bar {
  return { time: Number(row[0]) * 1000, open: numeric(row[1]), high: numeric(row[2]),
    low: numeric(row[3]), close: numeric(row[4]), volume: numeric(row[5]) };
}
function bind(capture: Capture) {
  const { binding, observation, source, headers, rows, mask } = capture;
  expect(hash(read(binding.path))).toBe(binding.sha256);
  expect(hash(source)).toBe(binding.executedSourceSha256);
  expect(hash(source)).toBe(observation.sourceSha256);
  expect(observation.status).toBe('RUNS');
  expect(observation.saveCompilerSuccess && observation.addCompilerSuccess).toBe(true);
  expect(observation.actualContext).toMatchObject({ symbol: 'BINANCE:BTCUSDT', chartTimezone: 'Etc/UTC', exchangeTimezone: null });
  expect(observation.markerChannelStatus).toBe('UNOBSERVED');
  expect([observation.studyInstanceId, observation.immediateMarkers, observation.settledMarkers]).toEqual([null, null, null]);
  expect(headers).toEqual(binding.headers);
  expect(rows).toHaveLength(binding.rows);
  expect(mask.rows).toHaveLength(rows.length);
  const column = (name: string) => mask.headers.indexOf(name);
  expect(mask.rows.map(row => [row[column('csv_sha256')], row[column('data_row_ordinal_1based_excluding_header')], row[column('time_raw')]]))
    .toEqual(rows.map((row, index) => [binding.sha256, String(index + 1), row[0]]));
  expect(capture.closed.every(index => rows[index][headers.indexOf('CHART_ISCONFIRMED')] === '1')).toBe(true);
}
function dailyBars(capture: Capture) {
  // A single complete daily export supplies the feed; cropped exports are never concatenated.
  return capture.closed.map(index => bar(capture.rows[index]));
}
function replay(capture: Capture, daily: Bar[]) {
  const compiled = tryCompile(parse(capture.source));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const interval = capture.observation.actualContext.interval;
  const result = executeCompiled(compiled, capture.rows.map(bar), undefined, {
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', bars: daily }]),
    realtimeLastBar: { isNew: false },
    runtime: {
      now: Date.parse(capture.binding.observedAtUtc),
      syminfo: { tickerid: 'BINANCE:BTCUSDT' },
      timeframe: { period: interval, multiplier: interval === '1D' ? 1 : 2, isminutes: interval === '2', isintraday: interval === '2', isdaily: interval === '1D' },
    },
  });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.swallowedErrors ?? []).toEqual([]);
  return result!;
}
function score(capture: Capture, result: ReturnType<typeof replay>, excluded: Set<string> = new Set()) {
  let scored = 0;
  for (const [index, title] of capture.headers.entries()) {
    if (index < 6 || excluded.has(title)) continue;
    const values = result.plots.find(plot => plot.title === title)!.values;
    expect(values).toHaveLength(capture.rows.length);
    for (const row of capture.closed) {
      const raw = capture.rows[row][index];
      const expected = raw === '' ? null : Number(raw);
      if (!Object.is(values[row], expected)) expect(values[row], `${capture.root} ${title} time=${capture.rows[row][0]}`).toBe(expected);
      scored++;
    }
  }
  return scored;
}

describe('v90 fresh closed daily chart and 2m daily-provider contexts', () => {
  it('binds the v3 integrity inventory to every consumed daily artifact', () => {
    const integrity = json<{ version: string; selfExcluded: boolean; files: { path: string; sha256: string; bytes: number }[] }>(`${base}/artifact-integrity-v3.json`);
    expect(integrity.version).toBe('v3');
    expect(integrity.selfExcluded).toBe(true);
    const selected = new Set([`${base}/daily-frontiers-v1.json`, `${base}/daily-provider-table-v1.json`]);
    for (const capture of captures) {
      for (const path of [capture.binding.path, capture.binding.closureMask, `${capture.root}/column-bindings-v1.json`, `${capture.root}/observation-v1.json`, `${capture.root}/executed-v1.pine`]) selected.add(path);
    }
    expect(selected.size).toBe(62);
    for (const path of selected) {
      const file = integrity.files.find(entry => entry.path === path)!;
      expect(file, path).toBeDefined();
      const source = read(path);
      expect(hash(source), path).toBe(file.sha256);
      expect(Buffer.byteLength(source), path).toBe(file.bytes);
    }
  });

  it('pins observed masked values and attributes every excluded difference to missing input context', () => {
    const physical = { rows: 0, cells: 0, differences: 0, matches: 0 };
    const developing = { rows: 0, cells: 0, differences: 0, matches: 0 };
    const rawObserved: [string, number, string, string][] = [];
    let croppedIndexDifferences = 0;
    for (const capture of captures) {
      const isProvider = capture.root.includes('daily-provider');
      const feedCapture = isProvider
        ? chart.find(candidate => candidate.root.includes(`chart-v${capture.root.includes('provider-v5') ? 5 : 6}/attempt-v1`))!
        : capture;
      const feed = dailyBars(feedCapture);
      const last = feed.at(-1)!;
      const result = replay(capture, feed);
      const values = new Map(result.plots.map(plot => [plot.title, plot.values]));
      const cropped = isProvider && capture.rows[0][capture.headers.indexOf('CHART_BAR_INDEX')] !== '0';
      const projection: Record<string, number> = isProvider ? {
        D_TIME: last.time, D_CLOSE_TIME: last.time + 86400000,
        D_OPEN: last.open, D_HIGH: last.high, D_LOW: last.low, D_CLOSE: last.close, D_VOLUME: last.volume, D_INDEX: feed.length - 1,
      } : { REQUEST_TIME: last.time, REQUEST_BAR_INDEX: feed.length - 1, REQUEST_COUNTER: feed.length - 1 };
      const eligibleColumn = capture.mask.headers.indexOf('closed_eligible');
      const reasonColumn = capture.mask.headers.indexOf('reason');
      for (const [rowIndex, mask] of capture.mask.rows.entries()) {
        if (mask[eligibleColumn] === '1') continue;
        const reason = mask[reasonColumn];
        expect(['PHYSICAL_OPEN_OR_NATIVE_CONFIRMATION_UNOBSERVED', 'REQUESTED_DAY_NOT_CLOSED_AT_EVERY_RELEVANT_OBSERVATION']).toContain(reason);
        const group = reason === 'PHYSICAL_OPEN_OR_NATIVE_CONFIRMATION_UNOBSERVED' ? physical : developing;
        group.rows++;
        const row = capture.rows[rowIndex];
        const requestedTime = Number(row[capture.headers.indexOf(isProvider ? 'D_TIME' : 'REQUEST_TIME')]);
        expect(requestedTime).toBe(last.time + 86400000);
        expect(feed.some(bar => bar.time === requestedTime)).toBe(false);
        for (const [column, title] of capture.headers.entries()) {
          if (column < 6) continue;
          const raw = row[column];
          // The mask limits closure eligibility; it does not make present native output unobserved.
          expect(raw, `${capture.root} ${rowIndex + 1} ${title} OBSERVED`).not.toBe('');
          rawObserved.push([capture.binding.path, rowIndex + 1, title, raw]);
          const native = Number(raw);
          const actual = values.get(title)![rowIndex];
          if (cropped && title === 'CHART_BAR_INDEX') {
            expect(native - Number(actual), 'observed, excluded: chart prefix uncaptured').toBe(22236);
            croppedIndexDifferences++;
            continue;
          }
          group.cells++;
          if (Object.is(actual, native)) {
            group.matches++;
            continue;
          }
          // Every mismatch must be the prior closed tuple carried because the developing daily tuple is absent.
          expect(Object.hasOwn(projection, title), `unexplained masked difference: ${title}`).toBe(true);
          expect(actual, `${capture.root} ${rowIndex + 1} ${title}: developing input absent`).toBe(projection[title]);
          group.differences++;
        }
      }
    }
    expect(physical).toEqual({ rows: 12, cells: 176, differences: 76, matches: 100 });
    expect(developing).toEqual({ rows: 3429, cells: 49726, differences: 27432, matches: 22294 });
    expect(croppedIndexDifferences).toBe(1713);
    expect(rawObserved).toHaveLength(51615);
    expect(hash(JSON.stringify(rawObserved))).toBe('90ad94b6b872ba02900eaa32506e981998e13bd84270e0432bcc7fa5c91f5a6f');
  });

  it('binds each complete daily frontier and its first-evaluation observations', () => {
    expect(chart).toHaveLength(4);
    for (const [index, capture] of chart.entries()) {
      bind(capture);
      const frontier = frontiers[index];
      expect(capture.binding.path).toBe(frontier.csv);
      expect(capture.binding.sha256).toBe(frontier.sha256);
      expect(capture.closed).toHaveLength(frontier.closedRows);
      expect(capture.closed).toHaveLength(3346);
      expect(capture.observation.actualContext.interval).toBe('1D');
      for (const [name, field] of Object.entries(frontier.fields)) {
        expect(capture.headers[field.columnOrdinal - 1]).toBe(name);
        expect(capture.rows[0][field.columnOrdinal - 1]).toBe(field.firstRaw);
      }
      const value = (name: string) => capture.rows[0][capture.headers.indexOf(name)];
      expect([value('CHART_BAR_INDEX'), value('REQUEST_BAR_INDEX'), value('REQUEST_ISFIRST'), value('REQUEST_CHANGE'), value('REQUEST_COUNTER'), value('REQUEST_CHANGE_IS_NA')])
        .toEqual(['0', '0', '1', '0', '0', '0']);
      expect(value('REQUEST_TIME')).toBe('1502928000000');
    }
  });

  it('authenticates closed provider table provenance without selecting a convenient variant or splicing history', () => {
    expect(dailyTable.symbol).toBe('BINANCE:BTCUSDT');
    expect(dailyTable.requestedInterval).toBe('1D');
    expect(dailyTable.closedProviderDailyKeyCount).toBe(31);
    expect(dailyTable.closedDailyKeysWithMultipleRawOhlcvVariants).toEqual([]);
    expect(dailyTable.allProviderAttemptCommonClosedW.rows).toBe(84);
    expect(dailyTable.fullHistorySupplementaryCohortClosedW.rows).toBe(22320);
    for (const cohort of [providers, providers.filter(capture => /attempt-v[34]$/.test(capture.root))]) {
      const times = cohort.map(capture => new Set(capture.closed.map(index => capture.rows[index][0])));
      const common = [...times[0]].filter(time => times.every(keys => keys.has(time))).sort((a, b) => Number(a) - Number(b));
      const recorded = cohort.length === 8 ? dailyTable.allProviderAttemptCommonClosedW : dailyTable.fullHistorySupplementaryCohortClosedW;
      expect([common.length, common[0], common.at(-1)]).toEqual([recorded.rows, recorded.firstTimeRaw, recorded.lastTimeRaw]);
    }
    const byPath = new Map(captures.map(capture => [capture.binding.path, capture]));
    let closedDays = 0;
    for (const day of dailyTable.days) {
      if (day.closedVariantCount === 0) continue;
      closedDays++;
      expect(day.closedVariantCount).toBe(1);
      const closedVariants = day.variants.filter(variant => variant.provenance.some(provenance => provenance.closedEligible));
      expect(closedVariants).toHaveLength(1);
      for (const provenance of closedVariants[0].provenance.filter(provenance => provenance.closedEligible)) {
        const capture = byPath.get(provenance.csv)!;
        expect(capture.binding.sha256).toBe(provenance.sha256);
        const [first, last] = provenance.rowOrdinalRangeInclusive ?? [provenance.rowOrdinal!, provenance.rowOrdinal!];
        const selected = capture.rows.slice(first - 1, last);
        expect(selected.every(row => provenance.columnOrdinals.every((ordinal, index) => row[ordinal - 1] === closedVariants[0].ohlcvRaw[index]))).toBe(true);
        const eligible = new Set(capture.closed);
        expect(Array.from({ length: last - first + 1 }, (_, index) => first - 1 + index).every(index => eligible.has(index))).toBe(true);
      }
    }
    expect(closedDays).toBe(3346);
    expect(dailyTable.limitations).toContain('Historic v58 developing-day snapshots remain held');
    expect(dailyTable.limitations).toContain('No imported nested originals executed');
  });

  for (const capture of chart) {
    it(`matches all 50,190 closed daily observer cells: ${capture.root}`, () => {
      bind(capture);
      expect(score(capture, replay(capture, dailyBars(capture)))).toBe(50190);
    });
  }

  for (const capture of providers) {
    it(`matches closed requested-daily values independently: ${capture.root}`, () => {
      bind(capture);
      const version = capture.root.includes('provider-v5') ? 5 : 6;
      const feed = chart.find(candidate => candidate.root.includes(`chart-v${version}/attempt-v1`))!;
      const result = replay(capture, dailyBars(feed));
      const cropped = Number(capture.rows[0][capture.headers.indexOf('CHART_BAR_INDEX')]) !== 0;
      const excluded = cropped ? new Set(['CHART_BAR_INDEX']) : new Set<string>();
      expect(capture.closed).toHaveLength(cropped ? 84 : 22320);
      const closeColumn = capture.headers.indexOf('D_CLOSE_TIME');
      expect(capture.closed.every(index => Number(capture.rows[index][closeColumn]) <= dailyTable.observationCutoffMs)).toBe(true);
      const reason = capture.mask.headers.indexOf('reason');
      const dayStillDeveloping = capture.mask.rows.flatMap((row, index) => row[reason] === 'REQUESTED_DAY_NOT_CLOSED_AT_EVERY_RELEVANT_OBSERVATION' ? [index] : []);
      expect(dayStillDeveloping).toHaveLength(cropped ? (capture.root.includes('provider-v6/attempt-v2') ? 428 : 427) : 430);
      expect(dayStillDeveloping.every(index => capture.rows[index][capture.headers.indexOf('CHART_ISCONFIRMED')] === '1')).toBe(true);

      expect(score(capture, result, excluded)).toBe(cropped ? 1176 : 334800);
      if (cropped) {
        // The missing chart prefix leaves absolute chart-index parity held; relative positions are checked separately.
        const values = result.plots.find(plot => plot.title === 'CHART_BAR_INDEX')!.values;
        const column = capture.headers.indexOf('CHART_BAR_INDEX');
        const offset = Number(capture.rows[0][column]);
        expect(offset).toBe(22236);
        expect(capture.closed.every(index => values[index] === Number(capture.rows[index][column]) - offset)).toBe(true);
      }
    });
  }
});
