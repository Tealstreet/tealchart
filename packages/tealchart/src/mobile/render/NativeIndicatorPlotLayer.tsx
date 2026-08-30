import type { SkPath } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { PlotLineStyle, PlotOutput, PlotStyle } from '@tealstreet/tealscript';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { memo, useMemo } from 'react';

import { DashPathEffect, Group, Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { sharedTimeToNativeX } from './nativeSharedViewport';

export interface NativeIndicatorPlotPoint {
  interval: number;
  time: number;
  value: number | null;
}

export interface NativeIndicatorPaneInfo {
  overlay: boolean;
  paneId?: string;
}

function isNativeIndicatorPlotVisible(plot: Pick<PlotOutput, 'display'>): boolean {
  return plot.display !== 0;
}

function shouldRenderNativeIndicatorPlotBar(
  plot: Pick<PlotOutput, 'showLast'>,
  totalBarCount: number,
  sourceIndex: number,
): boolean {
  if (plot.showLast === undefined) return true;
  if (plot.showLast <= 0) return false;
  return sourceIndex >= Math.max(0, totalBarCount - plot.showLast);
}

function nativePlotStyleBreaksOnNa(style: PlotStyle): boolean {
  'worklet';
  return style === 'linebr' || style === 'areabr' || style === 'steplinebr';
}

function nativePlotStyleUsesStepLine(style: PlotStyle): boolean {
  'worklet';
  return style === 'stepline' || style === 'steplinebr' || style === 'stepline_diamond';
}

function nativeIndicatorLineDash(lineStyle: PlotLineStyle | undefined): number[] | null {
  if (lineStyle === 'dashed') return [6, 4];
  if (lineStyle === 'dotted') return [2, 3];
  return null;
}

function getNativeIndicatorColor(color: PlotOutput['color']): string {
  if (Array.isArray(color)) return color.find((value): value is string => Boolean(value)) ?? '#2196F3';
  return color || '#2196F3';
}

function nativePaneValueToY(value: number, pane: NativePaneFrame): number {
  'worklet';
  const range = pane.yMax - pane.yMin;
  if (range === 0) return pane.top + pane.height / 2;
  return pane.top + ((pane.yMax - value) / range) * pane.height;
}

function nativeIndicatorPlotPane(
  frame: NativeChartFrame,
  plot: PlotOutput,
  indicatorPaneInfo: NativeIndicatorPaneInfo | undefined,
): NativePaneFrame {
  if (plot.forceOverlay || indicatorPaneInfo?.overlay !== false) return frame.mainPane;
  return (
    frame.panes.find((pane) => pane.type === 'indicator' && pane.id === indicatorPaneInfo.paneId) ?? frame.mainPane
  );
}

function nativeIndicatorYToPathValue({
  frame,
  pane,
  projection,
  value,
}: {
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  projection?: NativeChartProjection | null;
  value: number;
}): number {
  'worklet';
  if (pane.id === frame.mainPane.id && projection) return projection.priceToY(value);
  return nativePaneValueToY(value, pane);
}

function nativeSharedIndicatorYToPathValue({
  frame,
  pane,
  paneRangeOverrides,
  sharedViewport,
  value,
}: {
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  sharedViewport: NativeViewportSharedValues;
  value: number;
}): number {
  'worklet';
  if (pane.id !== frame.mainPane.id) {
    // Inlined rather than shared with the axis layer: a worklet reaching across
    // modules for this resolved to undefined on the UI runtime at run time.
    const override = paneRangeOverrides ? paneRangeOverrides[pane.id] : undefined;
    const yMin = override ? override.yMin : pane.yMin;
    const yMax = override ? override.yMax : pane.yMax;
    const span = yMax - yMin;
    if (span === 0) return pane.top + pane.height / 2;
    return pane.top + ((yMax - value) / span) * pane.height;
  }
  const range = sharedViewport.priceMax.value - sharedViewport.priceMin.value;
  if (range === 0) return frame.mainPane.top + frame.mainPane.height / 2;
  return frame.mainPane.top + ((sharedViewport.priceMax.value - value) / range) * frame.mainPane.height;
}

function nativeIndicatorPointX({
  frame,
  point,
  projection,
  sharedViewport,
}: {
  frame: NativeChartFrame;
  point: NativeIndicatorPlotPoint;
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
}): number {
  'worklet';
  return projection ? projection.timeToX(point.time) : sharedTimeToNativeX(point.time, sharedViewport!, frame);
}

function getNativeIndicatorLinePath({
  frame,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
  style,
}: {
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorPlotPoint[];
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
  style: PlotStyle;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;

  const breaksOnNa = nativePlotStyleBreaksOnNa(style);
  const isStepLine = nativePlotStyleUsesStepLine(style);
  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;
  let isDrawing = false;
  let lastY = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) continue;

    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
      if (breaksOnNa) isDrawing = false;
      continue;
    }

    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport: sharedViewport!, value: point.value });

    if (!isDrawing) {
      path.moveTo(x, y);
      isDrawing = true;
    } else if (isStepLine) {
      path.lineTo(x, lastY);
      path.lineTo(x, y);
    } else {
      path.lineTo(x, y);
    }

    lastY = y;
  }

  return path;
}

function getNativeIndicatorHistogramPath({
  frame,
  histbase,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
}: {
  frame: NativeChartFrame;
  histbase: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorPlotPoint[];
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;

  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;
  const timeRange = endTime - startTime;
  const baselineY = projection
    ? nativeIndicatorYToPathValue({ frame, pane, projection, value: histbase })
    : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport: sharedViewport!, value: histbase });

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) continue;
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) continue;

    const slotWidth = timeRange > 0 ? (point.interval * frame.contentWidth) / timeRange : 0;
    const barWidth = Math.max(1, slotWidth * 0.6);
    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport: sharedViewport!, value: point.value });
    const barTop = Math.min(y, baselineY);
    const barHeight = Math.max(1, Math.abs(y - baselineY));
    path.addRect(Skia.XYWHRect(x - barWidth / 2, barTop, barWidth, barHeight));
  }

  return path;
}

export function getNativeIndicatorPlotPoints({
  plot,
  totalBarCount,
  visibleBars,
}: {
  plot: PlotOutput;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}): NativeIndicatorPlotPoint[] {
  const offset = plot.offset ?? 0;
  const points: NativeIndicatorPlotPoint[] = [];

  for (const bar of visibleBars) {
    if (!shouldRenderNativeIndicatorPlotBar(plot, totalBarCount, bar.sourceIndex)) continue;
    const value = plot.values[bar.sourceIndex];
    points.push({
      interval: bar.interval,
      time: bar.time + offset * bar.interval,
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
    });
  }

  return points;
}

function NativeLiveIndicatorPlotPath({
  clip,
  color,
  frame,
  histbase,
  isHistogram,
  opacity,
  pane,
  paneRangeOverrides,
  points,
  sharedViewport,
  strokeWidth,
  style,
  dash,
}: {
  clip: SharedValue<NativePrimitiveClip>;
  color: string;
  frame: NativeChartFrame;
  histbase: number;
  isHistogram: boolean;
  opacity: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  points: readonly NativeIndicatorPlotPoint[];
  sharedViewport: NativeViewportSharedValues;
  strokeWidth: number;
  style: PlotStyle;
  dash: number[] | null;
}) {
  const path = useDerivedValue(() => {
    const overrides = paneRangeOverrides?.value;
    return isHistogram
      ? getNativeIndicatorHistogramPath({ frame, histbase, pane, paneRangeOverrides: overrides, points, sharedViewport })
      : getNativeIndicatorLinePath({ frame, pane, paneRangeOverrides: overrides, points, sharedViewport, style });
  });

  if (isHistogram) {
    return (
      <Group clip={clip} opacity={opacity}>
        <SkiaPath path={path} color={color} opacity={0.75} />
      </Group>
    );
  }

  return (
    <Group clip={clip} opacity={opacity}>
      <SkiaPath path={path} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dash && <DashPathEffect intervals={dash} />}
      </SkiaPath>
    </Group>
  );
}

function NativeProjectedIndicatorPlotPath({
  clip,
  color,
  frame,
  histbase,
  isHistogram,
  opacity,
  pane,
  projection,
  strokeWidth,
  style,
  dash,
  points,
}: {
  clip: { height: number; width: number; x: number; y: number };
  color: string;
  frame: NativeChartFrame;
  histbase: number;
  isHistogram: boolean;
  opacity: number;
  pane: NativePaneFrame;
  projection: NativeChartProjection;
  strokeWidth: number;
  style: PlotStyle;
  dash: number[] | null;
  points: readonly NativeIndicatorPlotPoint[];
}) {
  const path = useMemo(
    () =>
      isHistogram
        ? getNativeIndicatorHistogramPath({ frame, histbase, pane, points, projection })
        : getNativeIndicatorLinePath({ frame, pane, points, projection, style }),
    [frame, histbase, isHistogram, pane, points, projection, style],
  );

  if (isHistogram) {
    return (
      <Group clip={clip} opacity={opacity}>
        <SkiaPath path={path} color={color} opacity={0.75} />
      </Group>
    );
  }

  return (
    <Group clip={clip} opacity={opacity}>
      <SkiaPath path={path} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dash && <DashPathEffect intervals={dash} />}
      </SkiaPath>
    </Group>
  );
}

function NativeIndicatorPlotPath({
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  totalBarCount,
  visibleBars,
}: {
  frame: NativeChartFrame;
  indicatorPaneInfo?: NativeIndicatorPaneInfo;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const pane = nativeIndicatorPlotPane(frame, plot, indicatorPaneInfo);
  const color = getNativeIndicatorColor(plot.color);
  const strokeWidth = plot.linewidth ?? 1;
  const style = plot.style ?? 'line';
  const dash = nativeIndicatorLineDash(plot.lineStyle);
  const isHistogram = style === 'histogram' || style === 'columns';
  const histbase = Number.isFinite(plot.histbase) ? plot.histbase! : 0;
  const opacity = isNativeIndicatorPlotVisible(plot) ? 1 : 0;
  const points = useMemo(
    () => getNativeIndicatorPlotPoints({ plot, totalBarCount, visibleBars }),
    [plot, totalBarCount, visibleBars],
  );
  // The clip travels the channel its own path travels, or it arrives a
  // propagation apart from the thing it clips and shears the pane for a frame.
  // The projected branch builds its path in a useMemo, so it keeps a plain rect.
  const staticClip = { x: frame.contentLeft, y: pane.top, width: frame.contentWidth, height: pane.height };
  const clip = useDerivedValue<NativePrimitiveClip>(() => ({
    x: frame.contentLeft,
    y: pane.top,
    width: frame.contentWidth,
    height: pane.height,
  }));

  if (projection) {
    return (
      <NativeProjectedIndicatorPlotPath
        clip={staticClip}
        color={color}
        frame={frame}
        histbase={histbase}
        isHistogram={isHistogram}
        opacity={opacity}
        pane={pane}
        projection={projection}
        strokeWidth={strokeWidth}
        style={style}
        dash={dash}
        points={points}
      />
    );
  }

  return (
    <NativeLiveIndicatorPlotPath
      clip={clip}
      color={color}
      frame={frame}
      histbase={histbase}
      isHistogram={isHistogram}
      opacity={opacity}
      pane={pane}
      paneRangeOverrides={paneRangeOverrides}
      sharedViewport={sharedViewport}
      strokeWidth={strokeWidth}
      style={style}
      dash={dash}
      points={points}
    />
  );
}

export function NativeIndicatorPlotLayerImpl({
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plots,
  sharedViewport,
  staticProjection,
  totalBarCount,
  visibleBars,
}: {
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plots: readonly PlotOutput[];
  sharedViewport: NativeViewportSharedValues;
  staticProjection?: NativeChartProjection | null;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}) {
  if (plots.length === 0 || visibleBars.length === 0) return null;
  const renderablePlots = plots.filter((plot) => plot.type === 'plot');
  if (renderablePlots.length === 0) return null;

  return (
    <Group>
      {renderablePlots.map((plot) => (
        <NativeIndicatorPlotPath
          key={`${plot.scriptId ?? 'unknown'}-${plot.id}`}
          frame={frame}
          indicatorPaneInfo={plot.scriptId ? indicatorPaneInfo[plot.scriptId] : undefined}
          paneRangeOverrides={paneRangeOverrides}
          plot={plot}
          projection={staticProjection}
          sharedViewport={sharedViewport}
          totalBarCount={totalBarCount}
          visibleBars={visibleBars}
        />
      ))}
    </Group>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeIndicatorPlotLayer = memo(NativeIndicatorPlotLayerImpl);
NativeIndicatorPlotLayer.displayName = 'NativeIndicatorPlotLayer';
