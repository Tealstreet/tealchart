import type { RequestDatafeed } from '../../src/runtime/requestDatafeed';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';

const bar = (time: number, close: number) => ({
  time,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
});
const bars = Array.from({ length: 4 }, (_, i) => bar(i * 60000, 10 + i));

function execute(body: string, provider: 'series' | 'corporate' | 'invalid' = 'series') {
  const queries: Array<{ kind: string; symbol?: string; family?: string; time?: number }> = [];
  const requestDatafeed: RequestDatafeed = {
    getBars(query) {
      queries.push({ kind: 'bars', symbol: query.symbol });
      const values = [20, 40];
      return {
        ok: true,
        context: {
          symbol: query.symbol,
          timeframe: query.timeframe,
          bars: values.map((v, i) => bar(i * Number(query.timeframe) * 60000, v)),
          syminfo: { tickerid: query.symbol, ticker: query.symbol, timezone: 'UTC' },
        },
      };
    },
    getSeries(query) {
      queries.push({ kind: 'series', family: query.family });
      if (provider === 'invalid') return { ok: false, code: 'invalid_symbol', message: 'Unknown ticker' };
      return {
        ok: true,
        context: {
          ...query,
          points: [
            { time: 0, value: 41 },
            { time: 120000, value: 73 },
          ],
        },
      };
    },
    ...(provider === 'corporate'
      ? {
          getCorporateAction(query: import('../../src/runtime/requestDatafeed').RequestCorporateActionQuery) {
            queries.push({ kind: 'corporate', family: query.kind, symbol: query.ticker, time: query.time });
            return {
              time: query.time,
              value: { kind: 'splits' as const, numerator: query.time < 120000 ? 41 : 73, denominator: 2 },
            };
          },
        }
      : {}),
  };
  const ast = parse(`//@version=6\nindicator("request provider boundaries")\n${body}`);
  const result = executeCompiledScript(ast, bars, new Map(), {
    runtime: { syminfo: { tickerid: 'TEST', ticker: 'TEST', timezone: 'UTC' }, timeframe: { period: '1' } },
    requestDatafeed,
  });
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.reason);
  return { queries, errors: result.result.errors, values: result.result.plots[0]?.values };
}

describe('requested splits provider boundaries', () => {
  it('retains direct splits provider values', () => {
    const result = execute('plot(request.splits("ALT",splits.numerator))');
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual([41, 41, 73, 73]);
    expect(result.queries.filter((q) => q.family === 'splits')).toHaveLength(1);
  });
  it('resolves splits inside the requested dataset', () => {
    const result = execute(
      'plot(request.security("ALT","2",request.splits("ALT",splits.numerator),lookahead=barmerge.lookahead_on))',
    );
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual([41, 41, 73, 73]);
    expect(result.queries.filter((q) => q.family === 'splits')).toHaveLength(1);
  });
  for (const nested of [false, true]) {
    it(`${nested ? 'nested' : 'root'} selects split event fields at the requested ticker and clock`, () => {
      const expression = 'request.splits(syminfo.tickerid, splits.denominator)';
      const result = execute(
        `plot(${nested ? `request.security("ALT", "2", ${expression}, lookahead=barmerge.lookahead_on)` : expression})`,
        'corporate',
      );
      expect(result.errors).toEqual([]);
      expect(result.values).toEqual([2, 2, 2, 2]);
      expect(result.queries.filter((query) => query.kind === 'corporate')).toEqual(
        (nested ? [0, 120000] : [0, 60000, 120000, 180000]).map((time) => ({
          kind: 'corporate',
          family: 'splits',
          symbol: nested ? 'ALT' : 'TEST',
          time,
        })),
      );
      expect(result.queries.some((query) => query.kind === 'series')).toBe(false);
    });
    for (const ignore of [false, true]) {
      it(`${nested ? 'nested' : 'root'} preserves invalid ticker policy ignore=${ignore}`, () => {
        const expression = `request.splits("BAD", splits.numerator, ignore_invalid_symbol=${ignore})`;
        const result = execute(
          `plot(${nested ? `request.security("ALT", "2", ${expression})` : expression})`,
          'invalid',
        );
        if (ignore) expect(result.values).toEqual([null, null, null, null]);
        else expect(result.values?.some((value) => value !== null)).not.toBe(true);
        expect(result.errors.some((error) => error.message.includes('Unknown ticker'))).toBe(!ignore);
      });
    }
  }
  it.each([
    ['gaps_off', 'lookahead_off', [41, 41, 73, 73]],
    ['gaps_on', 'lookahead_off', [41, null, 73, null]],
    ['gaps_off', 'lookahead_on', [41, 73, 73, 73]],
    ['gaps_on', 'lookahead_on', [41, 73, null, null]],
  ])('preserves root point merging for %s/%s', (gaps, lookahead, expected) => {
    const result = execute(
      `plot(request.splits("ALT", splits.numerator, gaps=barmerge.${gaps}, lookahead=barmerge.${lookahead}))`,
    );
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual(expected);
  });
});
