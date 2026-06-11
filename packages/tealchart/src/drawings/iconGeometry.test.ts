import { describe, expect, it } from 'vitest';

import { DEFAULT_USER_DRAWING_ICON_SIZE, resolveUserDrawingIconGeometry } from './iconGeometry';

describe('user drawing icon geometry', () => {
  it('resolves supported icon library shapes', () => {
    const center = { x: 50, y: 50 };

    expect(resolveUserDrawingIconGeometry({ name: 'circle', center, size: 20 })).toMatchObject({
      name: 'circle',
      size: 20,
      bounds: { x: 40, y: 40, width: 20, height: 20 },
    });
    expect(resolveUserDrawingIconGeometry({ name: 'circle', center, size: 20 }).points).toHaveLength(16);
    expect(resolveUserDrawingIconGeometry({ name: 'square', center, size: 20 }).points).toEqual([
      { x: 40, y: 40 },
      { x: 60, y: 40 },
      { x: 60, y: 60 },
      { x: 40, y: 60 },
    ]);
    expect(resolveUserDrawingIconGeometry({ name: 'triangle', center, size: 20 }).points).toEqual([
      { x: 50, y: 40 },
      { x: 60, y: 60 },
      { x: 40, y: 60 },
    ]);
    expect(resolveUserDrawingIconGeometry({ name: 'flag', center, size: 20 }).points).toHaveLength(5);
    expect(resolveUserDrawingIconGeometry({ name: 'arrowUp', center, size: 20 }).points[0]).toEqual({ x: 50, y: 40 });
    expect(resolveUserDrawingIconGeometry({ name: 'arrowDown', center, size: 20 }).points[0]).toEqual({
      x: 50,
      y: 60,
    });
  });

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
