import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const ref = (member: string): string => `https://www.tradingview.com/pine-script-reference/v6/#fun_map.${member}`;
// Deliberately neither key-sorted nor value-sorted. Expectations are reference-derived.
const base = 'm = map.new<string, int>()\nm.put("zebra", 17)\nm.put("apple", -8)\nm.put("middle", 43)';

// Each case was proven red by runtime mutation, then green after restoration.
describe('Pine map documented collection contracts', () => {
  registerCollectionReferenceCases([
    {
      name: 'keys preserve insertion order and have independent mutable array slots',
      reference: ref('keys'),
      rejects: 'alphabetical order, a live key view, and extracted array mutations changing the map',
      source: `${base}\nk = m.keys()\nk.set(0, "renamed")\nk.remove(1)\nk.push("extra")\nfresh = m.keys()`,
      expressions: ['fresh.get(0) == "zebra" ? 1 : 0', 'fresh.get(1) == "apple" ? 1 : 0', 'fresh.get(2) == "middle" ? 1 : 0', 'm.size()', 'm.contains("renamed") ? 1 : 0', 'm.contains("extra") ? 1 : 0', 'k.size()', 'k.get(0) == "renamed" ? 1 : 0', 'k.get(1) == "middle" ? 1 : 0', 'k.get(2) == "extra" ? 1 : 0'],
      expected: [1, 1, 1, 3, 0, 0, 3, 1, 1, 1],
    },
    {
      name: 'values preserve insertion order and have independent mutable array slots',
      reference: ref('values'),
      rejects: 'sorted values, a live value view, and extracted array mutation changing the map',
      source: `${base}\nv = map.values(m)\nv.set(0, 29)\nv.remove(1)\nv.push(-31)\nfresh = m.values()`,
      expressions: ['m.get("zebra")', 'm.get("apple")', 'm.size()', 'fresh.get(0)', 'fresh.get(1)', 'fresh.get(2)', 'v.size()', 'v.get(0)', 'v.get(1)', 'v.get(2)'],
      expected: [17, -8, 3, 17, -8, 43, 3, 29, 43, -31],
    },
    {
      name: 'extracted key and value arrays remain snapshots after map insertion and replacement',
      reference: `${ref('keys')} ${ref('values')}`,
      rejects: 'live extracted arrays and replacement propagating into an earlier value snapshot',
      source: `${base}\nk = m.keys()\nv = m.values()\nm.put("zebra", 29)\nm.put("new", -31)`,
      expressions: ['k.size()', 'v.size()', 'v.get(0)', 'm.get("zebra")', 'm.size()'],
      expected: [3, 3, 17, 29, 4],
    },
    {
      name: 'put returns the previous value or na and preserves order on replacement',
      reference: ref('put'),
      rejects: 'returning the new value, replacing zero treated as missing, duplicate keys, and moving replaced keys to the end',
      source: `${base}\nprevious = m.put("zebra", 0)\nzero = m.put("zebra", 29)\nadded = m.put("new", -31)\nk = m.keys()`,
      expressions: ['previous', 'zero', 'na(added) ? 1 : 0', 'm.get("zebra")', 'm.size()', 'k.get(0) == "zebra" ? 1 : 0', 'k.get(3) == "new" ? 1 : 0'],
      expected: [17, 0, 1, 29, 4, 1, 1],
    },
    {
      name: 'remove returns the old value or na and distinguishes a stored zero',
      reference: ref('remove'),
      rejects: 'returning boolean success, leaving the pair present, and conflating stored zero with absence',
      source: `${base}\nm.put("zero", 0)\nremoved = m.remove("apple")\nmissing = m.remove("apple")\nzero = m.remove("zero")`,
      expressions: ['removed', 'na(missing) ? 1 : 0', 'zero', 'm.contains("apple") ? 1 : 0', 'm.contains("zero") ? 1 : 0', 'm.size()'],
      expected: [-8, 1, 0, 0, 0, 2],
    },
    {
      name: 'copy has independent pair storage in both mutation directions',
      reference: ref('copy'),
      rejects: 'aliasing the map or sharing its backing pair storage',
      source: `${base}\nc = m.copy()\nc.put("zebra", 29)\nc.remove("apple")\nm.put("middle", -31)`,
      expressions: ['m.get("zebra")', 'm.contains("apple") ? 1 : 0', 'c.get("middle")', 'c.size()', 'm.size()'],
      expected: [17, 1, 43, 2, 3],
    },
    {
      name: 'put_all overwrites duplicate keys and appends new pairs without mutating the source',
      reference: ref('put_all'),
      rejects: 'skipping duplicate keys, replacing the whole target, aliasing the source, and reversing merge direction',
      source: `${base}\ns = map.new<string, int>()\ns.put("apple", 29)\ns.put("new", -31)\nm.put_all(s)\nm.put("new", 71)`,
      expressions: ['m.get("zebra")', 'm.get("apple")', 'm.get("middle")', 'm.get("new")', 'm.size()', 's.get("new")', 's.size()'],
      expected: [17, 29, 43, 71, 4, -31, 2],
    },
    {
      name: 'clear removes every pair and permits subsequent insertion',
      reference: ref('clear'),
      rejects: 'removing only one pair, retaining keys with na values, and disabling the cleared map',
      source: `${base}\nm.clear()\nempty = m.size()\nm.put("new", -31)`,
      expressions: ['empty', 'm.size()', 'm.contains("zebra") ? 1 : 0', 'm.contains("apple") ? 1 : 0', 'm.contains("middle") ? 1 : 0', 'm.get("new")'],
      expected: [0, 1, 0, 0, 0, -31],
    },
  ]);
});
