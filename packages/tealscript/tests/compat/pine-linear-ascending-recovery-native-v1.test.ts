import { describe, expect, it } from 'vitest';

import { PercentileLinearInterpolation } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// Native v6 linear-hole-order-ascending-len4-v1 attempt1, bars 12..18.
// Source SHA65dccfe743c06130; capture SHA7421620707fcbece.
const recovery = [null, null, null, 114.5, 115.5, 116.5, 117.5];
const sourceAt = (index: number) => (index === 12 || index === 13 ? NaN : 100 + index);

describe('native ascending linear-percentile recovery', () => {
  it('publishes the captured upper ranks while physical missing slots remain', () => {
    const percentile = new PercentileLinearInterpolation(4, 75);
    const values = Array.from({ length: 19 }, (_, index) => percentile.compute(sourceAt(index)));
    expect(values.slice(12).map((value) => (Number.isNaN(value) ? null : value))).toEqual(recovery);
  });

  it('retains the captured recovery through replacement and snapshot restoration', () => {
    const percentile = new PercentileLinearInterpolation(4, 75);
    const values: Array<number | null> = [];
    for (let index = 0; index < 19; index += 1) {
      const snapshot = percentile.save();
      percentile.compute(sourceAt(index));
      percentile.recompute(NaN);
      percentile.recompute(sourceAt(index));
      percentile.restore(snapshot);
      const value = percentile.compute(sourceAt(index));
      values.push(Number.isNaN(value) ? null : value);
    }
    expect(values.slice(12)).toEqual(recovery);
  });

  it('publishes the captured values through a compiled Pine call', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Linear recovery")
phase = bar_index % 64
src = phase == 12 or phase == 13 ? na : 100.0 + phase
plot(ta.percentile_linear_interpolation(src, 4, 75.0), "RECOVERY")`,
      {
        bars: Array.from({ length: 19 }, (_, index) => ({
          time: 1788134400 + index * 120,
          open: 1,
          high: 2,
          low: 0,
          close: 1,
          volume: 1,
        })),
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'RECOVERY').values.slice(12)).toEqual(recovery);
  });
});
