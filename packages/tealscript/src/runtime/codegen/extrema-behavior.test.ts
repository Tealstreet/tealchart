import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { Highest, HighestBars, Lowest, LowestBars, PivotHigh, PivotLow } from './ta-classes';

// Small synthetic inputs only. Policies are discriminated by the TradingView
// extrema-barsago-v1 capture; no capture prices or CSV rows belong in tests.
function plots(source: string, values: number[]): (number | null)[][] {
  const bars = values.map((close, index) => ({
    time: (index + 1) * 60_000,
    open: close, high: close, low: close, close, volume: 1,
  }));
  const result = executeScript(parse(`//@version=6\nindicator("extrema")\n${source}`), bars);
  expect(result.errors).toEqual([]);
  expect(result.plots.every((plot) => plot.values.length === values.length)).toBe(true);
  return result.plots.map((plot) => plot.values);
}

const extrema = `plot(ta.highest(close, 3))
plot(ta.lowest(close, 3))
plot(ta.highestbars(close, 3))
plot(ta.lowestbars(close, 3))`;

describe('captured extrema behavior', () => {
  it('selects the oldest tied extremum in the physical window', () => {
    expect(plots(extrema, [2, 5, 5, 1, 1, 5, 5])).toEqual([
      [null, null, 5, 5, 5, 5, 5],
      [null, null, 2, 1, 1, 1, 1],
      [null, null, -1, -2, -2, 0, -1],
      [null, null, -2, 0, -1, -2, -2],
    ]);
  });

  it('stops at a hole and recovers without retaining pre-hole samples', () => {
    expect(plots(extrema, [9, 1, 5, NaN, 4, 3, 2, NaN, NaN, NaN, 7, 6])).toEqual([
      [null, null, 9, null, 4, 4, 4, null, null, null, 7, 7],
      [null, null, 1, null, 4, 3, 2, null, null, null, 7, 6],
      [null, null, -2, 0, 0, -1, -2, 0, 0, 0, 0, -1],
      [null, null, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]);
  });

  it('warms up by physical bars, including leading missing samples', () => {
    expect(plots(extrema, [NaN, NaN, NaN, NaN, 8, 7, 6])).toEqual([
      [null, null, null, null, 8, 8, 8],
      [null, null, null, null, 8, 7, 6],
      [null, null, 0, 0, 0, -1, -2],
      [null, null, 0, 0, 0, 0, 0],
    ]);
  });

  it('preserves length-one values and returns zero offsets on missing bars', () => {
    expect(plots(`plot(ta.highest(close, 1))
plot(ta.lowest(close, 1))
plot(ta.highestbars(close, 1))
plot(ta.lowestbars(close, 1))`, [NaN, 2, NaN, 1])).toEqual([
      [null, 2, null, 1], [null, 2, null, 1], [0, 0, 0, 0], [0, 0, 0, 0],
    ]);
  });

  it('propagates oldest ties and hole recovery into endpoint Aroon', () => {
    expect(plots(`plot(100.0 * (2 + ta.highestbars(high, 3)) / 2)
plot(100.0 * (2 + ta.lowestbars(low, 3)) / 2)`, [5, 5, 1, NaN, 2, 2, 3])).toEqual([
      [null, null, 0, 100, 100, 50, 100],
      [null, null, 100, 100, 100, 50, 0],
    ]);
  });

  it.each([
    { name: 'highest', TA: Highest, recomputed: 3, restored: 3 },
    { name: 'lowest', TA: Lowest, recomputed: 2, restored: 0 },
    { name: 'highestbars', TA: HighestBars, recomputed: -2, restored: -2 },
    { name: 'lowestbars', TA: LowestBars, recomputed: -1, restored: 0 },
  ])('$name restores history for recomputation and saved snapshots', ({ TA, recomputed, restored }) => {
    const ta = new TA(3);
    [1, 3, 2].forEach((value) => ta.compute(value));
    const saved = ta.save();
    ta.compute(NaN);
    expect(ta.recompute(2)).toBe(recomputed);
    ta.compute(100);
    ta.restore(saved);
    expect(ta.compute(0)).toBe(restored);
  });
});

describe('captured pivot behavior', () => {
  it.each([
    { name: 'high', sign: 1 },
    { name: 'low', sign: -1 },
  ])('accepts older-side equality and rejects newer-side equality for pivot $name', ({ name, sign }) => {
    const source = `plot(ta.pivot${name}(close, 2, 2))`;
    expect(plots(source, [1, 3, 3, 2, 1].map((value) => sign * value))[0]).toEqual([null, null, null, null, sign * 3]);
    expect(plots(source, [1, 2, 3, 3, 1].map((value) => sign * value))[0]).toEqual([null, null, null, null, null]);
  });

  it.each([
    { name: 'high', sign: 1 },
    { name: 'low', sign: -1 },
  ])('stops each pivot $name flank at its first hole', ({ name, sign }) => {
    const source = `plot(ta.pivot${name}(close, 2, 2))`;
    for (const values of [[9, NaN, 3, 2, 1], [1, 2, 3, NaN, 9], [9, NaN, 3, NaN, 9]]) {
      expect(plots(source, values.map((value) => sign * value))[0]).toEqual([null, null, null, null, sign * 3]);
    }
    // A missing candidate cannot be a pivot; a rejection before a hole still wins.
    for (const values of [[1, 2, NaN, 2, 1], [NaN, 9, 3, 2, 1], [1, 2, 3, 9, NaN]]) {
      expect(plots(source, values.map((value) => sign * value))[0]).toEqual([null, null, null, null, null]);
    }
  });

  it.each([
    { name: 'high', TA: PivotHigh, sign: 1 },
    { name: 'low', TA: PivotLow, sign: -1 },
  ])('pivot $name recomputes a replaceable flank without keeping the discarded hole', ({ TA, sign }) => {
    const ta = new TA(2, 2);
    [1, 2, 3, 2].forEach((value) => ta.compute(sign * value));
    const saved = ta.save();
    ta.compute(NaN);
    expect(ta.recompute(sign * 9)).toBeNaN();
    ta.restore(saved);
    expect(ta.compute(sign * 1)).toBe(sign * 3);
  });
});
