import { describe, expect, it } from 'vitest';

import {
  isMobileChartGestureLayerEnabled,
  isMobileCrosshairPanGestureEnabled,
  isMobileUserDrawingGestureActive,
} from './drawingGestureMode';

describe('mobile drawing gesture mode', () => {
  it('treats non-select drawing tools as active drawing gestures', () => {
    expect(isMobileUserDrawingGestureActive('select')).toBe(false);
    expect(isMobileUserDrawingGestureActive('rectangle')).toBe(true);
    expect(isMobileUserDrawingGestureActive('path')).toBe(true);
  });

  it('keeps drawing gestures enabled while crosshair is visible', () => {
    expect(isMobileChartGestureLayerEnabled('select', true)).toBe(false);
    expect(isMobileChartGestureLayerEnabled('rectangle', true)).toBe(true);
    expect(isMobileChartGestureLayerEnabled('rectangle', false)).toBe(true);
  });

  it('lets crosshair pan own gestures only when drawing tools are inactive', () => {
    expect(isMobileCrosshairPanGestureEnabled('select', true)).toBe(true);
    expect(isMobileCrosshairPanGestureEnabled('rectangle', true)).toBe(false);
    expect(isMobileCrosshairPanGestureEnabled('select', false)).toBe(false);
  });
});
