import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const identifiers = 'https://www.tradingview.com/pine-script-docs/language/identifiers/';
const functions = 'https://www.tradingview.com/pine-script-docs/language/user-defined-functions/';
const bars = [-7, 4, 1, -3].map((close, index) => ({
  time: (index + 1) * 60_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 10,
}));

function values(body: string): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Callable identifier case")\n${body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  const output = getPlot(result, 'Result').values;
  expect(output).toHaveLength(bars.length);
  return output;
}

describe(`user-defined callable and parameter identifiers are case-sensitive [${identifiers}; ${functions}]`, () => {
  it('calls differently cased functions with otherwise identical signatures independently', () => {
    expect(
      values(`Read(float source) => source - 7
read(float source) => source + 2
plot(Read(close) * 10 + read(close), "Result")`),
    ).toEqual([-145, -24, -57, -101]);
  });

  it('retains both case-distinct parameters when arguments are positional', () => {
    expect(
      values(`combine(float value, float Value) => value * 10 + Value
plot(combine(close, 2), "Result")`),
    ).toEqual([-68, 42, 12, -28]);
  });

  it('binds reordered named arguments to the exact case-distinct parameter names', () => {
    expect(
      values(`combine(float value, float Value) => value * 10 + Value
plot(combine(Value = 2, value = close), "Result")`),
    ).toEqual([-68, 42, 12, -28]);
  });
});
