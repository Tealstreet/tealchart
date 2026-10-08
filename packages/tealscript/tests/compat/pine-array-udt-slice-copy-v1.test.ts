import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[466]/methods[67] array.copy,
// functions[467]/methods[68] slice local indices; Arrays Copying shallow refs.
const reference = 'https://www.tradingview.com/pine-script-docs/language/arrays/#copying';
const setup = `type Cell
    int score
a = array.from(Cell.new(17), Cell.new(-8), Cell.new(43), Cell.new(5), Cell.new(101))
outer = a.slice(1, 4)`;

describe('compiled copies of UDT slices preserve logical windows and shallow references', () => {
  for (const method of [false, true]) {
    registerCollectionReferenceCases(
      [false, true].map((nested) => ({
        name: `copy of ${nested ? 'nested' : 'ordinary'} UDT slice has independent slots and shared objects method=${method}`,
        reference,
        rejects:
          'copying parent storage or empty view storage, retaining the view alias, cloning UDTs, or leaking copied size changes to the source',
        source: `${setup}\ns = ${nested ? 'outer.slice(1, 3)' : 'outer'}\noriginal = s.get(0)\nc = ${method ? 's.copy()' : 'array.copy(id=s)'}\nshared = c.get(0)\nshared.score := 29\nc.set(-1, Cell.new(31))\ns.set(0, Cell.new(71))\nc.push(Cell.new(-19))`,
        expressions: [
          'a.size()',
          'outer.size()',
          's.size()',
          'c.size()',
          'a.get(0).score',
          'a.get(1).score',
          'a.get(2).score',
          'a.get(3).score',
          'a.get(4).score',
          's.get(0).score',
          's.get(-1).score',
          'c.get(0).score',
          'c.get(-2).score',
          'c.get(-1).score',
          'shared.score',
          'original.score',
        ],
        expected: nested
          ? [5, 3, 2, 3, 17, -8, 71, 5, 101, 71, 5, 29, 31, -19, 29, 29]
          : [5, 3, 3, 4, 17, 71, 43, 5, 101, 71, 5, 29, 31, -19, 29, 29],
      })),
    );
  }
});
