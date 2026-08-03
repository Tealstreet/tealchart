import { describe, expect, it } from 'vitest';

import { isNativeGestureControlPoint } from './nativeGestureControlZones';

describe('native gesture control zones', () => {
  it('matches points inside primitive overlay control rectangles', () => {
    const zones = [{ x1: 10, x2: 30, y1: 40, y2: 60 }];

    expect(isNativeGestureControlPoint(zones, 10, 40)).toBe(true);
    expect(isNativeGestureControlPoint(zones, 30, 60)).toBe(true);
    expect(isNativeGestureControlPoint(zones, 31, 60)).toBe(false);
    expect(isNativeGestureControlPoint(zones, 20, 39)).toBe(false);
  });
});
