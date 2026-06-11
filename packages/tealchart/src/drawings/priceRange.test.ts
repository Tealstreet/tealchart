import { describe, expect, it } from 'vitest';

import { resolveUserDrawingPriceRangeMetrics, resolveUserDrawingVisualPriceRangeMetrics } from './priceRange';

describe('user drawing price range metrics', () => {
  it('formats signed price and percent changes', () => {
    expect(resolveUserDrawingPriceRangeMetrics(100, 112.5)).toEqual({
      delta: 12.5,
      percent: 12.5,
      label: '+12.50 (+12.50%)',
    });
    expect(resolveUserDrawingPriceRangeMetrics(100, 95)).toEqual({
      delta: -5,
      percent: -5,
      label: '-5.00 (-5.00%)',
    });
  });

  it('omits percent when the start price is zero', () => {
    expect(resolveUserDrawingPriceRangeMetrics(0, 10)).toEqual({
      delta: 10,
      percent: null,
      label: '+10.00',
    });
  });

  it('derives visual price range metrics from low to high regardless of anchor order', () => {
    expect(
      resolveUserDrawingVisualPriceRangeMetrics({ time: 1, price: 112.5 }, { time: 2, price: 100 }),
    ).toEqual({
      delta: 12.5,
      percent: 12.5,
      label: '+12.50 (+12.50%)',
    });
    expect(
      resolveUserDrawingVisualPriceRangeMetrics({ time: 1, price: 100 }, { time: 2, price: 112.5 }),
    ).toEqual({
      delta: 12.5,
      percent: 12.5,
      label: '+12.50 (+12.50%)',
    });
  });
});
