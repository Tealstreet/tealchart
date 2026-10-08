import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

// Authority: pine-v6-reference-v1.json functions[693..696]/methods[227..230],
// map.put replacement order and keys/values insertion order. UDT reference
// sharing retained from packet007 put_all and storage-reference witnesses.
const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_map.put_all';
const families = [
  {
    name: 'enum',
    type: 'Key',
    prelude: 'enum Key\n    alpha\n    beta\n    gamma\n    zulu\n',
    keys: ['Key.zulu', 'Key.alpha', 'Key.gamma', 'Key.beta'],
  },
  {
    name: 'color',
    type: 'color',
    prelude: '',
    keys: ['color.red', 'color.blue', 'color.orange', 'color.green'],
  },
];

describe('compiled UDT map merge retains independent pairs and shallow objects', () => {
  for (const family of families) {
    const [keep, collision, addedFirst, addedLast] = family.keys;
    for (const method of [false, true]) {
      registerCollectionReferenceCases([
        {
          name: `${family.name} map merge preserves collisions, pair independence and shared snapshots method=${method}`,
          reference,
          rejects:
            'skipping collisions, reordering overwritten keys, sorting/reversing source pairs, aliasing the source pair store, cloning UDTs or treating extracted values as a live view',
          source: `${family.prelude}type Cell
    int score
old = Cell.new(-8)
incoming = Cell.new(5)
target = map.new<${family.type}, Cell>()
source = map.new<${family.type}, Cell>()
target.put(${keep}, Cell.new(17))
target.put(${collision}, old)
source.put(${addedFirst}, Cell.new(71))
source.put(${collision}, incoming)
source.put(${addedLast}, Cell.new(43))
${method ? 'target.put_all(id2=source)' : 'map.put_all(id2=source, id=target)'}
keysBefore = target.keys()
sourceKeys = source.keys()
valuesBefore = target.values()
sourceValues = source.values()
shared = valuesBefore.get(1)
shared.score := 31
sharedTarget = target.get(${collision}).score
sharedSource = source.get(${collision}).score
source.put(${addedFirst}, Cell.new(-19))
sourceGamma = source.get(${addedFirst}).score
targetGamma = target.get(${addedFirst}).score
source.put(${collision}, Cell.new(79))
target.put(${collision}, Cell.new(29))
sourceAlpha = source.get(${collision}).score
removed = target.remove(${addedLast})
removed.score := -37
source.clear()
keysAfter = target.keys()`,
          expressions: [
            'target.size()',
            'source.size()',
            'keysBefore.size()',
            'sourceKeys.size()',
            'valuesBefore.size()',
            'sourceValues.size()',
            `target.get(${keep}).score`,
            `target.get(${collision}).score`,
            `target.get(${addedFirst}).score`,
            `na(target.get(${addedLast})) ? 1 : 0`,
            'old.score',
            'incoming.score',
            'removed.score',
            'sharedTarget',
            'sharedSource',
            'sourceGamma',
            'targetGamma',
            'sourceAlpha',
            'valuesBefore.get(0).score',
            'valuesBefore.get(1).score',
            'valuesBefore.get(2).score',
            'valuesBefore.get(3).score',
            'sourceValues.get(0).score',
            'sourceValues.get(1).score',
            'sourceValues.get(2).score',
            ...family.keys.map((key, index) => `keysBefore.get(${index}) == ${key} ? 1 : 0`),
            ...[addedFirst, collision, addedLast].map((key, index) => `sourceKeys.get(${index}) == ${key} ? 1 : 0`),
            ...[keep, collision, addedFirst].map((key, index) => `keysAfter.get(${index}) == ${key} ? 1 : 0`),
          ],
          expected: [
            3, 0, 4, 3, 4, 3, 17, 29, 71, 1, -8, 31, -37, 31, 31, -19, 71, 79, 17, 31, 71, -37, 71, 31, -37, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1,
          ],
        },
      ]);
    }
  }
});
