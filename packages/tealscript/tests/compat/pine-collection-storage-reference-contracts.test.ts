import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const arrays = 'https://www.tradingview.com/pine-script-docs/language/arrays/';
const matrices = 'https://www.tradingview.com/pine-script-docs/language/matrices/';
const maps = 'https://www.tradingview.com/pine-script-docs/language/maps/';
const objectType = 'type Point\n    int score';

const grid = 'm = matrix.new<int>(2, 3, 0)\nm.set(0, 0, 17)\nm.set(0, 1, -8)\nm.set(0, 2, 43)\nm.set(1, 0, 5)\nm.set(1, 1, 71)\nm.set(1, 2, -31)';

describe('uncovered documented collection contracts', () => {
  registerCollectionReferenceCases([
    {
      name: 'array initial object seeds share references but replacement changes only one slot',
      reference: `${arrays}#declaring-arrays`,
      rejects: 'deep-copying the seed per slot and replacing all slots together',
      source: `${objectType}\nseed = Point.new(17)\na = array.new<Point>(2, seed)\nfirst = a.get(0)\nfirst.score := 29\na.set(0, Point.new(-31))`,
      expressions: ['seed.score', 'a.get(0).score', 'a.get(1).score', 'a.size()'],
      expected: [29, -31, 29, 2],
    },
    {
      name: 'array copy shares object state while retaining independent slots',
      reference: `${arrays}#copying`,
      rejects: 'deep-copying referenced objects and sharing the copied slot storage',
      source: `${objectType}\na = array.from(Point.new(17), Point.new(-8))\nb = a.copy()\nshared = b.get(1)\nshared.score := 29\nb.set(0, Point.new(-31))`,
      expressions: ['a.get(0).score', 'a.get(1).score', 'b.get(0).score', 'b.get(1).score'],
      expected: [17, 29, -31, 29],
    },
    {
      name: 'array clear removes slots while referenced drawings remain active',
      reference: `${arrays}#removing`,
      rejects: 'deleting referenced labels while clearing their container',
      source: 'marker = label.new(bar_index, 17.0, "kept")\na = array.from(marker)\nbefore = array.size(label.all)\narray.clear(a)\nafter = array.size(label.all)',
      expressions: ['a.size()', 'after - before', 'label.get_y(marker)'],
      expected: [0, 0, 17],
    },
    {
      // Native coverage-collections-2-v1 and pine-native-standardize-v1.test.ts
      // settle the all-missing exception: retain missing slots in a fresh array.
      name: 'standardize keeps empty arrays empty and preserves all-na slots independently',
      reference: 'native coverage-collections-2-v1.csv; pine-native-standardize-v1.test.ts',
      rejects: 'dropping missing slots, returning a scalar na, and returning the input array',
      source: 'empty = array.new_float()\nmissing = array.new_float(3)\ne = array.standardize(empty)\nn = missing.standardize()\nn.push(17.0)',
      expressions: ['e.size()', 'n.size()', 'n.get(3)', 'missing.size()', 'na(missing.get(0)) ? 1 : 0', 'na(n.get(0)) and na(n.get(1)) and na(n.get(2)) ? 1 : 0'],
      expected: [0, 4, 17, 3, 1, 1],
    },
    {
      name: 'min and max use the supplied zero-based nth occurrence rank including duplicates',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.min https://www.tradingview.com/pine-script-reference/v6/#fun_array.max',
      rejects: 'ignoring nth and ranking distinct values instead of element occurrences',
      source: 'a = array.from(43, -8, 17, -8, 5, 43)',
      expressions: ['array.min(a, 0)', 'a.min(1)', 'a.min(2)', 'array.max(a, 0)', 'a.max(1)', 'a.max(2)'],
      expected: [-8, -8, 5, 43, 43, 17],
    },
    {
      name: 'every and some distinguish mixed all-true and all-false boolean arrays',
      reference: 'https://www.tradingview.com/pine-script-reference/v6/#fun_array.every https://www.tradingview.com/pine-script-reference/v6/#fun_array.some',
      rejects: 'using some for every, every for some, and checking only the first element',
      source: 'mixed = array.from(false, true, false)\nyes = array.from(true, true)\nno = array.from(false, false)',
      expressions: ['mixed.every() ? 1 : 0', 'mixed.some() ? 1 : 0', 'array.every(yes) ? 1 : 0', 'yes.some() ? 1 : 0', 'no.every() ? 1 : 0', 'array.some(no) ? 1 : 0'],
      expected: [0, 1, 1, 1, 0, 0],
    },
    {
      name: 'matrix row extraction has independent slots in both mutation directions',
      reference: `${matrices}#retrieving`,
      rejects: 'sharing array slots with the source matrix in either direction',
      source: `${grid}\nr = matrix.row(m, 1)\nr.set(0, 29)\nm.set(1, 2, -37)`,
      expressions: ['r.get(0)', 'm.get(1, 0)', 'r.get(2)', 'm.get(1, 2)', 'r.size()'],
      expected: [29, 5, -31, -37, 3],
    },
    {
      name: 'matrix column extraction has independent slots in both mutation directions',
      reference: `${matrices}#retrieving`,
      rejects: 'sharing slots, extracting a row, and returning coordinates in reverse order',
      source: `${grid}\nc = m.col(1)\nc.set(0, 29)\nm.set(1, 1, -37)`,
      expressions: ['c.get(0)', 'm.get(0, 1)', 'c.get(1)', 'm.get(1, 1)', 'c.size()'],
      expected: [29, -8, 71, -37, 2],
    },
    ...(['row', 'col'] as const).map((axis) => ({
      name: `matrix ${axis} extraction shares object state while keeping slots independent`,
      reference: `${matrices}#retrieving`,
      rejects: 'deep-copying referenced objects and sharing extracted slot storage',
      source: `${objectType}\nseed = Point.new(17)\nm = matrix.new<Point>(2, 3, seed)\nextracted = m.${axis}(1)\nshared = extracted.get(0)\nshared.score := 29\nextracted.set(0, Point.new(-31))`,
      expressions: ['m.get(0, 0).score', 'm.get(1, 1).score', 'seed.score', 'extracted.get(0).score'],
      expected: [29, 29, 29, -31],
    })),
    {
      name: 'map put and copy share object state while keeping copied pairs independent',
      reference: `${maps}#putting-and-getting-key-value-pairs ${maps}#deep-copies`,
      rejects: 'copying objects on put or copy, and aliasing the copied pair storage',
      source: `${objectType}\nseed = Point.new(17)\na = map.new<string, Point>()\na.put("alpha", seed)\nseed.score := 29\nb = a.copy()\nshared = b.get("alpha")\nshared.score := 43\nb.put("alpha", Point.new(-31))`,
      expressions: ['seed.score', 'a.get("alpha").score', 'b.get("alpha").score', 'a.size()', 'b.size()'],
      expected: [43, 43, -31, 1, 1],
    },
    {
      name: 'map remove preserves the insertion order of every remaining pair',
      reference: `${maps}#removing-key-value-pairs`,
      rejects: 'swapping the last pair into the removed slot, clearing all pairs, and sorting keys',
      source: 'a = map.new<string, int>()\na.put("zeta", 17)\na.put("alpha", -8)\na.put("mu", 43)\na.put("beta", 5)\nold = a.remove("alpha")\nk = a.keys()\nv = a.values()',
      expressions: ['old', 'k.get(0) == "zeta" ? 1 : 0', 'k.get(1) == "mu" ? 1 : 0', 'k.get(2) == "beta" ? 1 : 0', 'v.get(0)', 'v.get(1)', 'v.get(2)', 'a.size()'],
      expected: [-8, 1, 1, 1, 17, 43, 5, 3],
    },
  ]);
});
