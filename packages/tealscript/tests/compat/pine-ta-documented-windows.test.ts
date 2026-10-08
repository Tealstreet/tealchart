import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/
// SHA256 eba108f8975d3fcd3e66f7b69c81979bb671c887607a7914aa4c7495e805fb1d.
// Each test names its entry. All values are derived from those definitions.
function run(expression: string, closes: Array<number | null>, volumes?: number[]) {
  const bars: Bar[] = closes.map((close, index) => ({
    time: 1_700_000_000_000 + index * 60_000,
    open: 10, high: 13, low: 8, close: close ?? NaN, volume: volumes?.[index] ?? 100,
  }));
  const result = runCompatScript(`//@version=6\nindicator("documented windows")\nplot(${expression}, "value")`, { bars });
  expect(result.errors).toEqual([]);
  return getPlot(result, 'value').values;
}

describe('documented Pine TA windows and crossings', () => {
  it('ta.alma: fractional default center, optional floor, physical warmup and holes', () => {
    // fun_ta.alma example uses m=offset*(N-1), s=N/sigma; floor parameter
    // defaults false. N=3, offset=.75, sigma=3 gives m=1.5 or floor(m)=1.
    // Fractional weights [exp(-9/8),exp(-1/8),exp(-1/8)] simplify to
    // [exp(-1),1,1]; floored weights are [exp(-1/2),1,exp(-1/2)].
    // Rejects floored default, ignored floor flag, reversed weights, SMA,
    // partial warmup, compressed hole windows and held output on a hole.
    // Red proof: inverted ALMA.useFlooredOffset; failed, restored, passed.
    const a = Math.exp(-1);
    const b = Math.exp(-0.5);
    const closes = [null, -6, 9, -3, 12, null, -9, 6, 3];
    const fractional = [null, null, null, (-6 * a + 6) / (a + 2), (9 * a + 9) / (a + 2), null, null, null, (-9 * a + 9) / (a + 2)];
    const floored = [null, null, null, (-9 * b + 9) / (2 * b + 1), (21 * b - 3) / (2 * b + 1), null, null, null, (-6 * b + 6) / (2 * b + 1)];
    for (const [expression, expected] of [
      ['ta.alma(close, 3, 0.75, 3)', fractional],
      ['ta.alma(close, 3, 0.75, 3, false)', fractional],
      ['ta.alma(close, 3, 0.75, 3, true)', floored],
    ] as const) {
      const actual = run(expression, closes);
      expect(actual).toHaveLength(expected.length);
      expected.forEach((value, index) => {
        if (value === null) expect(actual[index]).toBeNull();
        else expect(actual[index]).toBeCloseTo(value, 10);
      });
    }
  });

  it('ta.range: extrema over length non-na samples after source holes', () => {
    // fun_ta.range, both overloads: max-min; length non-na values in remarks.
    // Assert only ready windows; partial-window output is not prescribed here.
    // Signed zigzags reject endpoint subtraction, absolute max, stale windows,
    // zero fill, calendar windows and missing-value propagation.
    // Red proof: changed Range max-min to max+min; failed, restored, passed.
    expect(run('ta.range(close, 3)', [-6, 9, -3, null, 12, -9, 6]).slice(2))
      .toEqual([15, 15, 15, 21, 21]);
  });

  it('ta.median: even float windows average middle values and skip holes', () => {
    // fun_ta.median float overload, length non-na remark. Sorted first window
    // [-6,-3,9,12] => (-3+9)/2=3. Not lower/upper-middle or input-order selection.
    // Red proof: selected lower middle instead of average; failed, restored, passed.
    expect(run('ta.median(close, 4)', [-6, 9, -3, 12, null, -9, 6]).slice(3))
      .toEqual([3, 3, 3, 1.5]);
  });

  it('ta.mode: smallest tied mode, repeated values, and ignored source holes', () => {
    // fun_ta.mode description and non-na quantity remark. First tie appears in
    // order [9,-3,9,-3], rejecting first/last-seen and largest-tied selection.
    // Final window [-3,6,6,6] rejects always selecting the minimum.
    // Red proof: reversed tie comparison to largest; failed, restored, passed.
    expect(run('ta.mode(close, 4)', [9, -3, 9, -3, null, 6, 6, 6]).slice(3))
      .toEqual([-3, -3, -3, 6, 6]);
  });

  it('ta.crossover: equality is allowed only on the previous bar', () => {
    // fun_ta.crossover: current >, previous <=. Rejects strict previous,
    // non-strict current, every-above-bar firing and direction reversal.
    // Red proof: changed previous <= to <; failed, restored, passed.
    expect(run('ta.crossover(close, 0) ? 1 : 0', [-2, 0, 3, 4, 0, -1, 2]))
      .toEqual([0, 0, 1, 0, 0, 0, 1]);
  });

  it('ta.crossunder: equality is allowed only on the previous bar', () => {
    // fun_ta.crossunder: current <, previous >=. Mirrors neither a guessed
    // sibling rule nor numeric truthiness: the entry states both comparisons.
    // Red proof: changed previous >= to >; failed, restored, passed.
    expect(run('ta.crossunder(close, 0) ? 1 : 0', [2, 0, -3, -4, 0, 1, -2]))
      .toEqual([0, 0, 1, 0, 0, 0, 1]);
  });

  it('ta.tr: missing previous close has explicit true/false handling', () => {
    // fun_ta.tr handle_na parameter and var_ta.tr equivalence to false.
    // H=13,L=8: first span5; prior close20 => max(5,7,12)=12;
    // missing current close still permits12; next bar true=5,false=na.
    // Rejects current-close gating, current-close gap calculation and unconditional fallback.
    // Red proof: negated TrueRange.handleNa branch; failed, restored, passed.
    expect(run('ta.tr(true)', [20, null, 10, 11])).toEqual([5, 12, 5, 5]);
    expect(run('ta.tr(false)', [20, null, 10, 11])).toEqual([null, 12, null, 5]);
    expect(run('ta.tr', [20, null, 10, 11])).toEqual([null, 12, null, 5]);
  });
});
