import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native coverage-tad-1-v1.csv, rma_hole_reference, rows 0-43:
// packages/tealscript/oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv
// The nested SMA is called at startup and after the missing recurrence.
// Its first three valid calls seed 52.333..., rather than recent chart history.
describe('Native nested SMA call history', () => {
  it('retains only invoked SMA samples inside the literal RMA ternary', () => {
    const bars = Array.from({ length: 44 }, (_, index) => ({
      time: index * 120000,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("Native RMA literal calls")
f_rma_reference(s, n) =>
    alpha = 1.0 / n
    sum = 0.0
    sum := na(sum[1]) ? ta.sma(s, n) : alpha * s + (1.0 - alpha) * nz(sum[1])
    sum
wave = 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)
hole = bar_index == 40 or bar_index == 41 ? na : wave
plot(f_rma_reference(hole, 3), "value")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    const values = result.plots[0].values;
    expect(values).toHaveLength(44);
    expect(values[2]).toBeCloseTo(52.333333333333336, 12);
    expect(values[39]).toBeCloseTo(61.03950985360683, 12);
    expect(values[40]).toBeNull();
    expect(values[41]).toBeCloseTo(52.333333333333336, 12);
    expect(values[42]).toBeCloseTo(59.88888888888889, 12);
    expect(values[43]).toBeCloseTo(62.25925925925927, 12);
  });
});
