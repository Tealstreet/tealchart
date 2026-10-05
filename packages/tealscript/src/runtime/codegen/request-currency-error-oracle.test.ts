import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import type { RequestDatafeed } from '../requestDatafeed';
const bars = [4, 6].map((close, i) => ({ time: i * 60000, open: close, high: close + 1, low: close - 1, close, volume: 1 }));
const invalid: RequestDatafeed = {
  getBars: () => ({ ok: false, code: 'invalid_currency', message: 'Rejected currency pair' }),
  getCurrencyRate: () => undefined,
  getSeries: () => ({ ok: false, code: 'invalid_currency', message: 'Rejected currency pair' }),
};
const run = (body: string, requestDatafeed: RequestDatafeed = invalid) => executeScript(parse(`//@version=6\nindicator("currency errors")\n${body}`), bars, undefined, { requestDatafeed });

describe('documented currency conversion failure', () => {
  it.each(['', ', ignore_invalid_currency=false'])('halts a rejected conversion with %s', flag => {
    const result = run(`plot(request.currency_rate("BAD", "USD"${flag}))`);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('request.currency_rate failed: Rejected currency pair');
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });
  it('continues with na when ignore-invalid is true', () => {
    const result = run('plot(request.currency_rate("BAD", "USD", ignore_invalid_currency=true))\nplot(1)');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null]);
    expect(result.plots[1].values).toEqual([1, 1]);
  });
  it('keeps missing host data and provider rates distinct from invalid conversions', () => {
    const missing = run('plot(request.currency_rate("EUR", "USD"))', { ...invalid, getSeries: () => ({ ok: false, code: 'missing_context', message: 'No host data' }) });
    expect(missing.errors).toEqual([]);
    expect(missing.plots[0].values).toEqual([null, null]);
    const valid = run('plot(request.currency_rate("EUR", "USD"))', { ...invalid, getCurrencyRate: () => 1.25 });
    expect(valid.errors).toEqual([]);
    expect(valid.plots[0].values).toEqual([1.25, 1.25]);
    const same = run('plot(request.currency_rate("USD", "USD"))');
    expect(same.errors).toEqual([]);
    expect(same.plots[0].values).toEqual([1, 1]);
  });
  it('only rejects executed calls', () => {
    const delayed = run('if bar_index == 1\n    request.currency_rate("BAD", "USD")\nplot(1)');
    expect(delayed.errors).toHaveLength(1);
    expect(delayed.plots[0].values[0]).toBe(1);
    const skipped = run('if bar_index < 0\n    request.currency_rate("BAD", "USD")\nplot(1)');
    expect(skipped.errors).toEqual([]);
  });
});
