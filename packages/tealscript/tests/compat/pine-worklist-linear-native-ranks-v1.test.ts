import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Native v14 int/float captures override a naive reading of interpolation remarks.
// DOC-CONFLICT-NATIVE-WINS: [10,21] at 0/25/50/75/100 => 10/10/15.5/21/21.
describe('pine-worklist-linear-native-ranks-v1', () => {
  registerCollectionReferenceCases([
    {
      name: 'int namespace native v14 ranks',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.percentile_linear_interpolation',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(10, 21)',
      expressions: [
        'array.percentile_linear_interpolation(a, 0)',
        'array.percentile_linear_interpolation(a, 25)',
        'array.percentile_linear_interpolation(a, 50)',
        'array.percentile_linear_interpolation(a, 75)',
        'array.percentile_linear_interpolation(a, 100)',
      ],
      expected: [10, 10, 15.5, 21, 21],
    },
    {
      name: 'int method native v14 ranks',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.percentile_linear_interpolation',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(10, 21)',
      expressions: [
        'a.percentile_linear_interpolation(0)',
        'a.percentile_linear_interpolation(25)',
        'a.percentile_linear_interpolation(50)',
        'a.percentile_linear_interpolation(75)',
        'a.percentile_linear_interpolation(100)',
      ],
      expected: [10, 10, 15.5, 21, 21],
    },
    {
      name: 'float namespace native v14 ranks',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.percentile_linear_interpolation',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(10.0, 21.0)',
      expressions: [
        'array.percentile_linear_interpolation(a, 0)',
        'array.percentile_linear_interpolation(a, 25)',
        'array.percentile_linear_interpolation(a, 50)',
        'array.percentile_linear_interpolation(a, 75)',
        'array.percentile_linear_interpolation(a, 100)',
      ],
      expected: [10, 10, 15.5, 21, 21],
    },
    {
      name: 'float method native v14 ranks',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.percentile_linear_interpolation',
      rejects: 'discarding arguments, reordering values, or changing the documented result',
      source: 'a = array.from(10.0, 21.0)',
      expressions: [
        'a.percentile_linear_interpolation(0)',
        'a.percentile_linear_interpolation(25)',
        'a.percentile_linear_interpolation(50)',
        'a.percentile_linear_interpolation(75)',
        'a.percentile_linear_interpolation(100)',
      ],
      expected: [10, 10, 15.5, 21, 21],
    },
  ]);
});
