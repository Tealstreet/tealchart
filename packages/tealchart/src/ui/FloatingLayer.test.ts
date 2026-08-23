import { describe, expect, it } from 'vitest';

import { resolveFixedFloatingPosition } from './FloatingLayer';

describe('resolveFixedFloatingPosition', () => {
  it('keeps a surface at its desired fixed coordinates when it fits', () => {
    expect(
      resolveFixedFloatingPosition({
        desiredLeft: 120,
        desiredTop: 80,
        width: 180,
        height: 100,
        viewport: { width: 800, height: 600 },
      }),
    ).toEqual({ left: 120, top: 80 });
  });

  it('clamps a surface inside the viewport margins', () => {
    expect(
      resolveFixedFloatingPosition({
        desiredLeft: 760,
        desiredTop: 580,
        width: 180,
        height: 100,
        viewport: { width: 800, height: 600 },
      }),
    ).toEqual({ left: 612, top: 492 });
  });

  it('uses fallback dimensions before mounted content has measurable size', () => {
    expect(
      resolveFixedFloatingPosition({
        desiredLeft: 780,
        desiredTop: 590,
        fallbackWidth: 150,
        fallbackHeight: 42,
        viewport: { width: 800, height: 600 },
      }),
    ).toEqual({ left: 642, top: 550 });
  });
});
