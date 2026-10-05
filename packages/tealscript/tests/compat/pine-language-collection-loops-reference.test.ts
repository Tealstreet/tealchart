import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: archived pine-v6-reference-v1.json (2026-10-03), kw_for...in,
// kw_type and map.put. Literal results below independently encode iteration
// order, key/value pairing, row indices, references and allowed size changes.

// Red proof: swapped matrix rows (2), reversed map pairs (3), reversed array
// traversal (1), copied UDT array/map values (2), ignored matrix growth (1).
// All nine failed in an isolated emitter copy, then passed after restoration.

// Inverse proof: refreshed indexed entries in the discarded source copy passed
// all eleven ordinary assertions, including both matrix-size expected reds
// with it.fails disabled. Production sources were unchanged throughout.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/';
const bars = compatibilityBars.slice(0, 2);
const mapPrelude = `items = map.new<string, int>()
map.put(items, "z", -7)
map.put(items, "a", 4)
map.put(items, "m", 1)`;
const matrixPrelude = `items = matrix.new<int>()
matrix.add_row(items, 0, array.from(-7, 2))
matrix.add_row(items, 1, array.from(4, -3))
matrix.add_row(items, 2, array.from(1, 9))`;

interface CollectionLoopCase {
  name: string;
  rule: string;
  rejects: string;
  body: string;
  expected: number;
}

const cases: CollectionLoopCase[] = [
  {
    name: 'matrix value iteration visits row arrays in row order',
    rule: 'description and matrix example: first form yields each row as an array',
    rejects: 'column iteration, scalar flattening, reverse traversal, skipped row, repeated first row',
    body: `${matrixPrelude}
encoded = 0
for row in items
    encoded := encoded * 100 + array.get(row, 0) * 10 + array.get(row, 1)
plot(encoded, "Result")`,
    expected: -676281,
  },
  {
    name: 'matrix indexed iteration pairs zero-based row indices with rows',
    rule: 'detailedDesc.index/item: row index and row array belong to the current iteration',
    rejects: 'one-based index, column index, swapped index/row, reverse traversal, flattened scalars',
    body: `${matrixPrelude}
encoded = 0
for [index, row] in items
    encoded := encoded * 1000 + index * 100 + array.get(row, 0) * 10 + array.get(row, 1)
plot(encoded, "Result")`,
    expected: -67862781,
  },
  {
    name: 'map pair iteration preserves insertion order and key-value association',
    rule: 'remarks: only pair form is compatible with maps; visits keys in insertion order',
    rejects: 'alphabetical key sorting, reverse order, values used as keys, repeated or swapped pairs',
    body: `${mapPrelude}
encoded = 0
for [key, value] in items
    code = key == "z" ? 2 : key == "a" ? 5 : 3
    encoded := encoded * 1000 + code * 100 + value
plot(encoded, "Result")`,
    expected: 193504301,
  },
  {
    name: 'map replacement retains the original key insertion position',
    rule: 'remarks insertion order; map.put remarks: replacing a key does not change order',
    rejects: 'replacement moved to end, duplicate key insertion, stale value, sorted keys',
    body: `${mapPrelude}
map.put(items, "z", 8)
encoded = 0
for [key, value] in items
    code = key == "z" ? 2 : key == "a" ? 5 : 3
    encoded := encoded * 1000 + code * 100 + value
plot(encoded, "Result")`,
    expected: 208504301,
  },
  {
    name: 'iterating map keys permits removing pairs from the original map',
    rule: 'remarks: change map size by looping over its map.keys array',
    rejects: 'iteration over live map instead of key array, skipped removals, wrong key order',
    body: `${mapPrelude}
keys = map.keys(items)
encoded = 0
for key in keys
    encoded := encoded * 10 + map.get(items, key)
    map.remove(items, key)
plot(encoded * 10 + map.size(items), "Result")`,
    expected: -6590,
  },
  {
    name: 'iterating a map copy permits removing pairs from the original map',
    rule: 'remarks: change map size by looping over a copy',
    rejects: 'copy aliases original map, skipped removals, iterates original map instead of copy',
    body: `${mapPrelude}
copy = map.copy(items)
encoded = 0
for [key, value] in copy
    encoded := encoded * 10 + value
    map.remove(items, key)
plot(encoded * 100 + map.size(items) * 10 + map.size(copy), "Result")`,
    expected: -65897,
  },
  {
    name: 'array iteration exposes UDT references that retain field mutations',
    rule: 'detailedDesc.item: current array element; kw_type new instances are reference values',
    rejects: 'copying UDT elements, discarded field updates, same object substituted for every element',
    body: `type Cell
    int number
items = array.from(Cell.new(-7), Cell.new(4), Cell.new(1))
for cell in items
    cell.number += 2
plot(array.get(items, 0).number * 100 + array.get(items, 1).number * 10 + array.get(items, 2).number, "Result")`,
    expected: -437,
  },
  {
    name: 'map iteration exposes UDT values that retain field mutations',
    rule: 'detailedDesc.item: current map value; kw_type new instances are reference values',
    rejects: 'copying UDT values, wrong key/value association, discarded updates, shared replacement object',
    body: `type Cell
    int number
items = map.new<string, Cell>()
map.put(items, "z", Cell.new(-7))
map.put(items, "a", Cell.new(4))
map.put(items, "m", Cell.new(1))
for [key, cell] in items
    increment = key == "z" ? 2 : key == "a" ? 5 : 3
    cell.number += increment
plot(map.get(items, "z").number * 100 + map.get(items, "a").number * 10 + map.get(items, "m").number, "Result")`,
    expected: -406,
  },
  {
    name: 'matrix value iteration visits a row appended during the loop',
    rule: 'remarks: matrices can change size during iteration; description: executes once per row',
    rejects: 'initial size cached, repeated or skipped new row, scalar rather than row iteration',
    body: `items = matrix.new<int>()
matrix.add_row(items, 0, array.from(-7))
matrix.add_row(items, 1, array.from(4))
encoded = 0
for row in items
    if array.get(row, 0) == -7
        matrix.add_row(items, 2, array.from(1))
    encoded := encoded * 10 + array.get(row, 0)
plot(encoded, "Result")`,
    expected: -659,
  },
  {
    name: 'matrix indexed iteration visits a row appended during the loop',
    rule: 'remarks: matrices can change size during iteration; description: executes once per row',
    rejects: 'initial indexed entry snapshot, skipped new row, initial size cached, repeated row',
    body: `items = matrix.new<int>()
matrix.add_row(items, 0, array.from(-7))
matrix.add_row(items, 1, array.from(4))
encoded = 0
for [index, row] in items
    if index == 0
        matrix.add_row(items, 2, array.from(1))
    encoded := encoded * 10 + array.get(row, 0)
plot(encoded, "Result")`,
    expected: -659,
  },
  {
    name: 'matrix indexed iteration stops before a row removed during the loop',
    rule: 'remarks: matrices can change size during iteration; description: executes once per row',
    rejects: 'initial indexed entry snapshot, deleted row still visited, stale row references',
    body: `${matrixPrelude}
encoded = 0
for [index, row] in items
    if index == 0
        matrix.remove_row(items, 2)
    encoded := encoded * 10 + array.get(row, 0)
plot(encoded, "Result")`,
    expected: -66,
  },
];

function collectionValues(testCase: CollectionLoopCase): Array<number | null> {
  const result = runCompatScript(`//@version=6\nindicator("Collection loops reference")\n${testCase.body}`, { bars });
  expect(result.errors).toEqual([]);
  expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
  const values = getPlot(result, 'Result').values;
  expect(values).toHaveLength(bars.length);
  return values;
}

describe('Pine v6 collection loop reference behavior', () => {
  for (const testCase of cases) {
    const title = `${testCase.name} [${reference}#kw_for...in; ${testCase.rule}; rejects ${testCase.rejects}]`;
    it(title, () => {
      expect(collectionValues(testCase)).toEqual(bars.map(() => testCase.expected));
    });
  }
});
