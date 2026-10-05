import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const ref = (member: string): string => `https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.${member}`;
// A rectangular asymmetric matrix rejects row/column swaps and flattened indexing.
const base = `m = matrix.new<int>(2, 3, 0)
m.set(0, 0, 17)
m.set(0, 1, -8)
m.set(0, 2, 43)
m.set(1, 0, 5)
m.set(1, 1, 71)
m.set(1, 2, -31)`;
const cells = ['m.get(0, 0)', 'm.get(0, 1)', 'm.get(0, 2)', 'm.get(1, 0)', 'm.get(1, 1)', 'm.get(1, 2)'];

// Passing cases were proven red by runtime mutation. Expected reds were proven
// green by documented patches in a discarded isolated package copy.
describe('Pine matrix documented collection contracts', () => {
  registerCollectionReferenceCases([
    {
      name: 'get and set address distinct zero-based row and column coordinates',
      reference: `${ref('get')} ${ref('set')}`,
      rejects: 'one-based indexing, row/column transposition, incorrect row stride, and setter no-op',
      source: `${base}\nm.set(1, 1, 29)`,
      expressions: [...cells, 'm.rows()', 'm.columns()'],
      expected: [17, -8, 43, 5, 29, -31, 2, 3],
    },
    ...(['get', 'set'] as const).flatMap((member) => [[2, 0], [0, 3], [-1, 0], [0, -1]].map(([row, column]) => ({
      name: `${member} refuses row ${row} column ${column} outside matrix dimensions`,
      reference: `${ref(member)} https://www.tradingview.com/pine-script-docs/language/matrices/#error-handling`,
      rejects: 'negative array-style indexing, clamping, wrapping, and silently reading or writing outside dimensions',
      source: `${base}\nm.${member}(${row}, ${column}${member === 'set' ? ', 29' : ''})`,
      error: /Matrix (row|column).*out of bounds/,
    }))),
    {
      name: 'row and col extract the selected axis in coordinate order',
      reference: `${ref('row')} ${ref('col')}`,
      rejects: 'swapped axes, first-axis-only extraction, wrong stride, and reversed extraction',
      source: `${base}\nr = m.row(1)\nc = matrix.col(m, 1)`,
      expressions: ['r.size()', 'r.get(0)', 'r.get(1)', 'r.get(2)', 'c.size()', 'c.get(0)', 'c.get(1)'],
      expected: [3, 5, 71, -31, 2, -8, 71],
    },
    {
      name: 'copy creates independent matrix element storage in both directions',
      reference: ref('copy'),
      rejects: 'returning the original matrix or sharing its backing element storage',
      source: `${base}\nc = m.copy()\nc.set(0, 1, 29)\nm.set(1, 2, 97)`,
      expressions: ['m.get(0, 1)', 'c.get(1, 2)', 'c.get(0, 1)', 'm.get(1, 2)', 'c.rows()', 'c.columns()'],
      expected: [-8, -31, 29, 97, 2, 3],
    },
    {
      name: 'fill uses inclusive starts and exclusive ends on both axes',
      reference: ref('fill'),
      rejects: 'inclusive ends, swapped axis ranges, full-matrix fill, and exclusive starts',
      source: `${base}\nm.fill(29, 0, 1, 1, 2)`,
      expressions: cells,
      expected: [17, 29, 43, 5, 71, -31],
    },
    {
      name: 'fill defaults span the complete matrix',
      reference: ref('fill'),
      rejects: 'defaulting ends to zero, filling only one row or column, and setter no-op',
      source: `${base}\nm.fill(29)`,
      expressions: cells,
      expected: [29, 29, 29, 29, 29, 29],
    },
    {
      name: 'submatrix uses half-open axis ranges and returns independent storage',
      reference: ref('submatrix'),
      rejects: 'inclusive bounds, reversed axes, and returning a mutable view of the original',
      source: `${base}\ns = m.submatrix(0, 2, 1, 3)\nbefore = s.get(1, 1)\ns.set(0, 0, 29)\nm.set(1, 2, 97)`,
      expressions: ['s.rows()', 's.columns()', 'before', 's.get(0, 0)', 's.get(0, 1)', 's.get(1, 0)', 's.get(1, 1)', 'm.get(0, 1)'],
      expected: [2, 2, -31, 29, 43, 71, -31, -8],
    },
    {
      name: 'submatrix omitted bounds copy the entire rectangular matrix',
      reference: ref('submatrix'),
      rejects: 'empty default bounds, losing the last row or column, and defaulting to a square',
      source: `${base}\ns = m.submatrix()`,
      expressions: ['s.rows()', 's.columns()', 's.get(0, 0)', 's.get(0, 2)', 's.get(1, 0)', 's.get(1, 2)'],
      expected: [2, 3, 17, 43, 5, -31],
    },
    {
      name: 'add_row inserts before the indexed row and shifts existing rows',
      reference: ref('add_row'),
      rejects: 'append, replacement, shifting by one scalar instead of one row, and changing column count',
      source: `${base}\nm.add_row(1, array.from(29, -47, 97))`,
      expressions: ['m.rows()', 'm.columns()', 'm.get(0, 1)', 'm.get(1, 0)', 'm.get(1, 1)', 'm.get(1, 2)', 'm.get(2, 0)', 'm.get(2, 2)'],
      expected: [3, 3, -8, 29, -47, 97, 5, -31],
    },
    {
      name: 'add_col inserts before the indexed column and shifts every row',
      reference: ref('add_col'),
      rejects: 'append, replacement, shifting only the first row, and changing row count',
      source: `${base}\nm.add_col(1, array.from(29, -47))`,
      expressions: ['m.rows()', 'm.columns()', 'm.get(0, 0)', 'm.get(0, 1)', 'm.get(0, 2)', 'm.get(0, 3)', 'm.get(1, 1)', 'm.get(1, 2)', 'm.get(1, 3)'],
      expected: [2, 4, 17, 29, -8, 43, -47, 71, -31],
    },
    {
      name: 'remove_row returns the removed row and shrinks the row dimension',
      reference: ref('remove_row'),
      rejects: 'removing the last row, returning a column, and leaving dimensions or following rows unchanged',
      source: `${base}\nr = m.remove_row(0)`,
      expressions: ['r.size()', 'r.get(0)', 'r.get(1)', 'r.get(2)', 'm.rows()', 'm.columns()', 'm.get(0, 0)', 'm.get(0, 2)'],
      expected: [3, 17, -8, 43, 1, 3, 5, -31],
    },
    {
      name: 'remove_col returns the removed column in row order and shifts all rows',
      reference: ref('remove_col'),
      rejects: 'removing the last column, returning reversed values, and shifting only the first row',
      source: `${base}\nc = m.remove_col(1)`,
      expressions: ['c.size()', 'c.get(0)', 'c.get(1)', 'm.rows()', 'm.columns()', 'm.get(0, 1)', 'm.get(1, 1)'],
      expected: [2, -8, 71, 2, 2, 43, -31],
    },
    {
      name: 'concat appends rows into and returns the first matrix preserving the second',
      reference: ref('concat'),
      rejects: 'appending columns, reversed append, detached return, and right-side mutation',
      source: `${base}\ns = matrix.new<int>(1, 3, -47)\nc = matrix.concat(m, s)\nc.set(0, 0, 29)`,
      expressions: ['m.rows()', 'm.columns()', 'm.get(0, 0)', 'm.get(1, 2)', 'm.get(2, 1)', 's.rows()', 's.get(0, 0)'],
      expected: [3, 3, 29, -31, -47, 1, -47],
    },
    {
      name: 'concat refuses unequal column counts',
      reference: ref('concat'),
      rejects: 'truncation, padding, and silently accepting incompatible shapes',
      source: `${base}\ns = matrix.new<int>(1, 2, -47)\nm.concat(s)`,
      error: /Matrix concat requires matching column counts/,
    },
    {
      name: 'concat requires equal column counts even when the second matrix has zero rows',
      reference: ref('concat'),
      rejects: 'returning early for zero rows before checking the documented column constraint',
      source: `${base}\ns = matrix.new<int>(0, 2)\nm.concat(s)`,
      error: /Matrix concat requires matching column counts/,
    },
    ...(['row', 'col'] as const).map((axis) => ({
      name: `add_${axis} refuses an array whose size does not match the opposite dimension`,
      reference: ref(`add_${axis}`),
      rejects: 'truncating or padding the supplied array and corrupting dimensions',
      source: `${base}\nm.add_${axis}(1, array.from(29))`,
      error: /Matrix (row|column) length .*does not match/,
    })),
    {
      name: 'reverse reverses both axes of a rectangular matrix',
      reference: ref('reverse'),
      rejects: 'reversing only rows, only columns, transposing, and changing dimensions',
      source: `${base}\nm.reverse()`,
      expressions: [...cells, 'm.rows()', 'm.columns()'],
      expected: [-31, 71, 5, 43, -8, 17, 2, 3],
    },
    {
      name: 'new add_row add_col and concat permit exactly one hundred thousand matrix elements',
      reference: `${ref('new<type>')} ${ref('add_row')} ${ref('add_col')} ${ref('concat')} https://www.tradingview.com/pine-script-docs/language/matrices/#introduction`,
      rejects: 'a less-than-only capacity check, per-axis limits, and rejecting valid boundary growth',
      source: `n = matrix.new<int>(10000, 10, 17)
r = matrix.new<int>(9999, 10, -8)
r.add_row(9999, array.new<int>(10, 29))
c = matrix.new<int>(10, 9999, 43)
c.add_col(9999, array.new<int>(10, -31))
a = matrix.new<int>(9999, 10, 5)
a.concat(matrix.new<int>(1, 10, 71))`,
      expressions: ['n.elements_count()', 'r.elements_count()', 'r.get(9999, 9)', 'c.elements_count()', 'c.get(9, 9999)', 'a.elements_count()', 'a.get(9999, 9)'],
      expected: [100000, 100000, 29, 100000, -31, 100000, 71],
    },
    ...([
      ['new<type>', 'new', 'm = matrix.new<int>(10001, 10, 17)'],
      ['add_row', 'add_row', 'm = matrix.new<int>(10000, 10, 17)\nm.add_row(10000, array.new<int>(10, 29))'],
      ['add_col', 'add_col', 'm = matrix.new<int>(10, 10000, 17)\nm.add_col(10000, array.new<int>(10, 29))'],
      ['concat', 'concat', 'm = matrix.new<int>(9999, 10, 17)\nm.concat(matrix.new<int>(2, 10, 29))'],
    ] as const).map(([member, name, source]) => ({
      name: `${name} refuses matrix capacity above one hundred thousand elements`,
      reference: `${ref(member)} https://www.tradingview.com/pine-script-docs/language/matrices/#introduction`,
      rejects: 'unbounded growth, applying the limit to each dimension separately, and ignoring combined element count',
      source,
      error: /Matrix.*100[,_]?000/,
    })),
    {
      name: 'new omitted dimensions create an empty matrix and omitted numeric initial values are na',
      reference: ref('new<type>'),
      rejects: 'one-cell default, zero initialization, and losing rectangular dimensions',
      source: 'm = matrix.new<float>()\ns = matrix.new<float>(2, 3)\nv = matrix.new<float>(1, 2, -31)',
      expressions: ['m.rows()', 'm.columns()', 's.rows()', 's.columns()', 'na(s.get(0, 0)) ? 1 : 0', 'na(s.get(1, 2)) ? 1 : 0', 'v.get(0, 1)'],
      expected: [0, 0, 2, 3, 1, 1, -31],
    },
  ]);
});
