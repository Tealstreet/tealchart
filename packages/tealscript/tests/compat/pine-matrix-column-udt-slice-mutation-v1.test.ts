import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[569]/methods[150] matrix.col new array;
// functions[467,473,482,496,499] and methods[68,74,83,85,88] slice/index/mutation;
// Column shallow reference contract retained in storage-reference witnesses.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.col';
const setup = `type Cell
    int score
m = matrix.new<Cell>(5, 2, Cell.new(113))
m.set(0, 1, Cell.new(17))
m.set(1, 1, Cell.new(-8))
m.set(2, 1, Cell.new(43))
m.set(3, 1, Cell.new(5))
m.set(4, 1, Cell.new(71))
original = m.get(2, 1)
replacement = Cell.new(29)`;
const matrixExpressions = [
  'm.rows()',
  'm.columns()',
  'm.get(0, 0).score',
  'm.get(4, 0).score',
  'm.get(0, 1).score',
  'm.get(1, 1).score',
  'm.get(2, 1).score',
  'm.get(3, 1).score',
  'm.get(4, 1).score',
];

describe('compiled matrix column extraction followed by UDT slice mutation', () => {
  for (const method of [false, true]) {
    const extracted = `${setup}\nc = ${method ? 'm.col(column=1)' : 'matrix.col(column=1, id=m)'}\ns = ${
      method ? 'c.slice(index_to=4, index_from=1)' : 'array.slice(index_to=4, id=c, index_from=1)'
    }`;
    registerCollectionReferenceCases([
      {
        name: `set through extracted column slice replaces only array slot and shares new object method=${method}`,
        reference,
        rejects:
          'editing matrix slots, parent-based negative indexing, cloning the replacement, changing column dimensions or editing the wrong column',
        source: `${extracted}\n${
          method ? 's.set(value=replacement, index=-2)' : 'array.set(value=replacement, id=s, index=-2)'
        }\nshared = c.get(2)\nshared.score := 31\noriginal.score := -37`,
        expressions: [
          ...matrixExpressions,
          'c.size()',
          's.size()',
          'c.get(0).score',
          'c.get(1).score',
          'c.get(2).score',
          'c.get(3).score',
          'c.get(4).score',
          's.get(1).score',
          'replacement.score',
        ],
        expected: [5, 2, 113, 113, 17, -8, -37, 5, 71, 5, 3, 17, -8, 31, 5, 71, 31, 31],
      },
      {
        name: `insert through extracted column slice grows only column array and keeps matrix references method=${method}`,
        reference,
        rejects:
          'growing the matrix, inserting at parent-based negative position, cloning the inserted object or losing existing shared objects',
        source: `${extracted}\n${
          method ? 's.insert(value=replacement, index=-2)' : 'array.insert(value=replacement, id=s, index=-2)'
        }\nshared = s.get(1)\nshared.score := 31\noriginal.score := -37`,
        expressions: [
          ...matrixExpressions,
          'c.size()',
          's.size()',
          'c.get(0).score',
          'c.get(1).score',
          'c.get(2).score',
          'c.get(3).score',
          'c.get(4).score',
          'c.get(5).score',
          's.get(1).score',
          'replacement.score',
        ],
        expected: [5, 2, 113, 113, 17, -8, -37, 5, 71, 6, 4, 17, -8, 31, -37, 5, 71, 31, 31],
      },
      {
        name: `remove through extracted column slice returns matrix shared object without changing matrix slots method=${method}`,
        reference,
        rejects:
          'removing a matrix slot, wrong parent offset, copied return object or leaving extracted column size unchanged',
        source: `${extracted}\nremoved = ${
          method ? 's.remove(index=-2)' : 'array.remove(index=-2, id=s)'
        }\nremoved.score := 31`,
        expressions: [
          ...matrixExpressions,
          'c.size()',
          's.size()',
          'c.get(0).score',
          'c.get(1).score',
          'c.get(2).score',
          'c.get(3).score',
          's.get(0).score',
          's.get(1).score',
          'removed.score',
          'original.score',
        ],
        expected: [5, 2, 113, 113, 17, -8, 31, 5, 71, 4, 2, 17, -8, 5, 71, -8, 5, 31, 31],
      },
    ]);
  }
});
