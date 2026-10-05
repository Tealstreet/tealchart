import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { PriceVolumeTrend } from '../../src/runtime/codegen/ta-classes';
import { executeScript } from '../../src/runtime/compiledOnly';

// Native v7 implicit-obv-pvt-wad-actual-chart-gaps-v6-v1 attempt2 (TVC:DXY).
// Source SHA31b68029b8d4d6bd74f34afacb7822593b43bda7fd28af88f90e8ec6e1cedca5.
const capturedBars = [
  { time: 1787522400000, open: 98.856, high: 98.887, low: 98.846, close: 98.882, volume: NaN },
  { time: 1787522520000, open: 98.881, high: 98.882, low: 98.858, close: 98.858, volume: NaN },
  { time: 1787522640000, open: 98.861, high: 98.861, low: 98.854, close: 98.854, volume: NaN },
];

describe('native PVT current volume publication', () => {
  it('keeps sustained unavailable chart volume missing beyond startup', () => {
    const result = executeScript(
      parse('//@version=6\nindicator("Native PVT missing volume")\nplot(ta.pvt, "PVT")'),
      capturedBars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, null]);
  });

  it('keeps legacy bare PVT missing for the same native chart inputs', () => {
    const result = executeScript(
      parse('//@version=4\nstudy("Legacy PVT missing volume")\nplot(pvt, "PVT")'),
      capturedBars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, null]);
  });

  it('retains finite-volume startup and cumulative increments', () => {
    const pvt = new PriceVolumeTrend();
    expect(pvt.compute(10, 10, 10, 10, 100)).toBeNaN();
    expect(pvt.compute(20, 20, 20, 20, 100)).toBe(100);
    expect(pvt.compute(10, 10, 10, 10, 100)).toBe(50);
  });

  it('restores the existing finite-volume accumulator and prior close', () => {
    const pvt = new PriceVolumeTrend();
    pvt.compute(10, 10, 10, 10, 100);
    pvt.compute(20, 20, 20, 20, 100);
    const snapshot = pvt.save();
    expect(pvt.compute(10, 10, 10, 10, 100)).toBe(50);
    pvt.restore(snapshot);
    expect(pvt.compute(30, 30, 30, 30, 100)).toBe(150);
  });
});
