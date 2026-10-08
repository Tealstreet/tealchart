import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const authority = 'https://www.tradingview.com/pine-script-reference/v6/#kw_type';
const varAuthority = 'https://www.tradingview.com/pine-script-reference/v6/#kw_var';

const bars: Bar[] = [
  { time: 1_700_000_000_000, open: -7, high: 4, low: -9, close: 2, volume: 31 },
  { time: 1_700_000_060_000, open: 8, high: 13, low: -3, close: -2, volume: 47 },
  { time: 1_700_000_120_000, open: -1, high: 9, low: -6, close: 5, volume: 19 },
  { time: 1_700_000_180_000, open: 3, high: 7, low: -5, close: -4, volume: 53 },
];

const declaration = `type Sample
    float opening = open
    float highest = high
    float lowest = low
    float closing = close
    int stamp = time`;

const fieldPlots = `plot(sample.opening, "opening")
plot(sample.highest, "highest")
plot(sample.lowest, "lowest")
plot(sample.closing, "closing")
plot(sample.stamp, "stamp")`;

function outputs(body: string): Record<string, Array<number | null>> {
  const result = runCompatScript(
    `//@version=6\nindicator("UDT builtin defaults")\n${declaration}\n${body}\n${fieldPlots}`,
    { bars },
  );
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  return Object.fromEntries(
    ['opening', 'highest', 'lowest', 'closing', 'stamp'].map((field) => [field, getPlot(result, field).values]),
  );
}

function sampled(source: Bar[]): Record<string, Array<number | null>> {
  return {
    opening: source.map((bar) => bar.open),
    highest: source.map((bar) => bar.high),
    lowest: source.map((bar) => bar.low),
    closing: source.map((bar) => bar.close),
    stamp: source.map((bar) => bar.time),
  };
}

describe(`UDT builtin field defaults [${authority}; detailedDesc bar example]`, () => {
  it('samples each builtin default when a fresh object is constructed', () => {
    expect(outputs('sample = Sample.new()')).toEqual(sampled(bars));
  });

  it(`retains construction-time defaults in a root var object [${varAuthority}]`, () => {
    expect(outputs('var sample = Sample.new()')).toEqual(sampled(bars.map(() => bars[0])));
  });

  it(`samples a local var object on its first executed bar [${varAuthority}]`, () => {
    const actual = outputs(`sample = Sample.new(0, 0, 0, 0, 0)
if bar_index >= 1
    var remembered = Sample.new()
    sample := remembered`);
    const expected = sampled(bars.map(() => bars[1]));
    for (const values of Object.values(expected)) values[0] = 0;
    expect(actual).toEqual(expected);
  });

  it('named zero and explicit na replace only their selected builtin defaults', () => {
    expect(outputs('sample = Sample.new(closing = float(na), opening = 0)')).toEqual({
      ...sampled(bars),
      opening: [0, 0, 0, 0],
      closing: [null, null, null, null],
    });
  });
});
