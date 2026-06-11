import { describe, expect, it } from 'vitest';

import { DEFAULT_USER_DRAWING_ICON_SIZE, resolveUserDrawingIconGeometry } from './iconGeometry';

describe('user drawing icon geometry', () => {
  it('falls back to the default size for non-finite sizes', () => {
    const geometry = resolveUserDrawingIconGeometry({
      center: { x: 50, y: 50 },
      size: Number.NaN,
    });

    expect(geometry.size).toBe(DEFAULT_USER_DRAWING_ICON_SIZE);
    expect(geometry.points[0]).toEqual({ x: 50, y: 41 });
    expect(geometry.bounds).toEqual({ x: 41, y: 41, width: 18, height: 18 });
  });
});
