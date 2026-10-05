import { describe, expect, it, vi } from 'vitest';

import { parse as parsePine } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

async function freshParser() {
  vi.resetModules();
  return (await import('./runtimeTimeframeSpec')).parseRuntimeTimeframeSpec;
}

describe('runtime timeframe specification memo', () => {
  it('parses a repeated exact pair once and returns the same frozen spec', async () => {
    const parse = await freshParser();
    const trim = vi.spyOn(String.prototype, 'trim');
    try {
      const first = parse(' 15s ', '60');
      for (let i = 0; i < 100; i++) expect(parse(' 15s ', '60')).toBe(first);
      expect(trim).toHaveBeenCalledTimes(1);
      expect(Object.isFrozen(first)).toBe(true);
    } finally {
      trim.mockRestore();
    }
  });

  it('caches null failures without confusing absent entries', async () => {
    const parse = await freshParser();
    const trim = vi.spyOn(String.prototype, 'trim');
    try {
      expect(parse('invalid', '60')).toBeNull();
      expect(parse('invalid', '60')).toBeNull();
      expect(trim).toHaveBeenCalledTimes(1);
    } finally {
      trim.mockRestore();
    }
  });

  it('keeps raw spelling and current-period keys distinct', async () => {
    const parse = await freshParser();
    const first = parse('D', '60');
    expect(parse(' d ', '60')).toEqual(first);
    expect(parse(' d ', '60')).not.toBe(first);
    expect(parse('D', '120')).not.toBe(first);
    expect(parse('D|60', '120')).toBeNull();
    expect(parse('D', '60|120')).toEqual(first);
  });

  it('resolves empty timeframe from its exact current-period key', async () => {
    const parse = await freshParser();
    expect(parse('', ' 1d ')).toEqual({ period: '1D', multiplier: 1, unit: 'day' });
    expect(parse('', '120')).toEqual({ period: '120', multiplier: 120, unit: 'minute' });
    expect(parse(' ', '')).toEqual({ period: '60', multiplier: 60, unit: 'minute' });
    expect(parse('', 'invalid')).toBeNull();
    expect(parse('', ' 1d ')).toBe(parse('', ' 1d '));
  });

  it('evicts beyond 256 pairs with FIFO hits and removes empty inner maps', async () => {
    const parse = await freshParser();
    const oldest = parse('1', 'seed');
    const second = parse('2', 'seed');
    for (let i = 3; i <= 256; i++) parse(String(i), `chart${i}`);
    expect(parse('1', 'seed')).toBe(oldest);
    parse('257', 'chart257');
    expect(parse('2', 'seed')).toBe(second);
    expect(parse('1', 'seed')).not.toBe(oldest);
    const newSecond = parse('2', 'seed');
    expect(newSecond).not.toBe(second);
    expect(parse('2', 'seed')).toBe(newSecond);
  });

  it('counts recursive empty fallback and cached failures toward the same bound', async () => {
    const parse = await freshParser();
    const original = parse('', 'D');
    for (let i = 0; i < 255; i++) expect(parse(`invalid${i}`, '60')).toBeNull();
    expect(parse('D', '60')).not.toBe(original);
    expect(parse('', 'D')).not.toBe(original);
  });

  it('rejects mutation in strict mode and preserves subsequent reads', async () => {
    const parse = await freshParser();
    const spec = parse('D', '60')!;
    expect(() => {
      (spec as { multiplier: number }).multiplier = 99;
    }).toThrow(TypeError);
    expect(parse('D', '60')).toEqual({ period: 'D', multiplier: 1, unit: 'day' });
  });

  it.each([
    ['1T', 'tick', 1],
    ['1000T', 'tick', 1000],
    ['45s', 'second', 45],
    ['1440', 'minute', 1440],
    ['365D', 'day', 365],
    ['52W', 'week', 52],
    ['12M', 'month', 12],
  ])('retains valid unit and multiplier for %s', async (period, unit, multiplier) => {
    const parse = await freshParser();
    expect(parse(period, '60')).toEqual({ period: period.toUpperCase(), unit, multiplier });
  });

  it('retains invalid ranges and formats', async () => {
    const parse = await freshParser();
    for (const invalid of ['0', '1441', '2T', '2S', '366D', '53W', '13M', '-1', '1.5', '1H']) {
      expect(parse(invalid, '60')).toBeNull();
    }
  });

  it.each([5, 6])('uses frozen specs through runtime callers without mutation in v%s', (version) => {
    const ast = parsePine(`//@version=${version}
indicator("frozen timeframe callers")
plot(timeframe.in_seconds("D"))
plot(time("D"))
plot(time_close("D"))
plot(timeframe.change("D") ? 1 : 0)
plot(timeframe.in_seconds(""))`);
    const compiled = tryCompile(ast);
    expect(compiled.success).toBe(true);
    if (!compiled.success) throw new Error(compiled.unsupported.join('; '));
    const bars = [0, 1, 2].map((index) => ({
      time: Date.UTC(2024, 0, 1) + index * 60_000,
      open: 1,
      high: 2,
      low: 0,
      close: 1,
      volume: 10,
    }));
    const result = executeCompiled(compiled, bars, undefined, {
      runtime: { syminfo: { timezone: 'UTC' }, timeframe: { period: '1', multiplier: 1 } },
    })!;
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
    expect(result.plots[0].values).toEqual([86400, 86400, 86400]);
    expect(result.plots[4].values).toEqual([60, 60, 60]);
  });
});
