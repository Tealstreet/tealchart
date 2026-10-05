import { describe, expect, it } from 'vitest';

import type { Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars: Bar[] = Array.from({ length: 12 }, (_, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: index + 10, high: index + 10, low: index + 10, close: index + 10, volume: 1,
}));

function values(source: string, title = 'Result'): Array<number | null> {
  const result = runCompatScript(source, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return getPlot(result, title).values;
}

describe('Pine final declarations and assignments in user functions', () => {
  // Unchanged official source; only its bars are small hand-built inputs.
  // https://www.tradingview.com/pine-script-reference/v6/#=>
  it('returns the official f2 sumChange declaration after ten bars of history', () => {
    expect(values(`//@version=6
indicator("=>")
// single-line function
f1(x, y) => x + y
// multi-line function
f2(x, y) =>
\tsum = x + y
\tsumChange = ta.change(sum, 10)
\t// Function automatically returns the last expression used in it
plot(f1(30, 8) + f2(1, 3))`, 'Plot 1')).toEqual([
      null, null, null, null, null, null, null, null, null, null, 38, 38,
    ]);
  });

  it.each([
    ['regular', 'x = close + 1', bars.map((bar) => bar.close + 1)],
    ['typed', 'float x = close + 1', bars.map((bar) => bar.close + 1)],
    ['var', 'var x = close + 1', Array(12).fill(11)],
    ['varip', 'varip x = close + 1', Array(12).fill(11)],
  ])('returns a %s declaration value', (_name, declaration, expected) => {
    expect(values(`//@version=6
indicator("Declaration return")
f() =>
    ${declaration}
plot(f(), title="Result")
`)).toEqual(expected);
  });

  it('returns an assignment once while preserving persistent call-site state', () => {
    expect(values(`//@version=6
indicator("Assignment return")
f(step) =>
    var x = 0.0
    x += step
a = f(1)
b = f(10)
plot(a * 100 + b, title="Result")
`)).toEqual([110, 220, 330, 440, 550, 660, 770, 880, 990, 1100, 1210, 1320]);
  });

  it('propagates declaration and assignment values through nested branch and loop tails', () => {
    expect(values(`//@version=6
indicator("Nested returns")
f(value) =>
    if value < 12
        x = value * 2
    else
        sum = 0.0
        for i = 1 to 2
            sum += value
plot(f(close), title="Result")
`)).toEqual(bars.map((bar) => bar.close * 2));
  });
});
