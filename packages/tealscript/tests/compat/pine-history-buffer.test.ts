import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeCompiled, tryCompile, type CompiledExecutionOptions } from '../../src/runtime/codegen/execute';
import type { Bar } from '../../src/runtime/context';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';

const bars: Bar[] = Array.from({ length: 1102 }, (_, i) => ({
  time: (i + 1) * 60000, open: i + 10, high: i + 20, low: i, close: i + 1, volume: 100,
}));

function run(body: string, options?: CompiledExecutionOptions, count = bars.length) {
  const compiled = tryCompile(parse(`//@version=6\n${body}`));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const dataset = count <= bars.length ? bars.slice(0, count) : Array.from({ length: count }, (_, i) => ({
    ...bars[0], time: (i + 1) * 60000, open: i + 10, high: i + 20, low: i, close: i + 1,
  }));
  const result = executeCompiled(compiled, dataset, undefined, options);
  if (!result) throw new Error('No compiled result');
  return result;
}

// https://www.tradingview.com/pine-script-docs/language/execution-model/#historical-buffers
describe('documented historical buffer sizing', () => {
  it.each([
    ['builtin', '', 'close[offset]', 1],
    ['user series', 'value = close * 2', 'value[offset]', 2],
    ['expression', '', '(close * 3)[offset]', 3],
    ['function parameter', 'past(source, depth) => source[depth]', 'past(close, offset)', 1],
    ['nested function expression', 'past(source, depth) => (source * 4)[depth]\nwrapped(source, depth) => past(source, depth)', 'wrapped(close, offset)', 4],
    ['time', '', 'time[offset]', 60000],
    ['computed price', '', 'hl2[offset]', 1],
    ['TA result', '', 'ta.sma(close, 1)[offset]', 1],
    ['function TA result', 'past(source, depth) => ta.sma(source, 1)[depth]', 'past(close, offset)', 1],
  ])('grows %s history and recovers data discarded by the initial buffer', (_, setup, expression, factor) => {
    const result = run(`indicator("adaptive history")\n${setup}\noffset = bar_index > 800 ? 800 : 1\nplot(${expression}, "Past")`);
    expect(result.errors).toEqual([]);
    const shift = expression === 'hl2[offset]' ? 9 : 0;
    expect(result.plots[0].values.slice(799, 803)).toEqual([799, 800, 2, 3].map(value => (value + shift) * Number(factor)));
    expect(result.plots[0].values).toHaveLength(bars.length);
  });

  it('learns large offsets on the first bar even when past samples are unavailable', () => {
    const result = run('indicator("early history")\noffset = barstate.isfirst ? 1000 : 1\nplot(close[offset], "Past")', { realtimeLastBar: { isNew: true } });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values[0]).toBeNull();
    expect(result.plots[0].values.at(-1)).toBe(1101);
  });

  it('allows a loop to discover progressively deeper history on the first bar', () => {
    const result = run('indicator("loop history")\npast(source) =>\n    float value = na\n    for depth = 1 to 1000\n        value := source[depth]\n    value\nplot(past(close), "Past")');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.filter(value => value !== null)).toHaveLength(102);
    expect(result.plots[0].values.slice(998, 1003)).toEqual([null, null, 1, 2, 3]);
  });

  it('restarts persistent state and outputs when a later historical bar grows the buffer', () => {
    const result = run('indicator("restart state")\nvar count = 0\ncount += 1\nplot(count, "Count")\noffset = bar_index > 800 ? 800 : 1\nplot(close[offset], "Past")');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual(bars.map((_, i) => i + 1));
    expect(result.plots[1].values[801]).toBe(2);
    expect(result.profile.swallowedErrors).toBeUndefined();
  });

  it('treats declaration sizing as an initial minimum for dynamic historical reads', () => {
    const result = run('indicator("declared minimum", max_bars_back=2)\noffset = bar_index > 800 ? 800 : 1\nplot(close[offset], "Past")');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values[801]).toBe(2);
  });

  it('grows requested-context history independently of chart history', () => {
    const requestDatafeed = new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '1', bars }]);
    const result = run('indicator("request history")\npast() =>\n    offset = bar_index > 800 ? 800 : 1\n    close[offset]\nplot(request.security("TEST", "1", past()), "Past")', { requestDatafeed, runtime: { timeframe: { period: '1', multiplier: 1, isminutes: true, isintraday: true } } });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values[801]).toBe(2);
  });

  it('freezes the inferred buffer at the historical requirement before realtime', () => {
    const result = run('indicator("realtime bounds")\noffset = barstate.ishistory ? 100 : 150\nplot(close[offset], "Past")', { realtimeLastBar: { isNew: true } });
    expect(result.errors[0]?.message).toMatch(/Historical offset 150 exceeds max_bars_back 100/);
  });

  it('keeps automatic historical growth scoped to the referenced series', () => {
    const result = run('indicator("series bounds")\noffset = bar_index > 800 ? 800 : 1\nplot(close[offset], "Close")\nopenOffset = barstate.ishistory ? 1 : 750\nplot(open[openOffset], "Open")', { realtimeLastBar: { isNew: true } });
    expect(result.errors[0]?.message).toMatch(/Historical offset 750 exceeds max_bars_back 1/);
    expect(result.plots[0].values[801]).toBe(2);
  });

  it('enforces the 5000-bar limit for user series after automatic growth', () => {
    const result = run('indicator("user limit")\nvalue = close\noffset = bar_index > 500 ? 5001 : 1\nplot(value[offset], "Past")');
    expect(result.errors[0]?.message).toMatch(/Historical offset 5001 exceeds max_bars_back 5000/);
  });

  it('supports builtin OHLC history beyond 5000 bars', () => {
    const result = run('indicator("builtin limit")\noffset = 6000\nplot(close[offset], "Past")', undefined, 6002);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(5998)).toEqual([null, null, 1, 2]);
  });

  it('grows strategy property history with the same historical sizing rules', () => {
    const result = run('strategy("strategy history")\noffset = bar_index > 800 ? 800 : 1\nplot(strategy.position_size[offset], "Past")');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(799, 803)).toEqual([0, 0, 0, 0]);
  });

  it('grows virtual bar-index history without bypassing realtime bounds', () => {
    const result = run('indicator("virtual history")\noffset = bar_index > 800 ? 800 : 1\nplot(bar_index[offset], "Past")');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(799, 803)).toEqual([798, 799, 1, 2]);
  });

  it('grows collection history and retrieves earlier collection instances', () => {
    const result = run('indicator("collection history")\nvalues = array.from(close)\noffset = bar_index > 800 ? 800 : 1\nprevious = values[offset]\nplot(na(previous) ? na : array.get(previous, 0), "Past")');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.slice(799, 803)).toEqual([799, 800, 2, 3]);
  });

  it.each([
    ['declaration', 'indicator("explicit realtime", max_bars_back=150)', ''],
    ['target hint after reference', 'indicator("explicit realtime")', 'max_bars_back(close, 150)'],
  ])('honors %s sizing for deeper realtime reads', (_, declaration, hint) => {
    const result = run(`${declaration}\noffset = barstate.ishistory ? 100 : 150\nplot(close[offset], "Past")\n${hint}`, { realtimeLastBar: { isNew: true } });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values.at(-1)).toBe(952);
  });

  it('keeps the host maxBarsBack override a hard execution limit', () => {
    const result = run('indicator("host limit")\noffset = bar_index > 800 ? 800 : 1\nplot(close[offset], "Past")', { maxBarsBack: 500 });
    expect(result.errors[0]?.message).toMatch(/Historical offset 800 exceeds max_bars_back 500/);
  });
});
