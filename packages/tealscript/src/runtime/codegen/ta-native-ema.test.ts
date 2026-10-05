import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native TradingView v6 CF040, first 20 rows:
// packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-1-v1.csv
// Small literal witness; no CSV dependency in the test. Missingness is exact;
// finite values allow 1e-12 for retained captured binary64 operation orders.
const expected: Array<number | null> = [
  null,
  null,
  null,
  null,
  null,
  13.8,
  13.200000000000001,
  13.133333333333335,
  13.422222222222222,
  13.948148148148148,
  14.632098765432099,
  13.088065843621399,
  12.3920438957476,
  12.261362597165066,
  12.507575064776711,
  null,
  13.338383376517807,
  14.225588917678538,
  12.817059278452358,
  12.211372852301572,
];
const bars = [13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11].map((close, index) => ({
  time: index * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('Native CF040 ta.ema', () => {
  it.each([
    ['static', 'ta.ema(source, 5)'],
    ['named', 'ta.ema(length=5, source=source)'],
    ['input length', 'ta.ema(source, length)'],
    ['UDF', 'smooth(source, length)'],
  ])('%s matches native startup, single holes and recovery', (_form, expression) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Native CF040")
smooth(s, n) =>
    ta.ema(s, n)
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
});
