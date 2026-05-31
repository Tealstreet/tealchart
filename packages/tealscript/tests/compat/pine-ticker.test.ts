import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed, type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const chartBars: Bar[] = [
  { time: 1_700_000_000_000, open: 100, high: 101, low: 99, close: 100, volume: 100 },
  { time: 1_700_000_060_000, open: 101, high: 102, low: 100, close: 101, volume: 110 },
  { time: 1_700_000_120_000, open: 102, high: 103, low: 101, close: 102, volume: 120 },
];

function sessionRequestDatafeed(): InMemoryRequestDatafeed {
  return new InMemoryRequestDatafeed([
    {
      symbol: 'NASDAQ:AAPL',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 180, high: 182, low: 179, close: 181, volume: 900 },
        { time: 1_700_000_060_000, open: 181, high: 183, low: 180, close: 182, volume: 950 },
        { time: 1_700_000_120_000, open: 182, high: 184, low: 181, close: 183, volume: 980 },
      ],
      syminfo: { ticker: 'NASDAQ:AAPL', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL|session=extended',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 200, high: 202, low: 199, close: 201, volume: 1_000 },
        { time: 1_700_000_060_000, open: 201, high: 203, low: 200, close: 202, volume: 1_100 },
        { time: 1_700_000_120_000, open: 202, high: 204, low: 201, close: 203, volume: 1_200 },
      ],
      syminfo: { ticker: 'NASDAQ:AAPL|session=extended', timezone: 'Etc/UTC' },
    },
  ]);
}

describe('Pine ticker compatibility', () => {
  it('constructs regular and extended session ticker identifiers', () => {
    const result = runCompatScript(`
indicator("Session ticker constructors")
regularFromNew = ticker.new("NASDAQ", "AAPL")
regularExplicit = ticker.new("NASDAQ", "AAPL", session.regular)
extendedFromNew = ticker.new("NASDAQ", "AAPL", session.extended)
extendedFromModify = ticker.modify("NASDAQ:AAPL", session=session.extended)
regularFromModify = ticker.modify(extendedFromModify, session=session.regular)
plot(str.length(regularFromNew), title="Regular New")
plot(str.length(regularExplicit), title="Regular Explicit")
plot(str.length(extendedFromNew), title="Extended New")
plot(str.length(extendedFromModify), title="Extended Modify")
plot(str.length(regularFromModify), title="Regular Modify")
`, { bars: [chartBars[0]!] });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Regular New').values).toEqual([11]);
    expect(getPlot(result, 'Regular Explicit').values).toEqual([11]);
    expect(getPlot(result, 'Extended New').values).toEqual([28]);
    expect(getPlot(result, 'Extended Modify').values).toEqual([28]);
    expect(getPlot(result, 'Regular Modify').values).toEqual([11]);
  });

  it('passes session-modified ticker IDs through request.security', () => {
    const result = runCompatScript(`
indicator("Extended session request")
extendedTicker = ticker.new("NASDAQ", "AAPL", session.extended)
extendedClose = request.security(extendedTicker, "1", close, lookahead=barmerge.lookahead_on)
plot(extendedClose, title="Extended Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: sessionRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Extended Close').values).toEqual([201, 202, 203]);
  });

  it('requests deterministic Heikin-Ashi close data from a base ticker context', () => {
    const result = runCompatScript(`
indicator("Heikin-Ashi close request")
haTicker = ticker.heikinashi("NASDAQ:AAPL")
haClose = request.security(haTicker, "1", close, lookahead=barmerge.lookahead_on)
plot(haClose, title="HA Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: sessionRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HA Close').values).toEqual([180.5, 181.5, 182.5]);
  });

  it('requests Heikin-Ashi OHLC tuples while preserving session modifiers', () => {
    const result = runCompatScript(`
indicator("Heikin-Ashi OHLC request")
regularTicker = ticker.new("NASDAQ", "AAPL", session.extended)
haTicker = ticker.heikinashi(regularTicker)
[haO, haH, haL, haC] = request.security(haTicker, "1", [open, high, low, close], lookahead=barmerge.lookahead_on)
plot(haO, title="HA Open")
plot(haH, title="HA High")
plot(haL, title="HA Low")
plot(haC, title="HA Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: sessionRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'HA Open').values).toEqual([200.5, 200.5, 201]);
    expect(getPlot(result, 'HA High').values).toEqual([202, 203, 204]);
    expect(getPlot(result, 'HA Low').values).toEqual([199, 200, 201]);
    expect(getPlot(result, 'HA Close').values).toEqual([200.5, 201.5, 202.5]);
  });
});
