import { describe, expect, it } from 'vitest';

import { resolveNativeAnchoredSurfacePosition } from './NativeFloatingOverlay';

describe('resolveNativeAnchoredSurfacePosition', () => {
  it('right-aligns below the anchor when there is enough viewport room', () => {
    expect(
      resolveNativeAnchoredSurfacePosition({
        anchor: { x: 250, y: 40, width: 40, height: 36 },
        preferredWidth: 200,
        viewport: { width: 390, height: 844 },
      }),
    ).toMatchObject({
      left: 90,
      top: 80,
      width: 200,
      maxHeight: 420,
    });
  });

  it('clamps horizontally and vertically inside the viewport', () => {
    expect(
      resolveNativeAnchoredSurfacePosition({
        anchor: { x: 360, y: 780, width: 28, height: 36 },
        preferredWidth: 292,
        minHeight: 180,
        minWidth: 228,
        viewport: { width: 390, height: 844 },
      }),
    ).toEqual({
      left: 90,
      top: 656,
      width: 292,
      maxHeight: 180,
    });
  });

  it('uses fallback placement when no anchor has been measured', () => {
    expect(
      resolveNativeAnchoredSurfacePosition({
        fallbackLeft: 300,
        fallbackTop: 48,
        preferredWidth: 292,
        viewport: { width: 390, height: 844 },
      }),
    ).toMatchObject({
      left: 90,
      top: 48,
      width: 292,
    });
  });
});
