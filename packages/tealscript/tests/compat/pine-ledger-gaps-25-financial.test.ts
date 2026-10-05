import type { RequestFinancialMetricQuery, RequestSeriesQuery } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { financialRequestKey, InMemoryRequestDatafeed } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('ledger gaps 25 financial request contracts', () => {
  for (const period of ['FQ', 'FH', 'FY', 'TTM']) {
    it(`rank 990 partial witness: financial ${period} routes to its distinct provider series`, () => {
      const queries: RequestSeriesQuery[] = [];
      const key = financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', period);
      const inner = new InMemoryRequestDatafeed(
        [],
        [
          {
            family: 'financial',
            key,
            points: [{ time: compatibilityBars[0]!.time, value: 73 }],
          },
        ],
      );
      const source = `//@version=6\nindicator("Ledger 25 financial period")\nplot(request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "${period}"), "Value")`;
      expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      const result = runCompatScript(source, {
        bars: compatibilityBars.slice(0, 2),
        engineOptions: {
          requestDatafeed: {
            getBars: (query) => inner.getBars(query),
            getSeries: (query) => {
              queries.push({ ...query });
              return inner.getSeries(query);
            },
          },
        },
      });
      expect(result.errors).toEqual([]);
      expect(queries.some((q) => q.family === 'financial' && q.key === key)).toBe(true);
      expect(getPlot(result, 'Value').values).toEqual([73, 73]);
      // A synthetic seed proves routing, not real provider period availability.
    });
  }

  it('rank 991 partial witness: seeded periodic financial values carry between provider timestamps', () => {
    const datafeed = new InMemoryRequestDatafeed(
      [],
      [
        {
          family: 'financial',
          key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ'),
          points: [
            { time: compatibilityBars[1]!.time, value: 73 },
            { time: compatibilityBars[3]!.time, value: 89 },
          ],
        },
      ],
    );
    const source = `//@version=6
indicator("Ledger 25 financial sampling")
plot(request.financial("NASDAQ:AAPL", "TOTAL_REVENUE", "FQ"), "Value")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, {
      bars: compatibilityBars.slice(0, 5),
      engineOptions: { requestDatafeed: datafeed },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([null, 73, 73, 89, 89]);
    // Provider timestamps are invented fixture data; native release dates remain unverified.
  });

  it('rank 992: nested financial requests resolve the requested security symbol context', () => {
    const chart = compatibilityBars.slice(0, 2);
    const datafeed = new InMemoryRequestDatafeed(
      [{ symbol: 'NASDAQ:MSFT', timeframe: '1', bars: chart }],
      [
        {
          family: 'financial',
          key: financialRequestKey('NASDAQ:MSFT', 'TOTAL_REVENUE', 'FQ'),
          points: [{ time: chart[0]!.time, value: 73 }],
        },
        {
          family: 'financial',
          key: financialRequestKey('NASDAQ:AAPL', 'TOTAL_REVENUE', 'FQ'),
          points: [{ time: chart[0]!.time, value: 89 }],
        },
      ],
    );
    const source = `//@version=6
indicator("Ledger 25 nested financial", dynamic_requests=true)
value = request.security("NASDAQ:MSFT", "1", request.financial(syminfo.tickerid, "TOTAL_REVENUE", "FQ"))
plot(value, "Value")
`;
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, {
      bars: chart,
      engineOptions: {
        requestDatafeed: datafeed,
        runtime: { syminfo: { tickerid: 'NASDAQ:AAPL' }, timeframe: { period: '1' } },
      },
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([73, 73]);
  });
  it('rank 992: direct provider queries use requested times, symbol and currency', () => {
    const chart = compatibilityBars.slice(0, 4);
    const requested = [chart[0]!, chart[2]!];
    const queries: RequestFinancialMetricQuery[] = [];
    const inner = new InMemoryRequestDatafeed([{ symbol: 'NASDAQ:MSFT', timeframe: '2', bars: requested }]);
    const result = runCompatScript(
      `//@version=6
indicator("Requested financial clock")
plot(request.security("NASDAQ:MSFT", "2", request.financial(syminfo.tickerid, "TOTAL_REVENUE", "FQ", currency=currency.EUR)), "Value")`,
      {
        bars: chart,
        engineOptions: {
          runtime: { syminfo: { tickerid: 'NASDAQ:AAPL' }, timeframe: { period: '1' } },
          requestDatafeed: {
            getBars: (query) => inner.getBars(query),
            getFinancialMetric: (query) => {
              queries.push({ ...query });
              return { time: query.time, value: query.time === requested[0]!.time ? 73 : 89 };
            },
          },
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(queries).toEqual(
      requested.map((bar) => ({
        symbol: 'NASDAQ:MSFT',
        financialId: 'TOTAL_REVENUE',
        period: 'FQ',
        currency: 'EUR',
        time: bar.time,
      })),
    );
    // Provider clock routing is the witness; HTF lookahead publication is a
    // separate security contract and the final requested bar may be unfinished.
    expect(getPlot(result, 'Value').values).toContain(73);
  });

  it('rank 992: recursive security expressions retain the financial resolver', () => {
    const chart = compatibilityBars.slice(0, 2);
    const feed = new InMemoryRequestDatafeed(
      ['NASDAQ:GOOG', 'NASDAQ:MSFT'].map((symbol) => ({ symbol, timeframe: '1', bars: chart })),
      [
        {
          family: 'financial',
          key: financialRequestKey('NASDAQ:MSFT', 'TOTAL_REVENUE', 'FQ'),
          points: [{ time: chart[0]!.time, value: 73 }],
        },
      ],
    );
    const result = runCompatScript(
      `//@version=6
indicator("Recursive financial")
plot(request.security("NASDAQ:GOOG", "1", request.security("NASDAQ:MSFT", "1", request.financial(syminfo.tickerid, "TOTAL_REVENUE", "FQ"))), "Value")`,
      {
        bars: chart,
        engineOptions: {
          requestDatafeed: feed,
          runtime: { syminfo: { tickerid: 'NASDAQ:AAPL' }, timeframe: { period: '1' } },
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Value').values).toEqual([73, 73]);
  });

  it('rank 992: top-level and requested calls share the financial series cache', () => {
    const chart = compatibilityBars.slice(0, 2);
    const key = financialRequestKey('NASDAQ:MSFT', 'TOTAL_REVENUE', 'FQ');
    const inner = new InMemoryRequestDatafeed(
      [{ symbol: 'NASDAQ:MSFT', timeframe: '1', bars: chart }],
      [{ family: 'financial', key, points: [{ time: chart[0]!.time, value: 73 }] }],
    );
    const queries: RequestSeriesQuery[] = [];
    const result = runCompatScript(
      `//@version=6
indicator("Shared financial cache")
plot(request.security("NASDAQ:MSFT", "1", request.financial(syminfo.tickerid, "TOTAL_REVENUE", "FQ")), "Nested")
plot(request.financial("NASDAQ:MSFT", "TOTAL_REVENUE", "FQ"), "Direct")`,
      {
        bars: chart,
        engineOptions: {
          runtime: { timeframe: { period: '1' } },
          requestDatafeed: {
            getBars: (query) => inner.getBars(query),
            getSeries: (query) => {
              queries.push(query);
              return inner.getSeries(query);
            },
          },
        },
      },
    );
    expect(result.errors).toEqual([]);
    expect(queries).toEqual([{ family: 'financial', key }]);
    expect(getPlot(result, 'Nested').values).toEqual([73, 73]);
    expect(getPlot(result, 'Direct').values).toEqual([73, 73]);
  });

  it('rank 992: nested financial calls contribute to the existing context budget', () => {
    const chart = compatibilityBars.slice(0, 2);
    const calls = Array.from(
      { length: 40 },
      (_, i) => `    v${i} = request.financial("NASDAQ:MSFT", "FIXTURE_FIELD_${i}", "FQ")`,
    ).join('\n');
    const result = runCompatScript(
      `//@version=6
indicator("Financial budget")
fields() =>
${calls}
    v39
plot(request.security("NASDAQ:MSFT", "1", fields()), "Value")`,
      {
        bars: chart,
        engineOptions: {
          requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'NASDAQ:MSFT', timeframe: '1', bars: chart }]),
          runtime: { timeframe: { period: '1' } },
        },
      },
    );
    expect(result.errors.some((error) => error.message.includes('Too many unique request.* contexts'))).toBe(true);
  });
});
