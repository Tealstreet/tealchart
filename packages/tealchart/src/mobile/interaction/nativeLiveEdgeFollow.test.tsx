import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

function renderRuntime(bars: Bar[], autoScaleEnabled: boolean) {
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
        sharedViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        symbol: 'BTCUSDT',
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput),
    { initialProps: { bars } },
  );
}

/** A view the user placed by hand, the way a pan leaves it. */
function panTo(result: ReturnType<typeof renderRuntime>['result'], viewport: Viewport) {
  act(() => {
    result.current.beginNativeViewportInteraction();
    result.current.commitPanViewport(viewport);
    result.current.cancelNativeViewportInteraction();
  });
}

// AGT-156 (Sam, 2026-11-22): in auto scale mode, a new candle pushes every candle
// left by one candle width, so the newest keeps its x. Native only followed a view
// the chart had placed itself; one the user had panned, even with the newest
// candle on screen, froze while the new candles printed off its right edge.
describe('native live-edge follow in auto scale mode (AGT-156)', () => {
  it('shifts a hand-placed view showing the newest candle left by exactly one bar per new bar', () => {
    const { result, rerender } = renderRuntime(makeBars(40), true);
    const view = { startTime: 31 * INTERVAL_MS, endTime: 43 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    panTo(result, view);

    rerender({ bars: makeBars(41) });
    expect(result.current.viewport.startTime).toBe(view.startTime + INTERVAL_MS);
    expect(result.current.viewport.endTime).toBe(view.endTime + INTERVAL_MS);

    rerender({ bars: makeBars(42) });
    expect(result.current.viewport.startTime).toBe(view.startTime + 2 * INTERVAL_MS);
    expect(result.current.viewport.endTime).toBe(view.endTime + 2 * INTERVAL_MS);
  });

  it('keeps the time window still on a tick to the bar in progress', () => {
    const { result, rerender } = renderRuntime(makeBars(40), true);
    const view = { startTime: 31 * INTERVAL_MS, endTime: 43 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    panTo(result, view);

    const ticked = makeBars(40);
    ticked[39] = { ...ticked[39]!, close: 145, high: 146 };
    rerender({ bars: ticked });

    expect(result.current.viewport.startTime).toBe(view.startTime);
    expect(result.current.viewport.endTime).toBe(view.endTime);
  });

  it('leaves a view scrolled into history where it is', () => {
    const { result, rerender } = renderRuntime(makeBars(40), true);
    const history = { startTime: 10 * INTERVAL_MS, endTime: 21 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    panTo(result, history);

    rerender({ bars: makeBars(41) });

    expect(result.current.viewport.startTime).toBe(history.startTime);
    expect(result.current.viewport.endTime).toBe(history.endTime);
  });

  it('leaves a hand-placed view alone with auto scale off', () => {
    const { result, rerender } = renderRuntime(makeBars(40), false);
    const view = { startTime: 31 * INTERVAL_MS, endTime: 43 * INTERVAL_MS, priceMin: 100, priceMax: 150 };
    panTo(result, view);

    rerender({ bars: makeBars(41) });

    expect(result.current.viewport.startTime).toBe(view.startTime);
    expect(result.current.viewport.endTime).toBe(view.endTime);
  });
});
