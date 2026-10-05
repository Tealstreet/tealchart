import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';
import { bars, provider } from './pine-ledger-gaps-28-request-fixtures';

// Other-timeframes manual nested-requests + reference dividends field domain.
// Provider responses are constructed controls, not certification of TV economics.
describe('ledger1095-1096 nested dividends', () => {
  it('evaluates a dynamic dividends ticker in the outer security context', () => {
    const { feed, queries } = provider();
    const result = runCompatScript(
      `//@version=6
indicator("nested dividends")
plot(request.security("NASDAQ:OUTER", "1", request.dividends(syminfo.tickerid, dividends.gross)), "nested")`,
      {
        bars,
        engineOptions: {
          requestDatafeed: feed,
          runtime: {
            syminfo: { ticker: 'NASDAQ:MAIN', tickerid: 'NASDAQ:MAIN', currency: 'USD' },
            timeframe: { period: '1' },
          },
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'nested').values).toEqual([7, 7, 7]);
    expect(queries.some((q) => q.ticker === 'NASDAQ:OUTER')).toBe(true);
  });
  it.each(['dividends.gross', 'dividends.net'])('accepts field %s and selects its provider value', (field) => {
    const { feed } = provider();
    const source = `//@version=6\nindicator("field")\nplot(request.dividends("NASDAQ:MAIN", ${field}), "out")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = runCompatScript(source, {
      bars,
      engineOptions: { requestDatafeed: feed, runtime: { timeframe: { period: '1' } } },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'out').values).toEqual(Array(3).fill(field === 'dividends.gross' ? 3 : 2));
  });
  it('refuses an invalid literal field', () => {
    expect(
      checkProgram(
        parse('//@version=6\nindicator("field")\nplot(request.dividends("NASDAQ:MAIN", "invalid"))'),
      ).diagnostics.some((d) => d.severity === 'error'),
    ).toBe(true);
  });
  it('applies gaps to corporate events at the requested bar time', () => {
    const { feed } = provider();
    const result = runCompatScript(
      '//@version=6\nindicator("gaps")\nplot(request.security("NASDAQ:OUTER", "1", request.dividends(syminfo.tickerid, dividends.gross, gaps=barmerge.gaps_on)), "out")',
      { bars, engineOptions: { requestDatafeed: feed, runtime: { timeframe: { period: '1' } } } },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'out').values[0]).toBe(7);
    expect(
      getPlot(result, 'out')
        .values.slice(1)
        .every((value) => value === null),
    ).toBe(true);
  });
  it('shares point-series data across repeated requested evaluations', () => {
    const { feed } = provider();
    delete feed.getCorporateAction;
    let calls = 0;
    feed.getSeries = () => {
      calls++;
      return {
        ok: true,
        context: {
          family: 'dividends',
          key: 'synthetic',
          points: [
            { time: bars[0]!.time, value: 11 },
            { time: bars[2]!.time, value: 13 },
          ],
        },
      };
    };
    const result = runCompatScript(
      '//@version=6\nindicator("points")\nplot(request.dividends("NASDAQ:SHARED", dividends.gross), "root")\nplot(request.security("NASDAQ:OUTER", "1", request.dividends("NASDAQ:SHARED", dividends.gross)), "out")\nplot(request.security("NASDAQ:SECOND", "1", request.dividends("NASDAQ:SHARED", dividends.gross)), "second")',
      { bars, engineOptions: { requestDatafeed: feed, runtime: { timeframe: { period: '1' } } } },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'root').values).toEqual([11, 11, 13]);
    expect(getPlot(result, 'out').values).toEqual([11, 11, 13]);
    expect(getPlot(result, 'second').values).toEqual([11, 11, 13]);
    expect(calls).toBe(1);
  });
  it.each([false, true])('preserves invalid-symbol policy inside requests: ignore=%s', (ignore) => {
    const { feed } = provider();
    delete feed.getCorporateAction;
    feed.getSeries = () => ({ ok: false, code: 'invalid_symbol', message: 'constructed invalid ticker' });
    const result = runCompatScript(
      `//@version=6\nindicator("invalid")\nplot(request.security("NASDAQ:OUTER", "1", request.dividends(syminfo.tickerid, dividends.gross, ignore_invalid_symbol=${ignore})), "out")`,
      { bars, engineOptions: { requestDatafeed: feed, runtime: { timeframe: { period: '1' } } } },
    );
    if (ignore) {
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'out').values.every((value) => value === null)).toBe(true);
    } else {
      expect(result.errors.some((error) => error.message.includes('constructed invalid ticker'))).toBe(true);
    }
  });
  it('charges nested dividends to the script-wide unique-request budget', () => {
    const manyBars = Array.from({ length: 45 }, (_, i) => ({ ...bars[0]!, time: bars[0]!.time + i * 60000 }));
    const { feed } = provider();
    feed.getBars = (query) => ({
      ok: true,
      context: { symbol: query.symbol, timeframe: query.timeframe, bars: manyBars },
    });
    const result = runCompatScript(
      '//@version=6\nindicator("budget")\nplot(request.security("NASDAQ:OUTER", "1", request.dividends("NASDAQ:T" + str.tostring(bar_index), dividends.gross)), "out")',
      { bars: manyBars, engineOptions: { requestDatafeed: feed, runtime: { timeframe: { period: '1' } } } },
    );
    expect(result.errors.some((error) => error.message.includes('Too many unique request.* contexts'))).toBe(true);
  });
});
