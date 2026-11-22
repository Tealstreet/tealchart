import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { isNativeViewportAtLiveEdge } from './nativeLiveEdgeResume';
import { useNativeViewportRuntime } from './useNativeViewportRuntime';

vi.mock('react-native-worklets', () => ({
  runOnJS: (callback: (...args: unknown[]) => unknown) => callback,
  runOnUI: (callback: (...args: unknown[]) => unknown) => callback,
}));

vi.mock('../render/nativeProjection', () => ({
  createNativeChartProjection: ({ viewport }: { viewport: Viewport }) => ({
    viewport,
    timePerPixel: 1,
    getPricePerPixel: () => 1,
  }),
}));

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = Date.UTC(2026, 10, 21, 16, 40);

/** `count` 1m bars ending at `end`, rising from `from` to `to`. */
function makeBars(count: number, end: number, from: number, to: number): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const price = from + ((to - from) * index) / (count - 1);
    return {
      time: end - (count - 1 - index) * MINUTE,
      open: price,
      high: price + 50,
      low: price - 50,
      close: price,
      volume: 10,
    };
  });
}

function shared<T>(value: T) {
  return { value } as { value: T };
}

function renderRuntime(initialBars: Bar[]) {
  const onRequestMoreBars = vi.fn();
  const rendered = renderHook(
    (props: { bars: Bar[] }) =>
      useNativeViewportRuntime({
        autoScaleEnabled: true,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame: { contentWidth: 300, dimensions: { width: 360, height: 400 } },
        interval: '1',
        isLoading: false,
        loadedBarsInterval: '1',
        onViewportChange: vi.fn(),
        onRequestMoreBars,
        panActive: shared(false),
        panMetrics: {
          intervalMs: shared(MINUTE),
          contentWidth: shared(300),
          timePerPixel: shared(1),
          pricePerPixel: shared(1),
        },
        panStartViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        pinchActive: shared(false),
        priceAutoScale: { active: shared(true), bars: shared([]) },
        priceScaleActive: shared(false),
        sharedViewport: { startTime: shared(0), endTime: shared(1), priceMin: shared(0), priceMax: shared(1) },
        symbol: 'BTC-PERP',
        timeScaleActive: shared(false),
        viewportSyncEpoch: shared(0),
      } as unknown as NativeViewportRuntimeInput),
    { initialProps: { bars: initialBars } },
  );
  return { ...rendered, onRequestMoreBars };
}

function expectLiveEdgeFit(viewport: Viewport, bars: Bar[]) {
  const latest = bars[bars.length - 1]!;
  expect(viewport.startTime).toBeLessThanOrEqual(latest.time);
  expect(viewport.endTime).toBeGreaterThanOrEqual(latest.time);
  const visible = bars.filter((bar) => bar.time >= viewport.startTime && bar.time <= viewport.endTime);
  expect(visible.length).toBeGreaterThan(1);
  const low = Math.min(...visible.map((bar) => bar.low));
  const high = Math.max(...visible.map((bar) => bar.high));
  // Fitted to the candles in view, not the price range the layout was saved with.
  expect(viewport.priceMin).toBeGreaterThan(low - (high - low));
  expect(viewport.priceMax).toBeLessThan(high + (high - low));
  expect(viewport.priceMin).toBeLessThanOrEqual(low);
  expect(viewport.priceMax).toBeGreaterThanOrEqual(high);
}

// AGT-148: the layout stores its viewport as absolute times, so a layout saved while
// following the market reopened hours later on the window it had then (05:00-06:40Z at
// 55-56.5k while the live bar was 16:40Z at ~60.1k), owned as a manual view that never
// followed new bars.
describe('native layout restore of a view saved at the live edge (AGT-148)', () => {
  // The bars when the layout was saved, ten hours before the cold launch.
  const savedBars = makeBars(700, NOW - 10 * HOUR, 54_000, 56_000);
  const savedWindow: Viewport = {
    startTime: savedBars[600]!.time,
    endTime: savedBars[699]!.time + 15 * MINUTE,
    priceMin: 55_500,
    priceMax: 56_100,
  };
  // The bars at launch: the market moved on to ~60.1k.
  const liveBars = makeBars(1_300, NOW, 54_000, 60_100);

  it('was at the live edge when saved (fixture sanity)', () => {
    expect(isNativeViewportAtLiveEdge(savedWindow, savedBars)).toBe(true);
    expect(isNativeViewportAtLiveEdge(savedWindow, liveBars)).toBe(false);
  });

  it('reopens at the newest bar with the saved zoom and a fitted axis when bars are already loaded', () => {
    const { result } = renderRuntime(liveBars);
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        atLiveEdge: true,
        autoScaleEnabled: true,
        fitPriceToBars: true,
      });
    });

    expectLiveEdgeFit(result.current.viewport, liveBars);
    const span = result.current.viewport.endTime - result.current.viewport.startTime;
    expect(span).toBeCloseTo(savedWindow.endTime - savedWindow.startTime, 3);
  });

  it('reopens at the newest bar when the layout restores before the bars arrive', () => {
    const { result, rerender } = renderRuntime([]);
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        atLiveEdge: true,
        autoScaleEnabled: true,
        fitPriceToBars: true,
      });
    });
    act(() => rerender({ bars: liveBars }));

    expectLiveEdgeFit(result.current.viewport, liveBars);
    const span = result.current.viewport.endTime - result.current.viewport.startTime;
    expect(span).toBeCloseTo(savedWindow.endTime - savedWindow.startTime, 3);
  });

  it('stays auto-owned and follows the next bar', () => {
    const { result, rerender } = renderRuntime(liveBars);
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        atLiveEdge: true,
        autoScaleEnabled: true,
        fitPriceToBars: true,
      });
    });
    const before = result.current.viewport;

    const next = { ...liveBars[liveBars.length - 1]!, time: NOW + MINUTE, high: 61_000, low: 60_500, close: 60_900 };
    act(() => rerender({ bars: [...liveBars, next] }));

    expect(result.current.viewport.endTime).toBeCloseTo(before.endTime + MINUTE, 3);
    expect(result.current.viewport.priceMax).toBeGreaterThanOrEqual(61_000);
  });

  it('still restores a view saved scrolled into history at its absolute window', () => {
    const historyWindow: Viewport = {
      startTime: liveBars[200]!.time,
      endTime: liveBars[300]!.time,
      priceMin: 54_000,
      priceMax: 56_000,
    };
    const { result } = renderRuntime(liveBars);
    act(() => {
      result.current.applyNativeViewport(historyWindow, { autoScaleEnabled: true, fitPriceToBars: true });
    });

    expect(result.current.viewport.startTime).toBe(historyWindow.startTime);
    expect(result.current.viewport.endTime).toBe(historyWindow.endTime);
  });
});
