import { describe, expect, it, vi } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  createNativePaneGeometryKey,
  NATIVE_MAXIMIZE_ECHO_FRAME_LIMIT,
  NativePaneGeometryEcho,
  shouldReleaseNativeMaximizeHold,
} from './nativeMaximizeHold';

const dimensions = {
  width: 400,
  height: 600,
  margins: { top: 0, right: 58, bottom: 24, left: 0 },
};

function frameWith(mainHeight: number, indicatorHeight: number, yMax = 100) {
  return createNativeChartFrameFromPanes({
    dimensions,
    panes: [
      { id: 'main', type: 'main', top: 0, height: mainHeight, yMin: 0, yMax },
      { id: 'pane_1', type: 'indicator', top: mainHeight, height: indicatorHeight, yMin: 0, yMax },
    ],
  });
}

function release(overrides: Partial<Parameters<typeof shouldReleaseNativeMaximizeHold>[0]> = {}) {
  return shouldReleaseNativeMaximizeHold({
    currentGeometryKey: 'main:0:400|pane_1:400:200',
    framesWaited: 0,
    heightsMatch: true,
    observedGeometryKey: 'main:0:400|pane_1:400:200',
    ...overrides,
  });
}

describe('createNativePaneGeometryKey', () => {
  it('changes when pane heights change', () => {
    expect(createNativePaneGeometryKey(frameWith(400, 200))).not.toBe(createNativePaneGeometryKey(frameWith(576, 0)));
  });

  // Autoscale rewrites yMin/yMax on every bar tick. Keying the gate on the full
  // layout signature would re-arm it all through a live market.
  it('ignores pane value ranges, which move on every bar', () => {
    expect(createNativePaneGeometryKey(frameWith(400, 200, 5_000))).toBe(
      createNativePaneGeometryKey(frameWith(400, 200)),
    );
  });

  it('is empty without a frame', () => {
    expect(createNativePaneGeometryKey(null)).toBe('');
  });
});

describe('shouldReleaseNativeMaximizeHold', () => {
  it('holds until the layout reaches the ratios that were asked for', () => {
    expect(release({ heightsMatch: false })).toBe(false);
  });

  // The whole point: the plain props already carry the new geometry, so without
  // this the bitmap comes off while the paths are still a propagation behind.
  it('holds while the closure channel is still a propagation behind', () => {
    expect(release({ observedGeometryKey: 'main:0:280|pane_1:280:320' })).toBe(false);
  });

  it('releases as soon as the echo reports the current geometry', () => {
    expect(release()).toBe(true);
  });

  // A divider drag overlapping the transition keeps geometry moving, and the
  // echo would never agree; the bitmap must not hold to the 250ms ceiling.
  it('gives up waiting rather than freezing on a layout still in motion', () => {
    const stale = { observedGeometryKey: 'main:0:280|pane_1:280:320' };

    expect(release({ ...stale, framesWaited: NATIVE_MAXIMIZE_ECHO_FRAME_LIMIT - 1 })).toBe(false);
    expect(release({ ...stale, framesWaited: NATIVE_MAXIMIZE_ECHO_FRAME_LIMIT })).toBe(true);
  });

  it('never releases before the heights match, however long it waited', () => {
    expect(release({ heightsMatch: false, framesWaited: 100 })).toBe(false);
  });
});

describe('NativePaneGeometryEcho', () => {
  // It draws nothing; it is mounted inside the canvas so its mapper restarts in
  // the same batch as the plot paths. Rendering anything would be a bug.
  it('publishes the geometry key and renders nothing', () => {
    const echoRef = { current: null } as { current: { value: string } | null };

    expect(NativePaneGeometryEcho({ echoRef: echoRef as never, geometryKey: 'main:0:400' })).toBeNull();
    expect(echoRef.current?.value).toBe('main:0:400');
  });
});
