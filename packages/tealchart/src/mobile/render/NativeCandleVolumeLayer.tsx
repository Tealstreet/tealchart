import type { SkPath } from '@shopify/react-native-skia';
import type { RenderOptions } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { memo } from 'react';

import { Group, Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { createNativeOhlcvPrimitiveClip } from './nativePrimitiveClip';
import { sharedPriceToNativeY, sharedTimeToNativeX } from './nativeSharedViewport';
import { getNativeCandleWidth, getNativeViewportMaxVolume, getNativeVisibleCandleGeometry } from './nativeVisibleBars';

interface NativeLiveCandleGeometry {
  bodyHeight: number;
  bodyVisible: boolean;
  bodyWidth: number;
  bodyX: number;
  bodyY: number;
  visible: boolean;
  wickBottomY: number;
  wickTopY: number;
  x: number;
}

interface NativeLiveVolumeGeometry {
  bodyHeight: number;
  bodyWidth: number;
  bodyX: number;
  bodyY: number;
  opacity: number;
}

type NativeOhlcvPathSide = 'up' | 'down';

function appendNativeRectPath(path: SkPath, x: number, y: number, width: number, height: number): void {
  'worklet';
  if (width <= 0 || height <= 0) return;
  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height);
  path.lineTo(x, y + height);
  path.close();
}

function appendNativeCandlePath(path: SkPath, geometry: NativeLiveCandleGeometry): void {
  'worklet';
  if (!geometry.visible) return;

  appendNativeRectPath(
    path,
    geometry.x - 0.5,
    geometry.wickTopY,
    1,
    Math.max(1, geometry.wickBottomY - geometry.wickTopY),
  );
  if (geometry.bodyVisible) {
    appendNativeRectPath(path, geometry.bodyX, geometry.bodyY, geometry.bodyWidth, geometry.bodyHeight);
  }
}

function isNativeBarOnPathSide(bar: NativeVisibleBar, side: NativeOhlcvPathSide): boolean {
  'worklet';
  return side === 'up' ? bar.close >= bar.open : bar.close < bar.open;
}

function isNativeOhlcvHorizontallyVisible({
  bodyWidth,
  frame,
  x,
}: {
  bodyWidth: number;
  frame: NativeChartFrame;
  x: number;
}): boolean {
  'worklet';
  return x + bodyWidth / 2 >= frame.contentLeft && x - bodyWidth / 2 <= frame.priceAxisRight;
}

export function getNativeLiveCandleGeometry({
  bar,
  frame,
  sharedViewport,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  sharedViewport: NativeViewportSharedValues;
}): NativeLiveCandleGeometry {
  'worklet';
  const x = sharedTimeToNativeX(bar.time, sharedViewport, frame);
  const bodyWidth = getNativeCandleWidth(
    bar.interval,
    sharedViewport.endTime.value - sharedViewport.startTime.value,
    frame.contentWidth,
  );
  const candleGeometry = getNativeVisibleCandleGeometry({
    clipBottom: frame.timeAxisBottom,
    clipTop: frame.mainPane.top,
    frame,
    openY: sharedPriceToNativeY(bar.open, sharedViewport, frame),
    closeY: sharedPriceToNativeY(bar.close, sharedViewport, frame),
    highY: sharedPriceToNativeY(bar.high, sharedViewport, frame),
    lowY: sharedPriceToNativeY(bar.low, sharedViewport, frame),
  });

  return {
    bodyHeight: candleGeometry.bodyHeight,
    bodyVisible: candleGeometry.bodyVisible,
    bodyWidth,
    bodyX: x - bodyWidth / 2,
    bodyY: candleGeometry.bodyY,
    visible: candleGeometry.visible,
    wickBottomY: candleGeometry.wickBottomY,
    wickTopY: candleGeometry.wickTopY,
    x,
  };
}

export function getNativeLiveVolumeGeometry({
  bar,
  frame,
  maxVolume,
  sharedViewport,
  volumeHeight,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  maxVolume: number;
  sharedViewport: NativeViewportSharedValues;
  volumeHeight: number;
}): NativeLiveVolumeGeometry {
  'worklet';
  const x = sharedTimeToNativeX(bar.time, sharedViewport, frame);
  const bodyWidth = getNativeCandleWidth(
    bar.interval,
    sharedViewport.endTime.value - sharedViewport.startTime.value,
    frame.contentWidth,
  );
  const barVolumeHeight = volumeHeight * ((bar.volume || 0) / Math.max(1, maxVolume));
  return {
    bodyHeight: barVolumeHeight,
    bodyWidth,
    bodyX: x - bodyWidth / 2,
    bodyY: frame.mainPane.bottom - barVolumeHeight,
    opacity: isNativeOhlcvHorizontallyVisible({ bodyWidth, frame, x }) ? 0.55 : 0,
  };
}

export function getNativeProjectedCandleGeometry({
  bar,
  frame,
  projection,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  projection: NativeChartProjection;
}): NativeLiveCandleGeometry {
  const x = projection.timeToX(bar.time);
  const bodyWidth = getNativeCandleWidth(
    bar.interval,
    projection.viewport.endTime - projection.viewport.startTime,
    frame.contentWidth,
  );
  const candleGeometry = getNativeVisibleCandleGeometry({
    clipBottom: frame.timeAxisBottom,
    clipTop: frame.mainPane.top,
    frame,
    openY: projection.priceToY(bar.open),
    closeY: projection.priceToY(bar.close),
    highY: projection.priceToY(bar.high),
    lowY: projection.priceToY(bar.low),
  });

  return {
    bodyHeight: candleGeometry.bodyHeight,
    bodyVisible: candleGeometry.bodyVisible,
    bodyWidth,
    bodyX: x - bodyWidth / 2,
    bodyY: candleGeometry.bodyY,
    visible: candleGeometry.visible,
    wickBottomY: candleGeometry.wickBottomY,
    wickTopY: candleGeometry.wickTopY,
    x,
  };
}

export function getNativeProjectedVolumeGeometry({
  bar,
  frame,
  maxVolume,
  projection,
  volumeHeight,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  maxVolume: number;
  projection: NativeChartProjection;
  volumeHeight: number;
}): NativeLiveVolumeGeometry {
  const x = projection.timeToX(bar.time);
  const bodyWidth = getNativeCandleWidth(
    bar.interval,
    projection.viewport.endTime - projection.viewport.startTime,
    frame.contentWidth,
  );
  const barVolumeHeight = volumeHeight * ((bar.volume || 0) / Math.max(1, maxVolume));
  return {
    bodyHeight: barVolumeHeight,
    bodyWidth,
    bodyX: x - bodyWidth / 2,
    bodyY: frame.mainPane.bottom - barVolumeHeight,
    opacity: isNativeOhlcvHorizontallyVisible({ bodyWidth, frame, x }) ? 0.55 : 0,
  };
}

/**
 * One path for every candle of a side, not one path per candle.
 *
 * Each SkPath is a native object that registers with Skia's runtime lifecycle
 * monitor and is torn down by Hermes' GC later, so a path per candle put a few
 * hundred allocations through that registry every animated frame. Batching by
 * side keeps the drawn result identical - the colour was already only ever a
 * function of `close >= open` - while making the per-frame cost independent of
 * how many bars are on screen.
 */
export function getNativeLiveCandlesPath({
  bars,
  frame,
  sharedViewport,
  side,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  sharedViewport: NativeViewportSharedValues;
  side: NativeOhlcvPathSide;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (!isNativeBarOnPathSide(bar, side)) continue;
    appendNativeCandlePath(path, getNativeLiveCandleGeometry({ bar, frame, sharedViewport }));
  }

  return path;
}

export function getNativeProjectedCandlesPath({
  bars,
  frame,
  projection,
  side,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  projection: NativeChartProjection;
  side: NativeOhlcvPathSide;
}): SkPath {
  const path = Skia.Path.Make();

  for (const bar of bars) {
    if (!isNativeBarOnPathSide(bar, side)) continue;
    appendNativeCandlePath(path, getNativeProjectedCandleGeometry({ bar, frame, projection }));
  }

  return path;
}

export function getNativeLiveVolumePath({
  bars,
  frame,
  sharedViewport,
  side,
  volumeHeight,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  sharedViewport: NativeViewportSharedValues;
  side: NativeOhlcvPathSide;
  volumeHeight: number;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  const startTime = sharedViewport.startTime.value;
  const endTime = sharedViewport.endTime.value;
  const maxVolume = getNativeViewportMaxVolume(bars, startTime, endTime);

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (!isNativeBarOnPathSide(bar, side)) continue;

    const geometry = getNativeLiveVolumeGeometry({
      bar,
      frame,
      maxVolume,
      sharedViewport,
      volumeHeight,
    });

    if (geometry.opacity <= 0 || geometry.bodyWidth <= 0 || geometry.bodyHeight <= 0) continue;
    appendNativeRectPath(path, geometry.bodyX, geometry.bodyY, geometry.bodyWidth, geometry.bodyHeight);
  }

  return path;
}

export function getNativeProjectedVolumePath({
  bars,
  frame,
  projection,
  side,
  volumeHeight,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  projection: NativeChartProjection;
  side: NativeOhlcvPathSide;
  volumeHeight: number;
}): SkPath {
  const path = Skia.Path.Make();
  const maxVolume = getNativeViewportMaxVolume(bars, projection.viewport.startTime, projection.viewport.endTime);

  for (const bar of bars) {
    if (!isNativeBarOnPathSide(bar, side)) continue;

    const geometry = getNativeProjectedVolumeGeometry({ bar, frame, maxVolume, projection, volumeHeight });
    if (geometry.opacity <= 0 || geometry.bodyWidth <= 0 || geometry.bodyHeight <= 0) continue;
    appendNativeRectPath(path, geometry.bodyX, geometry.bodyY, geometry.bodyWidth, geometry.bodyHeight);
  }

  return path;
}

function NativeLiveCandlePath({
  bars,
  frame,
  options,
  sharedViewport,
  side,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  options: RenderOptions;
  sharedViewport: NativeViewportSharedValues;
  side: NativeOhlcvPathSide;
}) {
  const candleColor = side === 'up' ? options.upColor : options.downColor;
  const path = useDerivedValue(() =>
    getNativeLiveCandlesPath({
      bars,
      frame,
      sharedViewport,
      side,
    }),
  );

  return <SkiaPath path={path} color={candleColor} />;
}

function NativeProjectedCandlePath({
  bars,
  frame,
  options,
  projection,
  side,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  options: RenderOptions;
  projection: NativeChartProjection;
  side: NativeOhlcvPathSide;
}) {
  const candleColor = side === 'up' ? options.upColor : options.downColor;
  const path = getNativeProjectedCandlesPath({ bars, frame, projection, side });

  return <SkiaPath path={path} color={candleColor} />;
}

function NativeLiveVolumePath({
  bars,
  frame,
  options,
  sharedViewport,
  side,
  volumeHeight,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  options: RenderOptions;
  sharedViewport: NativeViewportSharedValues;
  side: NativeOhlcvPathSide;
  volumeHeight: number;
}) {
  const candleColor = side === 'up' ? options.upColor : options.downColor;
  const path = useDerivedValue(() =>
    getNativeLiveVolumePath({
      bars,
      frame,
      sharedViewport,
      side,
      volumeHeight,
    }),
  );

  return <SkiaPath path={path} color={candleColor} opacity={0.55} />;
}

function NativeProjectedVolumePath({
  bars,
  frame,
  options,
  projection,
  side,
  volumeHeight,
}: {
  bars: readonly NativeVisibleBar[];
  frame: NativeChartFrame;
  options: RenderOptions;
  projection: NativeChartProjection;
  side: NativeOhlcvPathSide;
  volumeHeight: number;
}) {
  const candleColor = side === 'up' ? options.upColor : options.downColor;
  const path = getNativeProjectedVolumePath({ bars, frame, projection, side, volumeHeight });

  return <SkiaPath path={path} color={candleColor} opacity={0.55} />;
}

export function NativeCandleVolumeLayerImpl({
  frame,
  options,
  sharedViewport,
  staticProjection,
  visibleBars,
  volumeHeight,
}: {
  frame: NativeChartFrame;
  options: RenderOptions;
  sharedViewport: NativeViewportSharedValues;
  staticProjection?: NativeChartProjection | null;
  visibleBars: readonly NativeVisibleBar[];
  volumeHeight: number;
}) {
  // Same rule as the plot layer: the clip rides the channel its paths ride, so
  // a pane whose height changes never paints clipped one way and drawn another.
  // The projected branch builds its paths inline per render, so it stays plain.
  const staticClip = createNativeOhlcvPrimitiveClip(frame);
  const liveClip = useDerivedValue(() => createNativeOhlcvPrimitiveClip(frame));

  if (staticProjection) {
    return (
      <Group clip={staticClip}>
        <NativeProjectedCandlePath
          bars={visibleBars}
          frame={frame}
          options={options}
          projection={staticProjection}
          side="up"
        />
        <NativeProjectedCandlePath
          bars={visibleBars}
          frame={frame}
          options={options}
          projection={staticProjection}
          side="down"
        />
        {volumeHeight > 0 && (
          <>
            <NativeProjectedVolumePath
              bars={visibleBars}
              frame={frame}
              options={options}
              projection={staticProjection}
              side="up"
              volumeHeight={volumeHeight}
            />
            <NativeProjectedVolumePath
              bars={visibleBars}
              frame={frame}
              options={options}
              projection={staticProjection}
              side="down"
              volumeHeight={volumeHeight}
            />
          </>
        )}
      </Group>
    );
  }

  return (
    <Group clip={liveClip}>
      <NativeLiveCandlePath
        bars={visibleBars}
        frame={frame}
        options={options}
        sharedViewport={sharedViewport}
        side="up"
      />
      <NativeLiveCandlePath
        bars={visibleBars}
        frame={frame}
        options={options}
        sharedViewport={sharedViewport}
        side="down"
      />
      {volumeHeight > 0 && (
        <>
          <NativeLiveVolumePath
            bars={visibleBars}
            frame={frame}
            options={options}
            sharedViewport={sharedViewport}
            side="up"
            volumeHeight={volumeHeight}
          />
          <NativeLiveVolumePath
            bars={visibleBars}
            frame={frame}
            options={options}
            sharedViewport={sharedViewport}
            side="down"
            volumeHeight={volumeHeight}
          />
        </>
      )}
    </Group>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeCandleVolumeLayer = memo(NativeCandleVolumeLayerImpl);
NativeCandleVolumeLayer.displayName = 'NativeCandleVolumeLayer';
