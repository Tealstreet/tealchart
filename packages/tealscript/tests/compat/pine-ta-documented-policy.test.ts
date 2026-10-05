import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority for each named entry below:
// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json
// retrieved 2026-10-03; SHA256 eba108f8975d3fcd3e66f7b69c81979bb671c887607a7914aa4c7495e805fb1d.
// Expectations are hand-derived from that entry, never captured engine values.
const source = [null, -6, 9, -3, 12, null, -9, 6, 3, -12];
const bars: Bar[] = source.map((value, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: 20,
  high: 23,
  low: 17,
  close: value ?? NaN,
  volume: 100,
}));

function check(expression: string, expected: Array<number | null>) {
  const result = runCompatScript(`//@version=6\nindicator("documented TA policy")\nplot(${expression}, "value")`, { bars });
  expect(result.errors).toEqual([]);
  const actual = getPlot(result, 'value').values;
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => {
    if (value === null) expect(actual[index], `bar ${index}`).toBeNull();
    else expect(actual[index], `bar ${index}`).toBeCloseTo(value, 10);
  });
}

describe('documented Pine TA source policies', () => {
  it('ta.swma: four physical bars, symmetric weights, and hole propagation', () => {
    // fun_ta.swma example: (x[3]+2*x[2]+2*x[1]+x)/6; remarks include na.
    // Rejects partial warmup, equal weights, reversed asymmetric weights,
    // compressed valid-sample windows, and holding the prior value on a hole.
    // Red proof: changed the current-source weight from 1 to 3 in SWMA._advance;
    // this test failed; restored implementation and this test passed.
    check('ta.swma(close)', [null, null, null, null, 3, null, null, null, null, -0.5]);
  });

  it('ta.linreg: least-squares endpoint and offset with contiguous hole windows', () => {
    // fun_ta.linreg description: intercept+slope*(length-1-offset); remarks include na.
    // For [-6,9,-3], mean=0, slope=3/2, endpoint=3/2, offset-one=0.
    // Zigzags reject last-source, SMA, reversed time, and offset-sign mistakes.
    // Red proof: reversed the offset sign in LinReg._advance; failed, restored, passed.
    check('ta.linreg(close, 3, 1)', [null, null, null, 0, 6, null, null, null, 0, -1]);
    check('ta.linreg(close, 3, 0)', [null, null, null, 1.5, 7.5, null, null, null, 6, -10]);
  });

  it('ta.mom: signed calendar-lag difference, including missing endpoints', () => {
    // fun_ta.mom description source-source[length]; remarks include na.
    // An interior hole that is neither endpoint does not enter this expression.
    // Rejects adjacent lag, absolute differences, compressed history, and carry-forward.
    // Red proof: changed subtraction to addition in Mom._advance; failed, restored, passed.
    check('ta.mom(close, 2)', [null, null, null, 3, 3, null, -21, null, 12, -18]);
  });

  it('ta.roc: signed lagged denominator and percentage scaling with endpoint holes', () => {
    // fun_ta.roc description 100*(source-source[length])/source[length]; remarks include na.
    // Nonzero signed denominators reject abs-denominator, current denominator,
    // unscaled ratio, adjacent lag, and compressed valid-sample history.
    // Red proof: removed *100 in ROC._advance; failed, restored, passed.
    check('ta.roc(close, 2)', [null, null, null, -50, 100 / 3, null, -175, null, -400 / 3, -300]);
  });

  it('ta.variance: population/sample divisors and last three non-na observations', () => {
    // fun_ta.variance definition and remarks explicitly require length non-na values.
    // [-6,9,-3] => mean0, sumSq126; [9,-3,12] => mean6, sumSq126;
    // [-3,12,-9] => mean0, sumSq234; [12,-9,6] => mean3, sumSq234;
    // [-9,6,3] => mean0, sumSq126; [6,3,-12] => mean-1, sumSq186.
    // Rejects calendar windows, zero-filled/propagated holes, mean absolute deviation,
    // stale windows, and population/sample divisor swaps.
    // Red proof: swapped the two divisors in Variance._advance; failed, restored, passed.
    check('ta.variance(close, 3)', [null, null, null, 42, 42, 42, 78, 78, 42, 62]);
    check('ta.variance(close, 3, false)', [null, null, null, 63, 63, 63, 117, 117, 63, 93]);
  });
});
