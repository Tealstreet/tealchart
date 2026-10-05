import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const ref = (member: string): string => `https://www.tradingview.com/pine-script-reference/v6/#fun_array.${member}`;
const declaration = 'type Ranked\n    int score\n    int other';

describe('documented default UDT array sort field', () => {
  registerCollectionReferenceCases([
    {
      name: 'sort defaults to field zero in namespace and receiver forms',
      reference: ref('sort'),
      rejects: 'comparing object strings, selecting the second field, and preserving input order',
      source: `${declaration}\na = array.from(Ranked.new(43, -8), Ranked.new(-8, 43), Ranked.new(17, 5))\nb = a.copy()\narray.sort(a)\nb.sort(order.descending)`,
      expressions: ['a.get(0).score', 'a.get(1).score', 'a.get(2).score', 'b.get(0).score', 'b.get(2).score'],
      expected: [-8, 17, 43, 43, -8],
    },
    {
      name: 'sort_indices defaults to field zero and leaves objects in their original slots',
      reference: ref('sort_indices'),
      rejects: 'identity indices, second-field ordering, and mutating the source',
      source: `${declaration}\na = array.from(Ranked.new(43, -8), Ranked.new(-8, 43), Ranked.new(17, 5))\nindices = array.sort_indices(a)\ndescending = a.sort_indices(order.descending)`,
      expressions: ['indices.get(0)', 'indices.get(1)', 'indices.get(2)', 'descending.get(0)', 'descending.get(2)', 'a.get(0).score'],
      expected: [1, 2, 0, 0, 1, 43],
    },
    ...(['binary_search', 'binary_search_leftmost', 'binary_search_rightmost'] as const).map((member) => ({
      name: `${member} searches the first UDT field when sort_field is omitted`,
      reference: ref(member),
      rejects: 'object-string comparison, second-field comparison, and a constant index',
      source: `${declaration}\na = array.from(Ranked.new(-8, 43), Ranked.new(17, -31), Ranked.new(43, 5))`,
      expressions: [`array.${member}(a, 17)`, `a.${member}(-8)`, `a.${member}(43)`],
      expected: [1, 0, 2],
    })),
  ]);
});
