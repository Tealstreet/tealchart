import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Exact TV v4/v5 source/CSV hashes establish phase and prefix values.
// Highest ratio7.5 uses seven slots; SMA ratio6/2 uses three slots.
const bars = [
  {
    time: 1788134400000,
    open: 77682.0,
    high: 77682.01,
    low: 77572.0,
    close: 77674.04,
    volume: 0,
  },
  {
    time: 1788134520000,
    open: 77674.5,
    high: 77780.34,
    low: 77646.0,
    close: 77758.24,
    volume: 0,
  },
  {
    time: 1788134640000,
    open: 77758.24,
    high: 77827.99,
    low: 77724.0,
    close: 77740.01,
    volume: 0,
  },
  {
    time: 1788134760000,
    open: 77740.01,
    high: 77751.37,
    low: 77490.0,
    close: 77508.86,
    volume: 0,
  },
  {
    time: 1788134880000,
    open: 77508.86,
    high: 77525.28,
    low: 77436.4,
    close: 77437.58,
    volume: 0,
  },
  {
    time: 1788135000000,
    open: 77437.57,
    high: 77636.0,
    low: 77436.41,
    close: 77636.0,
    volume: 0,
  },
  {
    time: 1788135120000,
    open: 77635.99,
    high: 77726.0,
    low: 77576.0,
    close: 77725.99,
    volume: 0,
  },
  {
    time: 1788135240000,
    open: 77726.0,
    high: 77797.91,
    low: 77720.88,
    close: 77797.91,
    volume: 0,
  },
  {
    time: 1788135360000,
    open: 77797.99,
    high: 77896.0,
    low: 77784.0,
    close: 77864.01,
    volume: 0,
  },
  {
    time: 1788135480000,
    open: 77864.01,
    high: 77880.0,
    low: 77861.0,
    close: 77867.51,
    volume: 0,
  },
];
const cases = [
  {
    name: 'corpus5-v5-float-highest-length-v1.pine',
    source:
      '//@version=5\nindicator("corpus5-v5-float-highest-length-v1")\nlength = timeframe.in_seconds("15") / timeframe.in_seconds(timeframe.period)\nplot(ta.highest(length), "OUTCOME")\n',
    captureSha256: '00aa194e6e2e30b9ea19280cdf45cf7483c3ffbd1f8cab57adb320023f5fbfd6',
    expected: [null, null, null, null, null, null, 77827.99, 77827.99, 77896.0, 77896.0],
  },
  {
    name: 'corpus-length-sma-simple-float-v6-v1.pine',
    source:
      '//@version=6\nindicator("V5-CORPUS-SMA-SIMPLE-FLOAT-V1")\nlength = input.int(6, "Numerator") / timeframe.multiplier\nplot(ta.sma(close, length), "OUTCOME")\n',
    captureSha256: 'fd734f74b88adebd62d53ea52d922fba50b02a1d5b8cbc4011b639e0007a45c7',
    expected: [
      null,
      null,
      77724.09666666666,
      77669.03666666667,
      77562.15000000001,
      77527.48,
      77599.85666666667,
      77719.96666666667,
      77795.97,
      77843.14333333333,
    ],
  },
];

describe('native integer-derived TA length aliases', () => {
  it.each(cases)('matches captured admission and prefix for $name', ({ source, expected }) => {
    expect(checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const result = runCompatScript(source, {
      bars,
      engineOptions: { runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } } },
    });
    expect(result.errors).toEqual([]);
    const actual = getPlot(result, 'OUTCOME').values;
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => {
      if (value === null) expect(actual[i]).toBeNull();
      else {
        expect(actual[i]).not.toBeNull();
        expect(Math.abs(Number(actual[i]) - value)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(value)));
      }
    });
  });
});
