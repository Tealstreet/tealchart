import type { Bar } from '../context';

import { performance } from 'node:perf_hooks';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

function makeBars(times: number[]): Bar[] {
  return times.map((time) => ({ time, open: 1, high: 2, low: 0, close: 1, volume: 10 }));
}

function run(source: string, bars: Bar[]) {
  const ast = parse(`//@version=6\nindicator("Timezone session timing")\n${source}`);
  const start = performance.now();
  const result = executeScript(ast, bars, undefined, {
    runtime: {
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      syminfo: { ticker: 'BTCUSDT', tickerid: 'BINANCE:BTCUSDT', timezone: 'UTC', type: 'crypto' },
    },
  });
  const elapsedMs = performance.now() - start;
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return { values: result.plots.map((plot) => plot.values), elapsedMs };
}

describe('IANA session performance', () => {
  it('evaluates a 12000-bar New York session within ten seconds', () => {
    // Cached runs take 2–5s under shared load; per-bar construction takes >20s.
    const times = Array.from({ length: 12000 }, (_, index) => Date.UTC(2026, 7, 31) + index * 120000);
    const result = run('plot(time("2", "0000-2359", "America/New_York"))', makeBars(times));
    expect(result.values).toEqual([times]);
    if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
      expect(result.elapsedMs).toBeLessThan(10000);
    }
  }, 60000);

  it('preserves session membership on both sides of within-day DST transitions', () => {
    const times = [
      Date.UTC(2024, 2, 10, 6, 28),
      Date.UTC(2024, 2, 10, 6, 30),
      Date.UTC(2024, 2, 10, 6, 58),
      Date.UTC(2024, 2, 10, 7),
      Date.UTC(2024, 10, 3, 5, 30),
      Date.UTC(2024, 10, 3, 6, 30),
    ];
    expect(run('plot(time("2", "0130-0200", "America/New_York"))', makeBars(times)).values).toEqual([
      [null, times[1], times[2], null, times[4], times[5]],
    ]);
  });
});
