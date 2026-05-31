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
    {
      symbol: 'NASDAQ:AAPL|session=extended|adjustment=splits|backadjustment=on|settlement_as_close=off',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 300, high: 302, low: 299, close: 301, volume: 2_000 },
        { time: 1_700_000_060_000, open: 301, high: 303, low: 300, close: 302, volume: 2_100 },
        { time: 1_700_000_120_000, open: 302, high: 304, low: 301, close: 303, volume: 2_200 },
      ],
      syminfo: {
        ticker: 'NASDAQ:AAPL|session=extended|adjustment=splits|backadjustment=on|settlement_as_close=off',
        timezone: 'Etc/UTC',
      },
    },
    {
      symbol: 'NASDAQ:MSFT|session=extended|adjustment=dividends',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 300, high: 306, low: 294, close: 302, volume: 3_000 },
        { time: 1_700_000_060_000, open: 302, high: 308, low: 296, close: 304, volume: 3_100 },
        { time: 1_700_000_120_000, open: 304, high: 310, low: 298, close: 306, volume: 3_200 },
      ],
      syminfo: { ticker: 'NASDAQ:MSFT|session=extended|adjustment=dividends', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL|chart=renko:ATR:10',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 180, high: 182, low: 178, close: 182, volume: 1 },
        { time: 1_700_000_060_000, open: 182, high: 184, low: 182, close: 184, volume: 1 },
        { time: 1_700_000_120_000, open: 184, high: 184, low: 182, close: 182, volume: 1 },
      ],
      syminfo: { ticker: 'NASDAQ:AAPL|chart=renko:ATR:10', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL|chart=linebreak:3',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 210, high: 212, low: 209, close: 211, volume: 1 },
        { time: 1_700_000_060_000, open: 211, high: 213, low: 210, close: 212, volume: 1 },
        { time: 1_700_000_120_000, open: 212, high: 214, low: 211, close: 213, volume: 1 },
      ],
      syminfo: { ticker: 'NASDAQ:AAPL|chart=linebreak:3', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL|chart=kagi:ATR:10',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 220, high: 223, low: 219, close: 222, volume: 1 },
        { time: 1_700_000_060_000, open: 222, high: 225, low: 221, close: 224, volume: 1 },
        { time: 1_700_000_120_000, open: 224, high: 226, low: 222, close: 223, volume: 1 },
      ],
      syminfo: { ticker: 'NASDAQ:AAPL|chart=kagi:ATR:10', timezone: 'Etc/UTC' },
    },
    {
      symbol: 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3',
      timeframe: '1',
      bars: [
        { time: 1_700_000_000_000, open: 230, high: 235, low: 230, close: 235, volume: 1 },
        { time: 1_700_000_060_000, open: 235, high: 240, low: 235, close: 240, volume: 1 },
        { time: 1_700_000_120_000, open: 240, high: 240, low: 235, close: 235, volume: 1 },
      ],
      syminfo: { ticker: 'NASDAQ:AAPL|chart=pointfigure:hl:ATR:14:3', timezone: 'Etc/UTC' },
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

  it('propagates ticker modifiers through request.security and standardizes modified IDs', () => {
    const result = runCompatScript(`
indicator("Ticker modifier request")
modifiedTicker = ticker.modify(
     "NASDAQ:AAPL",
     session=session.extended,
     adjustment=adjustment.splits,
     backadjustment=backadjustment.on,
     settlement_as_close=settlement_as_close.off)
standardTicker = ticker.standard(modifiedTicker)
modifiedClose = request.security(modifiedTicker, "1", close, lookahead=barmerge.lookahead_on)
standardClose = request.security(standardTicker, "1", close, lookahead=barmerge.lookahead_on)
plot(modifiedClose, title="Modified Close")
plot(standardClose, title="Standard Close")
plot(str.length(modifiedTicker), title="Modified ID Length")
plot(str.length(standardTicker), title="Standard ID Length")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: sessionRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Modified Close').values).toEqual([301, 302, 303]);
    expect(getPlot(result, 'Standard Close').values).toEqual([181, 182, 183]);
    expect(getPlot(result, 'Modified ID Length').values).toEqual([88, 88, 88]);
    expect(getPlot(result, 'Standard ID Length').values).toEqual([11, 11, 11]);
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

  it('inherits session, adjustment, and chart modifiers for another symbol', () => {
    const result = runCompatScript(`
indicator("Inherited ticker modifiers")
sourceTicker = ticker.heikinashi(ticker.modify("NASDAQ:AAPL", session.extended, adjustment.dividends))
targetTicker = ticker.inherit(sourceTicker, "NASDAQ:MSFT")
targetClose = request.security(targetTicker, "1", close, lookahead=barmerge.lookahead_on)
plot(targetClose, title="Inherited HA Close")
plot(str.length(ticker.standard(targetTicker)), title="Inherited Standard Length")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: sessionRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Inherited HA Close').values).toEqual([300.5, 302.5, 304.5]);
    expect(getPlot(result, 'Inherited Standard Length').values).toEqual([11, 11, 11]);
  });

  it('passes remaining non-standard ticker IDs through request.security', () => {
    const result = runCompatScript(`
indicator("Non-standard ticker requests")
renkoTicker = ticker.renko("NASDAQ:AAPL", "ATR", 10)
lineBreakTicker = ticker.linebreak("NASDAQ:AAPL", 3)
kagiTicker = ticker.kagi("NASDAQ:AAPL", "ATR", 10)
pnfTicker = ticker.pointfigure("NASDAQ:AAPL", "hl", "ATR", 14, 3)
renkoClose = request.security(renkoTicker, "1", close, lookahead=barmerge.lookahead_on)
lineBreakClose = request.security(lineBreakTicker, "1", close, lookahead=barmerge.lookahead_on)
kagiClose = request.security(kagiTicker, "1", close, lookahead=barmerge.lookahead_on)
[pnfOpen, pnfClose] = request.security(pnfTicker, "1", [open, close], lookahead=barmerge.lookahead_on)
plot(renkoClose, title="Renko Close")
plot(lineBreakClose, title="Line Break Close")
plot(kagiClose, title="Kagi Close")
plot(pnfOpen, title="PnF Open")
plot(pnfClose, title="PnF Close")
`, {
      bars: chartBars,
      engineOptions: { requestDatafeed: sessionRequestDatafeed() },
    });

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Renko Close').values).toEqual([182, 184, 182]);
    expect(getPlot(result, 'Line Break Close').values).toEqual([211, 212, 213]);
    expect(getPlot(result, 'Kagi Close').values).toEqual([222, 224, 223]);
    expect(getPlot(result, 'PnF Open').values).toEqual([230, 235, 240]);
    expect(getPlot(result, 'PnF Close').values).toEqual([235, 240, 235]);
  });
});
