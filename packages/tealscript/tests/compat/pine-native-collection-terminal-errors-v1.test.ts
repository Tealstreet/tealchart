import { describe, expect, it } from 'vitest';

import { runCompatScript } from './fixtures';

const header = '//@version=6\nindicator("Native collection terminal errors")\n';

// Native v7 unequal-size, percentage-domain and fill-endpoint captures.
// Functional regression: preserve the argument and result contract.
describe('captured collection terminal errors', () => {
  it.each([
    [
      'array.covariance(array.from(1, 2), array.from(2, 5, 7))',
      0,
      'RE10073',
      'The sizes of the `id1` and `id2` arrays must be equal.',
    ],
    [
      'array.covariance(array.from(1, 2, 3), array.from(2, 5))',
      0,
      'RE10073',
      'The sizes of the `id1` and `id2` arrays must be equal.',
    ],
    [
      'if bar_index == 3\n    array.percentile_linear_interpolation(array.from(1, 2, 4), -1)',
      3,
      'RE10002',
      "Invalid value of the 'percentage' argument (-1) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100].",
    ],
    [
      'if bar_index == 3\n    array.percentile_linear_interpolation(array.from(1, 2, 4), 101)',
      3,
      'RE10002',
      "Invalid value of the 'percentage' argument (101) in the 'array.percentile_linear_interpolation' function. It must be in the range [0..100].",
    ],
    [
      'if bar_index == 3\n    array.fill(array.from(1, 2, 3), 9, -1, 2)',
      3,
      'RE10045',
      "In 'array.fill()' function. Index -1 is out of bounds, array size is 3.",
    ],
    [
      'if bar_index == 3\n    array.fill(array.from(1, 2, 3), 9, 0, 5)',
      3,
      'RE10045',
      "In 'array.fill()' function. Index 5 is out of bounds, array size is 3.",
    ],
  ] as const)('publishes the captured failure: %s', (body, barIndex, code, message) => {
    const result = runCompatScript(header + body);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ code, barIndex, message: `Error on bar ${barIndex}: ${message}` });
    expect(result.profile.swallowedErrors ?? []).toEqual([]);
  });
});
