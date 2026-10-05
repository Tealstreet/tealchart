import type { CompiledBarContext, GeneratedScriptInstance } from './compile';

import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';
import * as timestampCache from './literalTimestampCache';

const bars = Array.from({ length: 16 }, (_, i) => ({
  time: Date.UTC(2024, 0, 2) + i * 3_600_000,
  open: 1,
  high: 1,
  low: 1,
  close: 1,
  volume: 1,
}));
function compile(body: string) {
  const compiled = tryCompile(parse(`//@version=6\nindicator("literal timestamps")\n${body}`));
  expect(compiled.success).toBe(true);
  return compiled;
}

describe('literal timestamp reuse', () => {
  it.each([
    ['no timestamp', 'close'],
    ['dynamic timestamp', 'timestamp(2024, 1, 2, bar_index, 0)'],
    ['unreached literal', 'bar_index < 0 ? timestamp("2024-01-02") : close'],
  ])('constructs no cache for %s in chart or requested execution', (_, expression) => {
    const compiled = compile(`plot(${expression})
plot(request.security("TOKYO", "60", ${expression}))`);
    const createCache = vi.spyOn(timestampCache, 'createLiteralTimestampCache');
    try {
      const result = executeCompiled(compiled, bars, undefined, {
        runtime: { timeframe: { period: '60' } },
        requestDatafeed: new InMemoryRequestDatafeed([
          { symbol: 'TOKYO', timeframe: '60', bars, syminfo: { timezone: 'Asia/Tokyo' } },
        ]),
      })!;
      expect(result.errors).toEqual([]);
      expect(createCache).not.toHaveBeenCalled();
    } finally {
      createCache.mockRestore();
    }
  });

  it('constructs one cache on first reached literal in each execution context', () => {
    const compiled = compile(`plot(bar_index < 2 ? 0 : timestamp("2024-01-02"))
plot(request.security("TOKYO", "60", timestamp("2024-01-02")))`);
    const createCache = vi.spyOn(timestampCache, 'createLiteralTimestampCache');
    try {
      for (let i = 0; i < 2; i++) {
        const result = executeCompiled(compiled, bars, undefined, {
          runtime: { timeframe: { period: '60' } },
          requestDatafeed: new InMemoryRequestDatafeed([
            { symbol: 'TOKYO', timeframe: '60', bars, syminfo: { timezone: 'Asia/Tokyo' } },
          ]),
        })!;
        expect(result.errors).toEqual([]);
        expect(result.plots[0]!.values).toEqual(bars.map((_, bar) => (bar < 2 ? 0 : Date.UTC(2024, 0, 2))));
        expect(result.plots[1]!.values).toEqual(bars.map(() => Date.UTC(2024, 0, 2)));
      }
      expect(createCache).toHaveBeenCalledTimes(4);
    } finally {
      createCache.mockRestore();
    }
  });

  it.runIf(process.env.TEALSCRIPT_PERF_ASSERT === '1')('parses a reached literal once per execution', () => {
    const compiled = compile('plot(timestamp("2024-01-02"))');
    const parseDate = vi.spyOn(Date, 'parse');
    try {
      for (let i = 0; i < 2; i++) {
        const result = executeCompiled(compiled, bars)!;
        expect(result.errors).toEqual([]);
        expect(result.plots[0]!.values).toEqual(bars.map(() => Date.UTC(2024, 0, 2)));
      }
      expect(parseDate.mock.calls.filter((args) => args[0] === '2024-01-02')).toHaveLength(2);
    } finally {
      parseDate.mockRestore();
    }
  });

  it('rechecks the effective zone on the same literal call site', () => {
    const compiled = compile('plot(timestamp(2024, 1, 2, 3, 4, 5))');
    const original = compiled.ScriptClass.prototype.onBar;
    const zones = ['UTC', 'GMT+9', 'America/New_York', 'UTC'];
    const reference: number[] = [];
    const onBar = vi.spyOn(compiled.ScriptClass.prototype, 'onBar').mockImplementation(function (
      this: GeneratedScriptInstance,
      ctxValue: unknown,
    ) {
      const ctx = ctxValue as CompiledBarContext;
      ctx.syminfo.timezone = zones[ctx.barIndex % zones.length]!;
      reference.push(ctx.timestamp([2024, 1, 2, 3, 4, 5]));
      original.call(this, ctx);
    });
    try {
      const result = executeCompiled(compiled, bars)!;
      expect(result.errors).toEqual([]);
      expect(result.plots[0]!.values).toEqual(reference);
      expect(new Set(reference).size).toBe(3);
    } finally {
      onBar.mockRestore();
    }
  });

  it('owns literal entries separately in each requested execution', () => {
    const compiled = compile(`stamp() => timestamp("2024-02-03")
plot(stamp())
plot(request.security("TOKYO", "60", stamp()))
plot(request.security("NEWYORK", "60", stamp()))`);
    const parseDate = vi.spyOn(Date, 'parse');
    try {
      const result = executeCompiled(compiled, bars, undefined, {
        runtime: { timeframe: { period: '60' }, syminfo: { timezone: 'Etc/UTC' } },
        requestDatafeed: new InMemoryRequestDatafeed([
          { symbol: 'TOKYO', timeframe: '60', bars, syminfo: { timezone: 'Asia/Tokyo' } },
          { symbol: 'NEWYORK', timeframe: '60', bars, syminfo: { timezone: 'America/New_York' } },
        ]),
      })!;
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual(
        [0, 1, 2].map(() => bars.map(() => Date.UTC(2024, 1, 3))),
      );
      expect(parseDate.mock.calls.filter((args) => args[0] === '2024-02-03')).toHaveLength(3);
    } finally {
      parseDate.mockRestore();
    }
  });

  it('keeps chart and different-zone requested instances independent', () => {
    const compiled = compile(`stamp() => timestamp(2024, 1, 2, 3, 4, 5)
yearValue = int(2024)
plot(stamp())
plot(timestamp(yearValue, 1, 2, 3, 4, 5))
plot(request.security("TOKYO", "60", stamp()))
plot(request.security("NEWYORK", "60", stamp()))
plot(request.security("TOKYO", "60", timestamp(yearValue, 1, 2, 3, 4, 5)))`);
    const result = executeCompiled(compiled, bars, undefined, {
      runtime: { syminfo: { timezone: 'GMT+2' }, timeframe: { period: '60' } },
      requestDatafeed: new InMemoryRequestDatafeed([
        { symbol: 'TOKYO', timeframe: '60', bars, syminfo: { timezone: 'Asia/Tokyo' } },
        { symbol: 'NEWYORK', timeframe: '60', bars, syminfo: { timezone: 'America/New_York' } },
      ]),
    })!;
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual(result.plots[1]!.values);
    expect(result.plots[2]!.values).toEqual(result.plots[4]!.values);
    expect(result.plots[2]!.values).toEqual(bars.map(() => Date.UTC(2024, 0, 1, 18, 4, 5)));
    expect(result.plots[3]!.values).toEqual(bars.map(() => Date.UTC(2024, 0, 2, 8, 4, 5)));
    expect(result.plots[0]!.values[0]).not.toBe(result.plots[2]!.values[0]);
  });

  it('matches uncached DST and named/default component evaluations', () => {
    const compiled = compile(`yearValue = int(2024)
plot(timestamp("America/New_York", 2024, 3, 10, 2, 30))
plot(timestamp("America/New_York", yearValue, 3, 10, 2, 30))
plot(timestamp(timezone="America/New_York", year=2024, month=11, day=3, hour=1, minute=30))
plot(timestamp(timezone="America/New_York", year=yearValue, month=11, day=3, hour=1, minute=30))
plot(timestamp(year=2024, month=1, day=2))
plot(timestamp(year=yearValue, month=1, day=2))`);
    const result = executeCompiled(compiled, bars, undefined, { runtime: { syminfo: { timezone: 'GMT+9' } } })!;
    expect(result.errors).toEqual([]);
    for (const [a, b] of [
      [0, 1],
      [2, 3],
      [4, 5],
    ])
      expect(result.plots[a!]!.values).toEqual(result.plots[b!]!.values);
  });

  it('retains changing operands and lazy branches', () => {
    const compiled = compile(`plot(timestamp("UTC", 2024, 1, 2, bar_index, 0))
plot(bar_index < 2 ? 0 : timestamp("2024-01-02"))`);
    const result = executeCompiled(compiled, bars)!;
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual(bars.map((_, i) => Date.UTC(2024, 0, 2, i)));
    expect(result.plots[1]!.values).toEqual(bars.map((_, i) => (i < 2 ? 0 : Date.UTC(2024, 0, 2))));
  });

  it('preserves missing parse results and independent prefixes', () => {
    const compiled = compile('plot(timestamp("invalid date"))\nplot(timestamp("2024-01-02"))');
    const prefix = executeCompiled(compiled, bars.slice(0, 5))!;
    const full = executeCompiled(compiled, bars)!;
    expect(prefix.errors).toEqual([]);
    expect(full.errors).toEqual([]);
    expect(full.plots[0]!.values).toEqual(bars.map(() => null));
    expect(full.plots[1]!.values.slice(0, 5)).toEqual(prefix.plots[1]!.values);
  });
});
