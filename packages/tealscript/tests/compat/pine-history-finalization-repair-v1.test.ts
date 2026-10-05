import type { CompiledExecutionOptions } from '../../src/runtime/codegen/execute';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';
import { HistoryBufferSizing } from '../../src/runtime/codegen/history';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { compatibilityBars, getPlot } from './fixtures';

const bars = Array.from({ length: 700 }, (_, index) => ({
  ...compatibilityBars[0],
  time: (index + 1) * 60000,
  open: index,
  high: index + 2,
  low: index - 2,
  close: index,
  volume: 100,
}));

function run(source: string, count: number, options?: CompiledExecutionOptions) {
  const compiled = tryCompile(parse(source));
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const result = executeCompiled(compiled, bars.slice(0, count), undefined, options);
  if (!result) throw new Error('No compiled result');
  return result;
}

function independentHistories(offset: number) {
  const history = new HistoryBufferSizing();
  let passes = 0;
  const values = history.run(() => {
    passes++;
    const deps = history.dependencies(499, () => false);
    const series = Array.from({ length: 24 }, (_, key) => new deps.ValueSeries(500, 499, `late:${key}`));
    for (let index = 0; index < 700; index++) {
      history.beginBar(index, false);
      for (let key = 0; key < series.length; key++) {
        series[key].get(0);
        series[key].push(`${key}:${index}`);
      }
    }
    return series.map((value) => value.get(offset));
  });
  return { passes, values };
}

describe('history finalization preserves reached lookbacks', () => {
  it('retains a previous slot until late first history reads, without replaying per key', () => {
    const result = independentHistories(1);
    expect(result.passes).toBe(1);
    expect(result.values).toEqual(Array.from({ length: 24 }, (_, key) => `${key}:698`));
  });

  it('collects all independent late growth requests before replaying the pass', () => {
    const result = independentHistories(600);
    expect(result.passes).toBe(2);
    expect(result.values).toEqual(Array.from({ length: 24 }, (_, key) => `${key}:99`));
  });

  it('registers lowest declared length before limiting warmup to retained samples', () => {
    const result = run(
      `//@version=6
indicator("sparse lowest")
length = input.int(40)
value = float(bar_index)
float sparse = na
if bar_index == 27 or bar_index == 367
    sparse := ta.lowest(value, length)
plot(sparse, "Sparse")
plot(ta.lowest(value, length), "Global")`,
      400,
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Sparse').values[27]).toBeNull();
    expect(getPlot(result, 'Sparse').values[367]).toBe(27);
    expect(getPlot(result, 'Global').values[367]).toBe(328);
  });

  it('retains pivot input-strength windows before their first late invocation', () => {
    const result = run(
      `//@version=6
indicator("late pivots")
strength = input.int(2)
value = float(bar_index % 10)
float high = na
float low = na
if bar_index >= 300
    high := ta.pivothigh(value, strength, strength)
    low := ta.pivotlow(value, strength, strength)
plot(high, "High")
plot(low, "Low")
plot(ta.pivothigh(value, strength, strength), "Global high")
plot(ta.pivotlow(value, strength, strength), "Global low")`,
      340,
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'High').values.slice(304)).toEqual(getPlot(result, 'Global high').values.slice(304));
    expect(getPlot(result, 'Low').values.slice(304)).toEqual(getPlot(result, 'Global low').values.slice(304));
    expect(
      getPlot(result, 'High')
        .values.slice(300)
        .filter((value) => value !== null),
    ).toHaveLength(3);
    expect(
      getPlot(result, 'Low')
        .values.slice(300)
        .filter((value) => value !== null),
    ).toHaveLength(4);
  });

  it('declares a pivot window even when its early invocation cannot fill it', () => {
    const result = run(
      `//@version=6
indicator("early incomplete pivot")
strength = input.int(2)
float top = na
if bar_index == 2 or bar_index >= 300
    top := ta.pivothigh(float(bar_index % 5), strength, strength)
plot(top, "Top")`,
      340,
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Top').values[2]).toBeNull();
    expect(
      getPlot(result, 'Top')
        .values.slice(300)
        .filter((value) => value !== null),
    ).toEqual([2, ...Array(7).fill(4)]);
  });

  it('discards incomplete requested prefixes when batching late independent growth', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("requested late growth")
past() =>
    a = close * 2
    b = close * 3
    depth = bar_index == 699 ? 600 : 1
    bar_index == 699 ? a[depth] + b[depth] : 0
plot(request.security("TEST", "1", past()), "Past")`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: '1', bars }]),
      runtime: { timeframe: { period: '1', multiplier: 1, isminutes: true, isintraday: true } },
    })!;
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values.at(-1)).toBe(495);
  });

  it('replays pending historical growth before a realtime bar can commit', () => {
    const result = run(
      `//@version=6
indicator("late before live")
var count = 0
count += 1
offset = bar_index == 698 ? 600 : 1
plot(close[offset], "Past")
plot(count, "Count")`,
      700,
      { realtimeLastBar: { isNew: true } },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Past').values[698]).toBe(98);
    expect(getPlot(result, 'Past').values[699]).toBe(698);
    expect(getPlot(result, 'Count').values).toEqual(bars.map((_, index) => index + 1));
  });

  it('does not enter realtime while the historical pass is incomplete', () => {
    const history = new HistoryBufferSizing();
    let committed = 0;
    history.run(() => {
      const deps = history.dependencies(499, () => false);
      const series = new deps.NumericSeries(500, 499, 'late-before-realtime');
      for (let index = 0; index < 700; index++) {
        history.beginBar(index, false);
        series.push(index);
      }
      series.get(600);
      history.beginBar(700, true);
      committed++;
    });
    expect(committed).toBe(1);
  });

  it('publishes a terminal error only after pending growth has been replayed', () => {
    const history = new HistoryBufferSizing();
    let attempts = 0;
    expect(() =>
      history.run(() => {
        attempts++;
        const deps = history.dependencies(499, () => false);
        const series = new deps.NumericSeries(500, 499, 'late-error');
        for (let index = 0; index < 700; index++) {
          history.beginBar(index, false);
          series.push(index);
        }
        const value = series.get(600);
        throw new Error(`terminal:${value}`);
      }),
    ).toThrow('terminal:99');
    expect(attempts).toBe(2);
  });
});
