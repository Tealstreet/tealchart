import { describe } from 'vitest';

import { registerCollectionReferenceCases } from './collection-reference-fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/loops/#looping-through-maps';
describe('direct-map alias structural mutation', () => {
  registerCollectionReferenceCases(['map.remove(target, "A")', 'map.clear(target)'].map((mutation) => ({
    name: `UDF alias refuses structural change: ${mutation}`,
    reference,
    rejects: 'size changes through a second reference',
    source: `alter(map<string, int> target) =>\n    ${mutation}\nm = map.new<string, int>()\nm.put("A", 3)\nm.put("B", 7)\nalias = m\nfor [key, value] in m\n    alter(alias)\nplot(m.size())`,
    error: /Map cannot change size/,
  })));
});
