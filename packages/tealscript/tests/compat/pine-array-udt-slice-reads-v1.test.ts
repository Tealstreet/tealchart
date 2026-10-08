import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[467]/methods[68] slice-local
// coordinates; functions[473]/methods[74] get returns and negative-index remarks.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.get';
const setup = `type Cell
    int score
first = Cell.new(17)
second = Cell.new(-8)
middle = Cell.new(43)
end = Cell.new(5)
tail = Cell.new(71)
a = array.from(first, second, middle, end, tail)
s = array.slice(a, 1, 4)`;

describe('compiled UDT slice reads use view coordinates', () => {
  for (const method of [false, true]) {
    const get = (index: number) => (method ? `s.get(index=${index})` : `array.get(index=${index}, id=s)`);
    registerCollectionReferenceCases([
      ...([-3, -1] as const).map((index) => ({
        name: `UDT slice get(${index}) returns the corresponding shared object method=${method}`,
        reference,
        rejects:
          'using the parent size for a negative index, omitting the parent offset, returning a cloned reference, reading either outside neighbor',
        source: `${setup}\nselected = ${get(index)}\nbefore = selected.score\nselected.score := 29`,
        expressions: [
          'before',
          'selected.score',
          'a.get(0).score',
          'a.get(1).score',
          'a.get(2).score',
          'a.get(3).score',
          'a.get(4).score',
          'second.score',
          'end.score',
          's.size()',
          'a.size()',
        ],
        expected: index === -3 ? [-8, 29, 17, 29, 43, 5, 71, 29, 5, 3, 5] : [5, 29, 17, -8, 43, 29, 71, -8, 29, 3, 5],
      })),
      ...([3, -4] as const).map((index) => ({
        name: `UDT slice get(${index}) refuses coordinates outside its own size method=${method}`,
        reference: `${reference} https://www.tradingview.com/pine-script-docs/language/arrays/#index-xx-is-out-of-bounds-array-size-is-yy`,
        rejects: 'validating against the larger parent size or exposing an outside neighbor',
        source: `${setup}\nselected = ${get(index)}\nplot(selected.score)`,
        error: /Array index .* out of bounds\. Array size is 3/,
      })),
    ]);
  }
});
