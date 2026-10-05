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

function execute(body: string, realtime = false) {
  const queries: Array<{ kind: string; symbol?: string; family?: string; key?: string }> = [];
  const requestDatafeed: RequestDatafeed = {
    getBars(query) {
      queries.push({ kind: 'bars', symbol: query.symbol });
      const seed = query.symbol.startsWith('seed\0');
      const values = seed ? (query.timeframe === '2' ? [90, 91] : [31, 32, 33, 34]) : [20, 40];
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
      queries.push({ kind: 'series', family: query.family, key: query.key });
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
  };
  const ast = parse(`//@version=6\nindicator("request provider boundaries")\n${body}`);
  const result = executeCompiledScript(ast, bars, new Map(), {
    runtime: { syminfo: { tickerid: 'TEST', ticker: 'TEST', timezone: 'UTC' }, timeframe: { period: '1' } },
    requestDatafeed,
    ...(realtime ? { realtimeLastBar: { isNew: true } } : {}),
  });
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.reason);
  return { queries, errors: result.result.errors, values: result.result.plots[0]?.values };
}

describe('dynamic request historical preload', () => {
  it('refuses a first realtime dataset before fetching it', () => {
    const result = execute('symbol=barstate.isrealtime?"NEW":"ALT"\nplot(request.security(symbol,"1",close))', true);
    expect(result.errors.some((error) => /historical|preload/i.test(error.message))).toBe(true);
    expect(result.queries.some((q) => q.symbol === 'NEW')).toBe(false);
  });
  it('retains realtime access to a historical dataset', () => {
    const result = execute('plot(request.security("ALT","1",close))', true);
    expect(result.errors).toEqual([]);
    expect(result.values?.some((value) => value !== null)).toBe(true);
  });
  it('refuses a first realtime timeframe before fetching it', () => {
    const result = execute('tf=barstate.isrealtime?"2":"1"\nplot(request.security("ALT",tf,close))', true);
    expect(result.errors.some((error) => /historical|preload/i.test(error.message))).toBe(true);
  });
  it('refuses a first realtime expression in an already requested dataset', () => {
    const result = execute(
      'plot(barstate.isrealtime ? request.security("ALT", "1", high) : request.security("ALT", "1", close))',
      true,
    );
    expect(result.errors.some((error) => /historical|preload/i.test(error.message))).toBe(true);
  });
  it('refuses a first realtime point-provider ticker before fetching it', () => {
    const result = execute(
      'symbol=barstate.isrealtime?"NEW":"ALT"\nplot(request.splits(symbol,splits.numerator))',
      true,
    );
    expect(result.errors.some((error) => /historical|preload/i.test(error.message))).toBe(true);
    expect(result.queries.some((query) => query.key?.startsWith('NEW\0'))).toBe(false);
  });
  it('retains a changing source within a preloaded expression', () => {
    const result = execute('base=close+1\nplot(request.security("ALT", "1", base))', true);
    expect(result.errors).toEqual([]);
    expect(result.values?.some((value) => value !== null)).toBe(true);
  });
});
