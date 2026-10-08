import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Frozen reference functions[539]/methods[128]: reverse exchanges array endpoints.
// Slice functions[467]: local slots share the corresponding original array slots.
describe('UDT array reversal reference contracts', () => {
  for (const form of ['namespace', 'receiver'] as const) {
    for (const sliced of [false, true]) {
      const setup = sliced
        ? 'parent = array.from(Cell.new(113), first, second, third, fourth, fifth, Cell.new(-97))\nvalues = parent.slice(index_to=6, index_from=1)'
        : 'parent = array.from(first, second, third, fourth, fifth)\nvalues = parent';
      const call = form === 'namespace' ? 'array.reverse(id=values)' : 'values.reverse()';
      registerCollectionReferenceCases([
        {
          name: `${form} reverse preserves UDT identity and all logical slots (${sliced ? 'slice' : 'array'})`,
          reference: 'reference/pine-v6-reference-v1.json functions[539], methods[128], functions[467]',
          rejects:
            'no reversal, swapping only endpoints, cloning objects, skipping interior slots, and writing slice indices without their parent offset',
          source: `type Cell
    int score
first = Cell.new(17)
second = Cell.new(-8)
third = Cell.new(43)
fourth = Cell.new(5)
fifth = Cell.new(71)
${setup}
alias = values
${call}
sharedFirst = alias.get(4)
sharedFirst.score := 31
sharedSecond = alias.get(3)
sharedSecond.score := 29
replacement = Cell.new(-37)
values.set(index=1, value=replacement)
item0 = alias.get(0)
item1 = alias.get(1)
item2 = alias.get(2)
item3 = alias.get(3)
item4 = alias.get(4)
boundary0 = parent.get(0)
boundary1 = parent.get(parent.size() - 1)`,
          expressions: [
            'values.size()',
            'parent.size()',
            'item0.score',
            'item1.score',
            'item2.score',
            'item3.score',
            'item4.score',
            'first.score',
            'second.score',
            'third.score',
            'fourth.score',
            'fifth.score',
            'item0 == fifth ? 1 : 0',
            'item4 == first ? 1 : 0',
            'item1 == replacement ? 1 : 0',
            'alias == values ? 1 : 0',
            'boundary0.score',
            'boundary1.score',
          ],
          expected: [
            5,
            sliced ? 7 : 5,
            71,
            -37,
            43,
            29,
            31,
            31,
            29,
            43,
            5,
            71,
            1,
            1,
            1,
            1,
            sliced ? 113 : 71,
            sliced ? -97 : 31,
          ],
        },
      ]);
    }
  }
});
