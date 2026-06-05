import { describe, expect, it } from 'vitest';

import { getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine object compatibility', () => {
  it('runs user-defined type constructor, field, and reference idioms', () => {
    const result = runCompatScript(`
indicator("UDT object fields")
type pivotPoint
    int openTime
    float level
    pivotPoint previous = na

point = pivotPoint.new(time, close)
samePoint = point
samePoint.level += 1
plot(point.level, title="Reference Level")
plot(point.openTime, title="Open Time")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Reference Level').values)).toEqual([103, 106, 108, 104, 100, 101, 105, 110, 109, 112, 111, 113]);
    expect(getPlot(result, 'Open Time').values).toEqual([
      1_700_000_000_000,
      1_700_000_060_000,
      1_700_000_120_000,
      1_700_000_180_000,
      1_700_000_240_000,
      1_700_000_300_000,
      1_700_000_360_000,
      1_700_000_420_000,
      1_700_000_480_000,
      1_700_000_540_000,
      1_700_000_600_000,
      1_700_000_660_000,
    ]);
  });

  it('reports invalid local user-defined type constructor argument order', () => {
    const result = runCompatScript(`
indicator("UDT constructor argument order")
type Pivot
    int x
    float y
point = Pivot.new(x=bar_index, close)
plot(point.y, title="Value")
`);

    expect(result.errors[0]?.message).toBe('Pivot.new cannot use positional arguments after named arguments');
  });

  it('runs reduced pivot object array idioms from the official objects docs', () => {
    const result = runCompatScript(`
indicator("Pivot object array")
type pivotPoint
    int openTime
    float level

var pivots = array.new<pivotPoint>()
isPivot = close > open
if isPivot
    pivots.push(pivotPoint.new(time, close))

lastPivot = pivots.size() > 0 ? pivots.last() : pivotPoint.new(0, na)
plot(pivots.size(), title="Pivot Count")
plot(lastPivot.level, title="Last Pivot Level")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Pivot Count').values).toEqual([1, 2, 3, 3, 3, 4, 5, 6, 6, 7, 7, 8]);
    expect(roundSeries(getPlot(result, 'Last Pivot Level').values)).toEqual([102, 105, 107, 107, 107, 100, 104, 109, 109, 111, 111, 112]);
  });

  it('runs user-defined methods on primitive values and UDT references', () => {
    const result = runCompatScript(`
indicator("User methods")
type pivotPoint
    float level

method scaled(float this, float factor = 2) => this * factor
method lift(pivotPoint this, float amount) =>
    this.level += amount
    this

point = pivotPoint.new(close)
samePoint = point.lift(3)
plot(close.scaled(2), title="Scaled Close")
plot(samePoint.level, title="Lifted Level")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Scaled Close').values)).toEqual([204, 210, 214, 206, 198, 200, 208, 218, 216, 222, 220, 224]);
    expect(roundSeries(getPlot(result, 'Lifted Level').values)).toEqual([105, 108, 110, 106, 102, 103, 107, 112, 111, 114, 113, 115]);
  });

  it('runs reduced shallow UDT copy idioms from the official objects docs', () => {
    const result = runCompatScript(`
indicator("Object copy")
type childState
    float level = 0
type pivotPoint
    int openTime
    float level
    childState child = na

parent = pivotPoint.new(time, close, childState.new(close))
staticCopy = pivotPoint.copy(parent)
methodCopy = parent.copy()
staticCopy.level += 10
methodCopy.level += 20
staticCopy.child.level += 1
plot(parent.level, title="Parent Level")
plot(staticCopy.level, title="Static Copy Level")
plot(methodCopy.level, title="Method Copy Level")
plot(parent.child.level, title="Shared Child Level")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Parent Level').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Static Copy Level').values)).toEqual([112, 115, 117, 113, 109, 110, 114, 119, 118, 121, 120, 122]);
    expect(roundSeries(getPlot(result, 'Method Copy Level').values)).toEqual([122, 125, 127, 123, 119, 120, 124, 129, 128, 131, 130, 132]);
    expect(roundSeries(getPlot(result, 'Shared Child Level').values)).toEqual([103, 106, 108, 104, 100, 101, 105, 110, 109, 112, 111, 113]);
  });

  it('keeps overloaded user-defined method scopes isolated', () => {
    const result = runCompatScript(`
indicator("Method overload scopes")
method hits(float this) =>
    var count = 0
    count += 1
    count
method hits(float this, float step) =>
    var count = 0
    count += step
    count

plot(close.hits(), title="Unary Hits")
plot(close.hits(10), title="Binary Hits")
`);

    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Unary Hits').values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(getPlot(result, 'Binary Hits').values).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
  });

  it('uses a compatible method overload when another overload has missing required parameters', () => {
    const result = runCompatScript(`
indicator("Method required args")
method choose(float this, float required) => required
method choose(float this) => this

plot(close.choose(), title="Selected")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Selected').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
  });

  it('selects local method overloads by UDT receiver type', () => {
    const result = runCompatScript(`
indicator("Local receiver overload")
type Left
    float x
type Right
    float y
method value(Left this) => this.x
method value(Right this) => this.y
method bump(Left this) =>
    this.x += 10
    this
method bump(Right this) =>
    this.y += 20
    this

left = Left.new(open)
right = Right.new(close)
plot(left.value(), title="Left Value")
plot(right.value(), title="Right Value")
leftOut = left.bump()
rightOut = right.bump()
plot(leftOut.x, title="Left Bump")
plot(rightOut.y, title="Right Bump")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Left Value').values)).toEqual([100, 102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110]);
    expect(roundSeries(getPlot(result, 'Right Value').values)).toEqual([102, 105, 107, 103, 99, 100, 104, 109, 108, 111, 110, 112]);
    expect(roundSeries(getPlot(result, 'Left Bump').values)).toEqual([110, 112, 115, 117, 113, 109, 110, 114, 119, 118, 121, 120]);
    expect(roundSeries(getPlot(result, 'Right Bump').values)).toEqual([122, 125, 127, 123, 119, 120, 124, 129, 128, 131, 130, 132]);
  });
});
