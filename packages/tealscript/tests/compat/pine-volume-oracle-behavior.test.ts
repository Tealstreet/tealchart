import { describe, expect, it } from 'vitest';
import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { MFI, VWAP } from '../../src/runtime/codegen/ta-classes';
import type { Bar } from '../../src/runtime/context';

// Small, hand-built inputs. Expectations use the TradingView-captured policies
// documented in oracle-replay-v1/volume-vwap-v1/REPORT-v2.md, with arithmetic
// derived here independently; no capture rows or captured numeric vectors.
function run(body: string, closes: number[], times?: number[]) {
  const bars: Bar[] = closes.map((close, index) => ({
    time: times?.[index] ?? Date.UTC(2026, 0, 1) + index * 120000,
    open: close, high: close, low: close, close, volume: 1,
  }));
  const result = executeScript(parse(`//@version=6\nindicator("Volume policies")\n${body}`), bars,
    undefined, { runtime: { timeframe: { period: '2' }, syminfo: { timezone: 'Etc/UTC' } } });
  expect(result.errors).toEqual([]);
  return result.plots.map(plot => plot.values);
}

function expectValues(actual: (number | null)[], expected: (number | null)[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => {
    if (value === null) expect(actual[index]).toBeNull();
    else expect(actual[index]).toBeCloseTo(value, 10);
  });
}

describe('TradingView volume policies', () => {
  it('computes the VWAP variable and resets default calls at the daily boundary', () => {
    const times = [Date.UTC(2026, 0, 1, 23, 56), Date.UTC(2026, 0, 1, 23, 58),
      Date.UTC(2026, 0, 2), Date.UTC(2026, 0, 2, 0, 2)];
    const plots = run('plot(ta.vwap)\nplot(ta.vwap(close))\nplot(ta.vwap[1])', [10, 20, 30, 50], times);
    expectValues(plots[0], [10, 15, 30, 40]);
    expectValues(plots[1], [10, 15, 30, 40]);
    expectValues(plots[2], [null, 10, 15, 30]);
  });

  it('waits for an explicit first anchor, including a never-true anchor', () => {
    const plots = run('plot(ta.vwap(close, bar_index == 2))\nplot(ta.vwap(close, false))', [10, 20, 30, 50]);
    expectValues(plots[0], [null, null, 30, 40]);
    expectValues(plots[1], [null, null, null, null]);
  });

  it('poisons an anchor with a missing source until a valid reset, including bands', () => {
    const plots = run(`src = bar_index == 3 ? na : close
anchor = bar_index % 3 == 0
plot(ta.vwap(src, anchor))
[basis, upper, lower] = ta.vwap(src, anchor, 2.0)
plot(basis)
plot(upper)
plot(lower)`, [10, 10, 10, 20, 20, 20, 30]);
    for (const plot of plots) expectValues(plot, [10, 10, 10, null, null, null, 30]);
  });

  it('returns unavailable OBV/PVT on the first bar and preserves their accumulators', () => {
    const plots = run('plot(ta.obv)\nplot(ta.pvt)', [10, 20, 10]);
    expectValues(plots[0], [null, 1, 0]);
    expectValues(plots[1], [null, 1, 0.5]);
  });

  it('counts the initial MFI flow in both sums and skips source holes in the sums', () => {
    const plots = run('plot(ta.mfi(close, 2))', [10, 20, NaN, 15, 10]);
    expectValues(plots[0], [null, 75, 75, 70, 37.5]);
  });

  it('keeps MFI signed flows and returns 100 after a constant source seed leaves the window', () => {
    expectValues(run('plot(ta.mfi(close, 2))', [-100, 90, -100, 90])[0], [null, 100 / 11, -900, -900]);
    expectValues(run('plot(ta.mfi(close, 2))', [100, 100, 100, 100])[0], [null, 50, 100, 100]);
  });

  it('restores MFI and VWAP anchor state for replacement ticks and saved snapshots', () => {
    const mfi = new MFI(2);
    mfi.compute(10, 1);
    expect(mfi.compute(20, 1)).toBe(75);
    expect(mfi.recompute(10, 1)).toBe(50);
    const vwap = new VWAP(false, NaN);
    expect(vwap.compute(10, false, 1)).toBeNaN();
    const saved = vwap.save();
    expect(vwap.compute(20, true, 1)).toBe(20);
    expect(vwap.recompute(30, false, 1)).toBeNaN();
    vwap.restore(saved);
    expect(vwap.compute(40, false, 1)).toBeNaN();
  });

  it('reports no timeframe change before a previous bar exists', () => {
    expectValues(run('plot(timeframe.change("1D") ? 1 : 0)', [10, 20])[0], [0, 0]);
  });
});
