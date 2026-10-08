import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const highs = [8, 5, 12, 7, 9, 15, 10, 6];
const bars = highs.map((high, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: 1,
  high,
  low: -high,
  close: 1,
  volume: 100,
}));

// The reference's -rightbars plotting example locates the confirmed pivot.
// Unique extrema at source bars 2 and 5 avoid tie and missing-window policies.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivothigh
describe('documented asymmetric pivot confirmation and default source', () => {
  for (const member of ['pivothigh', 'pivotlow'] as const) {
    for (const [left, right] of [
      [2, 1],
      [1, 2],
    ]) {
      it(`${member} confirms after ${right} right bars with ${left} left bars`, () => {
        const source = member === 'pivothigh' ? 'high' : 'low';
        const result = runCompatScript(
          `//@version=6
indicator("Asymmetric pivot")
plot(ta.${member}(${left}, ${right}), "Default")
plot(ta.${member}(rightbars=${right}, source=${source}, leftbars=${left}), "Named")`,
          { bars },
        );
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        const sign = member === 'pivothigh' ? 1 : -1;
        const expected =
          right === 1 ? [12 * sign, null, null, 15 * sign, null] : [null, 12 * sign, null, null, 15 * sign];
        for (const title of ['Default', 'Named']) {
          const values = getPlot(result, title).values;
          expect(values).toHaveLength(8);
          expect(values.slice(3)).toEqual(expected);
        }
      });
    }
  }
});
