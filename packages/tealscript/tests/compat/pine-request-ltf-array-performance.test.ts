import type { Bar } from '../../src/runtime/context';
import type { RequestDatafeed } from '../../src/runtime/requestDatafeed';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

function bar(time: number, close: number): Bar {
  return { time, open: close, high: close, low: close, close, volume: 1 };
}

function run(requestBars: Bar[], chartBars: Bar[]) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("LTF array intervals")
values = request.security_lower_tf("REMOTE", "1", close)
plot(array.size(values), "Count")
plot(array.size(values) > 0 ? array.get(values, 0) : na, "First")
plot(array.size(values) > 0 ? array.get(values, array.size(values) - 1) : na, "Last")`),
  );
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const requestDatafeed: RequestDatafeed = {
    getBars: () => ({ ok: true, context: { symbol: 'REMOTE', timeframe: '1', bars: requestBars } }),
  };
  const started = performance.now();
  const result = executeCompiled(compiled, chartBars, undefined, {
    requestDatafeed,
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  const elapsedMs = performance.now() - started;
  if (!result) throw new Error('No compiled result');
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return { values: result.plots.map((plot) => plot.values), elapsedMs };
}

describe('lower-timeframe array collection interval cost', () => {
  it('keeps ordered duplicates and excludes the next interval endpoint', () => {
    expect(run([bar(0, 10), bar(0, 11), bar(60000, 12), bar(120000, 13)], [bar(0, 1), bar(120000, 2)]).values).toEqual([
      [3, 1],
      [10, 13],
      [12, 13],
    ]);
  });

  it('retains provider order for unordered timestamps', () => {
    expect(
      run([bar(60000, 12), bar(120000, 13), bar(0, 10), bar(60000, 11)], [bar(0, 1), bar(120000, 2)]).values,
    ).toEqual([
      [3, 1],
      [12, 13],
      [11, 13],
    ]);
  });

  it('retains missing values in the collected array', () => {
    expect(run([bar(0, NaN), bar(60000, 12)], [bar(0, 1)]).values).toEqual([[2], [null], [12]]);
  });

  it('does not scan the complete requested timeline for every chart bar', () => {
    let timeReads = 0;
    const requestBars = Array.from({ length: 4096 }, (_, index) => {
      const value = bar(index * 60000, index + 10);
      Object.defineProperty(value, 'time', {
        get() {
          timeReads++;
          return index * 60000;
        },
      });
      return value;
    });
    const chartBars = Array.from({ length: 256 }, (_, index) => bar(index * 120000, 1));
    const result = run(requestBars, chartBars);
    expect(result.values).toEqual([
      chartBars.map(() => 2),
      chartBars.map((_, i) => i * 2 + 10),
      chartBars.map((_, i) => i * 2 + 11),
    ]);
    console.log(JSON.stringify({ witness: 'ltf-array-4096x256', timeReads, elapsedMs: result.elapsedMs }));
    expect(timeReads).toBeLessThan(4096 * 20 + 256 * 80);
  });
});
