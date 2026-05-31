import type { BoxDrawingOutput, LabelDrawingOutput, LineDrawingOutput } from '@tealstreet/tealscript';
import type { Bar, ComputedPane, Viewport } from '../types';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingSegment {
  start: DrawingPoint;
  end: DrawingPoint;
}

export interface DrawingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingCoordinateResolvers {
  timeToX(time: number, viewport: Viewport, chartWidth: number): number;
  valueToY(value: number, pane: ComputedPane): number;
}

export function barIndexToTime(index: number, bars: readonly Bar[]): number | null {
  if (bars.length === 0 || !Number.isFinite(index)) return null;

  const roundedIndex = Math.trunc(index);
  if (roundedIndex >= 0 && roundedIndex < bars.length) {
    return bars[roundedIndex]?.time ?? null;
  }

  const interval = bars.length > 1 ? bars[1]!.time - bars[0]!.time : 60_000;
  return bars[0]!.time + roundedIndex * interval;
}

export function resolveExtendedLineSegment(
  start: DrawingPoint,
  end: DrawingPoint,
  extend: string,
  minX: number,
  maxX: number,
): DrawingSegment {
  if (start.x === end.x) {
    return { start, end };
  }

  const slope = (end.y - start.y) / (end.x - start.x);
  const yAt = (x: number): number => start.y + slope * (x - start.x);
  let nextStart = start;
  let nextEnd = end;

  if (extend === 'left' || extend === 'both') {
    nextStart = { x: minX, y: yAt(minX) };
  }
  if (extend === 'right' || extend === 'both') {
    nextEnd = { x: maxX, y: yAt(maxX) };
  }

  return { start: nextStart, end: nextEnd };
}

export function resolveLineDrawingPoint(
  xValue: number | null,
  yValue: number | null,
  xloc: string,
  bars: readonly Bar[],
  viewport: Viewport,
  pane: ComputedPane,
  chartWidth: number,
  resolvers: DrawingCoordinateResolvers,
): DrawingPoint | null {
  if (xValue === null || yValue === null || !Number.isFinite(xValue) || !Number.isFinite(yValue)) {
    return null;
  }

  const time = xloc === 'bar_time' ? xValue : barIndexToTime(xValue, bars);
  if (time === null) return null;

  const x = resolvers.timeToX(time, viewport, chartWidth);
  const y = resolvers.valueToY(yValue, pane);
  return { x, y };
}

export function resolveLineDrawingSegment(
  line: LineDrawingOutput,
  bars: readonly Bar[],
  viewport: Viewport,
  pane: ComputedPane,
  chartWidth: number,
  minX: number,
  maxX: number,
  resolvers: DrawingCoordinateResolvers,
): DrawingSegment | null {
  const start = resolveLineDrawingPoint(line.x1, line.y1, line.xloc, bars, viewport, pane, chartWidth, resolvers);
  const end = resolveLineDrawingPoint(line.x2, line.y2, line.xloc, bars, viewport, pane, chartWidth, resolvers);
  if (!start || !end) return null;
  return resolveExtendedLineSegment(start, end, line.extend, minX, maxX);
}

export function resolveBoxDrawingRect(
  box: BoxDrawingOutput,
  bars: readonly Bar[],
  viewport: Viewport,
  pane: ComputedPane,
  chartWidth: number,
  minX: number,
  maxX: number,
  resolvers: DrawingCoordinateResolvers,
): DrawingRect | null {
  if (
    box.left === null
    || box.right === null
    || box.top === null
    || box.bottom === null
    || !Number.isFinite(box.left)
    || !Number.isFinite(box.right)
    || !Number.isFinite(box.top)
    || !Number.isFinite(box.bottom)
  ) {
    return null;
  }

  const leftTime = box.xloc === 'bar_time' ? box.left : barIndexToTime(box.left, bars);
  const rightTime = box.xloc === 'bar_time' ? box.right : barIndexToTime(box.right, bars);
  if (leftTime === null || rightTime === null) return null;

  let leftX = resolvers.timeToX(leftTime, viewport, chartWidth);
  let rightX = resolvers.timeToX(rightTime, viewport, chartWidth);
  if (box.extend === 'left' || box.extend === 'both') leftX = minX;
  if (box.extend === 'right' || box.extend === 'both') rightX = maxX;

  const topY = resolvers.valueToY(box.top, pane);
  const bottomY = resolvers.valueToY(box.bottom, pane);
  const x = Math.min(leftX, rightX);
  const y = Math.min(topY, bottomY);
  return {
    x,
    y,
    width: Math.abs(rightX - leftX),
    height: Math.abs(bottomY - topY),
  };
}

export function resolveLabelDrawingPosition(
  label: LabelDrawingOutput,
  bars: readonly Bar[],
  viewport: Viewport,
  pane: ComputedPane,
  chartWidth: number,
  resolvers: DrawingCoordinateResolvers,
): DrawingPoint | null {
  const barIndex = Number.isFinite(label.barIndex) ? Math.trunc(label.barIndex) : -1;
  let time: number | undefined;
  let anchorIndex = barIndex;

  if (label.xloc === 'bar_time') {
    if (label.x === null || !Number.isFinite(label.x)) return null;
    time = label.x;
  } else {
    const xValue = label.x ?? barIndex;
    const xIndex = Number.isFinite(xValue) ? Math.trunc(xValue) : barIndex;
    anchorIndex = xIndex;
    time = xIndex >= 0 && xIndex < bars.length ? bars[xIndex].time : undefined;
  }

  const bar = anchorIndex >= 0 && anchorIndex < bars.length ? bars[anchorIndex] : undefined;
  if (time === undefined || time < viewport.startTime || time > viewport.endTime) {
    return null;
  }

  const x = resolvers.timeToX(time, viewport, chartWidth);
  let y: number;

  if (label.yloc === 'abovebar') {
    if (!bar) return null;
    y = resolvers.valueToY(bar.high, pane) - 6;
  } else if (label.yloc === 'belowbar') {
    if (!bar) return null;
    y = resolvers.valueToY(bar.low, pane) + 6;
  } else {
    if (label.y === null || !Number.isFinite(label.y)) return null;
    if (label.y < pane.yMin || label.y > pane.yMax) return null;
    y = resolvers.valueToY(label.y, pane);
  }

  return { x, y };
}
