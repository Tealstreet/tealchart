import type { Bar } from '../context';
import type { RequestDatafeedErrorCode, WorkerRequestDataCacheEntry } from '../requestDatafeed';

import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import {
  CacheBackedRequestDatafeed,
  CacheDiscoveringRequestDatafeed,
  workerRequestDataCacheKey,
} from '../requestDatafeed';

const bars: Bar[] = Array.from({ length: 3 }, (_, index) => ({
  time: Date.UTC(2026, 9, 1) + index * 120_000,
  open: 100,
  high: 102,
  low: 98,
  close: 101,
  volume: 10,
}));
const query = { symbol: 'BINANCE:BTCUSDT', financialId: 'NET_DEBT', period: 'FY', time: bars[0]!.time };
const nativeText = 'Symbol resolve error: FUND:BINANCE;BTCUSDT;NET_DEBT_FY';
const runtime = { syminfo: { tickerid: query.symbol }, timeframe: { period: '2' } };
const adapters = ['backed', 'discovery'] as const;
type State = 'error' | 'absent' | 'null' | 'resolved-na' | 'finite';
function run(
  adapter: (typeof adapters)[number] | 'none',
  state: State,
  named = false,
  ignore = false,
  options: { errorCode?: RequestDatafeedErrorCode; message?: string; body?: (call: string) => string } = {},
) {
  const entries = new Map<string, WorkerRequestDataCacheEntry>();
  if (state !== 'absent') {
    const entry: WorkerRequestDataCacheEntry = {
      kind: 'financial',
      query,
      value:
        state === 'finite'
          ? [{ time: query.time, value: 41 }]
          : state === 'resolved-na'
            ? [{ time: query.time, value: NaN }]
            : null,
    };
    if (state === 'error')
      entry.error = { code: options.errorCode ?? 'invalid_symbol', message: options.message ?? nativeText };
    entries.set(workerRequestDataCacheKey('financial', query), entry);
  }
  const datafeed =
    adapter === 'none'
      ? undefined
      : adapter === 'backed'
        ? new CacheBackedRequestDatafeed(entries)
        : new CacheDiscoveringRequestDatafeed(entries);
  const call = named
    ? `request.financial(period="FY", financial_id="NET_DEBT", symbol=syminfo.tickerid, ignore_invalid_symbol=${ignore})`
    : `request.financial(syminfo.tickerid, "NET_DEBT", "FY", ignore_invalid_symbol=${ignore})`;
  const ast = parse(`//@version=6\nindicator("Financial provider error")\n${options.body?.(call) ?? `plot(${call})`}`);
  expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  return executeScript(ast, bars, undefined, { runtime, requestDatafeed: datafeed });
}

// Native v9 v7:353 records this text; its first error bar and code are unknown.
describe('explicit financial symbol-resolution failure', () => {
  for (const adapter of adapters) {
    it.each([false, true])(`${adapter} retains native text with named=%s`, (named) => {
      const result = run(adapter, 'error', named);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toBe(nativeText);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
      expect(result.plots.flatMap((plot) => plot.values)).toEqual([]);
    });
    it(`${adapter} honors ignore_invalid_symbol`, () => {
      const result = run(adapter, 'error', false, true);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([null, null, null]);
    });
    it(`${adapter} honors named ignore_invalid_symbol`, () => {
      const result = run(adapter, 'error', true, true);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([null, null, null]);
    });
    it(`${adapter} preserves arbitrary provider error text`, () => {
      const message = 'Symbol resolve error: FUND:TEST;OTHER;NET_DEBT_FY';
      const result = run(adapter, 'error', false, false, { message });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toBe(message);
    });
    it(`${adapter} retains output before a delayed executed error`, () => {
      const result = run(adapter, 'error', false, false, {
        body: (call) => `if bar_index == 1\n    ${call}\nplot(bar_index)`,
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toBe(nativeText);
      expect(result.plots[0]!.values).toEqual([0]);
      expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    });
    it(`${adapter} leaves an unreachable invalid-symbol request inactive`, () => {
      const result = run(adapter, 'error', false, false, {
        body: (call) => `if bar_index < 0\n    ${call}\nplot(bar_index)`,
      });
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([0, 1, 2]);
    });
    it(`${adapter} retains unrelated provider failure policy`, () => {
      const result = run(adapter, 'error', false, false, { errorCode: 'missing_context' });
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([null, null, null]);
    });
    it.each(['absent', 'null', 'resolved-na'] as const)(`${adapter} retains %s data as missing`, (state) => {
      const result = run(adapter, state);
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([null, null, null]);
    });
    it(`${adapter} retains finite financial data`, () => {
      const result = run(adapter, 'finite');
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([41, 41, 41]);
    });
  }
  it.each([false, true])('retains absent providers with named=%s', (named) => {
    const result = run('none', 'absent', named);
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([null, null, null]);
  });
});
