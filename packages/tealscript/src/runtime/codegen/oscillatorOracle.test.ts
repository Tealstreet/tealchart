import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { BBW, CCI, CMO, Dev, EMA, Highest, KC, KCW, Lowest, Stoch, Sum } from './ta-classes';

const normalized = (values: number[]) => values.map((value) => (Number.isNaN(value) ? null : value));

describe('oscillator capture contracts on small independent inputs', () => {
  it('expresses BBW as a percentage of its basis', () => {
    const bbw = new BBW(2, 2);
    expect(Number.isNaN(bbw.compute(1))).toBe(true);
    // mean=2, population deviation=1, width=4: 100*4/2.
    expect(bbw.compute(3)).toBe(200);
  });

  it('seeds EMA with the first length valid samples and emits na without discarding state', () => {
    const ema = new EMA(3);
    expect(normalized([3, 6, 9, NaN, 12, 15].map((value) => ema.compute(value)))).toEqual([null, null, 6, null, 9, 12]);
    const pending = new EMA(3);
    pending.compute(3);
    pending.compute(6);
    expect(pending.compute(9)).toBe(6);
    // Same-bar replacement must replace the seed sample, not advance another bar.
    expect(pending.recompute(12)).toBe(7);
    expect(pending.compute(15)).toBe(11);
  });

  it('keeps Keltner true range independent of a missing explicit source', () => {
    const kc = new KC(3, 2, true);
    const width = new KCW(3, 2, true);
    const results = [10, 12, 14, 16, 18].map((close, index) => {
      const source = index === 3 ? NaN : close;
      return {
        bands: normalized(kc.compute(source, close + 1, close - 1, close)),
        width: width.compute(source, close + 1, close - 1, close),
      };
    });
    // Basis seeds at index2; ta.tr is initially na, so its EMA seeds at index3.
    expect(results.map((result) => result.bands)).toEqual([
      [null, null, null],
      [null, null, null],
      [12, null, null],
      [null, null, null],
      [15, 21, 9],
    ]);
    expect(results[4].width).toBeCloseTo(0.8, 12);
  });

  it('holds builtin stochastic output on a source hole while advancing the chart range', () => {
    const stoch = new Stoch(2);
    expect(
      normalized([stoch.compute(1, 2, 0), stoch.compute(3, 4, 2), stoch.compute(NaN, 8, 6), stoch.compute(7, 9, 5)]),
    ).toEqual([null, 75, 75, 50]);
  });

  it('requires a contiguous window for mean deviation and CCI after a hole', () => {
    const dev = new Dev(3);
    const cci = new CCI(3);
    const sources = [1, 2, 3, NaN, 4, 5, 6];
    const deviations = normalized(sources.map((value) => dev.compute(value)));
    const values = normalized(sources.map((value) => cci.compute(value)));
    expect(deviations).toEqual([null, null, 2 / 3, null, null, null, 2 / 3]);
    expect(values.slice(0, 2)).toEqual([null, null]);
    expect(values[2]).toBeCloseTo(100, 12);
    expect(values.slice(3, 6)).toEqual([null, null, null]);
    expect(values[6]).toBeCloseTo(100, 12);
  });

  it('computes CMO through the independently sampled gain and loss sums', () => {
    const cmo = new CMO(2);
    const source = [1, 2, 3, NaN, 4, 3, 5];
    const gains = new Sum(2);
    const losses = new Sum(2);
    const formula = source.map((value, index) => {
      const change = value - (source[index - 1] ?? NaN);
      const gain = gains.compute(change >= 0 ? change : 0);
      const loss = losses.compute(change >= 0 ? 0 : -change);
      if (index === 4) expect([gain, loss]).toEqual([0, 0]);
      return (100 * (gain - loss)) / (gain + loss);
    });
    // Missing changes advance gains with zero and skip losses; zero total is na.
    expect(normalized(formula)).toEqual([null, null, 100, 100, null, -100, 100 / 3]);
    expect(normalized(source.map((value) => cmo.compute(value)))).toEqual(normalized(formula));
  });

  it('resets extrema at a hole, resumes on partial recovery, and uses chart-bar startup', () => {
    const highest = new Highest(3);
    const lowest = new Lowest(3);
    const source = [9, 2, 4, NaN, 3, 5, 1];
    expect(normalized(source.map((value) => highest.compute(value)))).toEqual([null, null, 9, null, 3, 5, 5]);
    expect(normalized(source.map((value) => lowest.compute(value)))).toEqual([null, null, 2, null, 3, 3, 1]);
    const leading = new Highest(3);
    expect(normalized([NaN, 2, 4].map((value) => leading.compute(value)))).toEqual([null, null, 4]);
  });

  it('routes the corrected oscillator primitives through compiled execution', () => {
    const bars = [1, 2, 3, 4, 5, 6].map((close, index) => ({
      time: (index + 1) * 60000,
      open: close,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1,
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("small oscillator witness")
s = bar_index == 3 ? na : close
plot(ta.ema(s, 3), "ema")
plot(ta.dev(s, 3), "dev")
plot(ta.highest(s, 3), "highest")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, null, 2, null, 3.5, 4.75],
      [null, null, 2 / 3, null, null, null],
      [null, null, 3, null, 5, 6],
    ]);
  });
});
