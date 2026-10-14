import type { Bar } from '../../src/runtime/context';

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const fixture = (path: string) => readFileSync(new URL(`../../oracle-probes/${path}`, import.meta.url), 'utf8');
const json = <T,>(path: string): T => JSON.parse(fixture(path)) as T;
function csv(path: string) {
  const [header, ...lines] = fixture(path).trimEnd().split(/\r?\n/);
  return { columns: header.split(','), rows: lines.map((line) => line.split(',')) };
}
function bar(values: string[]): Bar {
  return { time: Number(values[0]) * 1000, open: Number(values[1]), high: Number(values[2]),
    low: Number(values[3]), close: Number(values[4]), volume: values[5] === undefined ? Number.NaN : Number(values[5]) };
}
const captured = json<{ chartIdentity: { symbol: string; interval: string; timezone: string } }>(
  'v89/captures/v89/environment-v1/chart-context-before-v1.json',
).chartIdentity;
const runtime = {
  syminfo: { tickerid: captured.symbol, ticker: 'BTCUSDT', timezone: captured.timezone, mintick: 0.01 },
  timeframe: { period: captured.interval, multiplier: 2, isminutes: true, isintraday: true },
};
const attempts = [5, 6].flatMap((version) => [1, 2].map((attempt) =>
  `v89/captures/v89/v89-v${version}-requested-daily-counter-p4250m-v1/attempt-v${attempt}`));
interface Frontier {
  status: string;
  sourceSha256: string;
  csv: { sha256: string; observerColumnIndices0Based: Record<string, number> };
  carriedFirstEvaluation: Record<string, string>;
  comparisonEligibleRows: number;
}
const columns = ['TIME', 'OPEN', 'HIGH', 'LOW', 'CLOSE', 'VOLUME'];
const daily = json<{ records: { rawColumns: Record<string, string>; independentlyClosed: boolean }[] }>(
  'v80/captures/v80/daily-provider-v1.json',
);
const dailyRows = new Map(daily.records.filter((r) => r.independentlyClosed)
  .map((r) => [Number(r.rawColumns.D_TIME), columns.map((column) => r.rawColumns['D_' + column])]));
for (const attempt of attempts) {
  const data = csv(attempt + '/native-v1.csv');
  const masks = csv(attempt + '/row-closure-mask-v1.csv');
  for (let i = 0; i < data.rows.length; i++) {
    if (masks.rows[i][5] !== '1') continue;
    const row = data.rows[i];
    const values = columns.map((column) => row[data.columns.indexOf('D_' + column)]);
    const time = Number(values[0]);
    // Closed-day original-study OHLCV can vary within its merged native output.
    // These programs observe only daily time; preserve the independent prefix.
    if (!dailyRows.has(time)) dailyRows.set(time, values);
  }
}
const dailyBars = [...dailyRows].sort(([a], [b]) => a - b).map(([time, values]) =>
  ({ ...bar([String(time / 1000), ...values.slice(1)]), time }));
function replay(source: string, bars: Bar[]) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success).toBe(true);
  const feed = new InMemoryRequestDatafeed([
    { symbol: captured.symbol, timeframe: '1D', bars: dailyBars, syminfo: runtime.syminfo },
  ]);
  const result = executeCompiled(compiled, bars, undefined, { requestDatafeed: feed, runtime });
  expect(result?.errors).toEqual([]);
  expect(result?.profile.swallowedErrors ?? []).toEqual([]);
  return result!;
}

describe('native v89 requested daily first change on the existing 2m chart', () => {
  it('binds the actual requested frontier and closed daily inputs', () => {
    expect(captured).toMatchObject({ symbol: 'BINANCE:BTCUSDT', interval: '2', timezone: 'Etc/UTC' });
    expect(dailyBars[0].time).toBe(Date.UTC(2017, 7, 17));
    expect(dailyBars.at(-1)!.time).toBe(Date.UTC(2026, 9, 12));
    expect(dailyBars).toHaveLength(3344);
    for (const attempt of attempts) {
      const frontier = json<Frontier>(attempt + '/frontier-observation-v1.json');
      expect(frontier.status).toBe('RUNS');
      expect(frontier.carriedFirstEvaluation).toEqual({ FIRST_REQUEST_TIME: '1502928000000',
        FIRST_REQUEST_BAR_INDEX: '0', FIRST_REQUEST_ISFIRST: '1', FIRST_REQUEST_CHANGE: '0',
        FIRST_REQUEST_COUNTER: '0', FIRST_REQUEST_CHANGE_IS_NA: '0' });
    }
  });

  it.each(attempts)('matches all closed requested observers exactly: %s', (attempt) => {
    const source = fixture(attempt + '/executed-v1.pine');
    const frontier = json<Frontier>(attempt + '/frontier-observation-v1.json');
    const data = csv(attempt + '/native-v1.csv');
    const masks = csv(attempt + '/row-closure-mask-v1.csv');
    expect(createHash('sha256').update(source).digest('hex')).toBe(frontier.sourceSha256);
    expect(createHash('sha256').update(fixture(attempt + '/native-v1.csv')).digest('hex')).toBe(frontier.csv.sha256);
    expect(masks.rows).toHaveLength(data.rows.length);
    const selected = data.rows.filter((row, i) => {
      expect(Number(masks.rows[i][1])).toBe(Number(row[0]));
      expect(Number(masks.rows[i][2])).toBe(Number(row[frontier.csv.observerColumnIndices0Based.REQUEST_TIME]));
      return masks.rows[i][6] === '1';
    });
    expect(selected).toHaveLength(4469);
    expect(frontier.comparisonEligibleRows).toBe(selected.length);
    const result = replay(source, selected.map(bar));
    expect(result.plots).toHaveLength(16);
    for (const [title, column] of Object.entries(frontier.csv.observerColumnIndices0Based)) {
      const plot = result.plots.find((p) => p.title === title)!;
      expect(plot).toBeDefined();
      const native = selected.map((row) => row[column] === '' ? null : Number(row[column]));
      if (title === 'CHART_BAR_INDEX') {
        // The capture omits the chart prefix; requested counters are never shifted.
        expect(plot.values).toEqual(native.map((value) => value! - native[0]!));
      } else {
        expect(plot.values, title).toEqual(native);
      }
    }
  });

  it('matches all 24,545 closed cells of the original v5 pivot-request counter', () => {
    const source = fixture('v4/corpus5-pivot-request-counter-v1.pine');
    expect(createHash('sha256').update(source).digest('hex')).toBe(
      'd91765c9517a779ff170b0b6632d4941fac93206a3c48be8015b4758e5d6cf20',
    );
    const data = csv('v4/captures/v4/corpus5-pivot-request-counter-v1-attempt1.csv');
    const closed = data.rows.slice(0, -1);
    expect(closed).toHaveLength(24545);
    const result = replay(source, closed.map((row) => bar(row.slice(0, 5))));
    expect(result.plots.find((plot) => plot.title === 'OUTCOME')!.values)
      .toEqual(closed.map((row) => Number(row[data.columns.indexOf('OUTCOME')])));
  });
});
