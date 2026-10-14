import type { Bar } from '../../src/runtime/context';

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed, requestDatafeedKey } from '../../src/runtime/requestDatafeed';

interface RawRecord {
  rawCSVRow: number;
  rawColumns: Record<string, string>;
  independentlyClosed: boolean;
}
interface MaskRecord {
  rawCSVRow: number;
  CHART_TIME: string;
  chartConfirmed: boolean;
  eligibleClosedParity: boolean;
  scoreW: boolean;
  developingDailyUnscored: boolean;
  chartOpenUnscored: boolean;
}
const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/v80/captures/v80/${path}`, import.meta.url), 'utf8');
const readJson = <T,>(path: string): T => JSON.parse(fixture(path)) as T;
function readCSV(path: string) {
  const [header, ...lines] = fixture(path).trimEnd().split(/\r?\n/);
  const columns = header.split(',');
  return { columns, rows: lines.map((line) => Object.fromEntries(line.split(',').map((value, i) => [columns[i], value]))) };
}
const audit = readJson<{
  result: string;
  window: { startTimeMs: string; endTimeCloseMs: string; interiorBoundaryMs: string };
  comparisons: { repeatStability: { comparedColumns: string[]; observationClockExcluded: boolean } };
}>('feed-identity-audit-v1.json');
const masks = readJson<{ attempts: Record<string, { records: MaskRecord[] }> }>('row-masks-v1.json');
const daily = readJson<{
  binding: { symbol: string; timeframe: string; currency: string };
  sourceCSV: string;
  records: RawRecord[];
  fields: string[];
}>('daily-provider-v1.json');
const start = Number(audit.window.startTimeMs);
const end = Number(audit.window.endTimeCloseMs);
const captured = readJson<{ symbolInfo: {
  name: string; full_name: string; source_id: string; currency_code: string; base_currency: string;
  minmov: number; pricescale: number; pointvalue: number; timezone: string; session: string; volume_type: string;
} }>('environment-v1/chart-context-before-v1.json').symbolInfo;
const syminfo = {
  ticker: captured.name, tickerid: captured.full_name, prefix: captured.source_id,
  currency: captured.currency_code, basecurrency: captured.base_currency,
  mintick: captured.minmov / captured.pricescale, pricescale: captured.pricescale, pointvalue: captured.pointvalue,
  timezone: captured.timezone, session: captured.session, volumetype: captured.volume_type,
};
const session = { regular: captured.session, premarket: '', postmarket: '', timezone: captured.timezone };
const libraries = new Map([['sours-lat/R2Nsad4a19ecf824/1', parse(fixture('library-reference-v1/published-source-v1.pine'))]]);
const fields = ['TIME', 'TIME_CLOSE', 'OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME'];
function nativeNumber(value: string): number {
  expect(value).not.toBe('');
  const number = Number(value);
  expect(Number.isFinite(number)).toBe(true);
  return number;
}
function nativeBar(raw: Record<string, string>, prefix: string): Bar {
  return { time: nativeNumber(raw[prefix + 'TIME']), open: nativeNumber(raw[prefix + 'OPEN']),
    high: nativeNumber(raw[prefix + 'HIGH']), low: nativeNumber(raw[prefix + 'LOW']),
    close: nativeNumber(raw[prefix + 'CLOSE']), volume: nativeNumber(raw[prefix + 'VOLUME']) };
}
const dailyBars = daily.records.map((record) => nativeBar(record.rawColumns, 'D_'));
const attempts = [
  ['original', 'v80-nested6-original-v1/attempt-v1', 'v80-nested6-with-feed-v1/attempt-v1'],
  ['initial observers', 'v80-nested6-with-feed-v1/attempt-v1', 'v80-nested6-with-feed-v1/attempt-v1'],
  ['repeat observers', 'v80-nested6-with-feed-v1/attempt-v2', 'v80-nested6-with-feed-v1/attempt-v2'],
] as const;

describe('native v80 nested daily requests in confirmed window W', () => {
  it('binds independent daily and physical chart inputs with the recorded eligibility masks', () => {
    expect(audit.result).toBe('PASS');
    expect(start).toBe(Date.UTC(2026, 9, 8));
    expect(end).toBe(Date.UTC(2026, 9, 10));
    expect(daily.binding).toMatchObject({ symbol: 'BINANCE:BTCUSDT', timeframe: '1D', currency: 'USDT' });
    expect(daily.records).toHaveLength(3343);
    const closed = daily.records.filter((record) => record.independentlyClosed);
    expect(closed).toHaveLength(3342);
    const dailyCSV = readCSV(daily.sourceCSV);
    const physical = readJson<{ chartRows: { value: number[] }[] }>(
      'v80-requested-daily-export-v1/attempt-v3/native-series-v1.json',
    );
    const physicalDaily = new Map(physical.chartRows.map((row) => [row.value[0] * 1000, row.value]));
    const byTime = new Map(closed.map((record) => [Number(record.rawColumns.D_TIME), record.rawColumns]));
    for (const record of daily.records) {
      const raw = dailyCSV.rows[record.rawCSVRow - 2];
      for (const field of daily.fields) expect(record.rawColumns[field]).toBe(raw[field]);
      if (!record.independentlyClosed) continue;
      for (const field of fields) expect(nativeNumber(raw['D_' + field])).toBe(nativeNumber(raw['CHART_' + field]));
      const native = physicalDaily.get(Number(raw.D_TIME));
      expect(native).toBeDefined();
      expect(dailyBars[record.rawCSVRow - 2]).toEqual({
        time: native![0] * 1000, open: native![1], high: native![2], low: native![3], close: native![4], volume: native![5],
      });
    }
    const repeatedPhysical = readJson<{ chartRows: { value: number[] }[] }>(
      'v80-nested6-with-feed-v1/attempt-v2/native-series-v1.json',
    );
    const physicalChart = new Map(repeatedPhysical.chartRows.map((row) => [row.value[0] * 1000, row.value]));
    for (const attempt of [attempts[1][1], attempts[2][1]]) {
      const rows = readCSV(attempt + '/native-v1.csv').rows;
      const scored = masks.attempts[attempt].records.filter((record) => record.scoreW);
      expect(scored).toHaveLength(1440);
      expect(new Set(scored.map((record) => record.CHART_TIME)).size).toBe(1440);
      expect(scored.map((record) => Number(record.CHART_TIME))).toEqual(Array.from({ length: 1440 }, (_, i) => start + i * 120_000));
      for (const record of scored) {
        expect(record).toMatchObject({ chartConfirmed: true, eligibleClosedParity: true, developingDailyUnscored: false, chartOpenUnscored: false });
        const time = Number(record.CHART_TIME);
        expect(time).toBeGreaterThanOrEqual(start);
        expect(time).toBeLessThan(end);
        const raw = rows[record.rawCSVRow - 2];
        const native = physicalChart.get(time)!;
        expect(nativeBar(raw, 'CHART_')).toEqual({ time: native[0] * 1000, open: native[1], high: native[2], low: native[3], close: native[4], volume: native[5] });
        for (const prefix of ['D_', 'N_']) {
          const requested = byTime.get(Number(raw[prefix + 'TIME']));
          expect(requested).toBeDefined();
          for (const field of fields) expect(nativeNumber(raw[prefix + field])).toBe(nativeNumber(requested!['D_' + field]));
        }
      }
    }
    expect(audit.comparisons.repeatStability.observationClockExcluded).toBe(true);
    expect(audit.comparisons.repeatStability.comparedColumns).toHaveLength(24);
    expect(audit.comparisons.repeatStability.comparedColumns).not.toContain('CAPTURE_CLOCK_MS');
  });

  it.each(attempts)('matches every scored cell exactly: %s', (role, attempt, inputAttempt) => {
    const source = fixture(attempt + '/executed-v1.pine');
    const observation = readJson<{ executedSource: string; status: string }>(attempt + '/observation-v3.json');
    expect(observation.executedSource).toBe(source);
    expect(observation.status).toBe('RUNS');
    const csv = readCSV(attempt + '/native-v1.csv');
    const inputs = readCSV(inputAttempt + '/native-v1.csv');
    const records = masks.attempts[inputAttempt].records;
    const selected = records.filter((record) => record.chartConfirmed && Number(record.CHART_TIME) < end);
    const bars = selected.map((record) => nativeBar(inputs.rows[record.rawCSVRow - 2], 'CHART_'));
    const scoredTimes = new Set(records.filter((record) => record.scoreW).map((record) => Number(record.CHART_TIME)));
    const positions = bars.map((bar, i) => scoredTimes.has(bar.time) ? i : -1).filter((i) => i >= 0);
    expect(positions).toHaveLength(1440);
    const expected = new Map(csv.rows.map((row) => [Number(row.time) * 1000, row]));
    const compiled = tryCompile(parse(source), undefined, { libraries });
    expect(compiled.success).toBe(true);
    const feed = new InMemoryRequestDatafeed([{ ...daily.binding, bars: dailyBars, syminfo, session }]);
    const queried = new Set<string>();
    const result = executeCompiled(compiled, bars, undefined, {
      libraries,
      requestDatafeed: { getBars(query) {
        const key = requestDatafeedKey(query.symbol, query.timeframe);
        expect(key).toBe(requestDatafeedKey(daily.binding.symbol, daily.binding.timeframe));
        queried.add(key);
        return feed.getBars(query);
      } },
      runtime: { syminfo, session, timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true }, chart: { type: 'standard' } },
      timenowObservations: selected.map((record) => Number(inputs.rows[record.rawCSVRow - 2].CAPTURE_CLOCK_MS)),
    });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    expect(queried.size).toBe(1);
    const columns = role === 'original' ? ['Plot', 'REQUESTED_CLOSE_CONTROL'] : audit.comparisons.repeatStability.comparedColumns;
    expect(result?.plots).toHaveLength(role === 'original' ? 2 : 25);
    for (const column of columns) {
      const plot = result!.plots[csv.columns.slice(6).indexOf(column)];
      expect(plot).toBeDefined();
      const actual = positions.map((i) => plot.values[i]);
      const native = positions.map((i) => {
        const value = expected.get(bars[i].time)![column];
        return value === '' ? null : Number(value);
      });
      expect(actual, column).toEqual(native);
    }
    expect(positions.length * columns.length).toBe(role === 'original' ? 2880 : 34560);
  });
});
