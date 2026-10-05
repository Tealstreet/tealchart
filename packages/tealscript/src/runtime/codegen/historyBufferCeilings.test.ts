import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

const bars = Array.from({ length: 10002 }, (_, index) => ({
  time: (index + 1) * 60000,
  open: index + 2,
  high: index + 4,
  low: index + 1,
  close: index + 3,
  volume: 1,
}));

const run = (expression: string, count = bars.length) =>
  executeScript(parse(`//@version=6\nindicator("History boundaries", max_bars_back=5000)\nx = close * 2\nplot(${expression})`), bars.slice(0, count));

describe('documented historical buffer ceilings', () => {
  // TradingView writing/limitations/#maximum-bars-back: listed builtins 10000, other series 5000.
  it.each(['open', 'high', 'low', 'close', 'time'])('retains the exact 10000-bar %s boundary', (field) => {
    const result = run(`${field}[10000]`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(0, 10000)).toEqual(Array(10000).fill(null));
    expect(result.plots[0].values.slice(10000)).toEqual(bars.slice(0, 2).map((bar) => bar[field as keyof typeof bar]));
  });

  it.each(['open', 'high', 'low', 'close', 'time'])('visibly refuses %s beyond 10000 even before history exists', (field) => {
    expect(run(`${field}[10001]`, 1).errors.some((error) => /Historical offset 10001.*10000/.test(error.message))).toBe(true);
  });

  it('retains the exact general-series 5000 boundary', () => {
    const result = run('x[5000]', 5002);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(0, 5000)).toEqual(Array(5000).fill(null));
    expect(result.plots[0].values.slice(5000)).toEqual([6, 8]);
  });

  it('visibly refuses general-series depth 5001', () => {
    expect(run('x[5001]', 1).errors.some((error) => /Historical offset 5001.*5000/.test(error.message))).toBe(true);
  });

  // TradingView language/execution-model/#historical-buffers: realtime cannot grow a buffer.
  it('preserves a historically provisioned builtin boundary on the realtime bar', () => {
    const result = executeScript(parse('//@version=6\nindicator("Provisioned realtime")\nplot(high[10000])'), bars, undefined, { realtimeLastBar: { isNew: false } });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(10000)).toEqual([4, 5]);
  });
  it('a first-bar forced depth provisions a later realtime-only read', () => {
    const result = executeScript(parse('//@version=6\nindicator("Forced first-bar depth")\nplot(high[barstate.isfirst or barstate.isrealtime ? 10000 : 0])'), bars, undefined, { realtimeLastBar: { isNew: false } });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values[0]).toBe(null);
    expect(result.plots[0].values.at(-1)).toBe(5);
  });

  it('does not enlarge an unprovisioned buffer on its first realtime deep read', () => {
    const result = executeScript(parse('//@version=6\nindicator("Unprovisioned realtime")\nplot(high[barstate.isrealtime ? 10000 : 0])'), bars, undefined, { realtimeLastBar: { isNew: false } });
    expect(result.errors.some((error) => /Historical offset 10000/.test(error.message))).toBe(true);
  });

});
