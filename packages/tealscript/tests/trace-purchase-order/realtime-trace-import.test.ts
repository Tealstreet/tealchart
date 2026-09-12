import { describe, expect, it } from 'vitest';

import { importTradingViewRealtimeTraceLog } from '../../scripts/import-tradingview-realtime-trace.ts';

describe('TradingView realtime trace import', () => {
  it('imports a barstate Pine Logs trace with same-timestamp realtime updates', () => {
    const log = [
      'Info TS_TRACE_V1 schema=1 kind=barstate declaredVersion=6 traceSession=session_001 script=tradingview-realtime-barstate-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=0 barIndex=100 time=1767225600000 timeClose=1767225660000 timenow=1767225601000 open=100 high=101 low=99 close=100 volume=1000 isnew=1 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0',
      'Info TS_TRACE_V1 schema=1 kind=barstate declaredVersion=6 traceSession=session_001 script=tradingview-realtime-barstate-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=1 barIndex=100 time=1767225600000 timeClose=1767225660000 timenow=1767225604000 open=100 high=102 low=99 close=101 volume=1500 isnew=0 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0',
      'Info TS_TRACE_V1 schema=1 kind=barstate declaredVersion=6 traceSession=session_001 script=tradingview-realtime-barstate-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=0 barIndex=101 time=1767225660000 timeClose=1767225720000 timenow=1767225661000 open=101 high=103 low=100 close=102 volume=1200 isnew=1 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0',
      'Info TS_TRACE_V1 schema=1 kind=barstate declaredVersion=6 traceSession=session_001 script=tradingview-realtime-barstate-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=0 barIndex=99 time=1767225540000 timeClose=1767225600000 timenow=1767225661000 open=99 high=100 low=98 close=100 volume=900 isnew=0 isrealtime=0 isconfirmed=1 islast=0 islastconfirmedhistory=1',
    ].join('\n');

    const trace = importTradingViewRealtimeTraceLog(log, { kind: 'barstate', sourceLog: 'pine-logs.txt' });

    expect(trace.kind).toBe('barstate');
    expect(trace.context).toEqual({
      declaredVersion: 6,
      traceSession: 'session_001',
      symbol: 'NASDAQ:AAPL',
      timeframe: '1',
      chartSession: 'regular',
      timezone: 'America/New_York',
    });
    expect(trace.coverage).toEqual({
      observations: 4,
      sameTimestampUpdateGroups: 1,
      uniqueBarTimes: 3,
      sawRealtime: true,
      sawNewBar: true,
      sawLastConfirmedHistory: true,
      sawTimenowChange: true,
    });
    expect(trace.observations.map((observation) => observation.updateSeq)).toEqual([0, 1, 0, 0]);
    expect(trace.observations[1]!.close).toBe(101);
  });

  it('imports a timenow Pine Logs trace across reload or live update', () => {
    const log = [
      'TS_TRACE_V1 schema=1 kind=timenow declaredVersion=6 traceSession=session_002 script=tradingview-timenow-trace-v1 symbol=BINANCE:BTCUSDT timeframe=1 chartSession=24x7 timezone=Etc/UTC updateSeq=0 barIndex=200 time=1767225600000 timeClose=1767225660000 timenow=1767225601000 open=100 high=101 low=99 close=100 volume=1000 isnew=1 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0',
      'TS_TRACE_V1 schema=1 kind=timenow declaredVersion=6 traceSession=session_002 script=tradingview-timenow-trace-v1 symbol=BINANCE:BTCUSDT timeframe=1 chartSession=24x7 timezone=Etc/UTC updateSeq=1 barIndex=200 time=1767225600000 timeClose=1767225660000 timenow=1767225610000 open=100 high=102 low=99 close=101 volume=1500 isnew=0 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0',
    ].join('\n');

    const trace = importTradingViewRealtimeTraceLog(log, { kind: 'timenow' });

    expect(trace.kind).toBe('timenow');
    expect(trace.coverage.sawTimenowChange).toBe(true);
    expect(trace.observations.map((observation) => observation.timenow)).toEqual([1767225601000, 1767225610000]);
  });

  it('imports a varip replacement trace with paired var and varip state', () => {
    const log = [
      'TS_TRACE_V1 schema=1 kind=varip declaredVersion=6 traceSession=session_004 script=tradingview-varip-replacement-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=0 barIndex=300 time=1767225600000 timeClose=1767225660000 timenow=1767225601000 open=100 high=101 low=99 close=100 volume=1000 isnew=1 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0 varScalar=1 varipScalar=1 varArraySize=1 varipArraySize=1',
      'TS_TRACE_V1 schema=1 kind=varip declaredVersion=6 traceSession=session_004 script=tradingview-varip-replacement-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=1 barIndex=300 time=1767225600000 timeClose=1767225660000 timenow=1767225604000 open=100 high=102 low=99 close=101 volume=1500 isnew=0 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0 varScalar=2 varipScalar=2 varArraySize=2 varipArraySize=2',
      'TS_TRACE_V1 schema=1 kind=varip declaredVersion=6 traceSession=session_004 script=tradingview-varip-replacement-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=2 barIndex=300 time=1767225600000 timeClose=1767225660000 timenow=1767225607000 open=100 high=103 low=99 close=102 volume=2000 isnew=0 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0 varScalar=2 varipScalar=3 varArraySize=2 varipArraySize=3',
    ].join('\n');

    const trace = importTradingViewRealtimeTraceLog(log, { kind: 'varip' });

    expect(trace.kind).toBe('varip');
    expect(trace.coverage.sameTimestampUpdateGroups).toBe(1);
    expect(trace.observations.map((observation) => observation.varipScalar)).toEqual([1, 2, 3]);
    expect(trace.observations.map((observation) => observation.varipArraySize)).toEqual([1, 2, 3]);
  });

  it('rejects a barstate trace that lacks repeated same-timestamp updates', () => {
    const log = [
      'TS_TRACE_V1 schema=1 kind=barstate declaredVersion=6 traceSession=session_003 script=tradingview-realtime-barstate-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=0 barIndex=100 time=1767225600000 timeClose=1767225660000 timenow=1767225601000 open=100 high=101 low=99 close=100 volume=1000 isnew=1 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=0',
      'TS_TRACE_V1 schema=1 kind=barstate declaredVersion=6 traceSession=session_003 script=tradingview-realtime-barstate-trace-v1 symbol=NASDAQ:AAPL timeframe=1 chartSession=regular timezone=America/New_York updateSeq=0 barIndex=101 time=1767225660000 timeClose=1767225720000 timenow=1767225661000 open=101 high=103 low=100 close=102 volume=1200 isnew=1 isrealtime=1 isconfirmed=0 islast=1 islastconfirmedhistory=1',
    ].join('\n');

    expect(() => importTradingViewRealtimeTraceLog(log, { kind: 'barstate' })).toThrow(
      'Barstate trace must include repeated same-timestamp realtime updates.',
    );
  });
});
