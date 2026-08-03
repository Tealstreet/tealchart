import type { SkPath } from '@shopify/react-native-skia';
import type { RenderOptions } from '../../types';
import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';
import type { NativeVisibleBar } from './nativeVisibleBars';

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

type NativeVolumePathSide = 'up' | 'down';

function appendNativeRectPath(path: SkPath, x: number, y: number, width: number, height: number): void {
  'worklet';
  if (width <= 0 || height <= 0) return;
  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height);
  path.lineTo(x, y + height);
  path.close();
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

function getNativeLiveCandlePath({
  bar,
  frame,
  sharedViewport,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  sharedViewport: NativeViewportSharedValues;
}): SkPath {
  'worklet';
  const geometry = getNativeLiveCandleGeometry({ bar, frame, sharedViewport });
  const path = Skia.Path.Make();
  if (!geometry.visible) return path;

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
  return path;
}

function getNativeProjectedCandlePath({
  bar,
  frame,
  projection,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  projection: NativeChartProjection;
}): SkPath {
  const geometry = getNativeProjectedCandleGeometry({ bar, frame, projection });
  const path = Skia.Path.Make();
  if (!geometry.visible) return path;

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
  return path;
}

function shouldNativeVolumePathRenderBar(bar: NativeVisibleBar, side: NativeVolumePathSide): boolean {
  'worklet';
  return side === 'up' ? bar.close >= bar.open : bar.close < bar.open;
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
  side: NativeVolumePathSide;
  volumeHeight: number;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  const startTime = sharedViewport.startTime.value;
  const endTime = sharedViewport.endTime.value;
  const maxVolume = getNativeViewportMaxVolume(bars, startTime, endTime);

  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (!shouldNativeVolumePathRenderBar(bar, side)) continue;

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
  side: NativeVolumePathSide;
  volumeHeight: number;
}): SkPath {
  const path = Skia.Path.Make();
  const maxVolume = getNativeViewportMaxVolume(bars, projection.viewport.startTime, projection.viewport.endTime);

  for (const bar of bars) {
    if (!shouldNativeVolumePathRenderBar(bar, side)) continue;

    const geometry = getNativeProjectedVolumeGeometry({ bar, frame, maxVolume, projection, volumeHeight });
    if (geometry.opacity <= 0 || geometry.bodyWidth <= 0 || geometry.bodyHeight <= 0) continue;
    appendNativeRectPath(path, geometry.bodyX, geometry.bodyY, geometry.bodyWidth, geometry.bodyHeight);
  }

  return path;
}

function NativeLiveCandle({
  bar,
  frame,
  options,
  sharedViewport,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  options: RenderOptions;
  sharedViewport: NativeViewportSharedValues;
}) {
  const candleColor = bar.close >= bar.open ? options.upColor : options.downColor;
  const path = useDerivedValue(() =>
    getNativeLiveCandlePath({
      bar,
      frame,
      sharedViewport,
    }),
  );

  return <SkiaPath path={path} color={candleColor} />;
}

function NativeProjectedCandle({
  bar,
  frame,
  options,
  projection,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  options: RenderOptions;
  projection: NativeChartProjection;
}) {
  const candleColor = bar.close >= bar.open ? options.upColor : options.downColor;
  const path = getNativeProjectedCandlePath({ bar, frame, projection });

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
  side: NativeVolumePathSide;
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
  side: NativeVolumePathSide;
  volumeHeight: number;
}) {
  const candleColor = side === 'up' ? options.upColor : options.downColor;
  const path = getNativeProjectedVolumePath({ bars, frame, projection, side, volumeHeight });

  return <SkiaPath path={path} color={candleColor} opacity={0.55} />;
}

export function NativeCandleVolumeLayer({
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
  const ohlcvPrimitiveClip = createNativeOhlcvPrimitiveClip(frame);

  if (staticProjection) {
    return (
      <Group clip={ohlcvPrimitiveClip}>
        {visibleBars.map((bar) => (
          <NativeProjectedCandle
            key={`candle-${bar.time}`}
            bar={bar}
            frame={frame}
            options={options}
            projection={staticProjection}
          />
        ))}
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
    <Group clip={ohlcvPrimitiveClip}>
      {visibleBars.map((bar) => (
        <NativeLiveCandle
          key={`candle-${bar.time}`}
          bar={bar}
          frame={frame}
          options={options}
          sharedViewport={sharedViewport}
        />
      ))}
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
