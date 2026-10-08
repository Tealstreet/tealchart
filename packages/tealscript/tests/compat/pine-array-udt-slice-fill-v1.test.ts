import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[495]/methods[84] fill range,
// functions[467]/methods[68] slice write-through and local-index remarks,
// functions[473]/methods[74] stored-element return; kw_type reference instances.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.fill';
const setup = `type Cell
    int score
first = Cell.new(17)
second = Cell.new(-8)
middle = Cell.new(43)
end = Cell.new(5)
tail = Cell.new(71)
a = array.from(first, second, middle, end, tail)
s = array.slice(a, 1, 4)
replacement = Cell.new(29)`;

describe('compiled UDT slice fill preserves reference and interval contracts', () => {
  for (const method of [false, true]) {
    registerCollectionReferenceCases(
      [0, 1].map((start) => ({
        name: `UDT slice fill [${start},${start + 2}) shares the replacement object and preserves displaced objects method=${method}`,
        reference,
        rejects:
          'filling the whole slice, inclusive end, parent-based coordinates, cloning the replacement per slot, mutating displaced objects or replacing the container',
        source: `${setup}\n${
          method
            ? `s.fill(index_to=${start + 2}, value=replacement, index_from=${start})`
            : `array.fill(index_to=${start + 2}, value=replacement, id=s, index_from=${start})`
        }\nshared = s.get(${start})\nshared.score := 31\nsecond.score := -13\nmiddle.score := -37\nend.score := -19`,
        expressions: [
          'a.size()',
          's.size()',
          'a.get(0).score',
          'a.get(1).score',
          'a.get(2).score',
          'a.get(3).score',
          'a.get(4).score',
          's.get(0).score',
          's.get(1).score',
          's.get(2).score',
          'replacement.score',
          'second.score',
          'middle.score',
          'end.score',
        ],
        expected:
          start === 0
            ? [5, 3, 17, 31, 31, -19, 71, 31, 31, -19, 31, -13, -37, -19]
            : [5, 3, 17, -13, 31, 31, 71, -13, 31, 31, 31, -13, -37, -19],
      })),
    );
  }
});
