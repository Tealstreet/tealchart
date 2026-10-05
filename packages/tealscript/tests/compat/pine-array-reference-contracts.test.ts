import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const ref = (member: string): string => `https://www.tradingview.com/pine-script-reference/v6/#fun_array.${member}`;
const base = 'a = array.from(17, -8, 43, 5)';

// Expectations derive from each cited reference entry, never from TealScript output.
// Passing cases were proven red by runtime mutation; expected reds were proven
// green by documented runtime patches in a discarded isolated package copy.
describe('Pine array documented collection contracts', () => {
  registerCollectionReferenceCases([
    {
      name: 'get counts negative indices from the end including negative size',
      reference: ref('get'),
      rejects: 'absolute-value indexing, one-based indexing, clamping, and returning an extremum',
      source: base,
      expressions: ['a.get(-1)', 'array.get(a, -2)', 'a.get(-4)', 'a.get(0)'],
      expected: [5, 43, 17, 17],
    },
    {
      name: 'set replaces end-relative slots without changing size or adjacent slots',
      reference: ref('set'),
      rejects: 'insertion, append, absolute-value indexing, and changing a neighbor',
      source: `${base}\na.set(-1, 29)\narray.set(a, -4, -31)`,
      expressions: ['a.get(0)', 'a.get(1)', 'a.get(2)', 'a.get(3)', 'a.size()'],
      expected: [-31, -8, 43, 29, 4],
    },
    {
      name: 'remove returns the end-relative element and shifts only following slots',
      reference: ref('remove'),
      rejects: 'pop, shift, no removal, wrong return value, and size-plus-index-plus-one',
      source: `${base}\nremoved = a.remove(-2)`,
      expressions: ['removed', 'a.size()', 'a.get(0)', 'a.get(1)', 'a.get(2)'],
      expected: [43, 3, 17, -8, 5],
    },
    {
      name: 'insert uses the negative element coordinate before shifting that element',
      reference: ref('insert'),
      rejects: 'inserting after the indexed element, append, and replacement',
      source: `${base}\na.insert(-1, 29)\narray.insert(a, -5, -31)`,
      expressions: ['a.get(0)', 'a.get(1)', 'a.get(4)', 'a.get(5)', 'a.size()'],
      expected: [-31, 17, 29, 5, 6],
    },
    ...(['get', 'set', 'remove'] as const).flatMap((member) => [4, -5].map((index) => ({
      name: `${member} refuses index ${index} outside the positive and negative bounds`,
      reference: `${ref(member)} https://www.tradingview.com/pine-script-docs/language/arrays/#negative-indexing`,
      rejects: 'clamping, wrapping, returning na, growing the array, and silently ignoring invalid coordinates',
      source: `${base}\na.${member}(${index}${member === 'set' ? ', 29' : ''})`,
      error: /Array index .*out of bounds/,
    }))),
    {
      name: 'insert refuses negative indices below negative size',
      reference: `${ref('insert')} https://www.tradingview.com/pine-script-docs/language/arrays/#negative-indexing`,
      rejects: 'accepting the extra negative coordinate -size-1 as the first insertion position',
      source: `${base}\na.insert(-5, 29)`,
      error: /Array index .*out of bounds/,
    },
    {
      name: 'copy has independent slots and length in both mutation directions',
      reference: ref('copy'),
      rejects: 'returning the same array or sharing its element storage',
      source: `${base}\nb = a.copy()\nb.set(0, 29)\nb.push(-31)\na.set(1, 71)`,
      expressions: ['a.get(0)', 'a.size()', 'b.get(1)', 'b.size()'],
      expected: [17, 4, -8, 5],
    },
    {
      name: 'concat mutates and returns the first array while preserving the second',
      reference: ref('concat'),
      rejects: 'detached return, right-side mutation, reversed append, and appending only one element',
      source: 'a = array.from(17, -8)\nb = array.from(43, 5)\nc = array.concat(a, b)\nc.set(0, 29)',
      expressions: ['a.get(0)', 'a.get(2)', 'a.get(3)', 'a.size()', 'b.get(0)', 'b.size()'],
      expected: [29, 43, 5, 4, 43, 2],
    },
    {
      name: 'slice is half-open with local indices and writes through to its parent',
      reference: ref('slice'),
      rejects: 'inclusive upper bound, parent-based slice indices, and detached copy',
      source: 'a = array.from(17, -8, 43, 5, 71)\ns = array.slice(a, 1, 4)\ns.set(1, 29)\na.set(3, -31)',
      expressions: ['s.size()', 's.get(0)', 'a.get(2)', 's.get(2)', 'a.get(4)'],
      expected: [3, -8, 29, -31, 71],
    },
    {
      name: 'inserting into a slice inserts into the corresponding parent position',
      reference: ref('slice'),
      rejects: 'detached slice mutation, replacement, and applying the local index directly to the parent',
      source: 'a = array.from(17, -8, 43, 5, 71)\ns = a.slice(1, 4)\ns.insert(1, 29)',
      expressions: ['a.get(0)', 'a.get(2)', 'a.get(3)', 'a.get(5)', 'a.size()', 's.size()'],
      expected: [17, 29, 43, 71, 6, 4],
    },
    {
      name: 'removing from a slice returns and removes the corresponding parent element',
      reference: ref('slice'),
      rejects: 'detached slice mutation, wrong parent offset, and leaving slice length unchanged',
      source: 'a = array.from(17, -8, 43, 5, 71)\ns = a.slice(1, 4)\nremoved = s.remove(1)',
      expressions: ['removed', 'a.get(2)', 'a.get(3)', 'a.size()', 's.size()'],
      expected: [43, 5, 71, 4, 2],
    },
    {
      name: 'fill includes its start and excludes its end',
      reference: ref('fill'),
      rejects: 'inclusive end, exclusive start, full-array fill, and no mutation',
      source: `${base}\na.fill(29, 1, 3)`,
      expressions: ['a.get(0)', 'a.get(1)', 'a.get(2)', 'a.get(3)'],
      expected: [17, 29, 29, 5],
    },
    {
      name: 'fill defaults cover all slots or the suffix from a supplied start',
      reference: ref('fill'),
      rejects: 'omitted end treated as zero or na, omitted start treated as one, and full fill for a suffix',
      source: `${base}\na.fill(29)\na.fill(-31, 2)`,
      expressions: ['a.get(0)', 'a.get(1)', 'a.get(2)', 'a.get(3)'],
      expected: [29, 29, -31, -31],
    },
    {
      name: 'first and last select positions rather than extrema',
      reference: `${ref('first')} ${ref('last')}`,
      rejects: 'minimum as first, maximum as last, reversed endpoints, and one-based indexing',
      source: base,
      expressions: ['a.first()', 'a.last()'],
      expected: [17, 5],
    },
    ...(['first', 'last'] as const).map((member) => ({
      name: `${member} refuses an empty array with a surfaced runtime error`,
      reference: ref(member),
      rejects: 'silently returning na, undefined, or zero for an empty array',
      source: `a = array.new<float>()\nplot(array.${member}(a))`,
      error: /Array index .*out of bounds/,
    })),
    {
      name: 'new defaults to empty and fills a sized numeric array with na',
      reference: ref('new<type>'),
      rejects: 'zero initialization, one-element default, and wrong explicit initial value',
      source: 'a = array.new<float>()\nb = array.new<float>(3)\nc = array.new<float>(2, -31)',
      expressions: ['a.size()', 'b.size()', 'na(b.get(0)) ? 1 : 0', 'na(b.get(2)) ? 1 : 0', 'c.get(0)'],
      expected: [0, 3, 1, 1, -31],
    },
    {
      name: 'indexof and lastindexof distinguish duplicate positions and return minus one when absent',
      reference: `${ref('indexof')} ${ref('lastindexof')}`,
      rejects: 'last occurrence for indexof, first for lastindexof, boolean membership, and zero for missing',
      source: 'a = array.from(17, -8, 43, -8, 5)',
      expressions: ['a.indexof(-8)', 'a.lastindexof(-8)', 'a.indexof(29)', 'a.lastindexof(29)'],
      expected: [1, 3, -1, -1],
    },
    {
      name: 'binary search leftmost returns zero for targets below the first value',
      reference: ref('binary_search_leftmost'),
      rejects: 'minus one for a below-first target and insertion point for an interior miss',
      source: 'a = array.from(-8, 5, 17, 43)',
      expressions: ['a.binary_search_leftmost(-31)', 'a.binary_search_leftmost(9)', 'a.binary_search_leftmost(71)'],
      expected: [0, 1, 3],
    },
    {
      name: 'binary search rightmost returns the next greater index or size for absent targets',
      reference: ref('binary_search_rightmost'),
      rejects: 'minus one for every miss, predecessor index, and clamping above-last to the last element',
      source: 'a = array.from(-8, 5, 17, 43)',
      expressions: ['a.binary_search_rightmost(-31)', 'a.binary_search_rightmost(9)', 'a.binary_search_rightmost(71)'],
      expected: [0, 2, 4],
    },
    ...(['sum', 'avg'] as const).map((member) => ({
      name: `${member} returns na for an empty numeric array`,
      reference: ref(member),
      rejects: 'zero or an empty-collection runtime error',
      source: 'a = array.new<float>()',
      expressions: [`na(array.${member}(a)) ? 1 : 0`],
      expected: [1],
    })),
  ]);
});
