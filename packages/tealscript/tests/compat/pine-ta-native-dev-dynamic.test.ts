import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: oracle-probes/v2/captures/v2/coverage-tab-1-v1.csv, rows0-31.
// SHA256 a1c5830fe34d2749e75961702255d0d51dcf79655750536b940a637c0302e4bb. The captured source depends only on bar_index.
const native = [
  null,
  1.0,
  0.5,
  3.0,
  2.0,
  2.0,
  2.0,
  2.222222222222222,
  2.2222222222222223,
  2.222222222222222,
  2.888888888888889,
  3.5555555555555554,
  4.444444444444445,
  5.333333333333333,
  4.444444444444445,
  3.5555555555555554,
  9.0,
  1.0,
  0.5,
  3.0,
  2.0,
  2.0,
  2.0,
  2.222222222222222,
  2.2222222222222223,
  2.222222222222222,
  2.888888888888889,
  3.5555555555555554,
  4.444444444444445,
  5.333333333333333,
  4.444444444444445,
  3.5555555555555554,
];

describe('Native dynamic Dev source history', () => {
  it.each(['positional', 'named', 'function'] as const)(
    'retains native history for %s calls when length changes',
    (form) => {
      const call = {
        positional: 'ta.dev(dyn_source, dynamic_length)',
        named: 'ta.dev(length=dynamic_length, source=dyn_source)',
        function: 'f_dev(dyn_source, dynamic_length)',
      }[form];
      const result = runCompatScript(
        `//@version=6
indicator("Native dynamic Dev")
f_dev(src, n) =>
    ta.dev(src, n)
p = bar_index % 16
dyn_source = p == 0 ? 1.0 : p == 1 ? 3.0 : p == 2 ? 2.0 : p == 3 ? 8.0 : p == 4 ? 4.0 : p == 5 ? 9.0 : p == 6 ? 5.0 : p == 7 ? 11.0 : p == 8 ? 7.0 : p == 9 ? 13.0 : p == 10 ? 6.0 : p == 11 ? 15.0 : p == 12 ? 4.0 : p == 13 ? 17.0 : p == 14 ? 10.0 : 19.0
dynamic_length = p < 5 ? 2 : int(3.0)
plot(${call}, "Dev")`,
        {
          bars: native.map((_, index) => ({
            time: 1788134400000 + index * 120000,
            open: 1,
            high: 1,
            low: 1,
            close: 1,
            volume: 1,
          })),
        },
      );
      expect(result.errors).toEqual([]);
      const values = getPlot(result, 'Dev').values;
      expect(values).toHaveLength(native.length);
      native.forEach((value, index) => {
        if (value === null) expect(values[index], `row${index}`).toBeNull();
        else expect(values[index], `row${index}`).toBeCloseTo(value, 8);
      });
    },
  );
});
