import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// Native coverage-tad-1-v1.csv: wma_dyn_builtin, bars 0-21.
// packages/tealscript/oracle-probes/v2/captures/v2/coverage-tad-1-v1.csv
// The same call alternates length 2 and 3; both use preceding physical bars.
const expected: Array<number | null> = [
  null,
  null,
  50.333333333333336,
  56.666666666666664,
  57.666666666666664,
  57.333333333333336,
  65,
  63,
  62.333333333333336,
  68.66666666666667,
  69.66666666666667,
  58.333333333333336,
  55,
  53,
  52.333333333333336,
  58.666666666666664,
  59.666666666666664,
  59.333333333333336,
  67,
  65,
  64.33333333333333,
  70.66666666666667,
];
const bars = expected.map((_, index) => ({
  time: index * 120000,
  open: 1,
  high: 1,
  low: 1,
  close: 1,
  volume: 1,
}));

describe('Native WMA length changes', () => {
  it('keeps input and literal lengths equivalent after raw history eviction', () => {
    // Route-consistency control: changing the qualifier of the same length
    // must preserve the established fill/warmup state when history is bounded.
    const data = Array.from({ length: 48 }, (_, index) => ({
      time: index * 120000,
      open: 1,
      high: 1,
      low: 1,
      close: index < 5 ? 13 + index : index < 46 ? 1 : index - 26,
      volume: 1,
    }));
    const result = executeScript(
      parse(`//@version=6
indicator("WMA history eviction", max_bars_back=20)
n = input.int(5)
s = bar_index >= 5 and bar_index < 46 ? na : close
plot(ta.wma(s, 5), "literal")
plot(ta.wma(s, n), "input")`),
      data,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values[46]).toBe(18);
    expect(result.plots[1].values).toEqual(result.plots[0].values);
  });

  it.each([
    ['root', 'ta.wma(wave, n)'],
    ['named', 'ta.wma(length=n, source=wave)'],
    ['UDF', 'weighted(wave, n)'],
  ])('%s uses each current length against retained call history', (_name, expression) => {
    const result = executeScript(
      parse(`//@version=6
indicator("Native dynamic WMA")
weighted(s, n) =>
    ta.wma(s, n)
wave = 50.0 + (bar_index % 11) * 2.0 + (bar_index % 3 == 0 ? 7.0 : -3.0)
n = bar_index % 2 == 0 ? 2 : 3
plot(${expression}, "value")`),
      bars,
    );
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toHaveLength(expected.length);
    expected.forEach((value, index) => {
      if (value === null) expect(result.plots[0].values[index], `bar ${index}`).toBeNull();
      else expect(result.plots[0].values[index], `bar ${index}`).toBeCloseTo(value, 12);
    });
  });
});
