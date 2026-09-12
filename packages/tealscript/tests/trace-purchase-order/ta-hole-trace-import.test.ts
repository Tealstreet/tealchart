import { describe, expect, it } from 'vitest';

import { importTradingViewTaHoleTraceCsv } from '../../scripts/import-tradingview-ta-hole-trace.ts';

describe('TradingView TA hole trace import', () => {
  it('imports TradingView chart-data CSV columns into trace expectations', () => {
    const csv = [
      [
        'time',
        'open',
        'high',
        'low',
        'close',
        'Volume',
        'TealScript TA Hole Trace V1: ts_trace__bar_index',
        'TealScript TA Hole Trace V1: ts_trace__time',
        'TealScript TA Hole Trace V1: ts_trace__open',
        'TealScript TA Hole Trace V1: ts_trace__high',
        'TealScript TA Hole Trace V1: ts_trace__low',
        'TealScript TA Hole Trace V1: ts_trace__close',
        'TealScript TA Hole Trace V1: ts_trace__volume',
        'TealScript TA Hole Trace V1: ts_trace__source',
        'TealScript TA Hole Trace V1: ts_trace__cross_source',
        'TealScript TA Hole Trace V1: ts_trace__cross_reference',
        'TealScript TA Hole Trace V1: ts_trace__vwap_source',
        'TealScript TA Hole Trace V1: ts_trace__stoch_high',
        'TealScript TA Hole Trace V1: ts_trace__stoch_low',
        'TealScript TA Hole Trace V1: ts_trace__ta_crossover',
        'TealScript TA Hole Trace V1: ts_trace__ta_crossunder',
        'TealScript TA Hole Trace V1: ts_trace__ta_cross',
        'TealScript TA Hole Trace V1: ts_trace__ta_bb_basis',
        'TealScript TA Hole Trace V1: ts_trace__ta_bb_upper',
        'TealScript TA Hole Trace V1: ts_trace__ta_bb_lower',
        'TealScript TA Hole Trace V1: ts_trace__ta_rsi',
        'TealScript TA Hole Trace V1: ts_trace__ta_stoch',
        'TealScript TA Hole Trace V1: ts_trace__ta_vwap',
      ].join(','),
      '2026-01-01,10,11,9,10,100,0,1767225600000,10,11,9,10,100,,40,50,,,,0,0,0,,,,,,',
      '2026-01-02,11,12,10,11,110,1,1767312000000,11,12,10,11,110,45,60,50,45,50,40,1,0,1,45,55,35,50,50,45',
      '2026-01-03,12,13,11,12,120,2,1767398400000,12,13,11,12,120,NaN,35,50,NaN,na,na,0,1,1,na,na,na,,0,',
    ].join('\n');

    const trace = importTradingViewTaHoleTraceCsv(csv, {
      sourceCsv: 'synthetic.csv',
      symbol: 'NASDAQ:AAPL',
      timeframe: '1D',
      timezone: 'Etc/UTC',
    });

    expect(trace.context).toEqual({ symbol: 'NASDAQ:AAPL', timeframe: '1D', timezone: 'Etc/UTC' });
    expect(trace.columns.source).toEqual([null, 45, null]);
    expect(trace.columns.crossSource).toEqual([40, 60, 35]);
    expect(trace.columns.stochHigh).toEqual([null, 50, null]);
    expect(trace.columns.stochLow).toEqual([null, 40, null]);
    expect(trace.expectations).toEqual([
      { member: 'ta.crossover', output: 'value', column: 'TealScript TA Hole Trace V1: ts_trace__ta_crossover', values: [0, 1, 0] },
      { member: 'ta.crossunder', output: 'value', column: 'TealScript TA Hole Trace V1: ts_trace__ta_crossunder', values: [0, 0, 1] },
      { member: 'ta.cross', output: 'value', column: 'TealScript TA Hole Trace V1: ts_trace__ta_cross', values: [0, 1, 1] },
      { member: 'ta.bb', output: 'basis', column: 'TealScript TA Hole Trace V1: ts_trace__ta_bb_basis', values: [null, 45, null] },
      { member: 'ta.bb', output: 'upper', column: 'TealScript TA Hole Trace V1: ts_trace__ta_bb_upper', values: [null, 55, null] },
      { member: 'ta.bb', output: 'lower', column: 'TealScript TA Hole Trace V1: ts_trace__ta_bb_lower', values: [null, 35, null] },
      { member: 'ta.rsi', output: 'value', column: 'TealScript TA Hole Trace V1: ts_trace__ta_rsi', values: [null, 50, null] },
      { member: 'ta.stoch', output: 'value', column: 'TealScript TA Hole Trace V1: ts_trace__ta_stoch', values: [null, 50, 0] },
      { member: 'ta.vwap', output: 'value', column: 'TealScript TA Hole Trace V1: ts_trace__ta_vwap', values: [null, 45, null] },
    ]);
  });
});
