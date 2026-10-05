import { describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { collectCompiledRequestDataQueryCollection } from './execute';
import type { Bar } from '../context';

const bars: Bar[] = [7, 8].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));
const runtime = { syminfo: { tickerid: 'TEST:VALUE' }, timeframe: { period: '1' } };
const program = (call: string) => parse(`//@version=6\nindicator("footprint defaults")\nfp = ${call}\nplot(na(fp) ? na : footprint.total_volume(fp))`);

// The v6 manual requires ticks_per_row and defaults va_percent=70,
// imbalance_percent=300. A hand-written provider verifies routing, not TV data.
describe('footprint optional arguments', () => {
  it.each([
    ['request.footprint(2)', 70, 300],
    ['request.footprint(ticks_per_row=2)', 70, 300],
    ['request.footprint(ticks_per_row=2, imbalance_percent=250)', 70, 250],
    ['request.footprint(2, 60)', 60, 300],
  ] as const)('accepts and routes %s with default percentages', (call, valueAreaPercent, imbalancePercent) => {
    const ast = program(call);
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const datafeed = new InMemoryRequestDatafeed([]);
    const provider = vi.spyOn(datafeed, 'getFootprint').mockImplementation((query) => ({ time: query.time, totalVolume: 42 }));
    const result = executeScript(ast, bars, undefined, { requestDatafeed: datafeed, runtime });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([42, 42]);
    expect(provider).toHaveBeenCalledTimes(bars.length);
    expect(provider.mock.calls.map(([query]) => query)).toEqual(bars.map((bar) => ({
      symbol: 'TEST:VALUE', timeframe: '1', ticksPerRow: 2, valueAreaPercent, imbalancePercent, time: bar.time,
    })));
    const preload = collectCompiledRequestDataQueryCollection(ast, undefined, { runtime });
    expect(preload).toEqual({ queries: [{ kind: 'footprint', query: {
      symbol: 'TEST:VALUE', timeframe: '1', ticksPerRow: 2, valueAreaPercent, imbalancePercent, time: 0,
    } }], hasUnpreloadableQueries: false, unpreloadableReasons: [] });
  });

  it.each(['request.footprint()', 'request.footprint(va_percent=70)'])('still rejects missing required ticks_per_row in %s', (call) => {
    const errors = checkProgram(program(call)).diagnostics.filter((item) => item.severity === 'error');
    expect(errors.some((item) => /missing required argument 'ticks_per_row'/.test(item.message))).toBe(true);
  });

  it('preloads omitted percentages while retaining nonstatic explicit arguments', () => {
    const defaults = collectCompiledRequestDataQueryCollection(program('request.footprint(2)'), undefined, { runtime });
    expect(defaults.queries).toHaveLength(1);
    expect(defaults.hasUnpreloadableQueries).toBe(false);
    for (const call of ['request.footprint(2, math.round(68.1))', 'request.footprint(2, 70, math.round(305.1))']) {
      const script = program(call);
      expect(checkProgram(script).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      const dynamic = collectCompiledRequestDataQueryCollection(script, undefined, { runtime });
      expect(dynamic.queries).toEqual([]);
      expect(dynamic.unpreloadableReasons).toContain('request.footprint:non-static-routing');
    }
  });

  it('returns na for an unseeded provider with omitted optional arguments', () => {
    const ast = program('request.footprint(2)');
    expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    const result = executeScript(ast, bars, undefined, { runtime });
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null]);
    expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  });
});
