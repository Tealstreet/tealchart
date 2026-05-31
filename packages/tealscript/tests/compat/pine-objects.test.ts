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
});
