import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { CALCULATED_BARS_INPUT_ID } from '../calculatedBars';
import { executeScript } from '../compiledOnly';

const bars = Array.from({ length: 10 }, (_, index) => ({
  time: (index + 1) * 60000,
  open: index + 1,
  high: index + 1,
  low: index + 1,
  close: index + 1,
  volume: 1,
}));
const program = (count: number) => parse(`//@version=6\nindicator("Calculation window", calc_bars_count=${count})\nplot(bar_index)\nplot(close)\nplot(close[1])`);
const expectedAll = [bars.map((_, index) => index), bars.map((bar) => bar.close), [null, ...bars.slice(0, -1).map((bar) => bar.close)]];

// TradingView language/declaration-statements/#calc_bars_count defines selection and rebased history.
describe('documented indicator calculation window', () => {
  it.each([0, 100])('uses the entire dataset for a zero or oversized window (%s)', (count) => {
    const result = executeScript(program(count), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual(expectedAll);
  });

  it('selects the last three historical bars, rebases indices and excludes earlier history', () => {
    const result = executeScript(program(3), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [...Array(7).fill(null), 0, 1, 2],
      [...Array(7).fill(null), 8, 9, 10],
      [...Array(8).fill(null), 8, 9],
    ]);
  });

  it('executes the selected historical window and all appended realtime bars', () => {
    const result = executeScript(program(3), bars, undefined, { confirmedRealtimeBarStartIndex: 7 });
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [...Array(4).fill(null), 0, 1, 2, 3, 4, 5],
      [...Array(4).fill(null), 5, 6, 7, 8, 9, 10],
      [...Array(5).fill(null), 5, 6, 7, 8, 9],
    ]);
  });

  it('a zero Calculated bars input override restores the whole dataset', () => {
    const result = executeScript(program(3), bars, new Map([[CALCULATED_BARS_INPUT_ID, 0]]));
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual(expectedAll);
  });

  it('exposes the positive declaration default as a nonnegative calculation input', () => {
    const result = executeScript(program(3), bars);
    expect(result.inputs).toContainEqual(expect.objectContaining({ id: CALCULATED_BARS_INPUT_ID, defval: 3, minval: 0 }));
    expect(executeScript(program(0), bars).inputs.some((input) => input.id === CALCULATED_BARS_INPUT_ID)).toBe(false);
  });
});
