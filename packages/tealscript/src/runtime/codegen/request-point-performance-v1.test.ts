import type { RequestDatafeed, RequestSeriesPoint } from '../requestDatafeed';

import { performance } from 'node:perf_hooks';

import { expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

function feed(points: RequestSeriesPoint[]): RequestDatafeed {
  return {
    getBars: () => ({ ok: false, code: 'missing_context', message: 'No price context' }),
    getSeries: (query) => ({ ok: true, context: { ...query, points } }),
  };
}

function run(points: RequestSeriesPoint[], times: number[], body: string) {
  const bars = times.map((time) => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  return executeScript(parse(`//@version=6\nindicator("point merge")\n${body}`), bars, undefined, {
    requestDatafeed: feed(points),
  });
}

// request.earnings: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json.
// Point-series merging is a host adapter; the time bound is an engine performance gate.
it('merges a retained point series without sorting and scanning every chart bar', () => {
  const points = Array.from({ length: 12_000 }, (_, i) => ({ time: i * 60_000, value: i + 10 })).reverse();
  const times = Array.from({ length: 12_000 }, (_, i) => i * 60_000);
  const started = performance.now();
  const result = run(points, times, 'plot(request.earnings("TEST", earnings.actual))');
  const elapsed = performance.now() - started;
  expect(result.errors).toEqual([]);
  expect(result.plots[0].values).toEqual(times.map((_, i) => i + 10));
  if (process.env.TEALSCRIPT_PERF_ASSERT === '1') {
    expect(elapsed).toBeLessThan(2_000);
  }
});

// request.earnings gaps/lookahead: same reference; duplicate-time ordering is a host control.
// Fresh execution caches preserve the existing host contract.
it('preserves sparse point selection, duplicate order, gaps, lookahead and refreshed executions', () => {
  const points = [
    { time: 30, value: 3 },
    { time: 10, value: 1 },
    { time: 10, value: 2 },
  ];
  const body = `plot(request.earnings("TEST", earnings.actual))
plot(request.earnings("TEST", earnings.actual, gaps=barmerge.gaps_on))
plot(request.earnings("TEST", earnings.actual, lookahead=barmerge.lookahead_on))
plot(request.earnings("TEST", earnings.actual, lookahead=barmerge.lookahead_on, gaps=barmerge.gaps_on))`;
  const result = run(points, [0, 10, 20, 30, 40], body);
  expect(result.errors).toEqual([]);
  expect(result.plots.map((plot) => plot.values)).toEqual([
    [null, 2, 2, 3, 3],
    [null, 2, null, 3, null],
    [1, 1, 3, 3, 3],
    [1, null, 3, null, null],
  ]);
  expect(points.map((point) => point.time)).toEqual([30, 10, 10]);
  points[0].value = 9;
  points.push({ time: 20, value: 7 });
  expect(run(points, [20, 30], body).plots[0].values).toEqual([7, 9]);
});
