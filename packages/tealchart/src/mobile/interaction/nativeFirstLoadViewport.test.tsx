import type { Bar, Viewport } from '../../types';
import type { NativeViewportRuntimeInput } from './useNativeViewportRuntime';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

/** `count` bars of `intervalMs` ending at `end`, rising from `from` to `to`. */
function makeBars(count: number, end: number, from: number, to: number, intervalMs = MINUTE): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const price = from + ((to - from) * index) / (count - 1);
    return {
      time: end - (count - 1 - index) * intervalMs,
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

interface Props {
  bars: Bar[];
  interval: string;
}

function renderRuntime(initial: Props) {
  const rendered = renderHook(
    (props: Props) =>
      useNativeViewportRuntime({
        autoScaleEnabled: true,
        bars: props.bars,
        barsMatchRequestedData: props.bars.length > 0,
        frame: { contentWidth: 300, dimensions: { width: 360, height: 400 } },
        interval: props.interval,
        isLoading: false,
        loadedBarsInterval: props.interval,
        onViewportChange: vi.fn(),
        onRequestMoreBars: vi.fn(),
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
    { initialProps: initial },
  );
  return rendered;
}

/** The newest candle sits at the horizontal centre, and the axis fits the candles in view. */
function expectNewestCentred(viewport: Viewport, bars: Bar[]) {
  const latest = bars[bars.length - 1]!;
  expect((viewport.startTime + viewport.endTime) / 2).toBeCloseTo(latest.time, -1);
  const visible = bars.filter((bar) => bar.time >= viewport.startTime && bar.time <= viewport.endTime);
  expect(visible.length).toBeGreaterThan(1);
  const low = Math.min(...visible.map((bar) => bar.low));
  const high = Math.max(...visible.map((bar) => bar.high));
  expect(viewport.priceMin).toBeGreaterThan(low - (high - low));
  expect(viewport.priceMax).toBeLessThan(high + (high - low));
  expect(viewport.priceMin).toBeLessThanOrEqual(low);
  expect(viewport.priceMax).toBeGreaterThanOrEqual(high);
}

// AGT-104 (Sam, 2026-11-22) + AGT-148: a first load opens with the newest candle centred.
// The layout stores its viewport as absolute times, so a cold launch used to reopen hours
// later on the window it had then (05:00-06:40Z at 55-56.5k while the live bar was 16:40Z
// at ~60.1k), owned as a manual view that never followed new bars. A stale saved window
// never wins over the newest candle.
describe('native first load centres the newest candle (AGT-104, AGT-148)', () => {
  // The bars when the layout was saved, ten hours before the cold launch.
  const savedBars = makeBars(700, NOW - 10 * HOUR, 54_000, 56_000);
  const savedWindow: Viewport = {
    startTime: savedBars[600]!.time,
    endTime: savedBars[699]!.time + 15 * MINUTE,
    priceMin: 55_500,
    priceMax: 56_100,
  };
  const savedSpan = savedWindow.endTime - savedWindow.startTime;
  // The bars at launch: the market moved on to ~60.1k.
  const liveBars = makeBars(1_300, NOW, 54_000, 60_100);

  it('opens with the newest candle centred when there is no layout', () => {
    const { result, rerender } = renderRuntime({ bars: [], interval: '1' });
    act(() => rerender({ bars: liveBars, interval: '1' }));

    expectNewestCentred(result.current.viewport, liveBars);
  });

  it('centres the newest candle at the saved zoom instead of the stale saved window', () => {
    const { result } = renderRuntime({ bars: liveBars, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        autoScaleEnabled: true,
        centreNewestBar: { interval: '1' },
        fitPriceToBars: true,
      });
    });

    expectNewestCentred(result.current.viewport, liveBars);
    expect(result.current.viewport.endTime - result.current.viewport.startTime).toBeCloseTo(savedSpan, 3);
  });

  it('centres the newest candle when the layout restores before the bars arrive', () => {
    const { result, rerender } = renderRuntime({ bars: [], interval: '1' });
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        autoScaleEnabled: true,
        centreNewestBar: { interval: '1' },
        fitPriceToBars: true,
      });
    });
    act(() => rerender({ bars: liveBars, interval: '1' }));

    expectNewestCentred(result.current.viewport, liveBars);
    expect(result.current.viewport.endTime - result.current.viewport.startTime).toBeCloseTo(savedSpan, 3);
  });

  it("measures the saved zoom in bars at the layout's interval and keeps it across the switch to it", () => {
    // A 60m layout restoring onto a chart that opened on 1m: 100 hourly candles,
    // not 6,000 one-minute ones.
    const hourly = makeBars(720, NOW, 50_000, 60_100, HOUR);
    const hourlyWindow: Viewport = {
      startTime: NOW - 10 * 24 * HOUR - 100 * HOUR,
      endTime: NOW - 10 * 24 * HOUR,
      priceMin: 40_000,
      priceMax: 41_000,
    };
    const { result, rerender } = renderRuntime({ bars: liveBars, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(hourlyWindow, {
        autoScaleEnabled: true,
        centreNewestBar: { interval: '60' },
        fitPriceToBars: true,
      });
    });
    act(() => rerender({ bars: [], interval: '60' }));
    act(() => rerender({ bars: hourly, interval: '60' }));

    expectNewestCentred(result.current.viewport, hourly);
    expect(result.current.viewport.endTime - result.current.viewport.startTime).toBeCloseTo(100 * HOUR, 3);
  });

  it('stays auto-owned and follows the next bar', () => {
    const { result, rerender } = renderRuntime({ bars: liveBars, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        autoScaleEnabled: true,
        centreNewestBar: { interval: '1' },
        fitPriceToBars: true,
      });
    });
    const before = result.current.viewport;

    const next = { ...liveBars[liveBars.length - 1]!, time: NOW + MINUTE, high: 61_000, low: 60_500, close: 60_900 };
    act(() => rerender({ bars: [...liveBars, next], interval: '1' }));

    expect(result.current.viewport.endTime).toBeCloseTo(before.endTime + MINUTE, 3);
    expect(result.current.viewport.priceMax).toBeGreaterThanOrEqual(61_000);
  });

  it('lets a later explicit restore retire a centring still waiting on bars', () => {
    const historyWindow: Viewport = {
      startTime: liveBars[200]!.time,
      endTime: liveBars[300]!.time,
      priceMin: 54_000,
      priceMax: 56_000,
    };
    const { result, rerender } = renderRuntime({ bars: [], interval: '1' });
    act(() => {
      result.current.applyNativeViewport(savedWindow, {
        autoScaleEnabled: true,
        centreNewestBar: { interval: '1' },
        fitPriceToBars: true,
      });
      result.current.applyNativeViewport(historyWindow, { autoScaleEnabled: true, fitPriceToBars: true });
    });
    act(() => rerender({ bars: liveBars, interval: '1' }));

    expect(result.current.viewport.startTime).toBe(historyWindow.startTime);
    expect(result.current.viewport.endTime).toBe(historyWindow.endTime);
  });

  it('still restores a layout picked later at its absolute window', () => {
    const historyWindow: Viewport = {
      startTime: liveBars[200]!.time,
      endTime: liveBars[300]!.time,
      priceMin: 54_000,
      priceMax: 56_000,
    };
    const { result } = renderRuntime({ bars: liveBars, interval: '1' });
    act(() => {
      result.current.applyNativeViewport(historyWindow, { autoScaleEnabled: true, fitPriceToBars: true });
    });

    expect(result.current.viewport.startTime).toBe(historyWindow.startTime);
    expect(result.current.viewport.endTime).toBe(historyWindow.endTime);
  });
});
