import { describe, expect, it } from 'vitest';

import { getPlotOhlcGeometry } from './plotOhlcGeometry';

describe('Captured V4-PLOTBAR-RAW-OHLC-VISUAL quartet ordering', () => {
  it.each([
    [110, 120, 100, 115, 120, 100],
    [110, 112, 100, 118, 118, 100],
    [105, 120, 110, 115, 120, 105],
    [110, 103, 119, 115, 119, 103],
    [123, 114, 106, 97, 123, 97],
  ])('retains raw quartet %s/%s/%s/%s while drawing its extremes', (open, high, low, close, drawHigh, drawLow) => {
    const plot = { openValues: [open], highValues: [high], lowValues: [low], closeValues: [close] };
    expect(getPlotOhlcGeometry(plot, 0)).toEqual({ open, high: drawHigh, low: drawLow, close });
    expect(plot).toEqual({ openValues: [open], highValues: [high], lowValues: [low], closeValues: [close] });
  });
  it('omits the captured missing-high quartet', () => {
    expect(
      getPlotOhlcGeometry({ openValues: [110], highValues: [null], lowValues: [100], closeValues: [115] }, 0),
    ).toBeNull();
  });
});
