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

function execute(body: string) {
  const queries: Array<{ kind: string; symbol?: string; family?: string }> = [];
  const requestDatafeed: RequestDatafeed = {
    getBars(query) {
      queries.push({ kind: 'bars', symbol: query.symbol });
      const seed = query.symbol.startsWith('seed\0');
      if (seed && query.symbol.endsWith('BAD'))
        return { ok: false, code: 'invalid_symbol', message: 'Unknown seed data' };
      const values = seed
        ? query.timeframe === '2'
          ? [90, 91]
          : [31, 32, 33, 34]
        : query.timeframe === '1'
          ? [20, 40, 60, 80]
          : [20, 40];
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

describe('requested seed provider boundaries', () => {
  it('retains direct seed provider values', () => {
    const result = execute('plot(request.seed("repo","DATA",close))');
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual([null, 31, 32, 33]);
  });
  it('evaluates seed expressions inside a requested dataset', () => {
    const result = execute(
      'plot(request.security("ALT","2",request.seed("repo","DATA",close),lookahead=barmerge.lookahead_on))',
    );
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual([null, null, 90, 90]);
    expect(result.queries.some((query) => query.symbol?.startsWith('seed\0'))).toBe(true);
  });
  it.each([
    ['close * 2 + 1', [null, 63, 65, 67]],
    ['close[1]', [null, null, 31, 32]],
    ['ta.sma(close, 2)', [null, null, 31.5, 32.5]],
    ['high - low', [null, 2, 2, 2]],
  ])('evaluates %s in the seed dataset instead of the outer bars', (expression, expected) => {
    const result = execute(
      `plot(request.security("ALT", "1", request.seed("repo", "DATA", ${expression}), lookahead=barmerge.lookahead_on))`,
    );
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual(expected);
  });
  it('preserves named seed binding', () => {
    const result = execute(
      'plot(request.security("ALT", "1", request.seed(expression=close, source="repo", symbol="DATA"), lookahead=barmerge.lookahead_on))',
    );
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual([null, 31, 32, 33]);
  });
  for (const nested of [false, true]) {
    for (const ignore of [false, true]) {
      it(`${nested ? 'nested' : 'root'} preserves invalid seed policy ignore=${ignore}`, () => {
        const expression = `request.seed("repo", "BAD", close, ignore_invalid_symbol=${ignore})`;
        const result = execute(`plot(${nested ? `request.security("ALT", "1", ${expression})` : expression})`);
        expect(result.values?.some((value) => value !== null)).not.toBe(true);
        expect(
          result.errors.some(
            (error) => error.message.includes('request.seed') && error.message.includes('Unknown seed data'),
          ),
        ).toBe(!ignore);
      });
    }
  }
});
