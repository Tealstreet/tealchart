import type { Bar } from '../../src/runtime';

import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { ExecutionContext, InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const times = [Date.UTC(2023, 11, 31, 23, 30), Date.UTC(2024, 0, 1, 0, 30), Date.UTC(2024, 2, 1)];
const bars: Bar[] = times.map((time, index) => ({ time, open: index + 1, high: index + 2, low: index, close: index + 1, volume: 100 }));
const requested = bars.map(bar => ({ ...bar, close: bar.close * 10 }));

function run(expression: string) {
  const compiled = tryCompile(parse(`//@version=6
indicator("Scalar capture demand")
f(float shift) =>
    request.security("ALT", "2", ${expression})
plot(f(11))
`));
  expect(compiled.success).toBe(true);
  const child = compiled.securityScripts?.get(0);
  expect(child).toBeDefined();
  let advances = 0;
  const advanceBar = ExecutionContext.prototype.advanceBar;
  const spy = vi.spyOn(ExecutionContext.prototype, 'advanceBar').mockImplementation(function (this: ExecutionContext) {
    if (this.syminfo.tickerid === 'ALT') advances += 1;
    return advanceBar.call(this);
  });
  try {
    const result = executeCompiled(compiled, bars, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'ALT', timeframe: '2', bars: requested }]),
      runtime: {
        syminfo: { ticker: 'CHART', tickerid: 'CHART', timezone: 'UTC' },
        timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true },
      },
    });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    return { child, advances, values: result?.plots[0].values };
  } finally {
    spy.mockRestore();
  }
}

describe('captured scalar requested builtin-context demand', () => {
  it('keeps captured parameter history without duplicate generic OHLC histories', () => {
    const result = run('close + nz(shift[1])');
    expect(result.values).toEqual([10, 31, 41]);
    expect(result.child?.independentScalarProgram).toBe(false);
    expect(result.advances).toBe(0);
  });

  it('reads explicit positional calendar timestamps without generic history', () => {
    const result = run('month(time, "America/New_York") + shift');
    expect(result.values).toEqual([23, 23, 13]);
    expect(result.advances).toBe(0);
  });

  it('reads explicit named calendar timestamps without generic history', () => {
    const result = run('year(time=time, timezone="UTC") + shift');
    expect(result.values).toEqual([2034, 2035, 2035]);
    expect(result.advances).toBe(0);
  });

  it('synchronizes default calendar timestamps across month and year boundaries', () => {
    const result = run('month() + shift');
    expect(result.values).toEqual([23, 12, 14]);
    expect(result.advances).toBeGreaterThan(0);
  });

  it('retains requested time-close history and adaptive history sizing', () => {
    const result = run('time_close[2] + shift');
    expect(result.values).toEqual([null, null, times[0] + 120_000 + 11]);
    expect(result.advances).toBeGreaterThan(0);
  });

  it('synchronizes reference helpers while retaining their requested values', () => {
    const result = run('array.get(array.from(close, shift), 0)');
    expect(result.values).toEqual([10, 20, 30]);
    expect(result.advances).toBeGreaterThan(0);
  });
});
