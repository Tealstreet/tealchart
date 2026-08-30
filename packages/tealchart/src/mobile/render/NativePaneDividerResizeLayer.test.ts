import type { NativeChartFrame } from './nativeChartFrame';

import { describe, expect, it } from 'vitest';

import { resolveNativePaneDividerAtY, resolveNativePaneDividerBands } from '../interaction/nativePaneDivider';
import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import { nativePaneDividerSnapshotBridgeVisible } from './NativePaneDividerResizeLayer';

function frame(mainHeight: number, indicatorHeight: number): NativeChartFrame {
  return createNativeChartFrameFromPanes({
    dimensions: { width: 220, height: 220, margins: { top: 0, right: 50, bottom: 40, left: 20 } },
    panes: [
      { id: 'main', type: 'main', top: 36, height: mainHeight, yMin: 62_000, yMax: 64_000 },
      { id: 'pane_1', type: 'indicator', top: 36 + mainHeight, height: indicatorHeight, yMin: 0, yMax: 100 },
    ],
  });
}

describe('nativePaneDividerSnapshotBridgeVisible', () => {
  it('keeps the divider snapshot visible while a divider target is active', () => {
    const start = frame(84, 60);
    const target = resolveNativePaneDividerAtY(start, start.mainPane.bottom)!;
    const bands = resolveNativePaneDividerBands({ target, translationY: 10 });

    expect(nativePaneDividerSnapshotBridgeVisible({ bands, frame: frame(94, 50), target })).toBe(true);
  });

  it('bridges a committed divider until the frame leaves the drag-start geometry', () => {
    const start = frame(84, 60);
    const target = resolveNativePaneDividerAtY(start, start.mainPane.bottom)!;
    const bands = resolveNativePaneDividerBands({ target, translationY: 10 });

    expect(nativePaneDividerSnapshotBridgeVisible({ bands, frame: start, target: null })).toBe(true);
    expect(nativePaneDividerSnapshotBridgeVisible({ bands, frame: frame(94, 50), target: null })).toBe(false);
  });
});
