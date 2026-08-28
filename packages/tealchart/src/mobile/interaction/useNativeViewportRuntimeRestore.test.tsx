import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNativeViewportRuntime } from './useNativeViewportRuntime';

// The worklets runtime needs a native module; the hook only ever hops back to JS.
vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
}));

function shared<T>(value: T) {
  return { value } as { value: T };
}

function makeBars(): Bar[] {
  return [
    { time: 1_000, open: 71_400, high: 71_800, low: 71_300, close: 71_700, volume: 10 },
    { time: 2_000, open: 71_700, high: 72_100, low: 71_600, close: 72_000, volume: 11 },
  ];
}

const RESTORED_VIEWPORT: Viewport = { startTime: 500, endTime: 2_500, priceMin: 48_000, priceMax: 54_000 };

function renderViewportRuntime(bars: Bar[], symbol = 'BTCUSDT') {
  const onViewportChange = vi.fn();
  const rendered = renderHook(
    (props: { bars: Bar[]; symbol: string }) =>
      useNativeViewportRuntime({
        autoScaleEnabled: true,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame: null,
        interval: '15',
        isLoading: false,
        loadedBarsInterval: '15',
        onViewportChange,
        panActive: shared(false),
        panMetrics: {
          intervalMs: shared(900_000),
          contentWidth: shared(300),
          timePerPixel: shared(1),
          pricePerPixel: shared(1),
        },
        panStartViewport: {
          startTime: shared(0),
          endTime: shared(1),
          priceMin: shared(0),
          priceMax: shared(1),
        },
        pinchActive: shared(false),
        priceAutoScale: { active: shared(true), bars: shared([]) },
        priceScaleActive: shared(false),
        sharedViewport: {
          startTime: shared(0),
          endTime: shared(1),
          priceMin: shared(0),
          priceMax: shared(1),
        },
        symbol: props.symbol,
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput),
    { initialProps: { bars, symbol } },
  );
  return { ...rendered, onViewportChange };
}

describe('native viewport runtime layout restore', () => {
  it('settles the first loaded auto viewport so same-candle ticks do not rebuild the time window', () => {
    const initialBars = makeBars();
    const { result, rerender } = renderViewportRuntime([]);

    rerender({ bars: initialBars, symbol: 'BTCUSDT' });
    const initialViewport = result.current.viewport;

    rerender({
      bars: [initialBars[0]!, { ...initialBars[1]!, high: 84_000, close: 83_000 }],
      symbol: 'BTCUSDT',
    });

    expect(result.current.viewport.startTime).toBe(initialViewport.startTime);
    expect(result.current.viewport.endTime).toBe(initialViewport.endTime);
    expect(result.current.viewport.priceMax).toBeGreaterThan(initialViewport.priceMax);
  });

  it('re-frames a restored price range against the bars it lands on', () => {
    const { result } = renderViewportRuntime(makeBars());

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: true, fitPriceToBars: true });
    });

    expect(result.current.viewport.startTime).toBe(RESTORED_VIEWPORT.startTime);
    expect(result.current.viewport.priceMax).toBeGreaterThan(72_000);
    expect(result.current.viewport.priceMin).toBeGreaterThan(60_000);
  });

  it('re-frames once the first bars arrive when the layout restored before them', () => {
    const { result, rerender } = renderViewportRuntime([]);

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: true, fitPriceToBars: true });
    });
    // Nothing to measure yet, so the saved range stands for now.
    expect(result.current.viewport.priceMax).toBe(54_000);

    rerender({ bars: makeBars(), symbol: 'BTCUSDT' });

    expect(result.current.viewport.priceMax).toBeGreaterThan(72_000);
    expect(result.current.viewport.startTime).toBe(RESTORED_VIEWPORT.startTime);
  });

  it('leaves the restored range alone when the layout had auto-scale off', () => {
    const { result } = renderViewportRuntime(makeBars());

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: false, fitPriceToBars: true });
    });

    expect(result.current.viewport).toEqual(RESTORED_VIEWPORT);
  });
  it('drops a restore still waiting on bars when the market changes under it', () => {
    const { result, rerender } = renderViewportRuntime([]);

    act(() => {
      result.current.applyNativeViewport(RESTORED_VIEWPORT, { autoScaleEnabled: true, fitPriceToBars: true });
    });
    rerender({ bars: [], symbol: 'ETHUSDT' });
    rerender({ bars: makeBars(), symbol: 'ETHUSDT' });

    // The new market frames itself; it must not inherit the old layout's window.
    expect(result.current.viewport.startTime).not.toBe(RESTORED_VIEWPORT.startTime);
  });
});
