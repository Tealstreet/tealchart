import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Ranks1629,1632-1640: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json operators entries below.
// Negative remainder authorities conflict, so neither % nor %= is asserted here.
const bars = [3, 1, 3, 2, 2].map((close, index) => ({
  time: 1700000000000 + index * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
}));
const cases = [
  { entry: 9, expression: 'close != 2 ? 1 : 0', expected: [1, 1, 1, 0, 0] },
  { entry: 1, expression: '+close', expected: [3, 1, 3, 2, 2] },
  { entry: 2, expression: 'close + 2', expected: [5, 3, 5, 4, 4] },
  { entry: 2, expression: '("left" + "right") == "leftright" ? 1 : 0', expected: [1, 1, 1, 1, 1] },
  { entry: 3, expression: '-close', expected: [-3, -1, -3, -2, -2] },
  { entry: 4, expression: 'close - 2', expected: [1, -1, 1, 0, 0] },
  { entry: 14, expression: 'close * 2', expected: [6, 2, 6, 4, 4] },
  { entry: 15, expression: 'close / 2', expected: [1.5, 0.5, 1.5, 1, 1] },
];
const assignments = [
  { entry: 17, operator: '+=', expected: [5, 3, 5, 4, 4] },
  { entry: 18, operator: '-=', expected: [1, -1, 1, 0, 0] },
  { entry: 19, operator: '*=', expected: [6, 2, 6, 4, 4] },
  { entry: 20, operator: '/=', expected: [1.5, 0.5, 1.5, 1, 1] },
];

describe('documented Pine arithmetic and reassignment', () => {
  it.each(cases)('evaluates operators[$entry] $expression', ({ expression, expected }) => {
    const result = runCompatScript(`//@version=6\nindicator("operator")\nplot(${expression}, "value")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(expected);
  });

  it.each(assignments)('evaluates operators[$entry] $operator', ({ operator, expected }) => {
    const result = runCompatScript(
      `//@version=6\nindicator("assignment")\nvalue = close\nvalue ${operator} 2\nplot(value, "value")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual(expected);
  });

  it('operators[7] reassigns the outer variable from a local conditional block', () => {
    const result = runCompatScript(
      '//@version=6\nindicator("reassignment")\nvalue = 0.0\nif close > 2\n    value := close\nplot(value, "value")',
      { bars },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual([3, 0, 3, 0, 0]);
  });
});
