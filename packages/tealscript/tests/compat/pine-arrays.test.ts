import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine compatibility golden harness', () => {
  it('runs core array mutation helpers', () => {
    const result = runCompatScript(`
indicator("Array helpers")
var array<float> values = array.new_float()
array.push(values, close)
lastIndex = array.size(values) - 1
lastValue = array.get(values, lastIndex)
array.set(values, 0, 42)
plot(lastValue, title="Last Value")
plot(array.get(values, 0), title="First Value")
plot(array.size(values), title="Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Last Value').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'First Value').values)).toEqual([42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('runs stack and queue array helpers', () => {
    const result = runCompatScript(`
indicator("Array stack queue")
var array<int> values = array.new_int()
array.push(values, 2)
array.unshift(values, 1)
first = array.shift(values)
last = array.pop(values)
plot(first, title="First")
plot(last, title="Last")
plot(array.size(values), title="Remaining")
array.clear(values)
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Last').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Remaining').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('runs array method helper idioms', () => {
    const result = runCompatScript(`
indicator("Array method helpers")
var array<float> window = array.new_float()
window.push(close)
if window.size() > 3
    window.shift()
head = window.get(0)
tail = window.get(window.size() - 1)
plot(head, title="Window Head")
plot(tail, title="Window Tail")
plot(window.size(), title="Window Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Window Head').values)).toEqual([102, 102, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111]);
    expect(roundSeries(getPlot(result, 'Window Tail').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Window Size').values)).toEqual([1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('runs extended array helper idioms', () => {
    const result = runCompatScript(`
indicator("Array extended helpers")
base = array.from(1, 2, 3, 2)
working = base.copy()
working.insert(2, 4)
removed = working.remove(3)
working.fill(8, 1, 3)
plot(working.first(), title="First")
plot(working.last(), title="Last")
plot(working.includes(4) ? 1 : 0, title="Includes")
plot(working.indexof(2), title="Index")
plot(working.lastindexof(2), title="Last Index")
plot(working.min(), title="Min")
plot(working.max(), title="Max")
plot(working.sum(), title="Sum")
plot(working.avg(), title="Avg")
plot(removed, title="Removed")
plot(array.size(base), title="Original Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Last').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Includes').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(roundSeries(getPlot(result, 'Index').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Last Index').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Min').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Max').values)).toEqual([8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]);
    expect(roundSeries(getPlot(result, 'Sum').values)).toEqual([19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19]);
    expect(roundSeries(getPlot(result, 'Avg').values)).toEqual([4.75, 4.75, 4.75, 4.75, 4.75, 4.75, 4.75, 4.75, 4.75, 4.75, 4.75, 4.75]);
    expect(roundSeries(getPlot(result, 'Removed').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Original Size').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('matches documented Pine array ordering and joining idioms', () => {
    const result = runCompatScript(`
indicator("Array ordering helpers")
values = array.from(3, 1, 2)
values.sort(order.descending)
highest = values.get(0)
array.sort(values, order=order.ascending)
lowest = values.get(0)
array.reverse(values)
values.reverse()
values.concat(array.from(4, 5))
joined = values.join("|")
plot(highest, title="Highest")
plot(lowest, title="Lowest")
plot(joined == "1|2|3|4|5" ? 1 : 0, title="Joined")
plot(values.size(), title="Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Highest').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Lowest').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Joined').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
  });

  it('matches documented Pine array slice window idioms', () => {
    const result = runCompatScript(`
indicator("Array slice window")
values = array.from(0, 1, 2, 3)
window = values.slice(0, 3)
values.remove(0)
window.push(4)
window.set(1, 20)
plot(window.get(0), title="Window First")
plot(window.get(1), title="Window Second")
plot(values.size(), title="Parent Size")
plot(values.get(3), title="Parent Tail")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Window First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Window Second').values)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    expect(roundSeries(getPlot(result, 'Parent Size').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(roundSeries(getPlot(result, 'Parent Tail').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it('matches common Pine array index assignment idioms', () => {
    const result = runCompatScript(`
indicator("Array index assignment")
values = array.from(1, 2, 3)
values[0] := 10
values[1] += 5
window = values.slice(0, 2)
window[1] *= 2
literal = [4, 5, 6]
literal[2] := 12
plot(values[0], title="First")
plot(values[1], title="Second")
plot(literal[2], title="Literal")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(roundSeries(getPlot(result, 'Second').values)).toEqual([14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
    expect(roundSeries(getPlot(result, 'Literal').values)).toEqual([12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]);
  });

  it('reads array literal values with array helpers', () => {
    const result = runCompatScript(`
indicator("Array literal")
values = [10, 20, 30]
plot(array.get(values, 1), title="Middle")
plot(array.size(values), title="Literal Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Middle').values)).toEqual([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);
    expect(roundSeries(getPlot(result, 'Literal Size').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('runs generic array constructor idioms', () => {
    const result = runCompatScript(`
indicator("Generic array constructor")
values = array.new<float>(2, 1.5)
values.push(close)
plot(values.get(0), title="Initial")
plot(values.size(), title="Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Initial').values)).toEqual([1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5]);
    expect(roundSeries(getPlot(result, 'Size').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('matches documented Pine array statistical helpers', () => {
    const result = runCompatScript(`
indicator("Array statistical helpers")
values = array.from(1, 2, 3, 4)
absValues = array.abs(array.from(-2, 3))
standardized = values.standardize()
plot(array.range(values), title="Range")
plot(array.median(values), title="Median")
plot(array.mode(array.from(2, 1, 2, 3)), title="Mode")
plot(array.variance(values), title="Variance")
plot(array.stdev(values, false), title="Unbiased Stdev")
plot(array.percentile_nearest_rank(values, 50), title="Nearest Rank")
plot(array.percentile_linear_interpolation(values, 50), title="Linear Percentile")
plot(array.percentrank(values, 2), title="Percent Rank")
plot(array.get(standardized, 0), title="Standardized First")
plot(array.get(absValues, 0), title="Abs First")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Range').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Median').values)).toEqual([2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5]);
    expect(roundSeries(getPlot(result, 'Mode').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Variance').values)).toEqual([1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25, 1.25]);
    expect(roundSeries(getPlot(result, 'Unbiased Stdev').values)).toEqual([1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994, 1.290994]);
    expect(roundSeries(getPlot(result, 'Nearest Rank').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Linear Percentile').values)).toEqual([2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5]);
    expect(roundSeries(getPlot(result, 'Percent Rank').values)).toEqual([75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75]);
    expect(roundSeries(getPlot(result, 'Standardized First').values)).toEqual([-1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641, -1.341641]);
    expect(roundSeries(getPlot(result, 'Abs First').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it('matches documented Pine array binary-search helpers', () => {
    const result = runCompatScript(`
indicator("Array binary search")
values = array.from(1, 2, 2, 4)
plot(values.binary_search(2), title="Found")
plot(array.binary_search(values, 3), title="Missing")
plot(values.binary_search_leftmost(2), title="Left Found")
plot(values.binary_search_leftmost(3), title="Left Missing")
plot(values.binary_search_rightmost(2), title="Right Found")
plot(values.binary_search_rightmost(3), title="Right Missing")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Found').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Missing').values)).toEqual([-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]);
    expect(roundSeries(getPlot(result, 'Left Found').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Left Missing').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Right Found').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Right Missing').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
  });

  it('matches documented Pine array sort-index and predicate helpers', () => {
    const result = runCompatScript(`
indicator("Array sort index and predicates")
values = array.from(5, -2, 0, 9, 1)
indices = values.sort_indices()
descending = array.sort_indices(values, order.descending)
truthy = array.from(1, true, 2)
mixed = array.from(0, false, 1)
colors = array.new_color(2, color.red)
plot(array.get(indices, 0), title="Smallest Index")
plot(array.get(descending, 0), title="Largest Index")
plot(values.every() ? 1 : 0, title="Every Values")
plot(truthy.every() ? 1 : 0, title="Every Truthy")
plot(mixed.some() ? 1 : 0, title="Some Mixed")
plot(array.size(colors), title="Color Array Size")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Smallest Index').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Largest Index').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Every Values').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(roundSeries(getPlot(result, 'Every Truthy').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Some Mixed').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Color Array Size').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });
});
