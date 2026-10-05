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
indicator("LTF selection")
plot(request.security("REMOTE", "1", close, lookahead=barmerge.lookahead_on), "First")
plot(request.security("REMOTE", "1", close, lookahead=barmerge.lookahead_off), "Last")`),
  );
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const requestDatafeed: RequestDatafeed = {
    getBars: () => ({ ok: true, context: { symbol: 'REMOTE', timeframe: '1', bars: requestBars } }),
  };
  const result = executeCompiled(compiled, chartBars, undefined, {
    requestDatafeed,
    runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
  });
  if (!result) throw new Error('No compiled result');
  expect(result.errors).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('lower-timeframe selection preserves input order and interval endpoints', () => {
  it.each([
    [
      'ordered duplicates',
      [bar(0, 10), bar(0, 11), bar(60000, 12), bar(120000, 13)],
      [
        [10, 13],
        [12, 13],
      ],
    ],
    [
      'unordered duplicates',
      [bar(60000, 12), bar(120000, 13), bar(0, 10), bar(60000, 11)],
      [
        [12, 13],
        [11, 13],
      ],
    ],
    [
      'empty intervals',
      [bar(-60000, 9), bar(240000, 14)],
      [
        [null, null],
        [null, null],
      ],
    ],
    [
      'missing selected values',
      [bar(0, NaN), bar(60000, 12), bar(120000, NaN)],
      [
        [null, null],
        [12, null],
      ],
    ],
  ] as const)('%s', (_, requestBars, expected) => {
    expect(run([...requestBars], [bar(0, 1), bar(120000, 2)])).toEqual(expected);
  });

  it('reads fresh timestamps and values when a provider array is reused in a later execution', () => {
    const requestBars = [bar(0, 10), bar(60000, 11)];
    expect(run(requestBars, [bar(0, 1)])).toEqual([[10], [11]]);
    requestBars[0] = bar(120000, 20);
    requestBars[1] = bar(0, 21);
    expect(run(requestBars, [bar(0, 1)])).toEqual([[21], [21]]);
  });

  it('does not reread the complete ordered requested dataset for every chart bar', () => {
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
    expect(result).toEqual([chartBars.map((_, index) => index * 2 + 10), chartBars.map((_, index) => index * 2 + 11)]);
    expect(timeReads).toBeLessThan(4096 * 20 + 256 * 80);
  });
});
