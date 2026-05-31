import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const chartBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_000_060_000, open: 100, high: 102, low: 99, close: 101, volume: 110 },
  { time: 1_700_000_120_000, open: 101, high: 103, low: 100, close: 102, volume: 120 },
  { time: 1_700_000_180_000, open: 102, high: 104, low: 101, close: 103, volume: 130 },
  { time: 1_700_000_240_000, open: 103, high: 105, low: 102, close: 104, volume: 140 },
  { time: 1_700_000_300_000, open: 104, high: 106, low: 103, close: 105, volume: 150 },
];

const requestedBars: Bar[] = [
  { time: 1_700_000_000_000, open: 11, high: 15, low: 9, close: 10, volume: 1_000 },
  { time: 1_700_000_120_000, open: 21, high: 25, low: 19, close: 20, volume: 1_100 },
  { time: 1_700_000_240_000, open: 31, high: 35, low: 29, close: 30, volume: 1_200 },
];

function requestDatafeed(calcBarsCount?: number): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    {
      symbol: 'BTCUSDT',
      timeframe: '2',
      bars: calcBarsCount === undefined ? requestedBars : requestedBars.slice(-calcBarsCount),
      syminfo: { ticker: 'BTCUSDT', timezone: 'Etc/UTC' },
    },
  ]);
}

describe('Pine request.security compatibility', () => {
  it('merges same-symbol higher timeframe values with default confirmed lookahead-off semantics', () => {
    const result = runCompatScript(`
indicator("HTF request")
htfClose = request.security(syminfo.tickerid, "2", close)
plot(htfClose, title="HTF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([null, null, 10, 10, 20, 20]);
  });

  it('supports lookahead and gaps barmerge modes', () => {
    const result = runCompatScript(`
indicator("HTF request modes")
lookahead = request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on)
confirmedGaps = request.security(syminfo.tickerid, "2", close, gaps=barmerge.gaps_on)
lookaheadGaps = request.security(syminfo.tickerid, "2", close, gaps=barmerge.gaps_on, lookahead=barmerge.lookahead_on)
plot(lookahead, title="Lookahead")
plot(confirmedGaps, title="Confirmed Gaps")
plot(lookaheadGaps, title="Lookahead Gaps")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Lookahead').values).toEqual([10, 10, 20, 20, 30, 30]);
    expect(getPlot(result, 'Confirmed Gaps').values).toEqual([null, null, 10, null, 20, null]);
    expect(getPlot(result, 'Lookahead Gaps').values).toEqual([10, null, 20, null, 30, null]);
  });

  it('evaluates request expressions inside the requested context', () => {
    const result = runCompatScript(`
indicator("HTF expression")
htfAverage = request.security(syminfo.tickerid, "2", ta.sma(close, 2), lookahead=barmerge.lookahead_on)
plot(htfAverage, title="HTF Average")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Average').values).toEqual([null, null, 15, 15, 25, 25]);
  });

  it('does not reuse cached values across conditional request expressions', () => {
    const result = runCompatScript(`
indicator("HTF conditional requests")
value = bar_index % 2 == 0 ?
    request.security(syminfo.tickerid, "2", close, lookahead=barmerge.lookahead_on) :
    request.security(syminfo.tickerid, "2", open, lookahead=barmerge.lookahead_on)
plot(value, title="Conditional")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Conditional').values).toEqual([10, 11, 20, 21, 30, 31]);
  });

  it('passes calc_bars_count to the request datafeed', () => {
    const result = runCompatScript(`
indicator("HTF calc bars")
htfClose = request.security(syminfo.tickerid, "2", close, calc_bars_count=2)
plot(htfClose, title="HTF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HTF Close').values).toEqual([null, null, null, null, 20, 20]);
  });

  it('supports ignore_invalid_symbol for missing fixture contexts', () => {
    const result = runCompatScript(`
indicator("HTF ignore missing")
missing = request.security("MISSING", "2", close, ignore_invalid_symbol=true)
plot(missing, title="Missing")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Missing').values).toEqual([null, null, null, null, null, null]);
  });

  it('reports a missing host datafeed explicitly', () => {
    const result = runCompatScript(`
indicator("HTF no datafeed")
plot(request.security(syminfo.tickerid, "2", close), title="HTF Close")
`, { bars: [chartBars[0]!] });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.security requires a request datafeed',
    ]);
  });

  it('reports missing request contexts when ignore_invalid_symbol is false', () => {
    const result = runCompatScript(`
indicator("HTF missing")
plot(request.security("MISSING", "2", close), title="Missing")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: requestDatafeed() },
    });

    expect(result.errors.map((error) => error.message)).toEqual([
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
      'request.security failed: No request data context for MISSING 2',
    ]);
  });
});
