import { describe, expect, it } from 'vitest';

import { parse } from '../../parser/parser';
import { executeCompiled, tryCompile } from './execute';

function lastFlags(times: number[], extended = false) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Scheduled session end")
plot(session.islastbar ? 1 : 0, "Any")
plot(session.islastbar_regular ? 1 : 0, "Regular")`),
  );
  expect(compiled.success).toBe(true);
  const bars = times.map((time) => ({ time, open: 10, high: 11, low: 9, close: 10, volume: 1 }));
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: {
      syminfo: { tickerid: 'BATS:BRK.A', timezone: 'America/New_York' },
      timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      session: {
        regular: '0930-1600:23456',
        premarket: extended ? '0400-0930:23456' : '',
        postmarket: extended ? '1600-2000:23456' : '',
        timezone: 'America/New_York',
      },
    },
  });
  expect(result?.errors).toEqual([]);
  return result!.plots.map((plot) => plot.values);
}

const opening = Date.UTC(2026, 5, 26, 13, 30);

describe('scheduled final session interval', () => {
  it('marks an existing final interval before the next trading day', () => {
    expect(lastFlags([Date.UTC(2026, 5, 25, 19, 58), opening])).toEqual([
      [1, 0],
      [1, 0],
    ]);
  });

  it('does not mark an earlier interval when the final interval has no trades', () => {
    expect(lastFlags([Date.UTC(2026, 5, 25, 19, 56), opening])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it('does not treat the available dataset tail as the scheduled end', () => {
    expect(lastFlags([Date.UTC(2026, 5, 25, 19, 56)])).toEqual([[0], [0]]);
  });

  it('recognizes a final interval without a following bar', () => {
    expect(lastFlags([Date.UTC(2026, 5, 25, 19, 58)])).toEqual([[1], [1]]);
  });

  it('retains separate regular and extended closing boundaries', () => {
    expect(lastFlags([Date.UTC(2026, 5, 25, 19, 58), Date.UTC(2026, 5, 25, 23, 58)], true)).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });
});
