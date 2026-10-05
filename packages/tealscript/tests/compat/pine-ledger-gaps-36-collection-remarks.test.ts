import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

function assertPlots(source: string, expected: Record<string, number>) {
  const result = runCompatScript(`//@version=6\nindicator("Collection remarks")\n${source}\n`, {
    bars: compatibilityBars.slice(0, 1),
  });
  expect(result.errors).toEqual([]);
  for (const [title, value] of Object.entries(expected)) expect(getPlot(result, title).values, title).toEqual([value]);
}
describe('exact collection remarks in ledger1430/1432/1434', () => {
  // Removing a pair preserves insertion order of every remaining pair.
  // https://www.tradingview.com/pine-script-docs/language/maps/#removing-key-value-pairs
  it.each(['namespace', 'receiver'] as const)(
    'map.remove %s preserves other-key order for middle, absent and head removal',
    (form) => {
      const remove = (key: string) => (form === 'namespace' ? `map.remove(m, "${key}")` : `m.remove("${key}")`);
      assertPlots(
        `m=map.new<string,int>()
map.put(m,"zebra",17)
map.put(m,"pear",-8)
map.put(m,"apple",43)
map.put(m,"mango",5)
removed=${remove('pear')}
keys=map.keys(m)
values=map.values(m)
plot(removed,title="Removed")
plot(map.size(m),title="Size")
plot(array.get(keys,0)=="zebra"?1:0,title="K0")
plot(array.get(keys,1)=="apple"?1:0,title="K1")
plot(array.get(keys,2)=="mango"?1:0,title="K2")
plot(array.get(values,0),title="V0")
plot(array.get(values,1),title="V1")
plot(array.get(values,2),title="V2")
missing=${remove('absent')}
unchanged=map.keys(m)
plot(na(missing)?1:0,title="Missing")
plot(map.size(m),title="Missing size")
plot(array.get(unchanged,0)=="zebra" and array.get(unchanged,1)=="apple" and array.get(unchanged,2)=="mango"?1:0,title="Missing order")
head=${remove('zebra')}
last=map.keys(m)
lastValues=map.values(m)
plot(head,title="Head")
plot(map.size(m),title="Head size")
plot(array.get(last,0)=="apple" and array.get(last,1)=="mango"?1:0,title="Head order")
plot(array.get(lastValues,0),title="Head V0")
plot(array.get(lastValues,1),title="Head V1")`,
        {
          Removed: -8,
          Size: 3,
          K0: 1,
          K1: 1,
          K2: 1,
          V0: 17,
          V1: 43,
          V2: 5,
          Missing: 1,
          'Missing size': 3,
          'Missing order': 1,
          Head: 17,
          'Head size': 2,
          'Head order': 1,
          'Head V0': 43,
          'Head V1': 5,
        },
      );
    },
  );
  // The function returns false for nonsquare matrices, even all-zero ones.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_diagonal
  it.each(['namespace', 'receiver'] as const)(
    'matrix.is_diagonal %s refuses wide/tall shape with square controls',
    (form) => {
      const predicate = (id: string) => (form === 'namespace' ? `matrix.is_diagonal(${id})` : `${id}.is_diagonal()`);
      assertPlots(
        `wide=matrix.new<float>(2,3,0.0)
tall=matrix.new<float>(3,2,0.0)
zero=matrix.new<float>(2,2,0.0)
diagonal=matrix.new<float>(2,2,0.0)
matrix.set(diagonal,0,0,17.0)
matrix.set(diagonal,1,1,-8.0)
off=matrix.new<float>(2,2,0.0)
matrix.set(off,0,1,5.0)
plot(${predicate('wide')}?1:0,title="Wide")
plot(${predicate('tall')}?1:0,title="Tall")
plot(${predicate('zero')}?1:0,title="Zero square")
plot(${predicate('diagonal')}?1:0,title="Diagonal square")
plot(${predicate('off')}?1:0,title="Off diagonal")`,
        { Wide: 0, Tall: 0, 'Zero square': 1, 'Diagonal square': 1, 'Off diagonal': 0 },
      );
    },
  );
});
