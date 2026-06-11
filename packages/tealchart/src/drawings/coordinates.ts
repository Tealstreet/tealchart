import type { Bar, ChartMargins, ComputedPane, Viewport } from '../types';
import type { UserDrawingInputPoint } from './input';
import type { BarsPatternBarSnapshot, UserDrawing, UserDrawingAnchor } from './types';

import type { DrawingArrowMark, DrawingArrowMarker } from './arrowGeometry';

import { resolveDrawingArrowMark, resolveDrawingArrowMarker } from './arrowGeometry';
import { resolveUserDrawingRiskRewardMetrics } from './riskReward';

export interface DrawingScreenPoint {
  x: number;
  y: number;
}

export interface DrawingScreenSegment {
  start: DrawingScreenPoint;
  end: DrawingScreenPoint;
}

export interface DrawingScreenPolyline {
  points: readonly DrawingScreenPoint[];
}

export interface DrawingScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingScreenCircle {
  center: DrawingScreenPoint;
  radius: number;
  rect: DrawingScreenRect;
}

export interface DrawingScreenEllipse {
  center: DrawingScreenPoint;
  radiusX: number;
  radiusY: number;
  rect: DrawingScreenRect;
}

export interface DrawingScreenParallelChannel {
  base: DrawingScreenSegment;
  parallel: DrawingScreenSegment;
  polygon: DrawingScreenPolyline;
}

export interface DrawingScreenCrossLine {
  horizontal: DrawingScreenSegment;
  vertical: DrawingScreenSegment;
  point: DrawingScreenPoint;
}

export interface DrawingScreenTrendAngle {
  segment: DrawingScreenSegment;
  label: string;
  labelPoint: DrawingScreenPoint;
  angleDegrees: number;
}

export interface DrawingScreenFibLevel {
  ratio: number;
  label: string;
  segment: DrawingScreenSegment;
  y: number;
  price: number;
}

export interface DrawingScreenFibLevels {
  rect: DrawingScreenRect;
  levels: readonly DrawingScreenFibLevel[];
}

export interface DrawingScreenRiskRewardPosition {
  entry: DrawingScreenPoint;
  target: DrawingScreenPoint;
  stop: DrawingScreenPoint;
  profitRect: DrawingScreenRect;
  riskRect: DrawingScreenRect;
  entryLine: DrawingScreenSegment;
  targetLine: DrawingScreenSegment;
  stopLine: DrawingScreenSegment;
  rewardLabel: string;
  riskLabel: string;
  ratioLabel: string;
}

export interface DrawingScreenBarsPatternBar {
  time: number;
  x: number;
  openY: number;
  highY: number;
  lowY: number;
  closeY: number;
  bodyWidth: number;
  up: boolean;
}

export interface DrawingScreenBarsPattern {
  bars: readonly DrawingScreenBarsPatternBar[];
  bounds: DrawingScreenRect;
  sourceStart: DrawingScreenPoint;
  sourceEnd: DrawingScreenPoint;
  placement: DrawingScreenPoint;
}

export interface DrawingCoordinateSpace {
  viewport: Viewport;
  pane: Pick<ComputedPane, 'id' | 'top' | 'height' | 'bottom' | 'yMin' | 'yMax'>;
  chartLeft: number;
  chartRight: number;
  bars?: readonly Bar[];
}

export interface ResolveUserDrawingInputPointOptions {
  point: DrawingScreenPoint;
  viewport: Viewport;
  panes: readonly DrawingCoordinateSpace['pane'][];
  chartLeft: number;
  chartRight: number;
}

export interface ResolveUserDrawingInputFromChartOptions {
  point: DrawingScreenPoint;
  viewport: Viewport;
  panes: readonly DrawingCoordinateSpace['pane'][];
  width: number;
  margins: Pick<ChartMargins, 'left' | 'right'>;
}

export type ResolvedUserDrawingGeometry =
  | {
      kind: 'line' | 'arrowLine' | 'ray' | 'horizontalRay' | 'horizontalLine' | 'verticalLine';
      drawing: UserDrawing;
      segment: DrawingScreenSegment;
    }
  | {
      kind: 'trendAngle';
      drawing: UserDrawing;
      angle: DrawingScreenTrendAngle;
    }
  | {
      kind: 'crossLine';
      drawing: UserDrawing;
      crossLine: DrawingScreenCrossLine;
    }
  | {
      kind: 'arrowMarker';
      drawing: UserDrawing;
      marker: DrawingArrowMarker;
    }
  | {
      kind: 'arrowMark';
      drawing: UserDrawing;
      mark: DrawingArrowMark;
    }
  | {
      kind: 'infoLine';
      drawing: UserDrawing;
      segment: DrawingScreenSegment;
    }
  | {
      kind: 'rectangle';
      drawing: UserDrawing;
      rect: DrawingScreenRect;
    }
  | {
      kind: 'circle';
      drawing: UserDrawing;
      circle: DrawingScreenCircle;
    }
  | {
      kind: 'ellipse';
      drawing: UserDrawing;
      ellipse: DrawingScreenEllipse;
    }
  | {
      kind: 'priceRange';
      drawing: UserDrawing;
      rect: DrawingScreenRect;
    }
  | {
      kind: 'datePriceRange';
      drawing: UserDrawing;
      rect: DrawingScreenRect;
    }
  | {
      kind: 'dateRange';
      drawing: UserDrawing;
      rect: DrawingScreenRect;
    }
  | {
      kind: 'longPosition' | 'shortPosition';
      drawing: UserDrawing;
      position: DrawingScreenRiskRewardPosition;
    }
  | {
      kind: 'barsPattern';
      drawing: UserDrawing;
      pattern: DrawingScreenBarsPattern;
    }
  | {
      kind: 'fibRetracement' | 'fibExtension';
      drawing: UserDrawing;
      fib: DrawingScreenFibLevels;
    }
  | {
      kind: 'path';
      drawing: UserDrawing;
      polyline: DrawingScreenPolyline;
    }
  | {
      kind: 'triangle';
      drawing: UserDrawing;
      polygon: DrawingScreenPolyline;
    }
  | {
      kind: 'parallelChannel' | 'regressionTrend';
      drawing: UserDrawing;
      channel: DrawingScreenParallelChannel;
    }
  | {
      kind: 'textLabel';
      drawing: UserDrawing;
      point: DrawingScreenPoint;
    };

export function timeToDrawingX(time: number, space: DrawingCoordinateSpace): number {
  const width = space.chartRight - space.chartLeft;
  const timeRange = space.viewport.endTime - space.viewport.startTime;
  if (timeRange === 0) return space.chartLeft + width / 2;
  return space.chartLeft + ((time - space.viewport.startTime) / timeRange) * width;
}

export function drawingXToTime(x: number, space: DrawingCoordinateSpace): number {
  const width = space.chartRight - space.chartLeft;
  if (width === 0) return space.viewport.startTime;
  const ratio = (x - space.chartLeft) / width;
  return space.viewport.startTime + ratio * (space.viewport.endTime - space.viewport.startTime);
}

export function priceToDrawingY(price: number, space: DrawingCoordinateSpace): number {
  const valueRange = space.pane.yMax - space.pane.yMin;
  if (valueRange === 0) return space.pane.top + space.pane.height / 2;
  return space.pane.top + ((space.pane.yMax - price) / valueRange) * space.pane.height;
}

export function drawingYToPrice(y: number, space: DrawingCoordinateSpace): number {
  const valueRange = space.pane.yMax - space.pane.yMin;
  if (space.pane.height === 0) return space.pane.yMax;
  const ratio = (y - space.pane.top) / space.pane.height;
  return space.pane.yMax - ratio * valueRange;
}

export function anchorToScreenPoint(anchor: UserDrawingAnchor, space: DrawingCoordinateSpace): DrawingScreenPoint {
  return {
    x: timeToDrawingX(anchor.time, space),
    y: priceToDrawingY(anchor.price, space),
  };
}

export function screenPointToAnchor(point: DrawingScreenPoint, space: DrawingCoordinateSpace): UserDrawingAnchor {
  return {
    time: drawingXToTime(point.x, space),
    price: drawingYToPrice(point.y, space),
  };
}

export function resolveUserDrawingInputPoint({
  point,
  viewport,
  panes,
  chartLeft,
  chartRight,
}: ResolveUserDrawingInputPointOptions): UserDrawingInputPoint | null {
  if (chartRight <= chartLeft || point.x < chartLeft || point.x >= chartRight) return null;

  const pane = panes.find((candidate) => candidate.height > 0 && point.y >= candidate.top && point.y < candidate.bottom);
  if (!pane) return null;

  return {
    paneId: pane.id,
    anchor: screenPointToAnchor(point, {
      viewport,
      pane,
      chartLeft,
      chartRight,
    }),
  };
}

export function resolveUserDrawingInputPointFromChart({
  point,
  viewport,
  panes,
  width,
  margins,
}: ResolveUserDrawingInputFromChartOptions): UserDrawingInputPoint | null {
  return resolveUserDrawingInputPoint({
    point,
    viewport,
    panes,
    chartLeft: margins.left,
    chartRight: width - margins.right,
  });
}

export function resolveExtendedSegment(
  start: DrawingScreenPoint,
  end: DrawingScreenPoint,
  extend: 'none' | 'left' | 'right' | 'both',
  chartLeft: number,
  chartRight: number,
): DrawingScreenSegment {
  if (extend === 'none' || start.x === end.x) {
    return { start, end };
  }

  const slope = (end.y - start.y) / (end.x - start.x);
  const yAt = (x: number): number => start.y + slope * (x - start.x);

  return {
    start: extend === 'left' || extend === 'both' ? { x: chartLeft, y: yAt(chartLeft) } : start,
    end: extend === 'right' || extend === 'both' ? { x: chartRight, y: yAt(chartRight) } : end,
  };
}

export function resolveRaySegment(
  start: DrawingScreenPoint,
  through: DrawingScreenPoint,
  chartLeft: number,
  chartRight: number,
  paneTop?: number,
  paneBottom?: number,
): DrawingScreenSegment {
  if (start.x === through.x && start.y !== through.y && paneTop !== undefined && paneBottom !== undefined) {
    return {
      start,
      end: {
        x: start.x,
        y: through.y < start.y ? paneTop : paneBottom,
      },
    };
  }

  const extend = through.x >= start.x ? 'right' : 'left';
  return resolveExtendedSegment(start, through, extend, chartLeft, chartRight);
}

export function formatTrendAngleDegrees(angleDegrees: number): string {
  const rounded = Math.round(angleDegrees * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}°`;
}

export function resolveTrendAngleFromSegment(segment: DrawingScreenSegment): DrawingScreenTrendAngle {
  const useOriginalOrder =
    segment.start.x < segment.end.x || (segment.start.x === segment.end.x && segment.start.y >= segment.end.y);
  const start = useOriginalOrder ? segment.start : segment.end;
  const end = useOriginalOrder ? segment.end : segment.start;
  const dx = end.x - start.x;
  const dy = start.y - end.y;
  const angleDegrees = dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    segment,
    angleDegrees,
    label: formatTrendAngleDegrees(angleDegrees),
    labelPoint: {
      x: (segment.start.x + segment.end.x) / 2,
      y: (segment.start.y + segment.end.y) / 2 - 4,
    },
  };
}

export function resolveRectFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenRect {
  const a = anchorToScreenPoint(first, space);
  const b = anchorToScreenPoint(second, space);
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function resolveCircleFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenCircle {
  const rect = resolveRectFromAnchors(first, second, space);
  const diameter = Math.min(rect.width, rect.height);
  const radius = diameter / 2;
  return {
    rect,
    center: {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    },
    radius,
  };
}

export function resolveEllipseFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenEllipse {
  const rect = resolveRectFromAnchors(first, second, space);
  return {
    rect,
    center: {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    },
    radiusX: rect.width / 2,
    radiusY: rect.height / 2,
  };
}

export function resolveDateRangeRectFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenRect {
  const a = anchorToScreenPoint(first, space);
  const b = anchorToScreenPoint(second, space);
  return {
    x: Math.min(a.x, b.x),
    y: space.pane.top,
    width: Math.abs(b.x - a.x),
    height: space.pane.height,
  };
}

function resolveRectBetweenY(x: number, width: number, a: number, b: number): DrawingScreenRect {
  return {
    x,
    y: Math.min(a, b),
    width,
    height: Math.abs(a - b),
  };
}

export function resolveRiskRewardPositionFromAnchors(
  kind: 'longPosition' | 'shortPosition',
  entryAnchor: UserDrawingAnchor,
  targetAnchor: UserDrawingAnchor,
  stopAnchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenRiskRewardPosition {
  const entry = anchorToScreenPoint(entryAnchor, space);
  const target = anchorToScreenPoint(targetAnchor, space);
  const stop = anchorToScreenPoint(stopAnchor, space);
  const left = Math.min(entry.x, target.x, stop.x);
  const right = Math.max(entry.x, target.x, stop.x);
  const width = right - left;
  const metrics = resolveUserDrawingRiskRewardMetrics(kind, entryAnchor, targetAnchor, stopAnchor);

  return {
    entry,
    target,
    stop,
    profitRect: resolveRectBetweenY(left, width, entry.y, target.y),
    riskRect: resolveRectBetweenY(left, width, entry.y, stop.y),
    entryLine: { start: { x: left, y: entry.y }, end: { x: right, y: entry.y } },
    targetLine: { start: { x: left, y: target.y }, end: { x: right, y: target.y } },
    stopLine: { start: { x: left, y: stop.y }, end: { x: right, y: stop.y } },
    rewardLabel: metrics.rewardLabel,
    riskLabel: metrics.riskLabel,
    ratioLabel: metrics.ratioLabel,
  };
}

export function resolvePolylineFromAnchors(
  points: readonly UserDrawingAnchor[],
  space: DrawingCoordinateSpace,
): DrawingScreenPolyline {
  return {
    points: points.map((point) => anchorToScreenPoint(point, space)),
  };
}

function isFiniteBar(bar: BarsPatternBarSnapshot | Bar): boolean {
  return (
    Number.isFinite(bar.time) &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close)
  );
}

function estimateBarsPatternBodyWidth(xs: readonly number[]): number {
  let spacing = Number.POSITIVE_INFINITY;
  for (let index = 1; index < xs.length; index++) {
    const delta = Math.abs(xs[index]! - xs[index - 1]!);
    if (delta > 0) spacing = Math.min(spacing, delta);
  }
  if (!Number.isFinite(spacing)) return 4;
  return Math.max(2, Math.min(12, spacing * 0.7));
}

function emptyBarsPatternBounds(point: DrawingScreenPoint): DrawingScreenRect {
  return { x: point.x, y: point.y, width: 0, height: 0 };
}

export function resolveBarsPatternFromAnchors(
  sourceStartAnchor: UserDrawingAnchor,
  sourceEndAnchor: UserDrawingAnchor,
  placementAnchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
  sourceBarsInput: readonly (BarsPatternBarSnapshot | Bar)[] = space.bars ?? [],
): DrawingScreenBarsPattern {
  const sourceStartTime = Math.min(sourceStartAnchor.time, sourceEndAnchor.time);
  const sourceEndTime = Math.max(sourceStartAnchor.time, sourceEndAnchor.time);
  const sourceBars = sourceBarsInput
    .filter((bar) => isFiniteBar(bar) && bar.time >= sourceStartTime && bar.time <= sourceEndTime)
    .slice()
    .sort((a, b) => a.time - b.time);
  const sourceStart = anchorToScreenPoint(sourceStartAnchor, space);
  const sourceEnd = anchorToScreenPoint(sourceEndAnchor, space);
  const placement = anchorToScreenPoint(placementAnchor, space);

  if (sourceBars.length === 0) {
    return {
      bars: [],
      bounds: emptyBarsPatternBounds(placement),
      sourceStart,
      sourceEnd,
      placement,
    };
  }

  const firstBar = sourceBars[0]!;
  const priceOffset = placementAnchor.price - firstBar.close;
  const mapped = sourceBars.map((bar) => {
    const time = placementAnchor.time + (bar.time - firstBar.time);
    return {
      time,
      x: timeToDrawingX(time, space),
      openY: priceToDrawingY(bar.open + priceOffset, space),
      highY: priceToDrawingY(bar.high + priceOffset, space),
      lowY: priceToDrawingY(bar.low + priceOffset, space),
      closeY: priceToDrawingY(bar.close + priceOffset, space),
      up: bar.close >= bar.open,
    };
  });
  const bodyWidth = estimateBarsPatternBodyWidth(mapped.map((bar) => bar.x));
  const bars = mapped.map((bar) => ({ ...bar, bodyWidth }));
  const minX = Math.min(...bars.map((bar) => bar.x - bodyWidth / 2));
  const maxX = Math.max(...bars.map((bar) => bar.x + bodyWidth / 2));
  const minY = Math.min(...bars.flatMap((bar) => [bar.openY, bar.highY, bar.lowY, bar.closeY]));
  const maxY = Math.max(...bars.flatMap((bar) => [bar.openY, bar.highY, bar.lowY, bar.closeY]));

  return {
    bars,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    sourceStart,
    sourceEnd,
    placement,
  };
}

export const FIB_RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618] as const;
export const FIB_EXTENSION_LEVELS = [0, 0.382, 0.618, 1, 1.272, 1.414, 1.618, 2, 2.618] as const;

export function formatFibRetracementRatio(ratio: number): string {
  return ratio === 0 || ratio === 0.5 || ratio === 1 ? String(ratio) : ratio.toFixed(3);
}

export function resolveFibLevelsFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
  levels: readonly number[],
): DrawingScreenFibLevels {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const x1 = Math.min(start.x, end.x);
  const x2 = Math.max(start.x, end.x);
  const priceDelta = second.price - first.price;

  return {
    rect: {
      x: x1,
      y: Math.min(start.y, end.y),
      width: x2 - x1,
      height: Math.abs(end.y - start.y),
    },
    levels: levels.map((ratio) => {
      const price = first.price + priceDelta * ratio;
      const y = priceToDrawingY(price, space);
      return {
        ratio,
        label: formatFibRetracementRatio(ratio),
        price,
        y,
        segment: {
          start: { x: x1, y },
          end: { x: x2, y },
        },
      };
    }),
  };
}

export function resolveFibRetracementFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibLevels {
  return resolveFibLevelsFromAnchors(first, second, space, FIB_RETRACEMENT_LEVELS);
}

export function resolveFibExtensionFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibLevels {
  return resolveFibLevelsFromAnchors(first, second, space, FIB_EXTENSION_LEVELS);
}

export function resolveParallelChannelFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  offset: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenParallelChannel {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const offsetPoint = anchorToScreenPoint(offset, space);
  const dx = offsetPoint.x - start.x;
  const dy = offsetPoint.y - start.y;
  const parallelStart = { x: start.x + dx, y: start.y + dy };
  const parallelEnd = { x: end.x + dx, y: end.y + dy };

  return {
    base: { start, end },
    parallel: { start: parallelStart, end: parallelEnd },
    polygon: {
      points: [start, end, parallelEnd, parallelStart],
    },
  };
}

function resolveRegressionPriceAt(time: number, bars: readonly Bar[]): number {
  const xOrigin = bars[0]?.time ?? time;
  let sumX = 0;
  let sumY = 0;

  for (const bar of bars) {
    sumX += bar.time - xOrigin;
    sumY += bar.close;
  }

  const meanX = sumX / bars.length;
  const meanY = sumY / bars.length;
  let numerator = 0;
  let denominator = 0;

  for (const bar of bars) {
    const x = bar.time - xOrigin;
    const dx = x - meanX;
    numerator += dx * (bar.close - meanY);
    denominator += dx * dx;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  return intercept + slope * (time - xOrigin);
}

export function resolveRegressionTrendFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  offset: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenParallelChannel {
  const startTime = Math.min(first.time, second.time);
  const endTime = Math.max(first.time, second.time);
  const regressionBars = (space.bars ?? []).filter(
    (bar) =>
      bar.time >= startTime &&
      bar.time <= endTime &&
      Number.isFinite(bar.time) &&
      Number.isFinite(bar.close),
  );

  if (regressionBars.length < 2) {
    return resolveParallelChannelFromAnchors(first, second, offset, space);
  }

  const start = anchorToScreenPoint(
    { time: first.time, price: resolveRegressionPriceAt(first.time, regressionBars) },
    space,
  );
  const end = anchorToScreenPoint(
    { time: second.time, price: resolveRegressionPriceAt(second.time, regressionBars) },
    space,
  );
  const offsetPoint = anchorToScreenPoint(offset, space);
  const dx = offsetPoint.x - start.x;
  const dy = offsetPoint.y - start.y;
  const parallelStart = { x: start.x + dx, y: start.y + dy };
  const parallelEnd = { x: end.x + dx, y: end.y + dy };

  return {
    base: { start, end },
    parallel: { start: parallelStart, end: parallelEnd },
    polygon: {
      points: [start, end, parallelEnd, parallelStart],
    },
  };
}

export function resolveUserDrawingGeometry(
  drawing: UserDrawing,
  space: DrawingCoordinateSpace,
): ResolvedUserDrawingGeometry {
  switch (drawing.kind) {
    case 'trendLine': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'line',
        drawing,
        segment: resolveExtendedSegment(start, end, drawing.extend, space.chartLeft, space.chartRight),
      };
    }
    case 'trendAngle': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'trendAngle',
        drawing,
        angle: resolveTrendAngleFromSegment({ start, end }),
      };
    }
    case 'extendedLine': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      const segment =
        start.x === end.x
          ? { start: { x: start.x, y: space.pane.top }, end: { x: start.x, y: space.pane.bottom } }
          : resolveExtendedSegment(start, end, 'both', space.chartLeft, space.chartRight);
      return {
        kind: 'line',
        drawing,
        segment,
      };
    }
    case 'infoLine': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'infoLine',
        drawing,
        segment: { start, end },
      };
    }
    case 'arrowLine': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'arrowLine',
        drawing,
        segment: { start, end },
      };
    }
    case 'arrowMarker': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'arrowMarker',
        drawing,
        marker:
          resolveDrawingArrowMarker(
            { start, end },
            {
              headLength: Math.max(22, drawing.style.lineWidth * 8),
              headWidth: Math.max(18, drawing.style.lineWidth * 7),
              tailWidth: Math.max(7, drawing.style.lineWidth * 3),
            },
          ) ?? { segment: { start, end }, points: [start] },
      };
    }
    case 'arrowMarkUp':
    case 'arrowMarkDown': {
      const point = anchorToScreenPoint(drawing.point, space);
      return {
        kind: 'arrowMark',
        drawing,
        mark: resolveDrawingArrowMark(point, drawing.kind === 'arrowMarkUp' ? 'up' : 'down', {
          height: Math.max(24, drawing.style.lineWidth * 9),
          width: Math.max(18, drawing.style.lineWidth * 7),
          stemWidth: Math.max(7, drawing.style.lineWidth * 3),
        }),
      };
    }
    case 'ray': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'ray',
        drawing,
        segment: resolveRaySegment(start, end, space.chartLeft, space.chartRight, space.pane.top, space.pane.bottom),
      };
    }
    case 'horizontalRay': {
      const start = anchorToScreenPoint(drawing.point, space);
      return {
        kind: 'horizontalRay',
        drawing,
        segment: { start, end: { x: space.chartRight, y: start.y } },
      };
    }
    case 'crossLine': {
      const point = anchorToScreenPoint(drawing.point, space);
      return {
        kind: 'crossLine',
        drawing,
        crossLine: {
          point,
          horizontal: { start: { x: space.chartLeft, y: point.y }, end: { x: space.chartRight, y: point.y } },
          vertical: { start: { x: point.x, y: space.pane.top }, end: { x: point.x, y: space.pane.bottom } },
        },
      };
    }
    case 'horizontalLine': {
      const y = priceToDrawingY(drawing.price, space);
      return {
        kind: 'horizontalLine',
        drawing,
        segment: { start: { x: space.chartLeft, y }, end: { x: space.chartRight, y } },
      };
    }
    case 'verticalLine': {
      const x = timeToDrawingX(drawing.time, space);
      return {
        kind: 'verticalLine',
        drawing,
        segment: { start: { x, y: space.pane.top }, end: { x, y: space.pane.bottom } },
      };
    }
    case 'rectangle':
      return {
        kind: 'rectangle',
        drawing,
        rect: resolveRectFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'circle':
      return {
        kind: 'circle',
        drawing,
        circle: resolveCircleFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'ellipse':
      return {
        kind: 'ellipse',
        drawing,
        ellipse: resolveEllipseFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'priceRange':
      return {
        kind: 'priceRange',
        drawing,
        rect: resolveRectFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'datePriceRange':
      return {
        kind: 'datePriceRange',
        drawing,
        rect: resolveRectFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'dateRange':
      return {
        kind: 'dateRange',
        drawing,
        rect: resolveDateRangeRectFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'longPosition':
    case 'shortPosition':
      return {
        kind: drawing.kind,
        drawing,
        position: resolveRiskRewardPositionFromAnchors(
          drawing.kind,
          drawing.points[0],
          drawing.points[1],
          drawing.points[2],
          space,
        ),
      };
    case 'barsPattern':
      return {
        kind: 'barsPattern',
        drawing,
        pattern: resolveBarsPatternFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space, drawing.bars),
      };
    case 'fibRetracement':
      return {
        kind: 'fibRetracement',
        drawing,
        fib: resolveFibRetracementFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'fibExtension':
      return {
        kind: 'fibExtension',
        drawing,
        fib: resolveFibExtensionFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'path':
      return {
        kind: 'path',
        drawing,
        polyline: resolvePolylineFromAnchors(drawing.points, space),
      };
    case 'triangle':
      return {
        kind: 'triangle',
        drawing,
        polygon: resolvePolylineFromAnchors(drawing.points, space),
      };
    case 'parallelChannel':
      return {
        kind: drawing.kind,
        drawing,
        channel: resolveParallelChannelFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'regressionTrend':
      return {
        kind: drawing.kind,
        drawing,
        channel: resolveRegressionTrendFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'textLabel':
      return {
        kind: 'textLabel',
        drawing,
        point: anchorToScreenPoint(drawing.point, space),
      };
  }
}
