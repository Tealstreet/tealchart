import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = '~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json';
const captures = '~/cs/tealstreet-next/packages/tealscript/oracle-probes/v2/captures/v2';
const bars = Array.from({ length: 50 }, (_, index) => ({
  ...compatibilityBars[0],
  time: compatibilityBars[0].time + index * 120000,
}));

const cases = [
  {
    capture: 'coverage-math-1-v1-attempt2.csv',
    column: 'round_clean',
    expression: 'math.round(clean)',
    expected: [
      -2.0, -2.0, -2.0, -1.0, -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, -2.0, -2.0, -2.0,
      -1.0, -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, -2.0, -2.0, -2.0, -1.0, -1.0, -1.0,
      -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0,
    ],
  },
  {
    capture: 'coverage-math-1-v1-attempt2.csv',
    column: 'round_hole97',
    expression: 'math.round(holes)',
    expected: [
      -2.0,
      -2.0,
      -2.0,
      -1.0,
      -1.0,
      -1.0,
      -1.0,
      0.0,
      0.0,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      2.0,
      2.0,
      2.0,
      -2.0,
      -2.0,
      -2.0,
      -1.0,
      -1.0,
      -1.0,
      -1.0,
      0.0,
      0.0,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      2.0,
      2.0,
      2.0,
      -2.0,
      -2.0,
      -2.0,
      -1.0,
      -1.0,
      -1.0,
      null,
      null,
      null,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      2.0,
      2.0,
    ],
  },
  {
    capture: 'coverage-math-1-v1-attempt2.csv',
    column: 'round_warm0_7',
    expression: 'math.round(warm)',
    expected: [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0.0,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      2.0,
      2.0,
      2.0,
      -2.0,
      -2.0,
      -2.0,
      -1.0,
      -1.0,
      -1.0,
      -1.0,
      0.0,
      0.0,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      2.0,
      2.0,
      2.0,
      -2.0,
      -2.0,
      -2.0,
      -1.0,
      -1.0,
      -1.0,
      -1.0,
      0.0,
      0.0,
      0.0,
      1.0,
      1.0,
      1.0,
      1.0,
      2.0,
      2.0,
    ],
  },
  {
    capture: 'coverage-math-1-v1-attempt2.csv',
    column: 'round_floor_control_delta',
    expression: 'math.round(clean) - math.floor(clean + 0.5)',
    expected: [
      0.0, 0.0, -1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0,
      0.0, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ],
  },
  {
    capture: 'coverage-math-2-v1.csv',
    column: 'round_m050',
    expression: 'math.round(-0.5)',
    expected: [
      -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0,
      -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0,
      -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0,
    ],
  },
  {
    capture: 'coverage-math-2-v1.csv',
    column: 'round_m150',
    expression: 'math.round(-1.5)',
    expected: [
      -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0,
      -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0,
      -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0,
    ],
  },
  {
    capture: 'coverage-math-2-v1.csv',
    column: 'round_prec0',
    expression: 'math.round(clean, 0)',
    expected: [
      -2.0, -2.0, -2.0, -1.0, -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, -2.0, -2.0, -2.0,
      -1.0, -1.0, -1.0, -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, -2.0, -2.0, -2.0, -1.0, -1.0, -1.0,
      -1.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0,
    ],
  },
  {
    capture: 'coverage-math-2-v1.csv',
    column: 'round_prec_dynamic',
    expression: 'math.round(clean / 3, b % 3)',
    expected: [
      -1.0, -0.6, -0.5, 0.0, -0.3, -0.25, 0.0, -0.1, 0.0, 0.0, 0.2, 0.25, 0.0, 0.4, 0.5, 1.0, 0.7, -0.67, -1.0, -0.5,
      -0.42, 0.0, -0.3, -0.17, 0.0, 0.0, 0.08, 0.0, 0.3, 0.33, 0.0, 0.5, 0.58, 1.0, -0.7, -0.58, -1.0, -0.4, -0.33, 0.0,
      -0.2, -0.08, 0.0, 0.1, 0.17, 0.0, 0.3, 0.42, 1.0, 0.6,
    ],
  },
] as const;

for (const { capture, column, expression, expected } of cases) {
  describe(`${reference} functions[152-159]; ${captures}/${capture} bars 0-49`, () => {
    it(`matches native ${column} values including negative half ties`, () => {
      const result = runCompatScript(
        `//@version=6
indicator("Native round half ties")
b = bar_index
hole = b % 97 == 40 or b % 97 == 41 or b % 97 == 42
clean = (b % 17 - 8) / 4.0
holes = hole ? na : clean
warm = b < 8 ? na : clean
plot(${expression}, title="Native")
plot(math.round(0.5), title="Positive")
`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      const nativeValues = getPlot(result, 'Native').values.map((value) => (value === 0 ? 0 : value));
      expect(nativeValues).toEqual(expected);
      expect(getPlot(result, 'Positive').values).toEqual(Array(50).fill(1));
    });
  });
}
