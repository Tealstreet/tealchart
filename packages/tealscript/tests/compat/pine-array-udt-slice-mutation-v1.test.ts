import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[467], methods[68], description
// and local-index remarks; get functions[473]/methods[74] returns stored values.
// Set: functions[482]/methods[83]; insert: [496]/[85]; remove: [499]/[88].
const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.slice';
const setup = `type Cell
    int score
first = Cell.new(17)
second = Cell.new(-8)
middle = Cell.new(43)
end = Cell.new(5)
tail = Cell.new(71)
a = array.from(first, second, middle, end, tail)`;

describe('compiled reference slice negative-coordinate mutation', () => {
  for (const method of [false, true]) {
    const slice = method ? 'a.slice(index_to=4, index_from=1)' : 'array.slice(index_to=4, id=a, index_from=1)';
    const call = (operation: string, arguments_: string) =>
      method ? `s.${operation}(${arguments_})` : `array.${operation}(s, ${arguments_})`;
    registerCollectionReferenceCases([
      {
        name: `UDT slice negative-index replacement changes its parent slot without retargeting the displaced object method=${method}`,
        reference,
        rejects:
          'detached slice storage, negative translation using parent size, absolute parent indices, cloning reference reads, mutating the displaced object instead of replacing its slot',
        source: `${setup}\ns = ${slice}\n${call('set', '-2, Cell.new(29)')}\nmiddle.score := -37\nshared = s.get(0)\nshared.score := 11`,
        expressions: [
          'a.size()',
          's.size()',
          'first.score',
          'second.score',
          'a.get(1).score',
          'a.get(2).score',
          's.get(1).score',
          'middle.score',
          'a.get(3).score',
          'tail.score',
        ],
        expected: [5, 3, 17, 11, 11, 29, 29, -37, 5, 71],
      },
      {
        name: `UDT slice negative-index insertion shifts parent slots while preserving inserted and existing references method=${method}`,
        reference,
        rejects:
          'detached slice insertion, size-plus-index-plus-one, negative translation using parent size, incorrect parent offset, replacement, deep copies and stale slice size',
        source: `${setup}\ns = ${slice}\ninserted = Cell.new(29)\n${call('insert', '-2, inserted')}\ninserted.score := 31\nmiddle.score := -37`,
        expressions: [
          'a.size()',
          's.size()',
          'a.get(0).score',
          'a.get(1).score',
          'a.get(2).score',
          's.get(1).score',
          'a.get(3).score',
          's.get(2).score',
          'a.get(4).score',
          'a.get(5).score',
        ],
        expected: [6, 4, 17, -8, 31, 31, -37, -37, 5, 71],
      },
      {
        name: `UDT slice negative-index removal returns the original object and shifts only its parent range method=${method}`,
        reference,
        rejects:
          'negative translation using parent size, wrong parent offset, returning a clone or neighbor, not shrinking the slice, loss of shared reference reads',
        source: `${setup}\ns = ${slice}\nremoved = ${call('remove', '-2')}\nremoved.score := -37\nshared = s.get(1)\nshared.score := 11`,
        expressions: [
          'a.size()',
          's.size()',
          'a.get(0).score',
          'a.get(1).score',
          'a.get(2).score',
          's.get(1).score',
          'end.score',
          'a.get(3).score',
          'removed.score',
          'middle.score',
        ],
        expected: [4, 2, 17, -8, 11, 11, 11, 71, -37, -37],
      },
    ]);
  }
});
