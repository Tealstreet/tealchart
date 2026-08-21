// @vitest-environment node
// Reads sibling sources through import.meta.url, which jsdom rewrites away from
// a file: URL. No DOM is used here, so pin the file to node.
import type { Bar } from '../../types';

import { describe, expect, it } from 'vitest';

import { createNativeChartFrameFromPanes } from './nativeChartFrame';
import {
  getNativePriceGridSlot,
  getNativePriceGridSlotCount,
  getNativePriceGridSpacing,
  getNativeTimeGridSlot,
  getNativeTimeGridSlotCount,
  getNativeTimeGridStep,
} from './nativeGridSlots';
import { createNativeChartProjection } from './nativeProjection';
import {
  getNativeBarInterval,
  getNativeCandleWidth,
  getNativeViewportMaxVolume,
  getNativeVisibleBars,
  getNativeVisibleCandleGeometry,
} from './nativeVisibleBars';

const frame = createNativeChartFrameFromPanes({
  dimensions: {
    width: 140,
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

function bar(time: number): Bar {
  return {
    time,
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    volume: 100,
  };
}

describe('NativeChartPrimitiveLayer', () => {
  it('derives price and time grid slots from the live viewport contract', () => {
    expect(getNativePriceGridSpacing(63_000, 64_800, frame.mainPane.height)).toBe(500);
    expect(getNativePriceGridSlotCount(100)).toBe(6);
    expect(getNativePriceGridSlotCount(900)).toBe(39);
    expect(
      Array.from({ length: 6 }, (_, index) =>
        getNativePriceGridSlot({
          index,
          priceMin: 63_000,
          priceMax: 64_800,
          priceHeight: frame.mainPane.height,
        }),
      ),
    ).toEqual([
      { visible: true, price: 63_000, spacing: 500 },
      { visible: true, price: 63_500, spacing: 500 },
      { visible: true, price: 64_000, spacing: 500 },
      { visible: true, price: 64_500, spacing: 500 },
      { visible: false, price: 65_000, spacing: 500 },
      { visible: false, price: 65_500, spacing: 500 },
    ]);

    const sixteenHours = 16 * 60 * 60 * 1_000;
    expect(getNativeTimeGridSlotCount(100)).toBe(3);
    expect(getNativeTimeGridSlotCount(1400)).toBe(22);
    expect(getNativeTimeGridStep(sixteenHours, frame.contentWidth)).toBe(28_800_000);
    expect(
      Array.from({ length: 5 }, (_, index) =>
        getNativeTimeGridSlot({
          index,
          startTime: 0,
          endTime: sixteenHours,
          chartWidth: frame.contentWidth,
        }),
      ).map((slot) => ({ visible: slot.visible, time: slot.time, step: slot.step })),
    ).toEqual([
      { visible: true, time: 0, step: 28_800_000 },
      { visible: true, time: 28_800_000, step: 28_800_000 },
      { visible: true, time: 57_600_000, step: 28_800_000 },
      { visible: false, time: 86_400_000, step: 28_800_000 },
      { visible: false, time: 115_200_000, step: 28_800_000 },
    ]);
    expect(
      getNativeTimeGridSlot({
        index: 0,
        startTime: 14_400_000,
        endTime: 72_000_000,
        chartWidth: frame.contentWidth,
      }).showMonthLabel,
    ).toBe(true);
  });

  it('projects the candidate cache overscan window and clamps candle width', () => {
    const projection = createNativeChartProjection({
      frame,
      viewport: {
        startTime: 1_000,
        endTime: 3_000,
        priceMin: 0,
        priceMax: 100,
      },
    });

    const visible = getNativeVisibleBars(
      [bar(-2_000), bar(0), bar(1_000), bar(2_000), bar(3_000), bar(6_000)],
      projection,
    );

    expect(visible.map((candidate) => candidate.time)).toEqual([0, 1_000, 2_000, 3_000]);
    expect(visible.map((candidate) => candidate.sourceIndex)).toEqual([1, 2, 3, 4]);
    expect(visible.map((candidate) => candidate.x)).toEqual([-70, 0, 70, 140]);
    expect(new Set(visible.map((candidate) => candidate.interval))).toEqual(new Set([1_000]));
  });

  it('derives candle width from the live viewport range contract', () => {
    expect(getNativeCandleWidth(1_000, 2_000, 100)).toBe(10);
    expect(getNativeCandleWidth(1_000, 10_000, 100)).toBe(7);
    // Both fall back to the render floor: the first is clamped by it, the
    // second is the degenerate zero-range guard.
    expect(getNativeCandleWidth(1_000, 100_000, 100)).toBe(1);
    expect(getNativeCandleWidth(1_000, 0, 100)).toBe(1);
  });

  it('uses the minimum positive bar interval instead of a leading data gap', () => {
    expect(getNativeBarInterval([bar(0), bar(5_000), bar(6_000), bar(7_000)], 10_000)).toBe(1_000);
    expect(getNativeBarInterval([bar(0)], 10_000)).toBe(10_000);
  });

  it('derives volume normalization from the live viewport range', () => {
    const visibleBars = [
      { ...bar(0), volume: 500, interval: 1_000, sourceIndex: 0, x: 0 },
      { ...bar(1_000), volume: 100, interval: 1_000, sourceIndex: 1, x: 10 },
      { ...bar(2_000), volume: 800, interval: 1_000, sourceIndex: 2, x: 20 },
      { ...bar(3_000), volume: 200, interval: 1_000, sourceIndex: 3, x: 30 },
    ];

    expect(getNativeViewportMaxVolume(visibleBars, 0, 3_000)).toBe(800);
    expect(getNativeViewportMaxVolume(visibleBars, 0, 1_000)).toBe(500);
    expect(getNativeViewportMaxVolume(visibleBars, 2_600, 2_700)).toBe(200);
    expect(getNativeViewportMaxVolume(visibleBars, 4_000, 5_000)).toBe(1);
  });

  it('clips partially visible candles without collapsing fully offscreen candles to pane edges', () => {
    expect(
      getNativeVisibleCandleGeometry({
        frame,
        openY: -20,
        closeY: 30,
        highY: -60,
        lowY: 50,
      }),
    ).toEqual({
      visible: true,
      bodyVisible: true,
      bodyY: 0,
      bodyHeight: 30,
      wickTopY: 0,
      wickBottomY: 50,
    });

    expect(
      getNativeVisibleCandleGeometry({
        frame,
        openY: -30,
        closeY: -10,
        highY: -40,
        lowY: 50,
      }),
    ).toEqual({
      visible: true,
      bodyVisible: false,
      bodyY: 0,
      bodyHeight: 0,
      wickTopY: 0,
      wickBottomY: 50,
    });

    expect(
      getNativeVisibleCandleGeometry({
        frame,
        openY: -30,
        closeY: -10,
        highY: -40,
        lowY: -5,
      }),
    ).toEqual({
      visible: false,
      bodyVisible: false,
      bodyY: 0,
      bodyHeight: 0,
      wickTopY: 0,
      wickBottomY: 0,
    });

    expect(
      getNativeVisibleCandleGeometry({
        frame,
        openY: 110,
        closeY: 130,
        highY: 105,
        lowY: 150,
      }).visible,
    ).toBe(false);
  });

  it('keeps the default candle clip on the plot but allows callers to extend into axis lanes', () => {
    expect(
      getNativeVisibleCandleGeometry({
        frame,
        openY: 104,
        closeY: 112,
        highY: 102,
        lowY: 116,
      }).visible,
    ).toBe(false);

    expect(
      getNativeVisibleCandleGeometry({
        clipBottom: frame.timeAxisBottom,
        frame,
        openY: 104,
        closeY: 112,
        highY: 102,
        lowY: 116,
      }),
    ).toEqual({
      visible: true,
      bodyVisible: true,
      bodyY: 104,
      bodyHeight: 8,
      wickTopY: 102,
      wickBottomY: 116,
    });
  });

  it('renders candles and volume from live projection without viewport scale transforms', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./NativeCandleVolumeLayer.tsx', import.meta.url), 'utf8'),
    );

    expect(source).toContain('sharedTimeToNativeX');
    expect(source).toContain('sharedPriceToNativeY');
    expect(source).toContain('NativeLiveCandle');
    expect(source).toContain('NativeLiveVolumePath');
    expect(source).toContain('getNativeViewportMaxVolume');
    expect(source).toContain('getNativeVisibleCandleGeometry');
    expect(source).not.toContain('createNativeViewportLayerTransform');
    expect(source).not.toContain('createNativeViewportTimeTransform');
    expect(source).not.toContain('const candleTransform');
    expect(source).not.toContain('const volumeTransform');
    expect(source).not.toContain('NativeStaticCandle');
    expect(source).not.toContain('NativeStaticVolumeBar');
    expect(source).not.toContain('scaleX');
    expect(source).not.toContain('scaleY');
    expect(source).not.toContain('width={bar.width}');
    expect(source).not.toContain('maxVolume: SharedValue');
    expect(source).not.toContain('maxVolume = useDerivedValue');
  });

  it('renders time grid rows from live projection without viewport scale transforms', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./NativeTimeGridLayer.tsx', import.meta.url), 'utf8'),
    );

    expect(source).toContain('nativeTimeToXFromViewport');
    expect(source).toContain('NativeAnimatedTimeGrid');
    expect(source).toContain('NativeAnimatedSkiaText');
    expect(source).not.toContain('createNativeTimeGridTransform');
    expect(source).not.toContain('sharedTimeToNativeX');
    expect(source).not.toContain('const slot = useDerivedValue');
    expect(source).not.toContain('function NativeStaticTimeGrid');
    expect(source).not.toContain('scaleX');
    expect(source).not.toContain('transform={transform}');
  });

  it('renders price grid rows from one live viewport model per row', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./NativePriceGridLayer.tsx', import.meta.url), 'utf8'),
    );

    expect(source).toContain('nativePriceToYFromViewport');
    expect(source).toContain('resolveNativePriceGridSlotModel');
    expect(source).not.toContain('sharedPriceToNativeY');
    expect(source).not.toContain('const slot = useDerivedValue');
    expect(source).not.toContain('scaleY');
    expect(source).not.toContain('transform={transform}');
  });
});
