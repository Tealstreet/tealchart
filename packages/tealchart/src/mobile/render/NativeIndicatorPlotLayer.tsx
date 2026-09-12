import type { SkPath } from '@shopify/react-native-skia';
import type { PlotLineStyle, PlotOutput, PlotStyle } from '@tealstreet/tealscript';
import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame, NativePaneFrame } from './nativeChartFrame';
import type { NativePaneRangeOverrides } from './nativePaneRangeOverride';
import type { NativePrimitiveClip } from './nativePrimitiveClip';
import type { NativeChartProjection } from './nativeProjection';
import type { NativeViewportSharedValues } from './nativeSharedViewport';
import type { NativeVisibleBar } from './nativeVisibleBars';

import { memo, useMemo } from 'react';

import { DashPathEffect, Group, Rect, Skia, Path as SkiaPath } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { sharedTimeToNativeX } from './nativeSharedViewport';
import { NativeAnimatedSkiaText } from './nativeSkiaText';

export interface NativeIndicatorPlotPoint {
  interval: number;
  time: number;
  value: number | null;
}

interface NativeIndicatorColoredPlotPoint extends NativeIndicatorPlotPoint {
  color: string | null;
}

interface NativeIndicatorMarkerPoint {
  color: string | null;
  interval: number;
  markerText?: string;
  sourceIndex: number;
  textColor: string;
  time: number;
  value: number;
}

export interface NativeIndicatorPaneInfo {
  overlay: boolean;
  paneId?: string;
  format?: string;
  precision?: number;
  scale?: string;
}

export function isNativeIndicatorPlotVisible(plot: Pick<PlotOutput, 'display'>): boolean {
  return plot.display === undefined || (plot.display & 1) !== 0;
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

function nativePlotStyleUsesPointMarkers(style: PlotStyle): boolean {
  'worklet';
  return style === 'cross' || style === 'circles';
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

function getNativeIndicatorColorAt(color: PlotOutput['color'], index: number, fallback = '#2196F3'): string | null {
  'worklet';
  if (Array.isArray(color)) return color[index] ?? null;
  return color || fallback;
}

function getNativeIndicatorOptionalColorAt(
  color: string | (string | null)[] | undefined,
  index: number,
  fallback: string,
): string | null {
  'worklet';
  if (Array.isArray(color)) return color[index] ?? null;
  return color || fallback;
}

function getNativeIndicatorColorSet(color: string | (string | null)[] | undefined, fallback: string): string[] {
  if (Array.isArray(color)) {
    const colors = new Set<string>();
    for (const value of color) {
      if (value) colors.add(value);
    }
    return colors.size > 0 ? Array.from(colors) : [fallback];
  }
  return [color || fallback];
}

function nativeIndicatorMarkerSize(size: PlotOutput['size']): number {
  'worklet';
  if (size === 'tiny') return 4;
  if (size === 'normal') return 8;
  if (size === 'large') return 12;
  if (size === 'huge') return 16;
  if (size === 'auto') return 8;
  return 6;
}

function nativeIndicatorAreaFillColor(color: string): string {
  'worklet';
  if (color.length === 9 && color.startsWith('#')) return color;
  if (color.length === 7) return `${color}33`;
  return color;
}

function getNativeIndicatorOptionalColorSet(
  color: string | (string | null)[] | undefined,
  fallbackColors: readonly string[],
): string[] {
  if (!Array.isArray(color)) return [color || fallbackColors[0] || '#2196F3'];
  const colors = new Set<string>(fallbackColors);
  for (const value of color) {
    if (value) colors.add(value);
  }
  return Array.from(colors);
}

function getNativeIndicatorPlotArrowColors(color: PlotOutput['color']): string[] {
  if (Array.isArray(color)) {
    const colors = new Set<string>();
    for (const value of color) {
      if (value) colors.add(value);
    }
    return colors.size > 0 ? Array.from(colors) : ['#4CAF50', '#F23645'];
  }
  return color ? [color] : ['#4CAF50', '#F23645'];
}

function getNativeIndicatorPlotArrowColorAt(plot: PlotOutput, sourceIndex: number, value: number): string | null {
  'worklet';
  if (Array.isArray(plot.color)) return plot.color[sourceIndex] || (value > 0 ? '#4CAF50' : '#F23645');
  return plot.color || (value > 0 ? '#4CAF50' : '#F23645');
}

function isNativeFinitePlotValue(value: number | null | undefined): value is number {
  'worklet';
  return typeof value === 'number' && Number.isFinite(value);
}

function nativePaneValueToY(value: number, pane: NativePaneFrame): number {
  'worklet';
  const range = pane.yMax - pane.yMin;
  if (range === 0) return pane.top + pane.height / 2;
  return pane.top + ((pane.yMax - value) / range) * pane.height;
}

function shouldApplyNativeIndicatorPlotPaneRangeOverride(
  pane: NativePaneFrame,
  override: NativePaneRangeOverrides[string] | undefined,
): boolean {
  'worklet';
  if (!override) return false;
  if (!override.committed) return true;
  if (pane.yMin === override.yMin && pane.yMax === override.yMax) return false;
  if (
    override.startYMin !== undefined &&
    override.startYMax !== undefined &&
    (pane.yMin !== override.startYMin || pane.yMax !== override.startYMax)
  ) {
    return false;
  }
  return true;
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
    const applyOverride = shouldApplyNativeIndicatorPlotPaneRangeOverride(pane, override);
    const yMin = applyOverride ? override!.yMin : pane.yMin;
    const yMax = applyOverride ? override!.yMax : pane.yMax;
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
  colorFilter,
  frame,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
  style,
}: {
  colorFilter?: string;
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorColoredPlotPoint[];
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
  let previousColoredPoint: { x: number; y: number } | null = null;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) continue;

    if (point.color === null) {
      isDrawing = false;
      previousColoredPoint = null;
      continue;
    }

    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
      if (breaksOnNa) {
        isDrawing = false;
        previousColoredPoint = null;
      }
      continue;
    }

    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({
          frame,
          pane,
          paneRangeOverrides,
          sharedViewport: sharedViewport!,
          value: point.value,
        });

    if (colorFilter !== undefined) {
      if (point.color === colorFilter) {
        if (previousColoredPoint) {
          path.moveTo(previousColoredPoint.x, previousColoredPoint.y);
          if (isStepLine) {
            path.lineTo(x, previousColoredPoint.y);
            path.lineTo(x, y);
          } else {
            path.lineTo(x, y);
          }
        } else {
          path.moveTo(x, y);
        }
      }
      previousColoredPoint = { x, y };
      continue;
    }

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
  colorFilter,
  frame,
  histbase,
  linewidth,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
  style,
}: {
  colorFilter?: string;
  frame: NativeChartFrame;
  histbase: number;
  linewidth: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorColoredPlotPoint[];
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
  style: PlotStyle;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;

  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;
  const timeRange = endTime - startTime;
  const baselineY = projection
    ? nativeIndicatorYToPathValue({ frame, pane, projection, value: histbase })
    : nativeSharedIndicatorYToPathValue({
        frame,
        pane,
        paneRangeOverrides,
        sharedViewport: sharedViewport!,
        value: histbase,
      });

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) continue;
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) continue;
    if (point.color === null || (colorFilter !== undefined && point.color !== colorFilter)) continue;

    const slotWidth = timeRange > 0 ? (point.interval * frame.contentWidth) / timeRange : 0;
    const barWidth =
      style === 'columns' ? Math.max(1, slotWidth * 0.6) : Math.max(1, Math.min(slotWidth, linewidth * 3));
    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({
          frame,
          pane,
          paneRangeOverrides,
          sharedViewport: sharedViewport!,
          value: point.value,
        });
    const barTop = Math.min(y, baselineY);
    const barHeight = Math.max(1, Math.abs(y - baselineY));
    path.addRect(Skia.XYWHRect(x - barWidth / 2, barTop, barWidth, barHeight));
  }

  return path;
}

function getNativeIndicatorAreaFillPath({
  colorFilter,
  frame,
  histbase,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
  style,
}: {
  colorFilter?: string;
  frame: NativeChartFrame;
  histbase: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorColoredPlotPoint[];
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
  style: PlotStyle;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;

  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;
  const breaksOnNa = nativePlotStyleBreaksOnNa(style);
  const baselineY = projection
    ? nativeIndicatorYToPathValue({ frame, pane, projection, value: histbase })
    : nativeSharedIndicatorYToPathValue({
        frame,
        pane,
        paneRangeOverrides,
        sharedViewport: sharedViewport!,
        value: histbase,
      });
  let started = false;
  let firstX = 0;
  let lastX = 0;
  let previous: { x: number; y: number } | null = null;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) {
      started = false;
      previous = null;
      continue;
    }
    if (point.color === null) {
      started = false;
      previous = null;
      continue;
    }
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
      if (breaksOnNa) {
        started = false;
        previous = null;
      }
      continue;
    }

    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({
          frame,
          pane,
          paneRangeOverrides,
          sharedViewport: sharedViewport!,
          value: point.value,
        });

    if (colorFilter !== undefined) {
      if (previous && point.color === colorFilter) {
        path.moveTo(previous.x, baselineY);
        path.lineTo(previous.x, previous.y);
        path.lineTo(x, y);
        path.lineTo(x, baselineY);
        path.close();
      }
      previous = { x, y };
      continue;
    }

    if (!started) {
      path.moveTo(x, baselineY);
      path.lineTo(x, y);
      firstX = x;
      started = true;
    } else {
      path.lineTo(x, y);
    }
    lastX = x;
  }

  if (started) {
    path.lineTo(lastX, baselineY);
    path.lineTo(firstX, baselineY);
    path.close();
  }

  return path;
}

function appendNativeIndicatorRectPath(path: SkPath, x: number, y: number, width: number, height: number): void {
  'worklet';
  if (width <= 0 || height <= 0) return;
  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height);
  path.lineTo(x, y + height);
  path.close();
}

function appendNativeIndicatorArrowPath(
  path: SkPath,
  x: number,
  y: number,
  size: number,
  direction: 'up' | 'down',
): void {
  'worklet';
  const height = Math.max(1, size);
  const headHalfWidth = Math.max(2, height * 0.28);
  const stemHalfWidth = Math.max(1, height * 0.09);
  const tipY = direction === 'up' ? y - height / 2 : y + height / 2;
  const tailY = direction === 'up' ? y + height / 2 : y - height / 2;
  const headBaseY = direction === 'up' ? y - height / 8 : y + height / 8;

  path.moveTo(x, tipY);
  path.lineTo(x + headHalfWidth, headBaseY);
  path.lineTo(x + stemHalfWidth, headBaseY);
  path.lineTo(x + stemHalfWidth, tailY);
  path.lineTo(x - stemHalfWidth, tailY);
  path.lineTo(x - stemHalfWidth, headBaseY);
  path.lineTo(x - headHalfWidth, headBaseY);
  path.close();
}

function appendNativeIndicatorShapePath(path: SkPath, x: number, y: number, shape: string, size: number): void {
  'worklet';
  const half = size / 2;

  if (shape === 'square') {
    path.addRect(Skia.XYWHRect(x - half, y - half, size, size));
    return;
  }
  if (shape === 'diamond') {
    path.moveTo(x, y - half);
    path.lineTo(x + half, y);
    path.lineTo(x, y + half);
    path.lineTo(x - half, y);
    path.close();
    return;
  }
  if (shape === 'triangleup' || shape === 'arrowup') {
    path.moveTo(x, y - half);
    path.lineTo(x + half, y + half);
    path.lineTo(x - half, y + half);
    path.close();
    return;
  }
  if (shape === 'triangledown' || shape === 'arrowdown') {
    path.moveTo(x, y + half);
    path.lineTo(x + half, y - half);
    path.lineTo(x - half, y - half);
    path.close();
    return;
  }
  if (shape === 'cross') {
    path.moveTo(x - half, y);
    path.lineTo(x + half, y);
    path.moveTo(x, y - half);
    path.lineTo(x, y + half);
    return;
  }
  if (shape === 'xcross') {
    path.moveTo(x - half, y - half);
    path.lineTo(x + half, y + half);
    path.moveTo(x + half, y - half);
    path.lineTo(x - half, y + half);
    return;
  }
  if (shape === 'flag') {
    path.moveTo(x - size / 3, y + half);
    path.lineTo(x - size / 3, y - half);
    path.addRect(Skia.XYWHRect(x - size / 3, y - half, size * 0.8, size * 0.45));
    return;
  }
  if (shape === 'labelup' || shape === 'labeldown') {
    path.addRect(Skia.XYWHRect(x - size * 0.7, y - size * 0.45, size * 1.4, size * 0.9));
    if (shape === 'labelup') {
      path.moveTo(x, y + size * 0.65);
      path.lineTo(x - size * 0.25, y + size * 0.25);
      path.lineTo(x + size * 0.25, y + size * 0.25);
    } else {
      path.moveTo(x, y - size * 0.65);
      path.lineTo(x - size * 0.25, y - size * 0.25);
      path.lineTo(x + size * 0.25, y - size * 0.25);
    }
    path.close();
    return;
  }

  path.addCircle(x, y, half);
}

function appendNativeIndicatorPointMarkerPath(
  path: SkPath,
  x: number,
  y: number,
  style: PlotStyle,
  size: number,
): void {
  'worklet';
  if (style === 'cross') {
    path.moveTo(x - size, y - size);
    path.lineTo(x + size, y + size);
    path.moveTo(x + size, y - size);
    path.lineTo(x - size, y + size);
    return;
  }
  path.addCircle(x, y, size);
}

function getNativeIndicatorPointMarkerPath({
  colorFilter,
  frame,
  markerSize,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
  style,
}: {
  colorFilter?: string;
  frame: NativeChartFrame;
  markerSize: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorColoredPlotPoint[];
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
  style: PlotStyle;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;
  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) continue;
    if (point.color === null || (colorFilter !== undefined && point.color !== colorFilter)) continue;
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) continue;
    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({
          frame,
          pane,
          paneRangeOverrides,
          sharedViewport: sharedViewport!,
          value: point.value,
        });
    appendNativeIndicatorPointMarkerPath(path, x, y, style, markerSize);
  }

  return path;
}

function getNativeIndicatorStepLineDiamondMarkerPath({
  colorFilter,
  frame,
  markerSize,
  pane,
  paneRangeOverrides,
  points,
  projection,
  sharedViewport,
}: {
  colorFilter?: string;
  frame: NativeChartFrame;
  markerSize: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  points: readonly NativeIndicatorColoredPlotPoint[];
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;
  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.time < startTime || point.time > endTime) continue;
    if (point.color === null || (colorFilter !== undefined && point.color !== colorFilter)) continue;
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) continue;
    const x = nativeIndicatorPointX({ frame, point, projection, sharedViewport });
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: point.value })
      : nativeSharedIndicatorYToPathValue({
          frame,
          pane,
          paneRangeOverrides,
          sharedViewport: sharedViewport!,
          value: point.value,
        });
    appendNativeIndicatorShapePath(path, x, y, 'diamond', markerSize);
  }

  return path;
}

function nativeIndicatorMarkerY({
  bar,
  frame,
  location,
  markerSize,
  pane,
  paneRangeOverrides,
  projection,
  sharedViewport,
  value,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  location: PlotOutput['location'];
  markerSize: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  value: number;
}): number {
  'worklet';
  const valueToY = (targetValue: number) =>
    projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: targetValue })
      : nativeSharedIndicatorYToPathValue({
          frame,
          pane,
          paneRangeOverrides,
          sharedViewport,
          value: targetValue,
        });

  if (location === 'belowbar') return valueToY(bar.low) + markerSize + 4;
  if (location === 'top') return pane.top + markerSize + 4;
  if (location === 'bottom') return pane.top + pane.height - markerSize - 4;
  if (location === 'absolute') return valueToY(value);
  return valueToY(bar.high) - markerSize - 4;
}

function getNativeIndicatorMarkerShapePath({
  colorFilter,
  frame,
  markerPoints,
  markerSize,
  pane,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  visibleBars,
}: {
  colorFilter: string;
  frame: NativeChartFrame;
  markerPoints: readonly NativeIndicatorMarkerPoint[];
  markerSize: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0 || plot.type === 'plotchar') return path;
  const startTime = projection?.viewport.startTime ?? sharedViewport.startTime.value;
  const endTime = projection?.viewport.endTime ?? sharedViewport.endTime.value;
  const location = plot.location ?? 'abovebar';
  const shape = plot.shape ?? 'circle';

  for (let index = 0; index < markerPoints.length; index += 1) {
    const point = markerPoints[index];
    if (point.color !== colorFilter || point.time < startTime || point.time > endTime) continue;
    const bar = visibleBars.find((candidate) => candidate.sourceIndex === point.sourceIndex);
    if (!bar) continue;
    const x = projection ? projection.timeToX(point.time) : sharedTimeToNativeX(point.time, sharedViewport, frame);
    const y = nativeIndicatorMarkerY({
      bar,
      frame,
      location,
      markerSize,
      pane,
      paneRangeOverrides,
      projection,
      sharedViewport,
      value: point.value,
    });
    appendNativeIndicatorShapePath(path, x, y, shape, markerSize);
  }

  return path;
}

function getNativeIndicatorPlotArrowSize(
  plot: PlotOutput,
  magnitude: number,
  maxMagnitude: number,
  fallbackSize: number,
): number {
  'worklet';
  const minHeight = Number.isFinite(plot.minHeight) ? Math.max(1, plot.minHeight!) : fallbackSize;
  const maxHeight = Number.isFinite(plot.maxHeight)
    ? Math.max(minHeight, plot.maxHeight!)
    : Math.max(minHeight, fallbackSize);
  if (maxMagnitude <= 0 || maxHeight === minHeight) return minHeight;
  return minHeight + (magnitude / maxMagnitude) * (maxHeight - minHeight);
}

function getNativeVisiblePlotArrowMaxMagnitude({
  plot,
  projection,
  sharedViewport,
  totalBarCount,
  visibleBars,
}: {
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}): number {
  'worklet';
  const startTime = projection?.viewport.startTime ?? sharedViewport.startTime.value;
  const endTime = projection?.viewport.endTime ?? sharedViewport.endTime.value;
  let maxMagnitude = 0;

  for (let index = 0; index < visibleBars.length; index += 1) {
    const bar = visibleBars[index];
    if (!shouldRenderNativeIndicatorPlotBar(plot, totalBarCount, bar.sourceIndex)) continue;
    const plotTime = bar.time + (plot.offset ?? 0) * bar.interval;
    if (plotTime < startTime || plotTime > endTime) continue;
    const value = plot.values[bar.sourceIndex];
    if (isNativeFinitePlotValue(value) && value !== 0) {
      maxMagnitude = Math.max(maxMagnitude, Math.abs(value));
    }
  }

  return maxMagnitude;
}

function getNativeIndicatorOhlcPath({
  colorFilter,
  colorKind,
  frame,
  pane,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  totalBarCount,
  visibleBars,
}: {
  colorFilter: string;
  colorKind: 'body' | 'wick' | 'border';
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;
  const openValues = plot.openValues;
  const highValues = plot.highValues;
  const lowValues = plot.lowValues;
  const closeValues = plot.closeValues;
  if (!openValues || !highValues || !lowValues || !closeValues) return path;

  const startTime = projection?.viewport.startTime ?? sharedViewport.startTime.value;
  const endTime = projection?.viewport.endTime ?? sharedViewport.endTime.value;
  const timeRange = endTime - startTime;
  const fallbackColor = getNativeIndicatorColor(plot.color);

  for (let index = 0; index < visibleBars.length; index += 1) {
    const bar = visibleBars[index];
    if (!shouldRenderNativeIndicatorPlotBar(plot, totalBarCount, bar.sourceIndex)) continue;
    if (bar.time < startTime || bar.time > endTime) continue;

    const open = openValues[bar.sourceIndex];
    const high = highValues[bar.sourceIndex];
    const low = lowValues[bar.sourceIndex];
    const close = closeValues[bar.sourceIndex];
    if (
      !isNativeFinitePlotValue(open) ||
      !isNativeFinitePlotValue(high) ||
      !isNativeFinitePlotValue(low) ||
      !isNativeFinitePlotValue(close)
    ) {
      continue;
    }

    const bodyColor = getNativeIndicatorOptionalColorAt(plot.color, bar.sourceIndex, fallbackColor);
    if (!bodyColor) continue;
    const wickColor = getNativeIndicatorOptionalColorAt(plot.wickColor, bar.sourceIndex, bodyColor);
    const borderColor = getNativeIndicatorOptionalColorAt(plot.borderColor, bar.sourceIndex, bodyColor);
    const targetColor = colorKind === 'wick' ? wickColor : colorKind === 'border' ? borderColor : bodyColor;
    if (targetColor !== colorFilter) continue;

    const x = projection ? projection.timeToX(bar.time) : sharedTimeToNativeX(bar.time, sharedViewport, frame);
    const slotWidth = timeRange > 0 ? (bar.interval * frame.contentWidth) / timeRange : 0;
    const bodyWidth = Math.max(1, slotWidth * 0.6);
    const tickWidth = Math.min(bodyWidth, Math.max(3, bodyWidth * 0.45));
    const openY = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: open })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport, value: open });
    const highY = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: high })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport, value: high });
    const lowY = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: low })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport, value: low });
    const closeY = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: close })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport, value: close });

    if (plot.type === 'plotbar') {
      path.moveTo(x, highY);
      path.lineTo(x, lowY);
      path.moveTo(x - tickWidth, openY);
      path.lineTo(x, openY);
      path.moveTo(x, closeY);
      path.lineTo(x + tickWidth, closeY);
      continue;
    }

    if (colorKind === 'wick') {
      appendNativeIndicatorRectPath(path, x - 0.5, Math.min(highY, lowY), 1, Math.max(1, Math.abs(lowY - highY)));
      continue;
    }

    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY));
    if (colorKind === 'body') {
      appendNativeIndicatorRectPath(path, x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
    } else {
      path.moveTo(x - bodyWidth / 2, bodyTop);
      path.lineTo(x + bodyWidth / 2, bodyTop);
      path.lineTo(x + bodyWidth / 2, bodyTop + bodyHeight);
      path.lineTo(x - bodyWidth / 2, bodyTop + bodyHeight);
      path.close();
    }
  }

  return path;
}

function getNativeIndicatorPlotArrowPath({
  colorFilter,
  frame,
  maxMagnitude,
  pane,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  totalBarCount,
  visibleBars,
}: {
  colorFilter: string;
  frame: NativeChartFrame;
  maxMagnitude: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;

  const startTime = projection?.viewport.startTime ?? sharedViewport.startTime.value;
  const endTime = projection?.viewport.endTime ?? sharedViewport.endTime.value;
  const fallbackSize = 6;

  for (let index = 0; index < visibleBars.length; index += 1) {
    const bar = visibleBars[index];
    if (!shouldRenderNativeIndicatorPlotBar(plot, totalBarCount, bar.sourceIndex)) continue;
    const value = plot.values[bar.sourceIndex];
    if (!isNativeFinitePlotValue(value) || value === 0) continue;

    const plotTime = bar.time + (plot.offset ?? 0) * bar.interval;
    if (plotTime < startTime || plotTime > endTime) continue;

    const color = getNativeIndicatorPlotArrowColorAt(plot, bar.sourceIndex, value);
    if (color !== colorFilter) continue;

    const markerSize = getNativeIndicatorPlotArrowSize(plot, Math.abs(value), maxMagnitude, fallbackSize);
    const x = projection ? projection.timeToX(plotTime) : sharedTimeToNativeX(plotTime, sharedViewport, frame);
    const anchorValue = value > 0 ? bar.low : bar.high;
    const anchorY = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: anchorValue })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides, sharedViewport, value: anchorValue });
    const y = value > 0 ? anchorY + markerSize + 4 : anchorY - markerSize - 4;
    appendNativeIndicatorArrowPath(path, x, y, markerSize, value > 0 ? 'up' : 'down');
  }

  return path;
}

function getNativeIndicatorFillValue(plot: PlotOutput, sourceIndex: number): number | null {
  'worklet';
  if (plot.type === 'hline') {
    return typeof plot.price === 'number' && Number.isFinite(plot.price) ? plot.price : null;
  }
  const value = plot.values[sourceIndex];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNativeIndicatorFillPath({
  colorFilter,
  fill,
  frame,
  pane,
  paneRangeOverrides,
  plot1,
  plot2,
  projection,
  sharedViewport,
  visibleBars,
}: {
  colorFilter?: string;
  fill: PlotOutput;
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: NativePaneRangeOverrides;
  plot1: PlotOutput;
  plot2: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport?: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (pane.height <= 0) return path;

  const startTime = projection?.viewport.startTime ?? sharedViewport?.startTime.value ?? 0;
  const endTime = projection?.viewport.endTime ?? sharedViewport?.endTime.value ?? 0;
  const fillgaps = fill.fillgaps ?? true;
  let previous: { x: number; y1: number; y2: number } | null = null;

  for (let index = 0; index < visibleBars.length; index += 1) {
    const bar = visibleBars[index];
    if (bar.time < startTime || bar.time > endTime) {
      previous = null;
      continue;
    }
    const value1 = getNativeIndicatorFillValue(plot1, bar.sourceIndex);
    const value2 = getNativeIndicatorFillValue(plot2, bar.sourceIndex);
    const color = getNativeIndicatorColorAt(fill.color, bar.sourceIndex, '#2196F333');
    if (colorFilter !== undefined && color !== colorFilter) {
      previous = null;
      continue;
    }
    if (color === null) {
      previous = null;
      continue;
    }
    if (value1 === null || value2 === null) {
      if (!fillgaps) previous = null;
      continue;
    }
    const current = {
      x: nativeIndicatorPointX({
        frame,
        point: { interval: bar.interval, time: bar.time, value: value1 },
        projection,
        sharedViewport,
      }),
      y1: projection
        ? nativeIndicatorYToPathValue({ frame, pane, projection, value: value1 })
        : nativeSharedIndicatorYToPathValue({
            frame,
            pane,
            paneRangeOverrides,
            sharedViewport: sharedViewport!,
            value: value1,
          }),
      y2: projection
        ? nativeIndicatorYToPathValue({ frame, pane, projection, value: value2 })
        : nativeSharedIndicatorYToPathValue({
            frame,
            pane,
            paneRangeOverrides,
            sharedViewport: sharedViewport!,
            value: value2,
          }),
    };
    if (previous) {
      path.moveTo(previous.x, previous.y1);
      path.lineTo(current.x, current.y1);
      path.lineTo(current.x, current.y2);
      path.lineTo(previous.x, previous.y2);
      path.close();
    }
    previous = current;
  }

  return path;
}

function getNativeFillColors(fill: PlotOutput): string[] {
  if (!Array.isArray(fill.color)) return [getNativeIndicatorColor(fill.color)];
  const colors = new Set<string>();
  for (const color of fill.color) {
    if (color) colors.add(color);
  }
  return Array.from(colors);
}

function getNativeIndicatorBgRects({
  frame,
  plot,
  projection,
  sharedViewport,
  visibleBars,
}: {
  frame: NativeChartFrame;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}): Array<{ color: string; height: number; width: number; x: number; y: number }> {
  const pane = nativeIndicatorPlotPane(frame, plot, undefined);
  const startTime = projection?.viewport.startTime ?? sharedViewport.startTime.value;
  const endTime = projection?.viewport.endTime ?? sharedViewport.endTime.value;
  const timeRange = Math.max(1, endTime - startTime);
  const rects: Array<{ color: string; height: number; width: number; x: number; y: number }> = [];

  for (const bar of visibleBars) {
    const value = plot.values[bar.sourceIndex];
    if (bar.time < startTime || bar.time > endTime || value === null || value === undefined) continue;
    const color = getNativeIndicatorColorAt(plot.color, bar.sourceIndex, 'rgba(33, 150, 243, 0.2)');
    if (!color) continue;
    const x = projection ? projection.timeToX(bar.time) : sharedTimeToNativeX(bar.time, sharedViewport, frame);
    const width = Math.max(1, (bar.interval * frame.contentWidth) / timeRange);
    rects.push({ color, height: pane.height, width, x: x - width / 2, y: pane.top });
  }

  return rects;
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

function getNativeIndicatorColoredPlotPoints({
  fallbackColor,
  plot,
  totalBarCount,
  visibleBars,
}: {
  fallbackColor: string;
  plot: PlotOutput;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}): NativeIndicatorColoredPlotPoint[] {
  const offset = plot.offset ?? 0;
  const points: NativeIndicatorColoredPlotPoint[] = [];

  for (const bar of visibleBars) {
    if (!shouldRenderNativeIndicatorPlotBar(plot, totalBarCount, bar.sourceIndex)) continue;
    const value = plot.values[bar.sourceIndex];
    points.push({
      color: getNativeIndicatorColorAt(plot.color, bar.sourceIndex, fallbackColor),
      interval: bar.interval,
      time: bar.time + offset * bar.interval,
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
    });
  }

  return points;
}

function getNativeIndicatorMarkerTextColor(plot: PlotOutput, sourceIndex: number): string {
  const fallback = Array.isArray(plot.textColor)
    ? (plot.textColor.find((value): value is string => Boolean(value)) ?? '#FFFFFF')
    : plot.textColor || '#FFFFFF';
  if (Array.isArray(plot.textColor)) return plot.textColor[sourceIndex] || fallback;
  return fallback;
}

function getNativeIndicatorMarkerPoints({
  fallbackColor,
  plot,
  totalBarCount,
  visibleBars,
}: {
  fallbackColor: string;
  plot: PlotOutput;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}): NativeIndicatorMarkerPoint[] {
  const offset = plot.offset ?? 0;
  const points: NativeIndicatorMarkerPoint[] = [];

  for (const bar of visibleBars) {
    if (!shouldRenderNativeIndicatorPlotBar(plot, totalBarCount, bar.sourceIndex)) continue;
    const value = plot.values[bar.sourceIndex];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    const markerText = Array.isArray(plot.textValues) ? plot.textValues[bar.sourceIndex] : plot.text;
    points.push({
      color: getNativeIndicatorColorAt(plot.color, bar.sourceIndex, fallbackColor),
      interval: bar.interval,
      markerText: markerText || undefined,
      sourceIndex: bar.sourceIndex,
      textColor: getNativeIndicatorMarkerTextColor(plot, bar.sourceIndex),
      time: bar.time + offset * bar.interval,
      value,
    });
  }

  return points;
}

function NativeLiveIndicatorPlotPath({
  clip,
  color,
  colorFilter,
  frame,
  histbase,
  isArea,
  isHistogram,
  isPointMarker,
  join,
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
  colorFilter?: string;
  frame: NativeChartFrame;
  histbase: number;
  isArea: boolean;
  isHistogram: boolean;
  isPointMarker: boolean;
  join: boolean;
  opacity: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  points: readonly NativeIndicatorColoredPlotPoint[];
  sharedViewport: NativeViewportSharedValues;
  strokeWidth: number;
  style: PlotStyle;
  dash: number[] | null;
}) {
  const linePath = useDerivedValue(() => {
    const overrides = paneRangeOverrides?.value;
    return isHistogram
      ? getNativeIndicatorHistogramPath({
          frame,
          colorFilter,
          histbase,
          linewidth: strokeWidth,
          pane,
          paneRangeOverrides: overrides,
          points,
          sharedViewport,
          style,
        })
      : getNativeIndicatorLinePath({
          colorFilter,
          frame,
          pane,
          paneRangeOverrides: overrides,
          points,
          sharedViewport,
          style,
        });
  });
  const areaPath = useDerivedValue(() =>
    getNativeIndicatorAreaFillPath({
      colorFilter,
      frame,
      histbase,
      pane,
      paneRangeOverrides: paneRangeOverrides?.value,
      points,
      sharedViewport,
      style,
    }),
  );
  const markerPath = useDerivedValue(() =>
    getNativeIndicatorPointMarkerPath({
      colorFilter,
      frame,
      markerSize: Math.max(3, strokeWidth * 2),
      pane,
      paneRangeOverrides: paneRangeOverrides?.value,
      points,
      sharedViewport,
      style,
    }),
  );
  const diamondPath = useDerivedValue(() =>
    getNativeIndicatorStepLineDiamondMarkerPath({
      colorFilter,
      frame,
      markerSize: Math.max(3, strokeWidth * 2),
      pane,
      paneRangeOverrides: paneRangeOverrides?.value,
      points,
      sharedViewport,
    }),
  );

  if (isHistogram) {
    return (
      <Group clip={clip} opacity={opacity}>
        <SkiaPath path={linePath} color={color} opacity={0.75} />
      </Group>
    );
  }

  if (isPointMarker) {
    return (
      <Group clip={clip} opacity={opacity}>
        <SkiaPath
          path={markerPath}
          color={color}
          style={style === 'cross' ? 'stroke' : 'fill'}
          strokeWidth={strokeWidth}
        />
        {join && (
          <SkiaPath path={linePath} color={color} style="stroke" strokeWidth={strokeWidth}>
            {dash && <DashPathEffect intervals={dash} />}
          </SkiaPath>
        )}
      </Group>
    );
  }

  return (
    <Group clip={clip} opacity={opacity}>
      {isArea && <SkiaPath path={areaPath} color={nativeIndicatorAreaFillColor(color)} />}
      <SkiaPath path={linePath} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dash && <DashPathEffect intervals={dash} />}
      </SkiaPath>
      {style === 'stepline_diamond' && <SkiaPath path={diamondPath} color={color} />}
    </Group>
  );
}

function NativeProjectedIndicatorPlotPath({
  clip,
  color,
  colorFilter,
  frame,
  histbase,
  isArea,
  isHistogram,
  isPointMarker,
  join,
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
  colorFilter?: string;
  frame: NativeChartFrame;
  histbase: number;
  isArea: boolean;
  isHistogram: boolean;
  isPointMarker: boolean;
  join: boolean;
  opacity: number;
  pane: NativePaneFrame;
  projection: NativeChartProjection;
  strokeWidth: number;
  style: PlotStyle;
  dash: number[] | null;
  points: readonly NativeIndicatorColoredPlotPoint[];
}) {
  const linePath = useMemo(
    () =>
      isHistogram
        ? getNativeIndicatorHistogramPath({
            colorFilter,
            frame,
            histbase,
            linewidth: strokeWidth,
            pane,
            points,
            projection,
            style,
          })
        : getNativeIndicatorLinePath({ colorFilter, frame, pane, points, projection, style }),
    [colorFilter, frame, histbase, isHistogram, pane, points, projection, strokeWidth, style],
  );
  const areaPath = useMemo(
    () =>
      getNativeIndicatorAreaFillPath({
        colorFilter,
        frame,
        histbase,
        pane,
        points,
        projection,
        style,
      }),
    [colorFilter, frame, histbase, pane, points, projection, style],
  );
  const markerPath = useMemo(
    () =>
      getNativeIndicatorPointMarkerPath({
        colorFilter,
        frame,
        markerSize: Math.max(3, strokeWidth * 2),
        pane,
        points,
        projection,
        style,
      }),
    [colorFilter, frame, pane, points, projection, strokeWidth, style],
  );
  const diamondPath = useMemo(
    () =>
      getNativeIndicatorStepLineDiamondMarkerPath({
        colorFilter,
        frame,
        markerSize: Math.max(3, strokeWidth * 2),
        pane,
        points,
        projection,
      }),
    [colorFilter, frame, pane, points, projection, strokeWidth],
  );

  if (isHistogram) {
    return (
      <Group clip={clip} opacity={opacity}>
        <SkiaPath path={linePath} color={color} opacity={0.75} />
      </Group>
    );
  }

  if (isPointMarker) {
    return (
      <Group clip={clip} opacity={opacity}>
        <SkiaPath
          path={markerPath}
          color={color}
          style={style === 'cross' ? 'stroke' : 'fill'}
          strokeWidth={strokeWidth}
        />
        {join && (
          <SkiaPath path={linePath} color={color} style="stroke" strokeWidth={strokeWidth}>
            {dash && <DashPathEffect intervals={dash} />}
          </SkiaPath>
        )}
      </Group>
    );
  }

  return (
    <Group clip={clip} opacity={opacity}>
      {isArea && <SkiaPath path={areaPath} color={nativeIndicatorAreaFillColor(color)} />}
      <SkiaPath path={linePath} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dash && <DashPathEffect intervals={dash} />}
      </SkiaPath>
      {style === 'stepline_diamond' && <SkiaPath path={diamondPath} color={color} />}
    </Group>
  );
}

function NativeIndicatorMarkerText({
  bar,
  frame,
  location,
  markerSize,
  pane,
  paneRangeOverrides,
  point,
  projection,
  sharedViewport,
  text,
  textColor,
  textFont,
  yOffset,
}: {
  bar: NativeVisibleBar;
  frame: NativeChartFrame;
  location: PlotOutput['location'];
  markerSize: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  point: NativeIndicatorMarkerPoint;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  text: string;
  textColor: string;
  textFont: ReturnType<typeof Skia.Font>;
  yOffset: number;
}) {
  const staticX = projection ? projection.timeToX(point.time) : undefined;
  const staticY = projection
    ? nativeIndicatorMarkerY({
        bar,
        frame,
        location,
        markerSize,
        pane,
        projection,
        sharedViewport,
        value: point.value,
      }) + yOffset
    : undefined;
  const liveX = useDerivedValue(() => sharedTimeToNativeX(point.time, sharedViewport, frame));
  const liveY = useDerivedValue(
    () =>
      nativeIndicatorMarkerY({
        bar,
        frame,
        location,
        markerSize,
        pane,
        paneRangeOverrides: paneRangeOverrides?.value,
        projection,
        sharedViewport,
        value: point.value,
      }) + yOffset,
  );

  return (
    <NativeAnimatedSkiaText
      x={projection ? staticX! : liveX}
      y={projection ? staticY! : liveY}
      text={text}
      color={textColor}
      font={textFont}
    />
  );
}

function NativeIndicatorShapeMarkerPath({
  clip,
  color,
  frame,
  markerPoints,
  markerSize,
  pane,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  visibleBars,
}: {
  clip: NativePrimitiveClip | SharedValue<NativePrimitiveClip>;
  color: string;
  frame: NativeChartFrame;
  markerPoints: readonly NativeIndicatorMarkerPoint[];
  markerSize: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const staticPath = useMemo(
    () =>
      getNativeIndicatorMarkerShapePath({
        colorFilter: color,
        frame,
        markerPoints,
        markerSize,
        pane,
        plot,
        projection,
        sharedViewport,
        visibleBars,
      }),
    [color, frame, markerPoints, markerSize, pane, plot, projection, sharedViewport, visibleBars],
  );
  const livePath = useDerivedValue(() =>
    getNativeIndicatorMarkerShapePath({
      colorFilter: color,
      frame,
      markerPoints,
      markerSize,
      pane,
      paneRangeOverrides: paneRangeOverrides?.value,
      plot,
      projection,
      sharedViewport,
      visibleBars,
    }),
  );

  return (
    <Group clip={clip}>
      <SkiaPath path={projection ? staticPath : livePath} color={color} style="fill" />
    </Group>
  );
}

function NativeIndicatorShapeMarker({
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  textFont,
  totalBarCount,
  visibleBars,
}: {
  frame: NativeChartFrame;
  indicatorPaneInfo?: NativeIndicatorPaneInfo;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  textFont: ReturnType<typeof Skia.Font>;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const pane = nativeIndicatorPlotPane(frame, plot, indicatorPaneInfo);
  const fallbackColor = getNativeIndicatorColor(plot.color);
  const colors = useMemo(() => getNativeIndicatorColorSet(plot.color, fallbackColor), [fallbackColor, plot.color]);
  const markerSize = nativeIndicatorMarkerSize(plot.size);
  const location = plot.location ?? 'abovebar';
  const markerPoints = useMemo(
    () => getNativeIndicatorMarkerPoints({ fallbackColor, plot, totalBarCount, visibleBars }),
    [fallbackColor, plot, totalBarCount, visibleBars],
  );
  const opacity = isNativeIndicatorPlotVisible(plot) ? 1 : 0;
  const staticClip = { x: frame.contentLeft, y: pane.top, width: frame.contentWidth, height: pane.height };
  const clip = useDerivedValue<NativePrimitiveClip>(() => ({
    x: frame.contentLeft,
    y: pane.top,
    width: frame.contentWidth,
    height: pane.height,
  }));

  return (
    <Group opacity={opacity}>
      {plot.type === 'plotshape' &&
        colors.map((color) => (
          <NativeIndicatorShapeMarkerPath
            key={color}
            clip={projection ? staticClip : clip}
            color={color}
            frame={frame}
            markerPoints={markerPoints}
            markerSize={markerSize}
            pane={pane}
            paneRangeOverrides={paneRangeOverrides}
            plot={plot}
            projection={projection}
            sharedViewport={sharedViewport}
            visibleBars={visibleBars}
          />
        ))}
      {markerPoints.map((point) => {
        const bar = visibleBars.find((candidate) => candidate.sourceIndex === point.sourceIndex);
        if (!bar) return null;
        const charText = plot.type === 'plotchar' && point.color !== null ? plot.char || '\u25CF' : undefined;
        const markerTexts = point.markerText ? point.markerText.split(/\r?\n/) : [];
        const textOffset = location === 'belowbar' ? markerSize : location === 'bottom' ? -markerSize : -markerSize;
        return (
          <Group key={`${plot.id}-${point.sourceIndex}-text`}>
            {charText ? (
              <NativeIndicatorMarkerText
                bar={bar}
                frame={frame}
                location={location}
                markerSize={markerSize}
                pane={pane}
                paneRangeOverrides={paneRangeOverrides}
                point={point}
                projection={projection}
                sharedViewport={sharedViewport}
                text={charText}
                textColor={point.color ?? fallbackColor}
                textFont={textFont}
                yOffset={0}
              />
            ) : null}
            {markerTexts.map((line, lineIndex) => (
              <NativeIndicatorMarkerText
                key={`${plot.id}-${point.sourceIndex}-label-${lineIndex}`}
                bar={bar}
                frame={frame}
                location={location}
                markerSize={markerSize}
                pane={pane}
                paneRangeOverrides={paneRangeOverrides}
                point={point}
                projection={projection}
                sharedViewport={sharedViewport}
                text={line}
                textColor={point.textColor}
                textFont={textFont}
                yOffset={textOffset + lineIndex * Math.max(10, markerSize * 1.5)}
              />
            ))}
          </Group>
        );
      })}
    </Group>
  );
}

function NativeIndicatorHlinePath({
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
}: {
  frame: NativeChartFrame;
  indicatorPaneInfo?: NativeIndicatorPaneInfo;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
}) {
  const pane = nativeIndicatorPlotPane(frame, plot, indicatorPaneInfo);
  const price = typeof plot.price === 'number' && Number.isFinite(plot.price) ? plot.price : null;
  const color = getNativeIndicatorColor(plot.color);
  const strokeWidth = plot.linewidth ?? 1;
  const dash = nativeIndicatorLineDash(plot.lineStyle);
  const opacity = isNativeIndicatorPlotVisible(plot) && price !== null ? 1 : 0;
  const path = useDerivedValue(() => {
    const built = Skia.Path.Make();
    if (price === null || pane.height <= 0) return built;
    const overrides = paneRangeOverrides?.value;
    const y = projection
      ? nativeIndicatorYToPathValue({ frame, pane, projection, value: price })
      : nativeSharedIndicatorYToPathValue({ frame, pane, paneRangeOverrides: overrides, sharedViewport, value: price });
    built.moveTo(frame.contentLeft, y);
    built.lineTo(frame.priceAxisLeft, y);
    return built;
  });

  return (
    <Group opacity={opacity}>
      <SkiaPath path={path} color={color} style="stroke" strokeWidth={strokeWidth}>
        {dash && <DashPathEffect intervals={dash} />}
      </SkiaPath>
    </Group>
  );
}

function NativeIndicatorFillPath({
  fill,
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plots,
  projection,
  sharedViewport,
  visibleBars,
}: {
  fill: PlotOutput;
  frame: NativeChartFrame;
  indicatorPaneInfo?: NativeIndicatorPaneInfo;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plots: readonly PlotOutput[];
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const plot1 = plots.find((plot) => plot.id === fill.plot1Id);
  const plot2 = plots.find((plot) => plot.id === fill.plot2Id);
  const pane = nativeIndicatorPlotPane(frame, plot1 ?? fill, indicatorPaneInfo);
  const colors = useMemo(() => getNativeFillColors(fill), [fill]);

  return (
    <Group opacity={isNativeIndicatorPlotVisible(fill) ? 1 : 0}>
      {colors.map((color) => (
        <NativeIndicatorFillColorPath
          key={color}
          color={color}
          fill={fill}
          frame={frame}
          pane={pane}
          paneRangeOverrides={paneRangeOverrides}
          plot1={plot1}
          plot2={plot2}
          projection={projection}
          sharedViewport={sharedViewport}
          visibleBars={visibleBars}
        />
      ))}
    </Group>
  );
}

function NativeIndicatorFillColorPath({
  color,
  fill,
  frame,
  pane,
  paneRangeOverrides,
  plot1,
  plot2,
  projection,
  sharedViewport,
  visibleBars,
}: {
  color: string;
  fill: PlotOutput;
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot1?: PlotOutput;
  plot2?: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const path = useDerivedValue(() => {
    if (!plot1 || !plot2) return Skia.Path.Make();
    const overrides = paneRangeOverrides?.value;
    return getNativeIndicatorFillPath({
      colorFilter: Array.isArray(fill.color) ? color : undefined,
      fill,
      frame,
      pane,
      paneRangeOverrides: overrides,
      plot1,
      plot2,
      projection,
      sharedViewport,
      visibleBars,
    });
  });

  return <SkiaPath path={path} color={color} />;
}

function NativeIndicatorBgcolorRects({
  frame,
  plot,
  projection,
  sharedViewport,
  visibleBars,
}: {
  frame: NativeChartFrame;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const rects = useMemo(
    () => getNativeIndicatorBgRects({ frame, plot, projection, sharedViewport, visibleBars }),
    [frame, plot, projection, sharedViewport, visibleBars],
  );

  if (!isNativeIndicatorPlotVisible(plot)) return null;
  return (
    <Group>
      {rects.map((rect, index) => (
        <Rect
          key={`${plot.id}-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          color={rect.color}
        />
      ))}
    </Group>
  );
}

function NativeIndicatorOhlcPlotPath({
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
  const fallbackColor = getNativeIndicatorColor(plot.color);
  const bodyColors = useMemo(() => getNativeIndicatorColorSet(plot.color, fallbackColor), [fallbackColor, plot.color]);
  const wickColors = useMemo(
    () => (plot.type === 'plotcandle' ? getNativeIndicatorOptionalColorSet(plot.wickColor, bodyColors) : []),
    [bodyColors, plot.type, plot.wickColor],
  );
  const borderColors = useMemo(
    () => (plot.type === 'plotcandle' ? getNativeIndicatorOptionalColorSet(plot.borderColor, bodyColors) : []),
    [bodyColors, plot.borderColor, plot.type],
  );
  const opacity = isNativeIndicatorPlotVisible(plot) ? 1 : 0;
  const staticClip = { x: frame.contentLeft, y: pane.top, width: frame.contentWidth, height: pane.height };
  const clip = useDerivedValue<NativePrimitiveClip>(() => ({
    x: frame.contentLeft,
    y: pane.top,
    width: frame.contentWidth,
    height: pane.height,
  }));

  const renderColorPath = (color: string, colorKind: 'body' | 'wick' | 'border') => (
    <NativeIndicatorOhlcColorPath
      key={`${colorKind}-${color}`}
      clip={projection ? staticClip : clip}
      color={color}
      colorKind={colorKind}
      frame={frame}
      pane={pane}
      paneRangeOverrides={paneRangeOverrides}
      plot={plot}
      projection={projection}
      sharedViewport={sharedViewport}
      totalBarCount={totalBarCount}
      visibleBars={visibleBars}
    />
  );

  return (
    <Group opacity={opacity}>
      {plot.type === 'plotcandle' && wickColors.map((color) => renderColorPath(color, 'wick'))}
      {bodyColors.map((color) => renderColorPath(color, 'body'))}
      {plot.type === 'plotcandle' && borderColors.map((color) => renderColorPath(color, 'border'))}
    </Group>
  );
}

function NativeIndicatorOhlcColorPath({
  clip,
  color,
  colorKind,
  frame,
  pane,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  totalBarCount,
  visibleBars,
}: {
  clip: NativePrimitiveClip | SharedValue<NativePrimitiveClip>;
  color: string;
  colorKind: 'body' | 'wick' | 'border';
  frame: NativeChartFrame;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const staticPath = useMemo(
    () =>
      getNativeIndicatorOhlcPath({
        colorFilter: color,
        colorKind,
        frame,
        pane,
        plot,
        projection,
        sharedViewport,
        totalBarCount,
        visibleBars,
      }),
    [color, colorKind, frame, pane, plot, projection, sharedViewport, totalBarCount, visibleBars],
  );
  const livePath = useDerivedValue(() =>
    getNativeIndicatorOhlcPath({
      colorFilter: color,
      colorKind,
      frame,
      pane,
      paneRangeOverrides: paneRangeOverrides?.value,
      plot,
      projection,
      sharedViewport,
      totalBarCount,
      visibleBars,
    }),
  );
  const path = projection ? staticPath : livePath;

  return (
    <Group clip={clip}>
      <SkiaPath
        path={path}
        color={color}
        style={colorKind === 'border' || plot.type === 'plotbar' ? 'stroke' : undefined}
        strokeWidth={1}
      />
    </Group>
  );
}

function NativeIndicatorPlotArrowPath({
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
  const colors = useMemo(() => getNativeIndicatorPlotArrowColors(plot.color), [plot.color]);
  const opacity = isNativeIndicatorPlotVisible(plot) ? 1 : 0;
  const maxMagnitude = getNativeVisiblePlotArrowMaxMagnitude({
    plot,
    projection,
    sharedViewport,
    totalBarCount,
    visibleBars,
  });
  const staticClip = { x: frame.contentLeft, y: pane.top, width: frame.contentWidth, height: pane.height };
  const clip = useDerivedValue<NativePrimitiveClip>(() => ({
    x: frame.contentLeft,
    y: pane.top,
    width: frame.contentWidth,
    height: pane.height,
  }));

  return (
    <Group opacity={opacity}>
      {colors.map((color) => (
        <NativeIndicatorPlotArrowColorPath
          key={color}
          clip={projection ? staticClip : clip}
          color={color}
          frame={frame}
          maxMagnitude={maxMagnitude}
          pane={pane}
          paneRangeOverrides={paneRangeOverrides}
          plot={plot}
          projection={projection}
          sharedViewport={sharedViewport}
          totalBarCount={totalBarCount}
          visibleBars={visibleBars}
        />
      ))}
    </Group>
  );
}

function NativeIndicatorPlotArrowColorPath({
  clip,
  color,
  frame,
  maxMagnitude,
  pane,
  paneRangeOverrides,
  plot,
  projection,
  sharedViewport,
  totalBarCount,
  visibleBars,
}: {
  clip: NativePrimitiveClip | SharedValue<NativePrimitiveClip>;
  color: string;
  frame: NativeChartFrame;
  maxMagnitude: number;
  pane: NativePaneFrame;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plot: PlotOutput;
  projection?: NativeChartProjection | null;
  sharedViewport: NativeViewportSharedValues;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}) {
  const staticPath = useMemo(
    () =>
      getNativeIndicatorPlotArrowPath({
        colorFilter: color,
        frame,
        maxMagnitude,
        pane,
        plot,
        projection,
        sharedViewport,
        totalBarCount,
        visibleBars,
      }),
    [color, frame, maxMagnitude, pane, plot, projection, sharedViewport, totalBarCount, visibleBars],
  );
  const livePath = useDerivedValue(() =>
    getNativeIndicatorPlotArrowPath({
      colorFilter: color,
      frame,
      maxMagnitude,
      pane,
      paneRangeOverrides: paneRangeOverrides?.value,
      plot,
      projection,
      sharedViewport,
      totalBarCount,
      visibleBars,
    }),
  );
  const path = projection ? staticPath : livePath;

  return (
    <Group clip={clip}>
      <SkiaPath path={path} color={color} />
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
  const fallbackColor = getNativeIndicatorColor(plot.color);
  const colors = useMemo(() => getNativeIndicatorColorSet(plot.color, fallbackColor), [fallbackColor, plot.color]);
  const strokeWidth = plot.linewidth ?? 1;
  const style = plot.style ?? 'line';
  const dash = nativeIndicatorLineDash(plot.lineStyle);
  const isHistogram = style === 'histogram' || style === 'columns';
  const isArea = style === 'area' || style === 'areabr';
  const isPointMarker = nativePlotStyleUsesPointMarkers(style);
  const histbase = Number.isFinite(plot.histbase) ? plot.histbase! : 0;
  const opacity = isNativeIndicatorPlotVisible(plot) ? 1 : 0;
  const points = useMemo(
    () => getNativeIndicatorColoredPlotPoints({ fallbackColor, plot, totalBarCount, visibleBars }),
    [fallbackColor, plot, totalBarCount, visibleBars],
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
      <Group opacity={opacity}>
        {colors.map((color) => (
          <NativeProjectedIndicatorPlotPath
            key={color}
            clip={staticClip}
            color={color}
            colorFilter={Array.isArray(plot.color) ? color : undefined}
            frame={frame}
            histbase={histbase}
            isArea={isArea}
            isHistogram={isHistogram}
            isPointMarker={isPointMarker}
            join={plot.join === true}
            opacity={1}
            pane={pane}
            projection={projection}
            strokeWidth={strokeWidth}
            style={style}
            dash={dash}
            points={points}
          />
        ))}
      </Group>
    );
  }

  return (
    <Group opacity={opacity}>
      {colors.map((color) => (
        <NativeLiveIndicatorPlotPath
          key={color}
          clip={clip}
          color={color}
          colorFilter={Array.isArray(plot.color) ? color : undefined}
          frame={frame}
          histbase={histbase}
          isArea={isArea}
          isHistogram={isHistogram}
          isPointMarker={isPointMarker}
          join={plot.join === true}
          opacity={1}
          pane={pane}
          paneRangeOverrides={paneRangeOverrides}
          sharedViewport={sharedViewport}
          strokeWidth={strokeWidth}
          style={style}
          dash={dash}
          points={points}
        />
      ))}
    </Group>
  );
}

export function NativeIndicatorPlotLayerImpl({
  frame,
  indicatorPaneInfo,
  paneRangeOverrides,
  plots,
  sharedViewport,
  staticProjection,
  textFont,
  totalBarCount,
  visibleBars,
}: {
  frame: NativeChartFrame;
  indicatorPaneInfo: Readonly<Record<string, NativeIndicatorPaneInfo>>;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  plots: readonly PlotOutput[];
  sharedViewport: NativeViewportSharedValues;
  staticProjection?: NativeChartProjection | null;
  textFont: ReturnType<typeof Skia.Font>;
  totalBarCount: number;
  visibleBars: readonly NativeVisibleBar[];
}) {
  if (plots.length === 0 || visibleBars.length === 0) return null;
  const renderablePlots = plots.filter(
    (plot) =>
      plot.type === 'plot' ||
      plot.type === 'plotbar' ||
      plot.type === 'plotcandle' ||
      plot.type === 'plotshape' ||
      plot.type === 'plotchar' ||
      plot.type === 'plotarrow' ||
      plot.type === 'hline' ||
      plot.type === 'fill' ||
      plot.type === 'bgcolor',
  );
  if (renderablePlots.length === 0) return null;

  return (
    <Group>
      {renderablePlots.map((plot) => {
        const key = `${plot.scriptId ?? 'unknown'}-${plot.id}`;
        const info = plot.scriptId ? indicatorPaneInfo[plot.scriptId] : undefined;
        if (plot.type === 'hline') {
          return (
            <NativeIndicatorHlinePath
              key={key}
              frame={frame}
              indicatorPaneInfo={info}
              paneRangeOverrides={paneRangeOverrides}
              plot={plot}
              projection={staticProjection}
              sharedViewport={sharedViewport}
            />
          );
        }
        if (plot.type === 'fill') {
          return (
            <NativeIndicatorFillPath
              key={key}
              fill={plot}
              frame={frame}
              indicatorPaneInfo={info}
              paneRangeOverrides={paneRangeOverrides}
              plots={plots}
              projection={staticProjection}
              sharedViewport={sharedViewport}
              visibleBars={visibleBars}
            />
          );
        }
        if (plot.type === 'bgcolor') {
          return (
            <NativeIndicatorBgcolorRects
              key={key}
              frame={frame}
              plot={plot}
              projection={staticProjection}
              sharedViewport={sharedViewport}
              visibleBars={visibleBars}
            />
          );
        }
        if (plot.type === 'plotbar' || plot.type === 'plotcandle') {
          return (
            <NativeIndicatorOhlcPlotPath
              key={key}
              frame={frame}
              indicatorPaneInfo={info}
              paneRangeOverrides={paneRangeOverrides}
              plot={plot}
              projection={staticProjection}
              sharedViewport={sharedViewport}
              totalBarCount={totalBarCount}
              visibleBars={visibleBars}
            />
          );
        }
        if (plot.type === 'plotarrow') {
          return (
            <NativeIndicatorPlotArrowPath
              key={key}
              frame={frame}
              indicatorPaneInfo={info}
              paneRangeOverrides={paneRangeOverrides}
              plot={plot}
              projection={staticProjection}
              sharedViewport={sharedViewport}
              totalBarCount={totalBarCount}
              visibleBars={visibleBars}
            />
          );
        }
        if (plot.type === 'plotshape' || plot.type === 'plotchar') {
          return (
            <NativeIndicatorShapeMarker
              key={key}
              frame={frame}
              indicatorPaneInfo={info}
              paneRangeOverrides={paneRangeOverrides}
              plot={plot}
              projection={staticProjection}
              sharedViewport={sharedViewport}
              textFont={textFont}
              totalBarCount={totalBarCount}
              visibleBars={visibleBars}
            />
          );
        }
        return (
          <NativeIndicatorPlotPath
            key={key}
            frame={frame}
            indicatorPaneInfo={info}
            paneRangeOverrides={paneRangeOverrides}
            plot={plot}
            projection={staticProjection}
            sharedViewport={sharedViewport}
            totalBarCount={totalBarCount}
            visibleBars={visibleBars}
          />
        );
      })}
    </Group>
  );
}

// Memoised: the chart owner re-renders on every unrelated UI state change, and
// reconciling this subtree each time was the cost behind the laggy transitions.
export const NativeIndicatorPlotLayer = memo(NativeIndicatorPlotLayerImpl);
NativeIndicatorPlotLayer.displayName = 'NativeIndicatorPlotLayer';
