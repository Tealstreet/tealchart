import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const bar = { time: 60_000, open: 10, high: 11, low: 9, close: 10, volume: 100 };

function requestedClose(sourceId: string, options: string, requestedId: string, session: string) {
  const datafeed = new InMemoryRequestDatafeed([
    { symbol: requestedId, timeframe: '1', bars: [{ ...bar, open: 37, high: 39, low: 35, close: 37 }] },
  ]);
  const execution = executeCompiledScript(parse(`//@version=6
indicator("Ticker defaults")
modified = ticker.modify("${sourceId}"${options})
plot(request.security(modified, "1", close, lookahead=barmerge.lookahead_on))`), [bar], undefined, {
    requestDatafeed: datafeed, runtime: { syminfo: { session }, timeframe: { period: '1' } },
  });
  if (execution.status !== 'success') throw new Error(execution.reason);
  expect(execution.result.errors).toEqual([]);
  return execution.result.plots[0].values;
}

// fun_ticker.modify params: omitted session uses chart session, adjustment uses the instrument default.
describe('ticker.modify documented defaults at the provider boundary', () => {
  it('uses the chart extended session when the source ID has no session modifier', () => {
    expect(requestedClose('TEST', '', 'TEST|session=extended', 'extended')).toEqual([37]);
  });

  it('uses the chart regular session instead of inheriting the source extended session', () => {
    expect(requestedClose('TEST|session=extended', '', 'TEST', 'regular')).toEqual([37]);
  });

  it('leaves omitted adjustment to the provider instrument default', () => {
    expect(requestedClose('TEST|adjustment=dividends', '', 'TEST', 'regular')).toEqual([37]);
  });

  it.each(['', ', backadjustment=backadjustment.inherit, settlement_as_close=settlement_as_close.inherit'])
    ('inherits existing futures settings with options %s', (options) => {
      expect(requestedClose('TEST|backadjustment=on|settlement_as_close=off', options,
        'TEST|backadjustment=on|settlement_as_close=off', 'regular')).toEqual([37]);
    });

  it('leaves inherited settings to the provider default when the source has none', () => {
    expect(requestedClose('TEST', ', backadjustment=backadjustment.inherit, settlement_as_close=settlement_as_close.inherit',
      'TEST', 'regular')).toEqual([37]);
  });
});
