import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Frozen Pine v6 reference: functions[520], methods[109] and slice functions[467].
// Concatenation pushes the second array's elements and returns the first array.
describe('UDT array concatenation reference contracts', () => {
  for (const form of ['namespace', 'receiver'] as const) {
    for (const sliced of [false, true]) {
      const second = sliced
        ? 'backing = array.from(Cell.new(113), right0, right1, right2, Cell.new(-97))\nb = backing.slice(index_to=4, index_from=1)'
        : 'b = array.from(right0, right1, right2)';
      const concat = form === 'namespace' ? 'array.concat(id2=b, id1=a)' : 'a.concat(id2=b)';
      registerCollectionReferenceCases([
        {
          name: `${form} concat preserves UDT identities and independent source slots (${sliced ? 'slice' : 'array'})`,
          reference: 'reference/pine-v6-reference-v1.json functions[520], methods[109], functions[467]',
          rejects:
            'detached result, cloned objects, reversed or incomplete append, source mutation, and whole-parent slice reads',
          source: `type Cell
    int score
left0 = Cell.new(17)
left1 = Cell.new(-8)
right0 = Cell.new(43)
right1 = Cell.new(5)
right2 = Cell.new(71)
a = array.from(left0, left1)
${second}
c = ${concat}
shared = c.get(2)
shared.score := 31
c.set(index=3, value=Cell.new(-37))
b.set(index=2, value=Cell.new(29))
b.push(Cell.new(99))
c.set(index=0, value=Cell.new(-11))
first = a.get(0)
joinedFirst = c.get(0)
joinedSecond = c.get(1)
joinedThird = c.get(2)
joinedFourth = c.get(3)
joinedFifth = c.get(4)
sourceFirst = b.get(0)
sourceSecond = b.get(1)
sourceThird = b.get(2)
sourceFourth = b.get(3)`,
          expressions: [
            'a.size()',
            'c.size()',
            'b.size()',
            'first.score',
            'joinedFirst.score',
            'joinedSecond.score',
            'joinedThird.score',
            'joinedFourth.score',
            'joinedFifth.score',
            'sourceFirst.score',
            'sourceSecond.score',
            'sourceThird.score',
            'sourceFourth.score',
            'right0.score',
            'right1.score',
            'right2.score',
            'left0.score',
            'c == a ? 1 : 0',
            'joinedThird == right0 ? 1 : 0',
          ],
          expected: [5, 5, 4, -11, -11, -8, 31, -37, 71, 31, 5, 29, 99, 31, 5, 71, 17, 1, 1],
        },
      ]);
    }
  }
});
