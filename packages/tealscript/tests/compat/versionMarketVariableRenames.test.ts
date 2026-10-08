import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const contexts = [
  { period: '30', multiplier: 30, isintraday: true, ticker: 'AAPL', tickerid: 'NASDAQ:AAPL' },
  { period: '5D', multiplier: 5, isintraday: false, ticker: 'ES1!', tickerid: 'CME_MINI:ES1!' },
] as const;

// The v4 migration guide names all five renames explicitly; the v6 entries define their values.
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-4/#renaming-of-built-in-constants-variables-and-functions
describe('v4 market-variable renames preserve the selected metadata field', () => {
  it.each([
    ['period', 'timeframe.period', 'period', 84],
    ['isintraday', 'timeframe.isintraday', 'isintraday', 119],
    ['interval', 'timeframe.multiplier', 'multiplier', 117],
    ['ticker', 'syminfo.ticker', 'ticker', 75],
    ['tickerid', 'syminfo.tickerid', 'tickerid', 79],
  ] as const)('%s becomes %s (%s, official v6 entry %i)', (legacy, modern, field, _entry) => {
    // Distinct symbols, prefixes, numeric periods and a day period reject swapped or constant routing.
    for (const context of contexts) {
      for (const version of [3, 4, 6]) {
        const expression = version === 3 ? legacy : modern;
        const declaration = version < 5 ? 'study' : 'indicator';
        const source = `//@version=${version}
${declaration}("Market variable rename")
plot(${expression} == ${JSON.stringify(context[field])} ? 1 : 0, "match")`;
        expect(checkProgram(parse(source)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = runCompatScript(source, {
          bars: compatibilityBars.slice(0, 2),
          engineOptions: {
            runtime: {
              timeframe: { period: context.period, multiplier: context.multiplier, isintraday: context.isintraday },
              syminfo: { ticker: context.ticker, tickerid: context.tickerid },
            },
          },
        });
        expect(result.errors).toEqual([]);
        expect(getPlot(result, 'match').values).toEqual([1, 1]);
      }
    }
  });
});
