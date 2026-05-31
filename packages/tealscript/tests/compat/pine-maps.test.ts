import { describe, expect, it } from 'vitest';

import { getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine map compatibility', () => {
  it('runs basic map constructor, accessor, mutation, and array extraction idioms', () => {
    const result = runCompatScript(`
indicator("Map basics")
m = map.new()
m.put("First", 1)
map.put(m, "Second", 2)
m.put("Third", 3)
m.put("Second", 22)
keys = m.keys()
values = map.values(m)
missing = m.get("Missing")
removed = map.remove(m, "First")
plot(m.size(), title="Size")
plot(m.get("Second"), title="Second")
plot(array.get(keys, 1) == "Second" ? 1 : 0, title="Key Order")
plot(array.get(values, 1), title="Value Order")
plot(na(missing) ? 1 : 0, title="Missing")
plot(removed, title="Removed")
m.clear()
plot(map.size(m), title="Cleared")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Second').values)).toEqual([22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22]);
    expect(roundSeries(getPlot(result, 'Key Order').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Value Order').values)).toEqual([22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22]);
    expect(roundSeries(getPlot(result, 'Missing').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Removed').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Cleared').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('runs map copy and put_all idioms', () => {
    const result = runCompatScript(`
indicator("Map copy and merge")
left = map.new()
left.put("A", 1)
left.put("B", 2)
right = map.new()
right.put("B", 20)
right.put("C", 30)
copy = left.copy()
copy.put_all(right)
plot(left.size(), title="Left Size")
plot(copy.size(), title="Copy Size")
plot(copy.get("B"), title="Merged Existing")
plot(copy.get("C"), title="Merged New")
plot(array.get(copy.keys(), 1) == "B" ? 1 : 0, title="Existing Order")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Left Size').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Copy Size').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Merged Existing').values)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    expect(roundSeries(getPlot(result, 'Merged New').values)).toEqual([30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]);
    expect(roundSeries(getPlot(result, 'Existing Order').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });
});
