import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { RMA } from './ta-classes';

// Native TradingView v6 CF047, first 20 rows:
// packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-2-v1.csv
// Small literal witness; no CSV dependency in the test. Missingness is exact;
// finite values allow 1e-12 for retained captured binary64 operation orders.
const expected: Array<number | null> = [
  null,
  null,
  null,
  null,
  null,
  13.8,
  13.440000000000001,
  13.352,
  13.4816,
  13.78528,
  14.228224,
  13.3825792,
  12.906063360000001,
  12.724850688,
  12.7798805504,
  null,
  13.223904440320002,
  13.779123552256001,
  13.023298841804802,
  12.618639073443841,
];
const bars = [13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11].map((close, index) => ({
  time: index * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('Native CF047 ta.rma', () => {
  it('masks the consecutive holes from coverage-tad-1 while retaining recovery state', () => {
    // Native coverage-tad-1-v1.csv, rows 0-43: rma_hole_builtin.
    // Path: packages/tealscript/oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv
    const data = Array.from({ length: 44 }, (_, index) => ({
      time: index * 120000,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("Native RMA consecutive holes")
wave = 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)
hole = bar_index == 40 or bar_index == 41 ? na : wave
plot(ta.rma(hole, 3), "value")`),
      data,
    );
    expect(result.errors).toEqual([]);
    const values = result.plots[0].values;
    expect(values).toHaveLength(44);
    expect(values[2]).toBeCloseTo(52.333333333333336, 12);
    expect(values[39]).toBeCloseTo(61.03950985360683, 12);
    expect(values[40]).toBeNull();
    expect(values[41]).toBeNull();
    expect(values[42]).toBeCloseTo(65.69300656907122, 12);
    expect(values[43]).toBeCloseTo(66.12867104604747, 12);
  });

  it.each([
    ['static', 'ta.rma(source, 5)'],
    ['named', 'ta.rma(length=5, source=source)'],
    ['input length', 'ta.rma(source, length)'],
    ['UDF', 'smooth(source, length)'],
  ])('%s matches native startup, single holes and recovery', (_form, expression) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Native CF047")
smooth(s, n) =>
    ta.rma(s, n)
length = input.int(5)
source = bar_index == 4 or bar_index == 15 ? na : close
plot(${expression}, "value")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots).toHaveLength(1);
    const values = result.plots[0].values;
    expect(values).toHaveLength(expected.length);
    expected.forEach((value, index) => {
      if (value === null) expect(values[index], `bar ${index}`).toBeNull();
      else expect(values[index], `bar ${index}`).toBeCloseTo(value, 12);
    });
  });

  it('restores seed count and retained accumulator on replacement', () => {
    const rma = new RMA(5, true);
    [13, 14, 15, 16].forEach((value) => rma.compute(value));
    expect(rma.compute(NaN)).toBeNaN();
    expect(rma.recompute(11)).toBe(13.8);
    const seeded = rma.save();
    expect(rma.compute(NaN)).toBeNaN();
    expect(rma.recompute(12)).toBe((13.8 * 4 + 12) / 5);
    rma.restore(seeded);
    expect(rma.compute(NaN)).toBeNaN();
    expect(rma.compute(12)).toBe((13.8 * 4 + 12) / 5);
  });
});
