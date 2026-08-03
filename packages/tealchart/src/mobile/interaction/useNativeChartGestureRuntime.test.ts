import { describe, expect, it, vi } from 'vitest';

import { createNativeChartFrameFromPanes } from '../render/nativeChartFrame';
import { resolveNativeCrosshairInteractionFrame } from './useNativeChartGestureRuntime';

vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
}));

const frame = createNativeChartFrameFromPanes({
  dimensions: { width: 220, height: 180, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
  panes: [{ id: 'main', type: 'main', top: 36, height: 104, yMin: 62_000, yMax: 64_000 }],
});

describe('native chart gesture runtime', () => {
  it('keeps crosshair taps enabled for the default select tool state', () => {
    expect(resolveNativeCrosshairInteractionFrame({ dataFrame: frame, drawingInputEnabled: false })).toBe(frame);
  });

  it('disables crosshair taps while placing drawings', () => {
    expect(resolveNativeCrosshairInteractionFrame({ dataFrame: frame, drawingInputEnabled: true })).toBeNull();
  });
});
