import { beforeAll, describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const citation = 'https://www.tradingview.com/pine-script-reference/v6/#fun_math.round_to_mintick';
const openDefect = 'math-round-to-mintick-epsilon-crosses-tick-boundary';

// functions161: nearest mintick multiple, with ties rounding up and na preserved.
// Binary-exact quarter/half fractions distinguish ties from padding-induced ties.
const cases = [
  { name: 'positive value below halfway', value: 1_000_000_000_000_000.25, tick: 1, expected: 1_000_000_000_000_000 },
  {
    name: 'negative value nearest lower tick',
    value: -1_000_000_000_000_000.75,
    tick: 1,
    expected: -1_000_000_000_000_001,
  },
  {
    name: 'positive quarter-tick tie',
    value: 1_000_000_000_000_000.125,
    tick: 0.25,
    expected: 1_000_000_000_000_000.25,
  },
  {
    name: 'negative quarter-tick tie',
    value: -1_000_000_000_000_000.125,
    tick: 0.25,
    expected: -1_000_000_000_000_000,
  },
];

function evaluate(values: number[], tick: number, expression = 'math.round_to_mintick(number=close)') {
  const bars = compatibilityBars.slice(0, values.length).map((bar, index) => ({
    ...bar,
    open: values[index],
    high: values[index],
    low: values[index],
    close: values[index],
  }));
  const result = runCompatScript(`//@version=6\nindicator("Mintick quotient")\nplot(${expression}, "rounded")`, {
    bars,
    engineOptions: { runtime: { syminfo: { mintick: tick } } },
  });
  expect(result.errors, citation).toEqual([]);
  expect(result.profile.compiledBarErrors?.count ?? 0, citation).toBe(0);
  const rounded = getPlot(result, 'rounded').values;
  expect(rounded, citation).toHaveLength(values.length);
  return rounded;
}

for (const testCase of cases) {
  describe(`${testCase.name} [functions:161] [FIXED-CONTRACT: ${openDefect}]`, () => {
    let values: Array<number | null>;
    beforeAll(() => {
      values = evaluate([testCase.value, testCase.value, testCase.value], testCase.tick);
    });
    it('returns the nearest tick rather than letting epsilon move the boundary', () => {
      expect(values, citation).toEqual([testCase.expected, testCase.expected, testCase.expected]);
    });
  });
}

it('ordinary finite values choose nearest tick with positive and negative ties up [functions:161]', () => {
  expect(evaluate([2.25, 2.5, -2.5, -2.75], 1), citation).toEqual([2, 3, -2, -3]);
});

it('missing number remains missing [functions:161]', () => {
  expect(evaluate([1, 2, 3], 1, 'math.round_to_mintick(float(na))'), citation).toEqual([null, null, null]);
});
