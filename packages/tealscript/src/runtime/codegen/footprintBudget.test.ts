import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import { InMemoryRequestDatafeed } from '../requestDatafeed';

const bars = [7, 8, 9].map((close, index) => ({
  time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
}));

function run(body: string, missing = false) {
  const ast = parse(`//@version=6\nindicator("Footprint budget")\n${body}`);
  expect(checkProgram(ast).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const datafeed = new InMemoryRequestDatafeed([
    { symbol: 'TEST:OTHER', timeframe: '1', bars },
    { symbol: 'TEST:CHART', timeframe: '1', bars },
    { symbol: 'TEST:OTHER', timeframe: '2', bars: bars.filter((_, index) => index !== 1) },
  ]);
  const provider = vi.spyOn(datafeed, 'getFootprint').mockImplementation((query) => missing ? undefined : ({
    time: query.time, totalVolume: query.ticksPerRow + query.valueAreaPercent,
  }));
  const result = executeScript(ast, bars, undefined, {
    requestDatafeed: datafeed,
    runtime: { syminfo: { tickerid: 'TEST:CHART' }, timeframe: { period: '1' } },
  });
  return { result, provider };
}

function expectLimit(body: string, missing = false) {
  const { result } = run(body, missing);
  expect(result.errors).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'runtime.error', message: expect.stringMatching(/footprint/i) }),
  ]));
}

// https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/
// Requesting footprints on other datasets: output-dependent copies share the one-unique-call limit.
describe('execution-wide footprint budget', () => {
  it.each(['3', '2, 80', '2, 70, 400'])('counts distinct parameters: %s', (second) => {
    expectLimit(`first = request.footprint(2)
second = request.footprint(${second})
plot(footprint.total_volume(first))
plot(footprint.total_volume(second))`);
  });

  it('counts requests even when the provider has no footprint', () => {
    expectLimit(`plot(footprint.total_volume(request.footprint(2)))
plot(footprint.total_volume(request.footprint(3)))`, true);
  });

  it('shares the budget between chart and requested contexts', () => {
    expectLimit(`plot(footprint.total_volume(request.footprint(2)))
plot(request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2))))`);
  });

  it('shares the budget across two requested contexts', () => {
    expectLimit(`plot(request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2))))
plot(request.security("TEST:OTHER", "2", footprint.total_volume(request.footprint(2))))`);
  });

  it('counts distinct calls inside a requested expression', () => {
    expectLimit(`plot(request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2)) + footprint.total_volume(request.footprint(3))))`);
  });

  it('reuses a single request across bars and repeated getter reads', () => {
    const { result, provider } = run(`fp = request.footprint(ticks_per_row = 2)
plot(footprint.total_volume(fp))
plot(footprint.total_volume(fp))`);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[72, 72, 72], [72, 72, 72]]);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it('discards a footprint declaration unused by outputs', () => {
    const { result, provider } = run(`unused = request.footprint(3)
fp = request.footprint(2)
plot(footprint.total_volume(fp))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
    expect(provider.mock.calls.map(([query]) => query.ticksPerRow)).toEqual([2, 2, 2]);
  });

  it('discards the chart copy when only the requested copy reaches an output', () => {
    const { result, provider } = run(`fp = request.footprint(2)
volume = footprint.total_volume(fp)
plot(request.security("TEST:OTHER", "1", volume))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
    expect(provider.mock.calls.map(([query]) => query.symbol)).toEqual(['TEST:OTHER', 'TEST:OTHER', 'TEST:OTHER']);
  });

  it('retains both copies when both reach outputs', () => {
    expectLimit(`fp = request.footprint(2)
volume = footprint.total_volume(fp)
plot(volume)
plot(request.security("TEST:OTHER", "1", volume))`);
  });
  it('retains footprint dependencies reached through a UDF', () => {
    const { result } = run(`fp = request.footprint(2)
f() => footprint.total_volume(fp)
plot(f())`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
  });

  it('shares the budget with a deeper nested request', () => {
    expectLimit(`plot(footprint.total_volume(request.footprint(2)))
plot(request.security("TEST:CHART", "1", request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2)))))`);
  });

  it('shares the budget with lower-timeframe requested evaluation', () => {
    expectLimit(`plot(footprint.total_volume(request.footprint(2)))
values = request.security_lower_tf("TEST:OTHER", "1", footprint.total_volume(request.footprint(2)))
plot(array.sum(values))`);
  });

  it('does not count the time of each bar as a distinct footprint', () => {
    const { result, provider } = run(`plot(request.security("TEST:OTHER", "1", footprint.total_volume(request.footprint(2))))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it('does not discard a needed footprint because a UDF declares a same-name local', () => {
    const { result } = run(`fp = request.footprint(2)
f() =>
    fp = 1
    fp
plot(footprint.total_volume(fp) + f())`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([73, 73, 73]);
  });

  it('retains a footprint used by a plot ID declaration', () => {
    const { result } = run(`fp = request.footprint(2)
p = plot(footprint.total_volume(fp))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
  });

  it('retains a footprint used by a drawing declaration', () => {
    const { result, provider } = run(`fp = request.footprint(2)
l = label.new(bar_index, footprint.total_volume(fp))`);
    expect(result.errors).toEqual([]);
    expect(provider).toHaveBeenCalledTimes(3);
    expect(result.drawings).toHaveLength(3);
  });

  it('discards the requested copy when only the chart copy reaches an output', () => {
    const { result, provider } = run(`fp = request.footprint(2)
value = footprint.total_volume(fp)
requestedValue = request.security("TEST:OTHER", "1", value)
plot(value)`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
    expect(provider.mock.calls.map(([query]) => query.symbol)).toEqual(['TEST:CHART', 'TEST:CHART', 'TEST:CHART']);
  });

  it('retains a footprint embedded directly in a plot ID initializer', () => {
    const { result, provider } = run(`p = plot(footprint.total_volume(request.footprint(2)))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([72, 72, 72]);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it('counts distinct footprints embedded directly in plot ID initializers', () => {
    expectLimit(`p = plot(footprint.total_volume(request.footprint(2)))
q = plot(footprint.total_volume(request.footprint(3)))`);
  });

});
