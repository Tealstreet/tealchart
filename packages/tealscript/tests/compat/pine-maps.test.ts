import { describe, expect, it } from 'vitest';

import { getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine map compatibility', () => {
  it('runs basic map constructor, accessor, mutation, and array extraction idioms', () => {
    const result = runCompatScript(`
indicator("Map basics")
m = map.new()
firstInsert = m.put("First", 1)
map.put(m, "Second", 2)
m.put("Third", 3)
previousSecond = m.put("Second", 22)
keys = m.keys()
values = map.values(m)
missing = m.get("Missing")
removed = map.remove(m, "First")
plot(na(firstInsert) ? 1 : 0, title="New Put")
plot(previousSecond, title="Previous Put")
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
    expect(roundSeries(getPlot(result, 'New Put').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Previous Put').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
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

  it('runs named map argument and receiver precedence idioms', () => {
    const result = runCompatScript(`
indicator("Map named arguments")
left = map.new<string, int>()
right = map.new<string, int>()
map.put(id=left, key="A", value=1)
left.put(key="B", value=2)
right.put("A", 100)
previous = left.put(id=right, key="A", value=3)
leftContains = left.contains(key="A") ? 1 : 0
rightContains = map.contains(id=right, key="A") ? 1 : 0
copied = map.copy(id=left)
map.put_all(id=copied, id2=right)
removed = copied.remove(key="A")
leftKeys = left.keys()
copiedValues = map.values(id=copied)
right.clear(id=left)
plot(previous, title="Previous")
plot(left.get(key="A"), title="Receiver Value")
plot(na(right.get(key="A")) ? 1 : 0, title="Other Missing")
plot(leftContains, title="Left Contains")
plot(rightContains, title="Right Contains")
plot(array.get(leftKeys, 0) == "A" ? 1 : 0, title="Named Keys")
plot(removed, title="Named Remove")
plot(array.get(copiedValues, 0), title="Named Values")
plot(left.size(), title="Left Size")
plot(map.size(id=right), title="Right Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Previous').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Receiver Value').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Other Missing').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Left Contains').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Right Contains').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Named Keys').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Named Remove').values)).toEqual([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
    expect(roundSeries(getPlot(result, 'Named Values').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Left Size').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Right Size').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('runs Pine generic map constructor and declaration idioms', () => {
    const result = runCompatScript(`
indicator("Generic map syntax")
var map<string, int> data = map.new<string, int>()
data.put("Rising", bar_index)
data.put("Falling", bar_index - 1)
plot(data.contains("Rising") ? 1 : 0, title="Contains")
plot(data.get("Rising") - data.get("Falling"), title="Difference")
plot(na(data.remove("Missing")) ? 1 : 0, title="Missing Remove")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Contains').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Difference').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Missing Remove').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('prefers scoped map receivers over the map namespace', () => {
    const result = runCompatScript(`
indicator("Map receiver shadowing")
map = map.new()
map.put("A", 7)
plot(map.size(), title="Size")
plot(map.get("A"), title="Value")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Value').values)).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
  });

  it('iterates map key-value pairs in insertion order', () => {
    const result = runCompatScript(`
indicator("Map loops")
m = map.new<string, int>()
m.put("A", 1)
m.put("B", 2)
m.put("C", 3)
keyScore = 0
valueSum = 0
for [key, value] in m
    keyScore += key == "A" ? 100 : key == "B" ? 10 : 1
    valueSum += value
plot(keyScore, title="Key Score")
plot(valueSum, title="Value Sum")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Key Score').values)).toEqual([111, 111, 111, 111, 111, 111, 111, 111, 111, 111, 111, 111]);
    expect(roundSeries(getPlot(result, 'Value Sum').values)).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
  });

  it('runs map loop expressions', () => {
    const result = runCompatScript(`
indicator("Map loop expressions")
m = map.new<string, int>()
m.put("A", 1)
m.put("B", 2)
m.put("C", 3)
sum = 0
last = for [key, value] in m
    sum += value
    key == "C" ? sum : 0
plot(last, title="Last Result")
plot(sum, title="Accumulated")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Last Result').values)).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
    expect(roundSeries(getPlot(result, 'Accumulated').values)).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
  });

  it('runs documented map history and scope idioms', () => {
    const result = runCompatScript(`
indicator("Map history scope")
globalData = map.new<int, float>()
update() =>
    previous = globalData[1]
    if na(previous)
        for i = 1 to 3
            globalData.put(i, close)
    else
        for [key, value] in previous
            globalData.put(key, value + key)
update()
values = globalData.values()
plot(globalData.get(1), title="One")
plot(values.max(), title="Max")
plot(values.min(), title="Min")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'One').values)).toEqual([102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113]);
    expect(roundSeries(getPlot(result, 'Max').values)).toEqual([102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135]);
    expect(roundSeries(getPlot(result, 'Min').values)).toEqual([102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113]);
  });
});
