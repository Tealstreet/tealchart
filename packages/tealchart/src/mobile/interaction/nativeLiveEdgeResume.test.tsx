import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { AppState } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  centreNativeViewportOnNewestBar,
  isNativeViewportAtLiveEdge,
  NATIVE_REFOCUS_RECENTRE_WINDOW_MS,
} from './nativeLiveEdgeResume';
import { useNativeViewportRuntime } from './useNativeViewportRuntime';

vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
}));

const INTERVAL_MS = 900_000;

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, index) => ({
    time: (index + 1) * INTERVAL_MS,
    open: 100 + index,
    high: 102 + index,
    low: 98 + index,
    close: 101 + index,
    volume: 10,
  }));
}

function shared<T>(value: T) {
  return { value } as { value: T };
}

const appState = AppState as unknown as { emit(next: string): void };

function renderRuntime(bars: Bar[], autoScaleEnabled = true) {
  const sharedViewport = { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) };
  return renderHook(
    (props: { bars: Bar[] }) =>
      useNativeViewportRuntime({
        autoScaleEnabled,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame: null,
        interval: '15',
        isLoading: false,
        loadedBarsInterval: '15',
        onViewportChange: vi.fn(),
        onRequestMoreBars: vi.fn(),
        panActive: shared(false),
        panMetrics: {
          intervalMs: shared(INTERVAL_MS),
          contentWidth: shared(300),
          timePerPixel: shared(1),
          pricePerPixel: shared(1),
        },
        panStartViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        pinchActive: shared(false),
        priceAutoScale: { active: shared(autoScaleEnabled), bars: shared([]) },
        priceScaleActive: shared(false),
        sharedViewport,
        symbol: 'BTCUSDT',
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput),
    { initialProps: { bars } },
  );
}

function placeView(result: ReturnType<typeof renderRuntime>['result'], viewport: Viewport) {
  act(() => {
    result.current.applyNativeViewport(viewport);
    result.current.cancelNativeViewportInteraction();
  });
}

afterEach(() => {
  act(() => appState.emit('active'));
});

const span = (view: Viewport) => view.endTime - view.startTime;
const centre = (view: Viewport) => (view.startTime + view.endTime) / 2;

// AGT-104, Sam's revised spec (2026-11-22): on refocus, if the newest candle is OFF
// screen, bring it back centred at the same zoom; if it is on screen, do not move.
// This replaced "follow for 150 s only if the newest bar was in view when the app
// went to the background", which left a view scrolled into history stranded.
describe('native refocus recentre (AGT-104)', () => {
  it('detects whether the newest bar is in view', () => {
    const bars = makeBars(10);
    const view = { startTime: 5 * INTERVAL_MS, endTime: 11 * INTERVAL_MS, priceMin: 0, priceMax: 1 };
    expect(isNativeViewportAtLiveEdge(view, bars)).toBe(true);
    expect(isNativeViewportAtLiveEdge({ ...view, endTime: 9 * INTERVAL_MS }, bars)).toBe(false);
  });

  it('centres the newest bar keeping the width', () => {
    const view = { startTime: 5 * INTERVAL_MS, endTime: 11 * INTERVAL_MS, priceMin: 0, priceMax: 1 };
    expect(centreNativeViewportOnNewestBar(view, makeBars(20))).toEqual({
      ...view,
      startTime: 17 * INTERVAL_MS,
      endTime: 23 * INTERVAL_MS,
    });
    expect(centreNativeViewportOnNewestBar(view, [])).toBeNull();
  });

  it('recentres a view scrolled into history, at the same zoom', () => {
    const { result } = renderRuntime(makeBars(40));
    const history = { startTime: 10 * INTERVAL_MS, endTime: 21 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, history);

    act(() => appState.emit('background'));
    act(() => appState.emit('active'));

    expect(span(result.current.viewport)).toBe(span(history));
    expect(centre(result.current.viewport)).toBe(40 * INTERVAL_MS);
  });

  it('recentres when the bars printed while away land off screen', () => {
    // Auto-scale off, so nothing follows the live edge on its own.
    const { result, rerender } = renderRuntime(makeBars(40), false);
    const pinned = { startTime: 30 * INTERVAL_MS, endTime: 41 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, pinned);

    act(() => appState.emit('background'));
    act(() => appState.emit('active'));
    // The newest bar is still on screen until the first tick and the backfill land.
    expect(result.current.viewport.endTime).toBe(pinned.endTime);
    rerender({ bars: makeBars(52) });

    expect(span(result.current.viewport)).toBe(span(pinned));
    expect(centre(result.current.viewport)).toBe(52 * INTERVAL_MS);
  });

  it('does not move a view whose newest bar is on screen', () => {
    const { result, rerender } = renderRuntime(makeBars(40), false);
    const pinned = { startTime: 30 * INTERVAL_MS, endTime: 45 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, pinned);

    act(() => appState.emit('background'));
    act(() => appState.emit('active'));
    rerender({ bars: makeBars(43) });

    expect(result.current.viewport.startTime).toBe(pinned.startTime);
    expect(result.current.viewport.endTime).toBe(pinned.endTime);
  });

  it('does not recentre without a trip to the background', () => {
    const { result } = renderRuntime(makeBars(40));
    const history = { startTime: 10 * INTERVAL_MS, endTime: 21 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, history);

    act(() => appState.emit('active'));

    expect(result.current.viewport.startTime).toBe(history.startTime);
  });

  it('stops checking once the refocus window has passed', () => {
    const now = vi.spyOn(Date, 'now');
    try {
      now.mockReturnValue(1_000_000);
      const { result, rerender } = renderRuntime(makeBars(40), false);
      const pinned = { startTime: 30 * INTERVAL_MS, endTime: 41 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
      placeView(result, pinned);
      act(() => appState.emit('background'));
      act(() => appState.emit('active'));
      now.mockReturnValue(1_000_000 + NATIVE_REFOCUS_RECENTRE_WINDOW_MS + 1);
      rerender({ bars: makeBars(52) });

      expect(result.current.viewport.endTime).toBe(pinned.endTime);
    } finally {
      now.mockRestore();
    }
  });

  it('lets a layout restore after the return settle where it put the view', () => {
    const { result, rerender } = renderRuntime(makeBars(40), false);
    placeView(result, { startTime: 30 * INTERVAL_MS, endTime: 41 * INTERVAL_MS, priceMin: 100, priceMax: 150 });
    act(() => appState.emit('background'));
    act(() => appState.emit('active'));
    const restored = { startTime: 31 * INTERVAL_MS, endTime: 42 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, restored);
    rerender({ bars: makeBars(52) });

    expect(result.current.viewport.startTime).toBe(restored.startTime);
    expect(result.current.viewport.endTime).toBe(restored.endTime);
  });

  it('does not move the view once the user touches it after the return', () => {
    const { result, rerender } = renderRuntime(makeBars(40), false);
    const pinned = { startTime: 30 * INTERVAL_MS, endTime: 41 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, pinned);

    act(() => appState.emit('background'));
    act(() => appState.emit('active'));
    act(() => {
      result.current.beginNativeViewportInteraction();
      result.current.cancelNativeViewportInteraction();
    });
    rerender({ bars: makeBars(52) });

    expect(result.current.viewport.endTime).toBe(pinned.endTime);
  });
});
