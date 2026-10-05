import { describe, expect, it } from 'vitest';

import { InMemoryRequestDatafeed } from '../../src/runtime';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ledger31 ticker session default', () => {
  it('ticker.new omitted session uses the chart session, rank1204', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Ticker session default")
implicit = ticker.new("NASDAQ", "AAPL")
explicit = ticker.new("NASDAQ", "AAPL", session.extended)
regular = ticker.new("NASDAQ", "AAPL", session.regular)
plot(implicit == explicit ? 1 : 0, title="Inherited")
plot(implicit == regular ? 1 : 0, title="Distinct")`,
      {
        bars: compatibilityBars.slice(0, 1),
        engineOptions: { runtime: { syminfo: { session: 'extended' } } },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Inherited').values).toEqual([1]);
    expect(getPlot(result, 'Distinct').values).toEqual([0]);
  });
  it('ticker.new omitted session uses requested symbol metadata, rank1204', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Requested ticker session default")
[inherited, distinct] = request.security("OUTER", "6", [
    ticker.new("NASDAQ", "AAPL") == ticker.new("NASDAQ", "AAPL", session.extended) ? 1 : 0,
    ticker.new("NASDAQ", "AAPL") == ticker.new("NASDAQ", "AAPL", session.regular) ? 1 : 0],
    lookahead=barmerge.lookahead_on)
plot(inherited, title="Inherited")
plot(distinct, title="Distinct")`,
      {
        bars: compatibilityBars.slice(0, 1),
        engineOptions: {
          runtime: { timeframe: { period: '2' }, syminfo: { session: 'regular' } },
          requestDatafeed: new InMemoryRequestDatafeed([
            { symbol: 'OUTER', timeframe: '6', bars: compatibilityBars.slice(0, 1), syminfo: { session: 'extended' } },
          ]),
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Inherited').values).toEqual([1]);
    expect(getPlot(result, 'Distinct').values).toEqual([0]);
  });
});
