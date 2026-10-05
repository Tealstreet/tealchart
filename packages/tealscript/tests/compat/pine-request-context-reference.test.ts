import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority: pine-v6-reference-v1.json (2026-10-03); independently derived values.
// All six cases failed under lookahead-selection or intrabar-order mutations,
// then passed after restoring execute.ts.
const start = Date.UTC(2026, 8, 28);
const minute = 60_000;
function bars(points: Array<[number, number]>): Bar[] {
  return points.map(([offset, close]) => ({
    time: start + offset * minute,
    open: close - 3 - offset,
    high: close + 7,
    low: close - 12,
    close,
    volume: 100,
  }));
}

const chartBars = bars([[0, 101], [1, 92], [2, 117], [3, 84], [4, 109], [5, 96]]);
const requestedBars = bars([[0, 37], [2, -8], [4, 21]]);
function run(source: string, datafeed = new InMemoryRequestDatafeed([
  { symbol: 'REMOTE:ALT', timeframe: '2', bars: requestedBars },
])) {
  return runCompatScript(`//@version=6\nindicator("Reference request context")\n${source}`, {
    bars: chartBars,
    engineOptions: {
      requestDatafeed: datafeed,
      runtime: {
        syminfo: { ticker: 'HOME', tickerid: 'LOCAL:HOME', timezone: 'Etc/UTC' },
        timeframe: { period: '1', isintraday: true, isminutes: true },
      },
    },
  });
}

describe('documented request context contracts', () => {
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security
  // Historical lookahead_on selects the active HTF value; gaps_on emits once.
  // Signed zigzags reject cumulative extrema and chart-source reuse.
  it.each([
    ['barmerge.gaps_off', [37, 37, -8, -8, 21, 21]],
    ['barmerge.gaps_on', [37, null, -8, null, 21, null]],
  ] as const)('merges historical lookahead_on with %s', (gaps, expected) => {
    const result = run(`plot(request.security("REMOTE:ALT", "2", close, gaps=${gaps}, lookahead=barmerge.lookahead_on), "Value")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual(expected);
  });

  // request.security lookahead parameter explicitly describes close[1].
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security
  // Rejects shifting merged chart bars instead of requested-context history.
  it('offsets history in the requested timeframe before merging', () => {
    const result = run('plot(request.security("REMOTE:ALT", "2", close[1], lookahead=barmerge.lookahead_on), "Previous")');
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Previous').values).toEqual([null, null, 37, 37, -8, -8]);
  });

  // request.security expression parameter allows tuples and computed expressions.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security
  // Rejects tuple transposition, chart evaluation, and arithmetic on merged inputs.
  it('evaluates tuple arithmetic and SMA on requested bars', () => {
    const result = run(`[delta, average] = request.security("REMOTE:ALT", "2", [close - open, ta.sma(close, 2)], lookahead=barmerge.lookahead_on)
plot(delta, "Delta")
plot(average, "Average")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Delta').values).toEqual([3, 3, 5, 5, 7, 7]);
    expect(getPlot(result, 'Average').values).toEqual([null, null, 14.5, 14.5, 6.5, 6.5]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#var_syminfo.main_tickerid
  // https://www.tradingview.com/pine-script-reference/v6/#var_syminfo.tickerid
  // https://www.tradingview.com/pine-script-reference/v6/#var_timeframe.period
  it('preserves the main ticker while switching requested ticker and period', () => {
    const result = run(`identity = request.security("REMOTE:ALT", "2", syminfo.tickerid == "REMOTE:ALT" and syminfo.main_tickerid == "LOCAL:HOME" and timeframe.period == "2", lookahead=barmerge.lookahead_on)
plot(identity ? 1 : 0, "Identity")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Identity').values).toEqual([1, 1, 1, 1, 1, 1]);
  });

  // https://www.tradingview.com/pine-script-reference/v6/#fun_request.security_lower_tf
  // One chronological array per tuple item. Distinct slots reject sorting,
  // truncation, padding, and inclusion of the next chart bar's intrabar.
  it('collects every available intrabar in chronological tuple arrays', () => {
    const datafeed = new InMemoryRequestDatafeed([{ symbol: 'REMOTE:ALT', timeframe: '1',
      bars: bars([[0, 41], [1, -9], [2, 16], [3, 7], [5, -12], [6, 99], [7, 5], [8, 23]]),
    }]);
    const result = runCompatScript(`//@version=6
indicator("Intrabar order")
[values, deltas] = request.security_lower_tf("REMOTE:ALT", "1", [close, close - open])
plot(array.size(values), "Count")
plot(array.size(values) > 0 ? array.get(values, 0) : na, "First")
plot(array.size(values) > 1 ? array.get(values, 1) : na, "Second")
plot(array.size(values) > 2 ? array.get(values, 2) : na, "Third")
plot(array.size(deltas), "Delta count")
plot(array.size(deltas) > 0 ? array.get(deltas, 0) : na, "Delta")`, {
      bars: bars([[0, 100], [3, 200], [6, 300]]),
      engineOptions: { requestDatafeed: datafeed, runtime: { timeframe: { period: '3' } } },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Count').values).toEqual([3, 2, 3]);
    expect(getPlot(result, 'First').values).toEqual([41, 7, 99]);
    expect(getPlot(result, 'Second').values).toEqual([-9, -12, 5]);
    expect(getPlot(result, 'Third').values).toEqual([16, null, 23]);
    expect(getPlot(result, 'Delta count').values).toEqual([3, 2, 3]);
    expect(getPlot(result, 'Delta').values).toEqual([3, 6, 9]);
  });
});
