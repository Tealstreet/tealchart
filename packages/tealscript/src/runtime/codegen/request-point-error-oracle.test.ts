import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import type { RequestDatafeed } from '../requestDatafeed';

const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const families = [
  ['financial', '"BAD:TEST", "TOTAL_REVENUE", "FQ"'],
  ['quandl', '"INVALID/__ARG_AUDIT__"'],
  ['earnings', '"BAD:TEST"'],
  ['dividends', '"BAD:TEST"'],
  ['splits', '"BAD:TEST"'],
  ['economic', '"BAD", "GDP"'],
] as const;
const invalidFeed: RequestDatafeed = {
  getBars: () => ({ ok: false, code: 'invalid_symbol', message: 'Rejected test symbol' }),
  getSeries: () => ({ ok: false, code: 'invalid_symbol', message: 'Rejected test symbol' }),
};
// V3 request-02 captures this index-zero refusal; native code and bar were not exposed.
const quandlError = 'Invalid symbol: QUANDL:INVALID/__ARG_AUDIT__|0.0';
const run = (body: string, requestDatafeed: RequestDatafeed = invalidFeed) => executeScript(
  parse(`//@version=6\nindicator("point request errors")\n${body}`), bars, undefined, { requestDatafeed },
);

describe('documented point request invalid-symbol failures', () => {
  for (const [family, args] of families) {
    it.each(['', ', ignore_invalid_symbol=false'])(`${family} halts with %s`, flag => {
      const result = run(`plot(request.${family}(${args}${flag}))`);
      expect(result.errors).toHaveLength(1);
      if (family === 'quandl') expect(result.errors[0].message).toBe(quandlError);
      else expect(result.errors[0].message).toContain(`request.${family} failed: Rejected test symbol`);
      expect(result.profile.swallowedErrors ?? []).toEqual([]);
    });

    it(`${family} ignores a rejected symbol when requested`, () => {
      const result = run(`plot(request.${family}(${args}, ignore_invalid_symbol=true))\nplot(1)`);
      expect(result.errors).toEqual([]);
      expect(result.plots[0].values).toEqual([null, null]);
      expect(result.plots[1].values).toEqual([1, 1]);
    });

    it(family === 'quandl'
      ? 'quandl refuses deprecated requests with absent or seeded host data'
      : `${family} retains unavailable host-data behavior and seeded values`, () => {
      const absent: RequestDatafeed = { ...invalidFeed, getSeries: () => ({ ok: false, code: 'missing_context', message: 'No host data' }) };
      const empty = run(`plot(request.${family}(${args}))`, absent);
      const seeded: RequestDatafeed = { ...invalidFeed, getSeries: query => ({ ok: true, context: { ...query, points: [{ time: 0, value: 7 }] } }) };
      const valid = run(`plot(request.${family}(${args}))`, seeded);
      // Deprecated Quandl requests refuse before host lookup (confirmed 145b8c79ee).
      if (family === 'quandl') {
        for (const result of [empty, valid]) {
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0].message).toBe(quandlError);
        }
      } else {
        expect(empty.errors).toEqual([]);
        expect(empty.plots[0].values).toEqual([null, null]);
        expect(valid.errors).toEqual([]);
        expect(valid.plots[0].values).toEqual([7, 7]);
      }
    });
  }

  it('handles the economic gaps-on fast path before a fallback getter can hide rejection', () => {
    const result = run('plot(request.economic("BAD", "GDP", gaps=barmerge.gaps_on, ignore_invalid_symbol=false))', { ...invalidFeed, getEconomicSeries: () => 9 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('request.economic failed: Rejected test symbol');
  });

  it('raises the error on execution and leaves skipped requests alone', () => {
    const delayed = run('if bar_index == 1\n    request.financial("BAD:TEST", "TOTAL_REVENUE", "FQ")\nplot(1)');
    expect(delayed.errors).toHaveLength(1);
    expect(delayed.plots[0].values[0]).toBe(1);
    const skipped = run('if bar_index < 0\n    request.financial("BAD:TEST", "TOTAL_REVENUE", "FQ")\nplot(1)');
    expect(skipped.errors).toEqual([]);
  });
});
