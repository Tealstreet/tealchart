import { expect, it } from 'vitest';
import { PercentileLinearInterpolation } from './ta-classes';

// Reference: https://www.tradingview.com/pine-script-reference/v6/#fun_ta.percentile_linear_interpolation
// Exact single-hole outcomes remain pending v8/linear-percentile-missing-current-len3-v1.pine.
// Native length4/14 two-hole captures do not settle this length3 single-hole case.
it.skip('AUTHORITY-CONFLICT (TV v8 pending): includes missing observations in the linear-percentile chart window', () => {
  const percentile = new PercentileLinearInterpolation(3, 75);
  const values = [1, 3, 5, NaN, 7, 9, 11].map(value => percentile.compute(value));
  // Isolate the documented missingness claim from the separately captured interpolation position.
  expect(values[3]).toBeNaN();
});

// The former 4.5 missing-current golden came from 2212586b7a, without manual/native authority.
// Captured finite-hole rollback is covered in pine-native-linear-cell-preservation-v1.test.ts.
// Retain the length3 finite replacement/restore controls, pending the exact v8 probe.
it('replaces a same-bar missing observation and restores the percentile window', () => {
  const percentile = new PercentileLinearInterpolation(3, 75);
  [1, 3, 5].forEach(value => percentile.compute(value));
  const snapshot = percentile.save();
  percentile.compute(NaN);
  expect(percentile.recompute(7)).toBe(6.5);
  percentile.restore(snapshot);
  expect(percentile.compute(7)).toBe(6.5);
});
