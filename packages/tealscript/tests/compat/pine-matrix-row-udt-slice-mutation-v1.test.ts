import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[568] matrix.row new array;
// functions[467,473,482,496,499] and methods[68,74,83,85,88] slice/index/mutation;
// Matrix row shallow reference contract retained in packet003's row witnesses.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.row';
const setup = `type Cell
    int score
m = matrix.new<Cell>(2, 5, Cell.new(113))
m.set(1, 0, Cell.new(17))
m.set(1, 1, Cell.new(-8))
m.set(1, 2, Cell.new(43))
m.set(1, 3, Cell.new(5))
m.set(1, 4, Cell.new(71))
original = m.get(1, 2)
replacement = Cell.new(29)`;
const matrixExpressions = [
  'm.rows()',
  'm.columns()',
  'm.get(0, 0).score',
  'm.get(0, 4).score',
  'm.get(1, 0).score',
  'm.get(1, 1).score',
  'm.get(1, 2).score',
  'm.get(1, 3).score',
  'm.get(1, 4).score',
];

describe('compiled matrix row extraction followed by UDT slice mutation', () => {
  for (const method of [false, true]) {
    const extracted = `${setup}\nr = ${method ? 'm.row(row=1)' : 'matrix.row(row=1, id=m)'}\ns = ${
      method ? 'r.slice(index_to=4, index_from=1)' : 'array.slice(index_to=4, id=r, index_from=1)'
    }`;
    registerCollectionReferenceCases([
      {
        name: `set through extracted row slice replaces only array slot and shares new object method=${method}`,
        reference,
        rejects:
          'editing matrix slots, parent-based negative indexing, cloning the replacement, changing row dimensions or editing the wrong row',
        source: `${extracted}\n${
          method ? 's.set(value=replacement, index=-2)' : 'array.set(value=replacement, id=s, index=-2)'
        }\nshared = r.get(2)\nshared.score := 31\noriginal.score := -37`,
        expressions: [
          ...matrixExpressions,
          'r.size()',
          's.size()',
          'r.get(0).score',
          'r.get(1).score',
          'r.get(2).score',
          'r.get(3).score',
          'r.get(4).score',
          's.get(1).score',
          'replacement.score',
        ],
        expected: [2, 5, 113, 113, 17, -8, -37, 5, 71, 5, 3, 17, -8, 31, 5, 71, 31, 31],
      },
      {
        name: `insert through extracted row slice grows only row array and keeps matrix references method=${method}`,
        reference,
        rejects:
          'growing the matrix, inserting at parent-based negative position, cloning the inserted object or losing existing shared objects',
        source: `${extracted}\n${
          method ? 's.insert(value=replacement, index=-2)' : 'array.insert(value=replacement, id=s, index=-2)'
        }\nshared = s.get(1)\nshared.score := 31\noriginal.score := -37`,
        expressions: [
          ...matrixExpressions,
          'r.size()',
          's.size()',
          'r.get(0).score',
          'r.get(1).score',
          'r.get(2).score',
          'r.get(3).score',
          'r.get(4).score',
          'r.get(5).score',
          's.get(1).score',
          'replacement.score',
        ],
        expected: [2, 5, 113, 113, 17, -8, -37, 5, 71, 6, 4, 17, -8, 31, -37, 5, 71, 31, 31],
      },
      {
        name: `remove through extracted row slice returns matrix shared object without changing matrix slots method=${method}`,
        reference,
        rejects:
          'removing a matrix slot, wrong parent offset, copied return object or leaving extracted row size unchanged',
        source: `${extracted}\nremoved = ${
          method ? 's.remove(index=-2)' : 'array.remove(index=-2, id=s)'
        }\nremoved.score := 31`,
        expressions: [
          ...matrixExpressions,
          'r.size()',
          's.size()',
          'r.get(0).score',
          'r.get(1).score',
          'r.get(2).score',
          'r.get(3).score',
          's.get(0).score',
          's.get(1).score',
          'removed.score',
          'original.score',
        ],
        expected: [2, 5, 113, 113, 17, -8, 31, 5, 71, 4, 2, 17, -8, 5, 71, -8, 5, 31, 31],
      },
    ]);
  }
});
