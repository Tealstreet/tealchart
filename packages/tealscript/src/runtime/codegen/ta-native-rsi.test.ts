import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native TradingView v6 CF048, first 20 rows:
// packages/tealscript/oracle-probes/v2/captures/v2/conflicts-batch-2-v1.csv
// Small literal witness; no CSV dependency in the test. Missingness is exact;
// finite values allow 1e-12 for retained captured binary64 operation orders.
const expected: Array<number | null> = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  100,
  100,
  100,
  100,
  40,
  46.666666666666664,
  53.17073170731708,
  59.36507936507937,
  null,
  null,
  65.1305334846765,
  31.55347814132527,
  38.191862449955,
];
const bars = [13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11, 12, 13, 14, 15, 16, 10, 11].map((close, index) => ({
  time: index * 120000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

describe('Native CF048 ta.rsi', () => {
  it.each([
    ['static', 'ta.rsi(source, 5)'],
    ['named', 'ta.rsi(length=5, source=source)'],
    ['input length', 'ta.rsi(source, length)'],
    ['UDF', 'smooth(source, length)'],
  ])('%s matches native startup, single holes and recovery', (_form, expression) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Native CF048")
smooth(s, n) =>
    ta.rsi(s, n)
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
