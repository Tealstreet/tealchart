import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { AppState } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isNativeViewportAtLiveEdge, resolveNativeLiveEdgeResumeViewport } from './nativeLiveEdgeResume';
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

function renderRuntime(bars: Bar[]) {
  const sharedViewport = { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) };
  return renderHook(
    (props: { bars: Bar[] }) =>
      useNativeViewportRuntime({
        autoScaleEnabled: true,
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
        priceAutoScale: { active: shared(true), bars: shared([]) },
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
    result.current.applyNativeViewport(viewport, { autoScaleEnabled: true });
    result.current.cancelNativeViewportInteraction();
  });
}

afterEach(() => {
  act(() => appState.emit('active'));
});

describe('native live-edge resume (AGT-104)', () => {
  it('detects whether the newest bar is in view', () => {
    const bars = makeBars(10);
    const view = { startTime: 5 * INTERVAL_MS, endTime: 11 * INTERVAL_MS, priceMin: 0, priceMax: 1 };
    expect(isNativeViewportAtLiveEdge(view, bars)).toBe(true);
    expect(isNativeViewportAtLiveEdge({ ...view, endTime: 9 * INTERVAL_MS }, bars)).toBe(false);
  });

  it('shifts by the bars printed since, keeping the width', () => {
    const view = { startTime: 5 * INTERVAL_MS, endTime: 11 * INTERVAL_MS, priceMin: 0, priceMax: 1 };
    const followed = resolveNativeLiveEdgeResumeViewport({
      bars: makeBars(14),
      intervalMs: INTERVAL_MS,
      pinnedLastBarTime: 10 * INTERVAL_MS,
      viewport: view,
    });
    expect(followed).toEqual({ ...view, startTime: 9 * INTERVAL_MS, endTime: 15 * INTERVAL_MS });
    // Nothing printed past the right edge: no move.
    expect(
      resolveNativeLiveEdgeResumeViewport({
        bars: makeBars(10),
        intervalMs: INTERVAL_MS,
        pinnedLastBarTime: 10 * INTERVAL_MS,
        viewport: view,
      }),
    ).toBeNull();
  });

  it('scrolls a view that was at the live edge to the bars printed while backgrounded', () => {
    const { result, rerender } = renderRuntime(makeBars(40));
    const pinned = { startTime: 30 * INTERVAL_MS, endTime: 41 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, pinned);

    act(() => appState.emit('background'));
    act(() => appState.emit('active'));
    // The first tick and the backfill land after the return.
    rerender({ bars: makeBars(52) });

    const view = result.current.viewport;
    expect(view.endTime - view.startTime).toBe(pinned.endTime - pinned.startTime);
    expect(view.endTime).toBe(53 * INTERVAL_MS);
    expect(view.startTime).toBe(42 * INTERVAL_MS);
  });

  it('leaves a view scrolled back into history alone', () => {
    const { result, rerender } = renderRuntime(makeBars(40));
    const history = { startTime: 10 * INTERVAL_MS, endTime: 21 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    placeView(result, history);

    act(() => appState.emit('background'));
    act(() => appState.emit('active'));
    rerender({ bars: makeBars(52) });

    expect(result.current.viewport.startTime).toBe(history.startTime);
    expect(result.current.viewport.endTime).toBe(history.endTime);
  });

  it('does not move the view once the user touches it after the return', () => {
    const { result, rerender } = renderRuntime(makeBars(40));
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
