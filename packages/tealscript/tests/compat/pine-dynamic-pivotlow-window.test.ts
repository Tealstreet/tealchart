import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime';
import { checkProgram } from '../../src/semantic/checker';

// Official v6 ta.pivotlow supports series strengths and source history sizing.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.pivotlow
// Strict untied extrema avoid the unresolved tie and missing-source policies.
const samples = [9, 6, 8, 5, 7, 4, 8, 3, 6];
const bars = samples.map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close + 1, low: close - 1, close, volume: 100,
}));

function run(body: string) {
  const program = parse(`//@version=6\nindicator("Dynamic pivot low", max_bars_back=100)\n${body}`);
  expect(checkProgram(program).diagnostics).toEqual([]);
  const result = executeScript(program, bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values);
}

describe('dynamic pivot-low source windows', () => {
  it('uses physical source bars when left strength changes', () => {
    expect(run('left = bar_index % 2 + 1\nplot(ta.pivotlow(close, left, 1))')).toEqual([
      [null, null, 6, null, 5, null, 4, null, 3],
    ]);
  });

  it('includes both sides when right strength changes', () => {
    expect(run('right = bar_index % 2 + 1\nplot(ta.pivotlow(close, 1, right))')).toEqual([
      [null, null, 6, null, 5, null, 4, null, 3],
    ]);
  });

  it('uses the current left and right strengths together', () => {
    expect(run('left = bar_index % 2 + 1\nright = bar_index % 3 + 1\nplot(ta.pivotlow(close, left, right))')).toEqual([
      [null, null, null, null, null, null, 4, null, null],
    ]);
  });

  it('uses low for the omitted-source overload', () => {
    expect(run('left = bar_index % 2 + 1\nplot(ta.pivotlow(left, 1))')).toEqual([
      [null, null, 5, null, 4, null, 3, null, 2],
    ]);
  });

  it('retains the source window inside a UDF', () => {
    expect(run('pivot(float source, int left) => ta.pivotlow(source, left, 1)\nplot(pivot(close, bar_index % 2 + 1))')).toEqual([
      [null, null, 6, null, 5, null, 4, null, 3],
    ]);
  });

  it('preserves fixed-strength lows and the existing dynamic high route', () => {
    expect(run('plot(ta.pivotlow(close, 1, 1))\nplot(ta.pivothigh(-close, bar_index % 2 + 1, 1))')).toEqual([
      [null, null, 6, null, 5, null, 4, null, 3],
      [null, null, -6, null, -5, null, -4, null, -3],
    ]);
  });
});
