import type { CompiledBarContext, GeneratedScriptInstance } from './compile';

import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';
import { parseRuntimeSessionDescriptor } from './runtimeSessionDescriptor';

function sessionValues(session: string, times: number[], version = 6, timezone = 'UTC') {
  const declaration = version === 4 ? 'study' : 'indicator';
  const compiled = tryCompile(
    parse(
      `//@version=${version}\n${declaration}("session control")\nplot(time("2", ${JSON.stringify(session)}, ${JSON.stringify(timezone)}))`,
    ),
  );
  expect(compiled.success).toBe(true);
  const bars = times.map((time) => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 }));
  const result = executeCompiled(compiled, bars, undefined, {
    runtime: { syminfo: { timezone: 'UTC' }, timeframe: { period: '2' } },
  })!;
  expect(result.errors).toEqual([]);
  return result.plots[0]!.values;
}

describe('session descriptor reuse', () => {
  it('parses a repeated bounded period once', () => {
    const compiled = tryCompile(
      parse('//@version=6\nindicator("session parsing")\nplot(time("60", "1017-1143:24", "UTC"))'),
    );
    expect(compiled.success).toBe(true);
    const bars = Array.from({ length: 16 }, (_, i) => ({
      time: Date.UTC(2024, 0, 3, i),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    const original = RegExp.prototype.exec;
    let parses = 0;
    const spy = vi.spyOn(RegExp.prototype, 'exec').mockImplementation(function (this: RegExp, value: string) {
      if (this.source === '^(\\d{4})-(\\d{4})$' && value === '1017-1143') parses++;
      return original.call(this, value);
    });
    try {
      const result = executeCompiled(compiled, bars)!;
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values.filter((value) => value !== null)).toHaveLength(1);
      expect(parses).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('freezes every shared descriptor layer against mutation leakage', () => {
    const descriptor = parseRuntimeSessionDescriptor('0930-1600,2000-0100:23456');
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(Object.isFrozen(descriptor.periods)).toBe(true);
    expect(Object.isFrozen(descriptor.periods[0])).toBe(true);
    expect(Reflect.set(descriptor, 'days', '1')).toBe(false);
    expect(Reflect.set(descriptor.periods, '0', null)).toBe(false);
    expect(Reflect.set(descriptor.periods[0]!, 'start', 0)).toBe(false);
    expect(parseRuntimeSessionDescriptor('0930-1600,2000-0100:23456')).toBe(descriptor);
    expect(descriptor.days).toBe('23456');
    expect(descriptor.periods[0]).toEqual({ start: 570, end: 960 });
  });

  it('uses exact keys and evicts the oldest of 256 descriptors', () => {
    const first = parseRuntimeSessionDescriptor('0713-0847:7654321');
    expect(parseRuntimeSessionDescriptor('0713-0847:7654321')).toBe(first);
    expect(parseRuntimeSessionDescriptor(' 0713-0847:7654321')).not.toBe(first);
    for (let i = 1; i <= 256; i++) parseRuntimeSessionDescriptor(`0713-0847:${'1'.repeat(i)}`);
    const replaced = parseRuntimeSessionDescriptor('0713-0847:7654321');
    expect(replaced).not.toBe(first);
    expect(replaced).toEqual(first);
  });

  it('preserves aliases, invalid syntax and period order', () => {
    for (const session of ['', ' Regular ', 'EXTENDED', 'session.regular', 'SESSION.EXTENDED', '24X7']) {
      expect(parseRuntimeSessionDescriptor(session).unrestricted).toBe(true);
    }
    for (const session of [':123', '0900-1000:', '0900-1000:8', 'bad', '2460-2500']) {
      const descriptor = parseRuntimeSessionDescriptor(session);
      expect(descriptor.unrestricted).toBe(false);
      expect(descriptor.periods.every((period) => period === null)).toBe(true);
    }
    const ordered = parseRuntimeSessionDescriptor('bad, 0900-1000,1100-1200:234:ignored');
    expect(ordered.days).toBe('234');
    expect(ordered.periods).toEqual([null, { start: 540, end: 600 }, { start: 660, end: 720 }]);
  });

  it('retains version defaults and exclusive endpoints', () => {
    const times = [Date.UTC(2024, 0, 7, 9), Date.UTC(2024, 0, 8, 9), Date.UTC(2024, 0, 8, 10)];
    expect(sessionValues('0900-1000', times, 4)).toEqual([null, times[1], null]);
    for (const version of [5, 6])
      expect(sessionValues('0900-1000', times, version)).toEqual([times[0], times[1], null]);
  });

  it('retains overnight and same-start/end day attribution', () => {
    const times = [
      Date.UTC(2024, 0, 7, 21),
      Date.UTC(2024, 0, 7, 22),
      Date.UTC(2024, 0, 8, 1),
      Date.UTC(2024, 0, 8, 2),
    ];
    expect(sessionValues('2200-0200:2', times)).toEqual([null, times[1], times[2], null]);
    expect(sessionValues('2200-2200:2', times)).toEqual([null, times[1], times[2], times[3]]);
  });

  it('re-evaluates changing zones and DST for reused syntax', () => {
    const compiled = tryCompile(parse('//@version=6\nindicator("zone changes")\nplot(time("2", "0900-1000"))'));
    const original = compiled.ScriptClass.prototype.onBar;
    const spy = vi.spyOn(compiled.ScriptClass.prototype, 'onBar').mockImplementation(function (
      this: GeneratedScriptInstance,
      value: unknown,
    ) {
      const ctx = value as CompiledBarContext;
      ctx.syminfo.timezone = ctx.barIndex % 2 === 0 ? 'UTC' : 'GMT+9';
      original.call(this, ctx);
    });
    const times = Array.from({ length: 4 }, (_, i) => Date.UTC(2024, 0, 8, 9, i * 2));
    try {
      const result = executeCompiled(
        compiled,
        times.map((time) => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 1 })),
        undefined,
        { runtime: { timeframe: { period: '2' } } },
      )!;
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([times[0], null, times[2], null]);
    } finally {
      spy.mockRestore();
    }
    const dst = [
      Date.UTC(2024, 2, 10, 6, 30),
      Date.UTC(2024, 2, 10, 7),
      Date.UTC(2024, 10, 3, 5, 30),
      Date.UTC(2024, 10, 3, 6, 30),
    ];
    expect(sessionValues('0130-0200', dst, 6, 'America/New_York')).toEqual([dst[0], null, dst[2], dst[3]]);
  });

  it('keeps dynamic sessions, prefixes and restarts independent', () => {
    const compiled = tryCompile(
      parse(
        '//@version=6\nindicator("dynamic sessions")\ns = bar_index % 2 == 0 ? "0900-1000" : "1100-1200"\nplot(time("2", s, "UTC"))',
      ),
    );
    const bars = Array.from({ length: 4 }, (_, i) => ({
      time: Date.UTC(2024, 0, 8, 9, i * 2),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    const prefix = executeCompiled(compiled, bars.slice(0, 2))!;
    for (let repeat = 0; repeat < 2; repeat++) {
      const result = executeCompiled(compiled, bars)!;
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual([bars[0]!.time, null, bars[2]!.time, null]);
      expect(result.plots[0]!.values.slice(0, 2)).toEqual(prefix.plots[0]!.values);
    }
  });

  it('shares syntax without sharing chart and requested membership', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("requested sessions")
hit() => not na(time("2", "0900-1000", syminfo.timezone))
plot(hit() ? 1 : 0)
plot(request.security("NEWYORK", "2", hit()) ? 1 : 0)`),
    );
    const bars = Array.from({ length: 4 }, (_, i) => ({
      time: Date.UTC(2024, 0, 8, 9, i * 2),
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    const result = executeCompiled(compiled, bars, undefined, {
      runtime: { syminfo: { timezone: 'UTC' }, timeframe: { period: '2' } },
      requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'NEWYORK', timeframe: '2', bars, syminfo: { timezone: 'America/New_York' } },
      ]),
    })!;
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ]);
  });
});
