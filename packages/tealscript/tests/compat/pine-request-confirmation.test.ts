import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const start = Date.UTC(2026, 0, 1);
const minute = 60_000;

function bar(offset: number, close: number): Bar {
  return { time: start + offset * minute, open: close, high: close, low: close, close, volume: 1 };
}

const chartBars = Array.from({ length: 9 }, (_, i) => bar(i * 2, i + 100));
const requestedBars = [bar(0, 10), bar(6, 20), bar(12, 30)];

function run(source: string, bars = chartBars, requested = requestedBars, realtimeLastBar = false) {
  return runCompatScript(`//@version=6\nindicator("Request confirmation")\n${source}`, {
    bars,
    engineOptions: {
      runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
      realtimeLastBar: realtimeLastBar ? { isNew: true } : undefined,
      requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'TEST', timeframe: '6', bars: requested },
        { symbol: 'TEST', timeframe: '2', bars },
        { symbol: 'TEST', timeframe: '1', bars: Array.from({ length: 18 }, (_, i) => bar(i, i)) },
      ]),
    },
  });
}

describe('Requested bar closing-time confirmation', () => {
  it('publishes historical HTF closes on the chart bar that closes the period, including the final requested bar', () => {
    const result = run('plot(request.security("TEST", "6", close), title="Close")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual([null, null, 10, 10, 10, 20, 20, 20, 30]);
  });

  it('publishes gaps-on values only when a new requested bar closes', () => {
    const result = run('plot(request.security("TEST", "6", close, gaps=barmerge.gaps_on), title="Close")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual([null, null, 10, null, null, 20, null, null, 30]);
  });

  it('publishes requested expression holes at the same confirmation boundary', () => {
    const result = run(`
plot(request.security("TEST", "6", bar_index == 1 ? na : close), title="Filled")
plot(request.security("TEST", "6", bar_index == 1 ? na : close, gaps=barmerge.gaps_on), title="Sparse")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Filled').values).toEqual([null, null, 10, 10, 10, null, null, null, 30]);
    expect(getPlot(result, 'Sparse').values).toEqual([null, null, 10, null, null, null, null, null, 30]);
  });

  it('retains first-chart-bar prehistory publication for gaps-on', () => {
    const result = run('plot(request.security("TEST", "6", close, gaps=barmerge.gaps_on), title="Close")', chartBars, [bar(-6, 5), ...requestedBars]);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual([5, null, 10, null, null, 20, null, null, 30]);
  });

  it('confirms a requested bar even when the next requested opening is absent', () => {
    const result = run('plot(request.security("TEST", "6", close, gaps=barmerge.gaps_on), title="Close")', chartBars, [bar(0, 10), bar(12, 30)]);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual([null, null, 10, null, null, null, null, null, 30]);
  });

  it('does not confirm early across missing chart bars', () => {
    const result = run('plot(request.security("TEST", "6", close, gaps=barmerge.gaps_on), title="Close")', [bar(0, 100), bar(8, 101), bar(10, 102), bar(12, 103)]);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual([null, 10, 20, null]);
  });

  it('keeps historical lookahead-on values at requested openings', () => {
    const result = run(`
plot(request.security("TEST", "6", close, lookahead=barmerge.lookahead_on), title="Filled")
plot(request.security("TEST", "6", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on), title="Sparse")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Filled').values).toEqual([10, 10, 10, 20, 20, 20, 30, 30, 30]);
    expect(getPlot(result, 'Sparse').values).toEqual([10, null, null, 20, null, null, 30, null, null]);
  });

  it('keeps realtime unconfirmed values on the active requested bar', () => {
    const result = run('plot(request.security("TEST", "6", close), title="Close")', chartBars.slice(0, 4), requestedBars, true);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Close').values).toEqual([null, null, 10, 20]);
  });

  it('keeps same-timeframe and lower-timeframe selection unchanged', () => {
    const result = run(`
plot(request.security("TEST", "2", close), title="Same")
plot(request.security("TEST", "1", close), title="Lower last")
plot(request.security("TEST", "1", close, lookahead=barmerge.lookahead_on), title="Lower first")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Same').values).toEqual(chartBars.map(b => b.close));
    expect(getPlot(result, 'Lower last').values).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17]);
    expect(getPlot(result, 'Lower first').values).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16]);
  });

  it('evaluates requested time_close and its history in requested milliseconds', () => {
    const result = run(`
[end, previousEnd] = request.security("TEST", "6", [time_close, time_close[1]], lookahead=barmerge.lookahead_on)
plot(end, title="End")
plot(previousEnd, title="Previous end")
plot(request.security("TEST", "6", time_close), title="Confirmed end")`);
    expect(result.errors).toEqual([]);
    const end6 = start + 6 * minute;
    const end12 = start + 12 * minute;
    const end18 = start + 18 * minute;
    expect(getPlot(result, 'End').values).toEqual([end6, end6, end6, end12, end12, end12, end18, end18, end18]);
    expect(getPlot(result, 'Previous end').values).toEqual([null, null, null, end6, end6, end6, end12, end12, end12]);
    expect(getPlot(result, 'Confirmed end').values).toEqual([null, null, end6, end6, end6, end12, end12, end12, end18]);
  });

  it('uses the enclosing requested bar close for nested HTF confirmation', () => {
    const result = run(`
value = request.security("TEST", "2", request.security("TEST", "6", close), lookahead=barmerge.lookahead_on)
plot(value, title="Nested")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Nested').values).toEqual([null, null, 10, 10, 10, 20, 20, 20, 30]);
  });

  it('sizes a dynamic requested calendar history offset from requested bars', () => {
    const result = run(`
offset = bar_index < 2 ? 1 : 2
plot(request.security("TEST", "6", time_close[offset], lookahead=barmerge.lookahead_on), title="Previous end")`);
    expect(result.errors).toEqual([]);
    // Requested indices0/1 use offset1; index2 uses offset2. Chart indices
    // advance three times faster and must not determine the history offset.
    expect(getPlot(result, 'Previous end').values).toEqual([
      null, null, null, start + 6 * minute, start + 6 * minute, start + 6 * minute,
      start + 6 * minute, start + 6 * minute, start + 6 * minute,
    ]);
  });

  it('retains requested history when an explicit declaration sizes the buffer', () => {
    const result = runCompatScript(`//@version=6
indicator("Sized requested history", max_bars_back=2)
plot(request.security("TEST", "6", time_close[1], lookahead=barmerge.lookahead_on), title="Previous end")`, {
      bars: chartBars,
      engineOptions: {
        runtime: { timeframe: { period: '2' }, syminfo: { tickerid: 'TEST', timezone: 'Etc/UTC' } },
        requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '6', bars: requestedBars }]),
      },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Previous end').values).toEqual([
      null, null, null, start + 6 * minute, start + 6 * minute, start + 6 * minute,
      start + 12 * minute, start + 12 * minute, start + 12 * minute,
    ]);
  });
});
