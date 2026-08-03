import { describe, expect, it } from 'vitest';

import { DEFAULT_MARGINS } from '../../types';
import { createNativePriceAxisLaneWidth } from '../utils/nativePriceAxisLane';
import { createNativeSkiaChartMargins, resolveNativeSkiaDimensions } from './useNativeSkiaLayoutRuntime';

describe('native Skia layout runtime margins', () => {
  it('lets the native top bar own the default top reservation', () => {
    const margins = createNativeSkiaChartMargins({
      pricePrecision: 2,
      showTopBar: true,
      topBarHeight: 36,
    });

    expect(margins.top).toBe(36);
  });

  it('preserves explicit top inset above the native top bar', () => {
    const margins = createNativeSkiaChartMargins({
      marginsProp: { top: 6 },
      pricePrecision: 2,
      showTopBar: true,
      topBarHeight: 36,
    });

    expect(margins.top).toBe(42);
  });

  it('keeps the normal chart top margin when the native top bar is hidden', () => {
    const margins = createNativeSkiaChartMargins({
      pricePrecision: 2,
      showTopBar: false,
      topBarHeight: 36,
    });

    expect(margins.top).toBe(DEFAULT_MARGINS.top);
  });

  it('lets native overlay chrome float over full-width chart space', () => {
    const margins = createNativeSkiaChartMargins({
      marginsProp: { left: 2, right: 20 },
      pricePrecision: 2,
      showTopBar: true,
      topBarHeight: 36,
    });

    expect(margins.left).toBe(2);
    expect(margins.right).toBe(createNativePriceAxisLaneWidth({ pricePrecision: 2 }));
  });

  it('does not reserve native left rail space when the drawing rail is collapsed', () => {
    const margins = createNativeSkiaChartMargins({
      leftToolRailCollapsed: true,
      marginsProp: { left: 2 },
      pricePrecision: 2,
      showTopBar: true,
      topBarHeight: 36,
    });

    expect(margins.left).toBe(2);
  });

  it('allows explicit price-axis reservations for fixture and embed callers', () => {
    const margins = createNativeSkiaChartMargins({
      marginsProp: { right: 20 },
      priceAxisWidth: 104,
      pricePrecision: 2,
      showTopBar: true,
      topBarHeight: 36,
    });

    expect(margins.right).toBe(104);
  });

  it('uses explicit dimensions synchronously instead of waiting for layout state', () => {
    const dimensions = resolveNativeSkiaDimensions({
      measuredDimensions: { width: 320, height: 240 },
      propWidth: 390,
      propHeight: 312,
    });

    expect(dimensions).toEqual({ width: 390, height: 312 });
  });

  it('falls back to measured dimensions when explicit dimensions are incomplete', () => {
    const dimensions = resolveNativeSkiaDimensions({
      measuredDimensions: { width: 320, height: 240 },
      propWidth: 390,
    });

    expect(dimensions).toEqual({ width: 320, height: 240 });
  });
});
