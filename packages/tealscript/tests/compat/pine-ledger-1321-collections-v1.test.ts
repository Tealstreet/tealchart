import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Authority: https://www.tradingview.com/pine-script-reference/v6/.
describe('ledger1321–1360 collection remarks', () => {
  // Ranks1326/1327/1330/1331; functions599/600 and methods180/181: mode excludes NA elements.
  it.each(['int', 'float'].flatMap((kind) => ['namespace', 'method'].map((binding) => ({ kind, binding }))))('matrix<$kind> $binding mode excludes a majority of missing elements', ({ kind, binding }) => {
    const value = kind === 'int' ? '7' : '7.25';
    const call = binding === 'method' ? 'm.mode()' : 'matrix.mode(m)';
    const result = runCompatScript(`//@version=6
indicator("Matrix mode missing elements")
m = matrix.new<${kind}>(2, 3, na)
matrix.set(m, 0, 0, ${value})
matrix.set(m, 1, 2, ${value})
plot(${call}, title="Mode")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Mode').values).toEqual(compatibilityBars.map(() => Number(value)));
  });

  // Rank1351; functions694 description: changing the returned array's slots does not change map values.
  it.each(['namespace', 'method'])('map.values %s returns independent array slots', (binding) => {
    const call = binding === 'method' ? 'm.values()' : 'map.values(m)';
    const result = runCompatScript(`//@version=6
indicator("Map values array slots")
m = map.new<string, int>()
map.put(m, "z", 30)
map.put(m, "a", 10)
values = ${call}
array.set(values, 0, 999)
array.push(values, 888)
plot(map.get(m, "z"), title="Original value")
plot(map.size(m), title="Original size")
map.put(m, "a", 77)
plot(array.get(values, 1), title="Copied slot")
`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Original value').values).toEqual(compatibilityBars.map(() => 30));
    expect(getPlot(result, 'Original size').values).toEqual(compatibilityBars.map(() => 2));
    expect(getPlot(result, 'Copied slot').values).toEqual(compatibilityBars.map(() => 10));
  });

  // Ranks1352/1353; functions694/methods228 remark0: values retain insertion order.
  it.each(['namespace', 'method'])('map.values %s preserves insertion order after replacement and reinsertion', (binding) => {
    const call = binding === 'method' ? 'm.values()' : 'map.values(m)';
    const result = runCompatScript(`//@version=6
indicator("Map values order")
m = map.new<string, int>()
map.put(m, "z", 30)
map.put(m, "a", 10)
map.put(m, "m", 20)
map.put(m, "a", 99)
map.remove(m, "z")
map.put(m, "z", 31)
values = ${call}
plot(array.get(values, 0), title="First")
plot(array.get(values, 1), title="Second")
plot(array.get(values, 2), title="Third")
`);
    expect(result.errors).toEqual([]);
    for (const [title, value] of [['First', 99], ['Second', 20], ['Third', 31]] as const) {
      expect(getPlot(result, title).values).toEqual(compatibilityBars.map(() => value));
    }
  });
});
