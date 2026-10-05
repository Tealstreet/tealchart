import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';
import { WMA } from './ta-classes';

// Native TradingView v6 CF046, first 20 rows:
// packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-2-v1.csv
// Small literal witness; no CSV dependency in the test. Missingness is exact;
// finite values allow 1e-12 for retained captured binary64 operation orders.
const expected: Array<number | null> = [
  null,
  null,
  null,
  null,
  null,
  14.066666666666666,
  13.266666666666667,
  12.933333333333334,
  13.066666666666666,
  13.666666666666666,
  14.666666666666666,
  13.333333333333334,
  12.466666666666667,
  12.066666666666666,
  12.133333333333333,
  null,
  13.4,
  14.466666666666667,
  13.2,
  12.4,
];
const bars = [13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11].map((close, index) => ({
  time: index * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('Native CF046 ta.wma', () => {
  it.each([
    ['static', 'ta.wma(source, 5)'],
    ['named', 'ta.wma(length=5, source=source)'],
    ['input length', 'ta.wma(source, length)'],
    ['UDF', 'smooth(source, length)'],
  ])('%s matches native startup, single holes and recovery', (_form, expression) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Native CF046")
smooth(s, n) =>
    ta.wma(s, n)
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

  it('restores filled slots and valid-sample warmup on replacement', () => {
    const wma = new WMA(5, true);
    [13, 14, 15, 16].forEach((value) => wma.compute(value));
    const beforeHole = wma.save();
    expect(wma.compute(NaN)).toBeNaN();
    expect(wma.recompute(17)).toBe(235 / 15);
    wma.restore(beforeHole);
    expect(wma.compute(NaN)).toBeNaN();
    expect(wma.compute(11)).toBe(211 / 15);
    const seeded = wma.save();
    expect(wma.compute(NaN)).toBeNaN();
    expect(wma.recompute(12)).toBe(199 / 15);
    wma.restore(seeded);
    expect(wma.compute(12)).toBe(199 / 15);
  });
});
