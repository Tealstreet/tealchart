import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const ref = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.pinv';

describe('documented nonsingular matrix pseudoinverse equality', () => {
  registerCollectionReferenceCases([
    ...[0.000001, -0.000002].map((value) => ({
      name: `pinv of nonsingular scalar ${value} equals its reciprocal`,
      reference: ref,
      rejects: 'squaring the zero tolerance and returning a zero pseudoinverse for a nonzero scalar',
      source: `a = matrix.new<float>(1, 1, ${value})\np = matrix.pinv(a)`,
      expressions: ['p.get(0, 0)', 'a.get(0, 0)', 'p.rows()', 'p.columns()'],
      expected: [1 / value, value, 1, 1],
    })),
    {
      name: 'pinv of a small nonsingular diagonal matrix inverts both independent columns',
      reference: ref,
      rejects: 'discarding the first column, treating the second column as dependent, and a zero result',
      source: 'a = matrix.new<float>(2, 2, 0.0)\na.set(0, 0, 0.000002)\na.set(1, 1, -0.000004)\np = a.pinv()',
      expressions: ['p.get(0, 0)', 'p.get(0, 1)', 'p.get(1, 0)', 'p.get(1, 1)'],
      expected: [500000, 0, 0, -250000],
    },
  ]);
});
