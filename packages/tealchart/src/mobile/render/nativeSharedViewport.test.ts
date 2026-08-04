import { describe, expect, it } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import {
  isNativeYInMainPane,
  resolveNativeTradeLineLabelTopOffset,
} from './nativeSharedViewport';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 160,
    height: 120,
    margins: {
      top: 0,
      right: 40,
      bottom: 20,
      left: 0,
    },
  },
  panes: [
    {
      id: 'main',
      type: 'main',
      top: 0,
      height: 100,
      yMin: 0,
      yMax: 100,
    },
  ],
});

function shared<T>(value: T): SharedValue<T> {
  return { value } as SharedValue<T>;
}

const sharedViewport: NativeViewportSharedValues = {
  startTime: shared(0),
  endTime: shared(1),
  priceMin: shared(0),
  priceMax: shared(100),
};

describe('native shared viewport', () => {
  it('detects whether a raw y-coordinate belongs to the main pane', () => {
    expect(isNativeYInMainPane(0, frame)).toBe(true);
    expect(isNativeYInMainPane(100, frame)).toBe(true);
    expect(isNativeYInMainPane(-1, frame)).toBe(false);
    expect(isNativeYInMainPane(101, frame)).toBe(false);
  });

  it('does not let offscreen trade rows affect visible label stacking', () => {
    expect(
      resolveNativeTradeLineLabelTopOffset(
        [
          { objectType: 'order', objectId: 'offscreen', price: 200 },
          { objectType: 'order', objectId: 'visible', price: 50 },
        ],
        'order',
        'visible',
        sharedViewport,
        frame,
        18,
      ),
    ).toBe(-9);
  });

  it('falls back to centered labels when every trade row is offscreen', () => {
    expect(
      resolveNativeTradeLineLabelTopOffset(
        [{ objectType: 'order', objectId: 'offscreen', price: 200 }],
        'order',
        'offscreen',
        sharedViewport,
        frame,
        18,
      ),
    ).toBe(-9);
  });
});
