import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { BBW, CMO, EMA, KC, RMA, RSI, WPR } from './ta-classes';

// Strict binary64 expectations derived independently from the operation orders
// established by the historical TradingView captures and noise-forms reports.
// These small inputs distinguish equivalent forms without tolerance checks.
describe('Captured TA arithmetic', () => {
  it('uses the captured EMA seed and source mask across compiled call forms', () => {
    const bars = [0.1, 0.2, 0.3, 0.4, 0.5].map((close, index) => ({
      time: index * 120000, open: close, high: close, low: close, close, volume: 1,
    }));
    const result = executeScript(parse(`//@version=6
indicator("Captured EMA")
f(s, n) =>
    ta.ema(s, n)
length = input.int(3)
source = bar_index == 3 ? na : close
plot(ta.ema(source, 3), "Static")
plot(ta.ema(source=source, length=3), "Named")
plot(ta.ema(source, length), "Input")
plot(f(source, length), "Function")`), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(4);
    for (const plot of result.plots) {
      expect(plot.values).toEqual([null, null, 0.19999999999999998, null, 0.35]);
    }
  });

  it('masks an EMA source hole while preserving its seed and rollback state', () => {
    const ema = new EMA(3, true, true);
    ema.compute(0.1);
    ema.compute(0.2);
    expect(ema.compute(0.3)).toBe(0.19999999999999998);
    const seeded = ema.save();
    expect(ema.compute(NaN)).toBeNaN();
    expect(ema.recompute(0.5)).toBe(0.35);
    ema.restore(seeded);
    expect(ema.compute(NaN)).toBeNaN();
    expect(ema.compute(0.5)).toBe(0.35);
  });

  it('pauses RSI across invalid adjacent changes and restores source holes', () => {
    const rsi = new RSI(2);
    rsi.compute(10);
    rsi.compute(12);
    expect(rsi.compute(11)).toBe(66.66666666666666);
    const beforeHole = rsi.save();
    expect(rsi.compute(NaN)).toBeNaN();
    const afterHole = rsi.save();
    expect(rsi.compute(100)).toBeNaN();
    expect(rsi.recompute(101)).toBeNaN();
    rsi.restore(afterHole);
    expect(rsi.compute(100)).toBeNaN();
    // The resumed gain/loss RMAs are 3 and 0.25: no 11-to-100 bridge.
    expect(rsi.compute(105)).toBe(92.3076923076923);
    rsi.restore(beforeHole);
    rsi.compute(NaN);
    expect(rsi.recompute(13)).toBe(85.71428571428571);
  });

  it('seeds RSI from valid adjacent changes across initial holes', () => {
    const rsi = new RSI(2);
    expect(rsi.compute(10)).toBeNaN();
    expect(rsi.compute(NaN)).toBeNaN();
    expect(rsi.compute(20)).toBeNaN();
    expect(rsi.compute(21)).toBeNaN();
    expect(rsi.compute(20)).toBe(50);
  });

  it('scales the WPR distance from the high before dividing by the range', () => {
    const wpr = new WPR(1);
    expect(wpr.compute(1, -2, 0)).toBe(-33.333333333333336);
    // Division first gives -33.33333333333333.
    expect(wpr.recompute(1, -2, 0)).toBe(-33.333333333333336);
    const snap = wpr.save();
    wpr.compute(1, -2, 1);
    wpr.restore(snap);
    expect(wpr.compute(1, -2, 0)).toBe(-33.333333333333336);
  });

  it('scales the CMO gain/loss difference before dividing by the total', () => {
    // v1 CMO captures distinguish multiplication before division. These
    // independently chosen changes produce gain=1, loss=2 without sum noise.
    const cmo = new CMO(2);
    cmo.compute(0);
    cmo.compute(1);
    const snap = cmo.save();
    expect(cmo.compute(-1)).toBe(-33.333333333333336);
    // Division first gives -33.33333333333333.
    expect(cmo.recompute(-1)).toBe(-33.333333333333336);
    cmo.restore(snap);
    expect(cmo.compute(-1)).toBe(-33.333333333333336);
  });
  it('multiplies the previous RMA by length - 1 before adding and dividing', () => {
    const rma = new RMA(3);
    rma.compute(1);
    rma.compute(1);
    expect(rma.compute(1)).toBe(1);
    expect(rma.compute(2)).toBe(1.3333333333333333);
    // The old alpha-weighted form gives 1.3333333333333335.
    expect(rma.recompute(2)).toBe(1.3333333333333333);
  });

  it('adds the scaled source difference to the previous EMA', () => {
    const ema = new EMA(5);
    for (let i = 0; i < 4; i++) expect(ema.compute(1)).toBeNaN();
    expect(ema.compute(1)).toBe(1);
    expect(ema.compute(0.1)).toBe(0.7);
    // The old alpha-weighted form gives 0.7000000000000001.
    expect(ema.recompute(0.1)).toBe(0.7);
  });

  it('seeds the captured KC EMA surface with a compensated SMA', () => {
    const kc = new KC(3, 2, false);
    expect(kc.compute(0.1, 1, 0, 0.1)[0]).toBeNaN();
    expect(kc.compute(0.2, 1, 0, 0.2)[0]).toBeNaN();
    expect(kc.compute(0.3, 1, 0, 0.3)[0]).toBe(0.19999999999999998);
    // Sequential addition / 3 gives 0.20000000000000004.
    expect(kc.recompute(0.3, 1, 0, 0.3)[0]).toBe(0.19999999999999998);
  });

  it('restores KC seed compensation and sample count across rollback and holes', () => {
    const kc = new KC(3, 2, false);
    kc.compute(1, 1, 0, 1);
    kc.compute(2 ** -53, 1, 0, 2 ** -53);
    const snap = kc.save();
    expect(kc.compute(-1, 1, 0, -1)[0]).toBe(3.700743415417188e-17);
    expect(kc.recompute(1, 1, 0, 1)[0]).toBe(0.6666666666666666);
    kc.restore(snap);
    expect(kc.compute(NaN, 1, 0, NaN)[0]).toBeNaN();
    expect(kc.compute(-1, 1, 0, -1)[0]).toBe(3.700743415417188e-17);
  });

  it('retains the integrated EMA seed and missing-source output mask', () => {
    const ema = new EMA(3);
    expect(ema.compute(0.1)).toBeNaN();
    expect(ema.compute(NaN)).toBeNaN();
    expect(ema.compute(0.2)).toBeNaN();
    expect(ema.compute(0.3)).toBe(0.19999999999999998);
    expect(ema.compute(NaN)).toBeNaN();
  });

  it('keeps explicit first-source EMA mode available', () => {
    const ema = new EMA(3, false, false);
    expect(ema.compute(0.1)).toBe(0.1);
    expect(ema.compute(NaN)).toBe(0.1);
  });

  it('starts the KC true-range seed after a previous close is available', () => {
    const kc = new KC(3, 2);
    kc.compute(1, 2, 0, 1);
    kc.compute(1, 2, 0, 1);
    expect(kc.compute(1, 2, 0, 1)[1]).toBeNaN();
    expect(kc.compute(1, 2, 0, 1)).toEqual([1, 5, -3]);
  });

  it('seeds the KC range from chart prices independently of source holes', () => {
    const kc = new KC(2, 1);
    kc.compute(1, 1, 1, 1);
    kc.compute(1, 2, 0, 1);
    // True ranges 2 and 4 seed to 3 even when the indicator source is na.
    // Native CF041 masks the basis and bands on that source hole.
    expect(kc.compute(NaN, 3, -1, 1)).toEqual([NaN, NaN, NaN]);
    // Length 2 gives alpha 2/3; retained range 3 advances toward span 2.
    const range = 3 + (2 / 3) * (2 - 3);
    expect(kc.compute(1, 2, 0, 1)).toEqual([1, 1 + range, 1 - range]);
  });

  it('divides BBW by the basis before converting to percent', () => {
    const bbw = new BBW(3, 2);
    bbw.compute(1);
    bbw.compute(2);
    // Native raw moments use total 7 and squared total 21. Unlike the old
    // decimal inputs, this still distinguishes BBW's operation order:
    // multiplication before division gives 213.8089935299394.
    expect(bbw.compute(4)).toBe(213.80899352993939);
    expect(bbw.recompute(4)).toBe(213.80899352993939);
    const mean = 7 / 3;
    const width = 2 * 2 * Math.sqrt(21 / 3 - mean * mean);
    expect((width / mean) * 100).toBe(213.80899352993939);
    expect((width * 100) / mean).not.toBe(213.80899352993939);
  });
});
