import { describe, expect, it } from 'vitest';

import { type Bar } from '../../src/runtime';
import { getPlot, runCompatScript } from './fixtures';

const bars: Bar[] = [1, 2, 4, 4].map((close, index) => ({
  time: 1_700_000_000_000 + index * 60_000,
  open: close, high: close, low: close, close, volume: 1,
}));

function values(source: string): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("UDF tail")\n${source}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
  return getPlot(result, 'Result').values;
}

describe('Pine UDF assignment and declaration returns', () => {
  it.each([
    ['regular', 'x = close + 1', [2, 3, 5, 5]],
    ['typed', 'float x = close + 1', [2, 3, 5, 5]],
    ['var', 'var x = close + 1', [2, 2, 2, 2]],
    ['varip', 'varip x = close + 1', [2, 2, 2, 2]],
  ])('returns a %s declaration tail', (_name, tail, expected) => {
    expect(values(`f() =>\n    ${tail}\nplot(f(), title="Result")`)).toEqual(expected);
  });

  it('returns the assigned value without evaluating the RHS twice', () => {
    expect(values(`
f(array<float> source) =>
    x = 0.0
    x := array.pop(source)
source = array.from(1.0, 2.0, 3.0)
assigned = f(source)
plot(assigned * 10 + array.size(source), title="Result")
`)).toEqual([32, 32, 32, 32]);
  });

  it('returns compound assignments while preserving independent call-site state', () => {
    expect(values(`
f(step) =>
    var x = 0.0
    x += step
a = f(1)
b = f(10)
plot(a * 100 + b, title="Result")
`)).toEqual([110, 220, 330, 440]);
  });

  it('returns the official EMA recurrence assignment and commits local history', () => {
    expect(values(`
pine_ema(src, length) =>
    alpha = 2.0 / (length + 1)
    sum = 0.0
    sum := na(sum[1]) ? src : alpha * src + (1 - alpha) * nz(sum[1])
plot(pine_ema(close, 3), title="Result")
`)).toEqual([1, 1.5, 2.75, 3.375]);
  });

  it('returns the official deviation equivalent declaration', () => {
    expect(values(`
pine_dev(src, length) =>
    mean = ta.sma(src, length)
    sum = 0.0
    for i = 0 to length - 1
        sum += math.abs(src[i] - mean)
    result = sum / length
plot(pine_dev(close, 2), title="Result")
`)).toEqual([null, 0.5, 1, 0]);
  });

  it('propagates declaration and assignment values through nested if and loop tails', () => {
    expect(values(`
f(src) =>
    if src < 3
        x = src * 2
    else
        sum = 0.0
        for i = 1 to 2
            sum += src
plot(f(close), title="Result")
`)).toEqual([2, 4, 8, 8]);
  });

  it('preserves function-name assignment tails', () => {
    expect(values(`
f(src) =>
    f = 0.0
    f := src + 1
plot(f(close), title="Result")
`)).toEqual([2, 3, 5, 5]);
  });
});
