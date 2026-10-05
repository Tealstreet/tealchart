import { expect, it } from 'vitest';

import { NumericSeries } from './runtime';
import { PivotHigh, PivotLow } from './ta-classes';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json entries[845,847].
// Incremental append rollback retains the same pivot/no-result values and full snapshots.
const perfIt = process.env.TEALSCRIPT_PERF_ASSERT === '1' ? it : it.skip;
perfIt('avoids full numeric snapshots for pivot append checkpoints', () => {
  const save = NumericSeries.prototype.save;
  let copies = 0;
  NumericSeries.prototype.save = function () {
    copies++;
    return save.call(this);
  };
  try {
    for (const Type of [PivotHigh, PivotLow]) {
      const actual = new Type(2, 1);
      const oracle = new Type(2, 1);
      const values = [3, 1, 8, 2, NaN, 5, 4, 9, 0, 7, 6, -0];
      for (let index = 0; index < values.length; index++) {
        const before = oracle.save();
        copies = 0;
        expect(actual.compute(values[index])).toEqual(oracle.compute(values[index]));
        expect(actual.recompute(values[index] + 2)).toEqual((oracle.restore(before), oracle.compute(values[index] + 2)));
        expect(actual.recompute(values[index] - 2)).toEqual((oracle.restore(before), oracle.compute(values[index] - 2)));
        // Oracle deliberately uses ordinary compute for each replacement.
        expect(copies).toBe(0);
      }
      const snapshot = actual.save();
      const expected = actual.compute(99);
      actual.compute(-99);
      actual.restore(snapshot);
      expect(actual.compute(99)).toEqual(expected);
    }
  } finally {
    NumericSeries.prototype.save = save;
  }
});
