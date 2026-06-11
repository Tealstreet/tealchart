import type { Bar, ChartMargins, ComputedPane, Viewport } from '../types';
import type { UserDrawingInputPoint } from './input';
import type { BarsPatternBarSnapshot, UserDrawing, UserDrawingAnchor, UserDrawingPathFamilyKind } from './types';

import type { DrawingArrowMark, DrawingArrowMarker } from './arrowGeometry';
import type { UserDrawingIconGeometry } from './iconGeometry';

import { resolveDrawingArrowMark, resolveDrawingArrowMarker } from './arrowGeometry';
import { resolveUserDrawingIconGeometry } from './iconGeometry';
import { resolveUserDrawingInfoLineMetrics } from './infoLine';
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

export interface DrawingScreenCurve {
  start: DrawingScreenPoint;
  control: DrawingScreenPoint;
  end: DrawingScreenPoint;
  points: readonly DrawingScreenPoint[];
}

export interface DrawingScreenArc {
  center: DrawingScreenPoint;
  radius: number;
  start: DrawingScreenPoint;
  through: DrawingScreenPoint;
  end: DrawingScreenPoint;
  startAngle: number;
  endAngle: number;
  counterclockwise: boolean;
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

export interface DrawingScreenFibCircle {
  ratio: number;
  radius: number;
  rect: DrawingScreenRect;
}

export interface DrawingScreenFibArc {
  ratio: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  rect: DrawingScreenRect;
}

export interface DrawingScreenFibCircles {
  center: DrawingScreenPoint;
  baseRadius: number;
  circles: readonly DrawingScreenFibCircle[];
}

export interface DrawingScreenFibSpeedResistanceArcs {
  center: DrawingScreenPoint;
  reference: DrawingScreenPoint;
  baseRadius: number;
  arcs: readonly DrawingScreenFibArc[];
}

export interface DrawingScreenFibWedge {
  center: DrawingScreenPoint;
  lower: DrawingScreenPoint;
  upper: DrawingScreenPoint;
  startAngle: number;
  endAngle: number;
  baseRadius: number;
  arcs: readonly DrawingScreenFibArc[];
  boundaries: readonly [DrawingScreenSegment, DrawingScreenSegment];
}

export interface DrawingScreenFibSpiral {
  center: DrawingScreenPoint;
  reference: DrawingScreenPoint;
  baseRadius: number;
  startAngle: number;
  points: readonly DrawingScreenPoint[];
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

export interface DrawingScreenPitchfork {
  median: DrawingScreenSegment;
  upper: DrawingScreenSegment;
  lower: DrawingScreenSegment;
  origin: DrawingScreenPoint;
  midpoint: DrawingScreenPoint;
}

export type DrawingPitchforkVariant = 'original' | 'schiff' | 'modifiedSchiff' | 'inside';

export interface DrawingScreenPitchfanRay {
  ratio: number;
  target: DrawingScreenPoint;
  segment: DrawingScreenSegment;
}

export interface DrawingScreenPitchfan {
  origin: DrawingScreenPoint;
  targetStart: DrawingScreenPoint;
  targetEnd: DrawingScreenPoint;
  rays: readonly DrawingScreenPitchfanRay[];
}

export interface DrawingScreenFibFan {
  origin: DrawingScreenPoint;
  targetStart: DrawingScreenPoint;
  targetEnd: DrawingScreenPoint;
  rays: readonly DrawingScreenPitchfanRay[];
}

export interface DrawingScreenFibChannelLevel {
  ratio: number;
  segment: DrawingScreenSegment;
}

export interface DrawingScreenFibChannel {
  base: DrawingScreenSegment;
  levels: readonly DrawingScreenFibChannelLevel[];
  polygon: DrawingScreenPolyline;
}

export interface DrawingScreenFibTimeZoneLevel {
  ratio: number;
  time: number;
  x: number;
  segment: DrawingScreenSegment;
}

export interface DrawingScreenFibTimeZone {
  levels: readonly DrawingScreenFibTimeZoneLevel[];
}

export type DrawingScreenCyclicLineLevel = DrawingScreenFibTimeZoneLevel;

export interface DrawingScreenCyclicLines {
  anchor: DrawingScreenPoint;
  interval: number;
  levels: readonly DrawingScreenCyclicLineLevel[];
}

export interface DrawingScreenTimeCycle {
  ratio: number;
  startTime: number;
  endTime: number;
  startBoundary: DrawingScreenSegment;
  endBoundary: DrawingScreenSegment;
  points: readonly DrawingScreenPoint[];
}

export interface DrawingScreenTimeCycles {
  baseline: DrawingScreenPoint;
  peak: DrawingScreenPoint;
  interval: number;
  cycles: readonly DrawingScreenTimeCycle[];
}

export interface DrawingScreenSineLine {
  baseline: DrawingScreenPoint;
  amplitudePoint: DrawingScreenPoint;
  cycleLength: number;
  points: readonly DrawingScreenPoint[];
}

export interface DrawingScreenGannFan {
  origin: DrawingScreenPoint;
  reference: DrawingScreenPoint;
  rays: readonly DrawingScreenPitchfanRay[];
}

export interface DrawingScreenGannBoxLevel {
  ratio: number;
  horizontal: DrawingScreenSegment;
  vertical: DrawingScreenSegment;
}

export interface DrawingScreenGannBox {
  rect: DrawingScreenRect;
  levels: readonly DrawingScreenGannBoxLevel[];
  angles: readonly DrawingScreenSegment[];
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

export interface DrawingScreenForecast {
  source: DrawingScreenPoint;
  target: DrawingScreenPoint;
  segment: DrawingScreenSegment;
  labelPoint: DrawingScreenPoint;
  sourceLabel: string;
  targetLabel: string;
  changeLabel: string;
}

export interface DrawingScreenProjection {
  start: DrawingScreenPoint;
  pivot: DrawingScreenPoint;
  target: DrawingScreenPoint;
  baseSegment: DrawingScreenSegment;
  projectionSegment: DrawingScreenSegment;
  labelPoint: DrawingScreenPoint;
  startLabel: string;
  pivotLabel: string;
  targetLabel: string;
  changeLabel: string;
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

export const ABCD_PATTERN_LABELS = ['A', 'B', 'C', 'D'] as const;
export type AbcdPatternLabel = (typeof ABCD_PATTERN_LABELS)[number];

export interface DrawingScreenAbcdPatternLabel {
  text: AbcdPatternLabel;
  point: DrawingScreenPoint;
}

export interface DrawingScreenAbcdPattern {
  polyline: DrawingScreenPolyline;
  labels: readonly DrawingScreenAbcdPatternLabel[];
}

export const XABCD_PATTERN_LABELS = ['X', 'A', 'B', 'C', 'D'] as const;
export type XabcdPatternLabel = (typeof XABCD_PATTERN_LABELS)[number];

export interface DrawingScreenXabcdPatternLabel {
  text: XabcdPatternLabel;
  point: DrawingScreenPoint;
}

export interface DrawingScreenXabcdPattern {
  polyline: DrawingScreenPolyline;
  labels: readonly DrawingScreenXabcdPatternLabel[];
}

export interface DrawingScreenAnchoredVwap {
  anchor: DrawingScreenPoint;
  points: readonly DrawingScreenPoint[];
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
      kind: 'forecast';
      drawing: UserDrawing;
      forecast: DrawingScreenForecast;
    }
  | {
      kind: 'projection';
      drawing: UserDrawing;
      projection: DrawingScreenProjection;
    }
  | {
      kind: 'barsPattern';
      drawing: UserDrawing;
      pattern: DrawingScreenBarsPattern;
    }
  | {
      kind: 'xabcdPattern';
      drawing: UserDrawing;
      pattern: DrawingScreenXabcdPattern;
    }
  | {
      kind: 'abcdPattern';
      drawing: UserDrawing;
      pattern: DrawingScreenAbcdPattern;
    }
  | {
      kind: 'fibRetracement' | 'fibExtension';
      drawing: UserDrawing;
      fib: DrawingScreenFibLevels;
    }
  | {
      kind: UserDrawingPathFamilyKind;
      drawing: UserDrawing;
      polyline: DrawingScreenPolyline;
    }
  | {
      kind: 'curve';
      drawing: UserDrawing;
      curve: DrawingScreenCurve;
    }
  | {
      kind: 'arc';
      drawing: UserDrawing;
      arc: DrawingScreenArc;
    }
  | {
      kind: 'anchoredVwap';
      drawing: UserDrawing;
      vwap: DrawingScreenAnchoredVwap;
    }
  | {
      kind: 'triangle';
      drawing: UserDrawing;
      polygon: DrawingScreenPolyline;
    }
  | {
      kind: 'pitchfork';
      drawing: UserDrawing;
      pitchfork: DrawingScreenPitchfork;
    }
  | {
      kind: 'pitchfan';
      drawing: UserDrawing;
      pitchfan: DrawingScreenPitchfan;
    }
  | {
      kind: 'fibFan';
      drawing: UserDrawing;
      fibFan: DrawingScreenFibFan;
    }
  | {
      kind: 'fibSpeedResistanceFan';
      drawing: UserDrawing;
      fibSpeedResistanceFan: DrawingScreenFibFan;
    }
  | {
      kind: 'fibSpeedResistanceArcs';
      drawing: UserDrawing;
      fibSpeedResistanceArcs: DrawingScreenFibSpeedResistanceArcs;
    }
  | {
      kind: 'fibCircles';
      drawing: UserDrawing;
      fibCircles: DrawingScreenFibCircles;
    }
  | {
      kind: 'fibWedge';
      drawing: UserDrawing;
      fibWedge: DrawingScreenFibWedge;
    }
  | {
      kind: 'fibSpiral';
      drawing: UserDrawing;
      fibSpiral: DrawingScreenFibSpiral;
    }
  | {
      kind: 'fibChannel';
      drawing: UserDrawing;
      fibChannel: DrawingScreenFibChannel;
    }
  | {
      kind: 'fibTimeZone';
      drawing: UserDrawing;
      fibTimeZone: DrawingScreenFibTimeZone;
    }
  | {
      kind: 'trendBasedFibTime';
      drawing: UserDrawing;
      trendBasedFibTime: DrawingScreenFibTimeZone;
    }
  | {
      kind: 'cyclicLines';
      drawing: UserDrawing;
      cyclicLines: DrawingScreenCyclicLines;
    }
  | {
      kind: 'timeCycles';
      drawing: UserDrawing;
      timeCycles: DrawingScreenTimeCycles;
    }
  | {
      kind: 'sineLine';
      drawing: UserDrawing;
      sineLine: DrawingScreenSineLine;
    }
  | {
      kind: 'gannFan';
      drawing: UserDrawing;
      gannFan: DrawingScreenGannFan;
    }
  | {
      kind: 'gannBox';
      drawing: UserDrawing;
      gannBox: DrawingScreenGannBox;
    }
  | {
      kind: 'gannSquare';
      drawing: UserDrawing;
      gannBox: DrawingScreenGannBox;
    }
  | {
      kind: 'parallelChannel' | 'regressionTrend' | 'flatTopBottom' | 'disjointChannel' | 'rotatedRectangle';
      drawing: UserDrawing;
      channel: DrawingScreenParallelChannel;
    }
  | {
      kind: 'textLabel' | 'note' | 'comment' | 'balloon';
      drawing: UserDrawing;
      point: DrawingScreenPoint;
    }
  | {
      kind: 'pin';
      drawing: UserDrawing;
      point: DrawingScreenPoint;
    }
  | {
      kind: 'icon';
      drawing: UserDrawing;
      icon: UserDrawingIconGeometry;
    }
  | {
      kind: 'callout' | 'priceNote';
      drawing: UserDrawing;
      tip: DrawingScreenPoint;
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

export function resolveFibCirclesFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibCircles {
  const center = anchorToScreenPoint(first, space);
  const reference = anchorToScreenPoint(second, space);
  const baseRadius = Math.hypot(reference.x - center.x, reference.y - center.y);
  return {
    center,
    baseRadius,
    circles: FIB_CIRCLE_LEVELS.map((ratio) => {
      const radius = baseRadius * ratio;
      return {
        ratio,
        radius,
        rect: {
          x: center.x - radius,
          y: center.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
      };
    }),
  };
}

export function resolveFibSpeedResistanceArcsFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibSpeedResistanceArcs {
  const center = anchorToScreenPoint(first, space);
  const reference = anchorToScreenPoint(second, space);
  const baseRadius = Math.hypot(reference.x - center.x, reference.y - center.y);
  const endAngle = Math.atan2(reference.y - center.y, reference.x - center.x);
  const startAngle = reference.x >= center.x ? 0 : Math.PI;

  return {
    center,
    reference,
    baseRadius,
    arcs: FIB_SPEED_RESISTANCE_ARC_LEVELS.map((ratio) => {
      const radius = baseRadius * ratio;
      return {
        ratio,
        radius,
        startAngle,
        endAngle,
        rect: {
          x: center.x - radius,
          y: center.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
      };
    }),
  };
}

export function resolveFibWedgeFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  third: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibWedge {
  const center = anchorToScreenPoint(first, space);
  const lower = anchorToScreenPoint(second, space);
  const upper = anchorToScreenPoint(third, space);
  const startAngle = Math.atan2(lower.y - center.y, lower.x - center.x);
  const endAngle = Math.atan2(upper.y - center.y, upper.x - center.x);
  const baseRadius = Math.max(Math.hypot(lower.x - center.x, lower.y - center.y), Math.hypot(upper.x - center.x, upper.y - center.y));

  return {
    center,
    lower,
    upper,
    startAngle,
    endAngle,
    baseRadius,
    boundaries: [
      { start: center, end: lower },
      { start: center, end: upper },
    ],
    arcs: FIB_WEDGE_LEVELS.map((ratio) => {
      const radius = baseRadius * ratio;
      return {
        ratio,
        radius,
        startAngle,
        endAngle,
        rect: {
          x: center.x - radius,
          y: center.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
      };
    }),
  };
}

export function resolveFibSpiralFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibSpiral {
  const center = anchorToScreenPoint(first, space);
  const reference = anchorToScreenPoint(second, space);
  const baseRadius = Math.hypot(reference.x - center.x, reference.y - center.y);
  const startAngle = Math.atan2(reference.y - center.y, reference.x - center.x);
  const points = FIB_SPIRAL_STEPS.map((step) => {
    const angle = startAngle + step;
    const radius = baseRadius * Math.pow(FIB_SPIRAL_GROWTH, step / (Math.PI / 2));
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });

  return {
    center,
    reference,
    baseRadius,
    startAngle,
    points,
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

function formatForecastPriceLabel(price: number): string {
  return Number.isFinite(price) ? price.toFixed(2) : '';
}

export function resolveForecastFromAnchors(
  sourceAnchor: UserDrawingAnchor,
  targetAnchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenForecast {
  const source = anchorToScreenPoint(sourceAnchor, space);
  const target = anchorToScreenPoint(targetAnchor, space);
  const metrics = resolveUserDrawingInfoLineMetrics(sourceAnchor, targetAnchor);

  return {
    source,
    target,
    segment: { start: source, end: target },
    labelPoint: {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2 - 4,
    },
    sourceLabel: `Source ${formatForecastPriceLabel(sourceAnchor.price)}`,
    targetLabel: `Target ${formatForecastPriceLabel(targetAnchor.price)}`,
    changeLabel: metrics.label,
  };
}

export function resolveProjectionFromAnchors(
  startAnchor: UserDrawingAnchor,
  pivotAnchor: UserDrawingAnchor,
  targetAnchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenProjection {
  const start = anchorToScreenPoint(startAnchor, space);
  const pivot = anchorToScreenPoint(pivotAnchor, space);
  const target = anchorToScreenPoint(targetAnchor, space);
  const metrics = resolveUserDrawingInfoLineMetrics(pivotAnchor, targetAnchor);

  return {
    start,
    pivot,
    target,
    baseSegment: { start, end: pivot },
    projectionSegment: { start: pivot, end: target },
    labelPoint: {
      x: (pivot.x + target.x) / 2,
      y: (pivot.y + target.y) / 2 - 4,
    },
    startLabel: `Start ${formatForecastPriceLabel(startAnchor.price)}`,
    pivotLabel: `Pivot ${formatForecastPriceLabel(pivotAnchor.price)}`,
    targetLabel: `Target ${formatForecastPriceLabel(targetAnchor.price)}`,
    changeLabel: metrics.label,
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

export function resolveAbcdPatternFromAnchors(
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor],
  space: DrawingCoordinateSpace,
): DrawingScreenAbcdPattern {
  const polyline = resolvePolylineFromAnchors(points, space);
  return {
    polyline,
    labels: polyline.points.map((point, index) => ({
      text: ABCD_PATTERN_LABELS[index]!,
      point,
    })),
  };
}

export function resolveXabcdPatternFromAnchors(
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ],
  space: DrawingCoordinateSpace,
): DrawingScreenXabcdPattern {
  const polyline = resolvePolylineFromAnchors(points, space);
  return {
    polyline,
    labels: polyline.points.map((point, index) => ({
      text: XABCD_PATTERN_LABELS[index]!,
      point,
    })),
  };
}

const CURVE_SAMPLE_COUNT = 48;
const ARC_SAMPLE_COUNT = 96;

function resolveQuadraticPoint(
  start: DrawingScreenPoint,
  control: DrawingScreenPoint,
  end: DrawingScreenPoint,
  t: number,
): DrawingScreenPoint {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

export function resolveCurveFromAnchors(
  startAnchor: UserDrawingAnchor,
  controlAnchor: UserDrawingAnchor,
  endAnchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenCurve {
  const start = anchorToScreenPoint(startAnchor, space);
  const control = anchorToScreenPoint(controlAnchor, space);
  const end = anchorToScreenPoint(endAnchor, space);
  const points = Array.from({ length: CURVE_SAMPLE_COUNT + 1 }, (_, index) =>
    resolveQuadraticPoint(start, control, end, index / CURVE_SAMPLE_COUNT),
  );
  return { start, control, end, points };
}

function normalizeArcAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function isAngleOnClockwiseSweep(startAngle: number, throughAngle: number, endAngle: number): boolean {
  const sweep = normalizeArcAngle(endAngle - startAngle);
  const throughSweep = normalizeArcAngle(throughAngle - startAngle);
  return throughSweep <= sweep;
}

function resolveCircumcenter(
  start: DrawingScreenPoint,
  through: DrawingScreenPoint,
  end: DrawingScreenPoint,
): DrawingScreenPoint | null {
  const determinant =
    2 *
    (start.x * (through.y - end.y) +
      through.x * (end.y - start.y) +
      end.x * (start.y - through.y));
  if (Math.abs(determinant) < 1e-6) return null;

  const startLength = start.x * start.x + start.y * start.y;
  const throughLength = through.x * through.x + through.y * through.y;
  const endLength = end.x * end.x + end.y * end.y;
  return {
    x:
      (startLength * (through.y - end.y) +
        throughLength * (end.y - start.y) +
        endLength * (start.y - through.y)) /
      determinant,
    y:
      (startLength * (end.x - through.x) +
        throughLength * (start.x - end.x) +
        endLength * (through.x - start.x)) /
      determinant,
  };
}

export function resolveArcFromAnchors(
  startAnchor: UserDrawingAnchor,
  throughAnchor: UserDrawingAnchor,
  endAnchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenArc {
  const start = anchorToScreenPoint(startAnchor, space);
  const through = anchorToScreenPoint(throughAnchor, space);
  const end = anchorToScreenPoint(endAnchor, space);
  const center = resolveCircumcenter(start, through, end) ?? through;
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const throughAngle = Math.atan2(through.y - center.y, through.x - center.x);
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
  const counterclockwise = !isAngleOnClockwiseSweep(startAngle, throughAngle, endAngle);
  const sweep = counterclockwise
    ? -normalizeArcAngle(startAngle - endAngle)
    : normalizeArcAngle(endAngle - startAngle);
  const points =
    radius <= 0
      ? [start, through, end]
      : Array.from({ length: ARC_SAMPLE_COUNT + 1 }, (_, index) => {
          const angle = startAngle + sweep * (index / ARC_SAMPLE_COUNT);
          return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
        });

  return { center, radius, start, through, end, startAngle, endAngle, counterclockwise, points };
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
  filterBySourceRange = true,
): DrawingScreenBarsPattern {
  const sourceStartTime = Math.min(sourceStartAnchor.time, sourceEndAnchor.time);
  const sourceEndTime = Math.max(sourceStartAnchor.time, sourceEndAnchor.time);
  const sourceBars = sourceBarsInput
    .filter(
      (bar) => isFiniteBar(bar) && (!filterBySourceRange || (bar.time >= sourceStartTime && bar.time <= sourceEndTime)),
    )
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
export const FIB_FAN_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
export const FIB_SPEED_RESISTANCE_FAN_LEVELS = [1 / 3, 2 / 3, 1] as const;
export const FIB_SPEED_RESISTANCE_ARC_LEVELS = [1 / 3, 2 / 3, 1] as const;
export const FIB_CIRCLE_LEVELS = [0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618] as const;
export const FIB_WEDGE_LEVELS = [0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618] as const;
export const FIB_SPIRAL_GROWTH = 1.618033988749895;
export const FIB_SPIRAL_TURNS = 4;
export const FIB_SPIRAL_SEGMENTS_PER_TURN = 64;
export const FIB_SPIRAL_STEPS = Array.from(
  { length: FIB_SPIRAL_TURNS * FIB_SPIRAL_SEGMENTS_PER_TURN + 1 },
  (_, index) => (index / FIB_SPIRAL_SEGMENTS_PER_TURN) * Math.PI * 2,
);
export const FIB_CHANNEL_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2] as const;
export const FIB_TIME_ZONE_LEVELS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55] as const;
export const CYCLIC_LINES_MAX_VISIBLE_LEVELS = 401;
export const TIME_CYCLES_MAX_VISIBLE_CYCLES = 160;
export const TIME_CYCLES_POINTS_PER_CYCLE = 32;
export const SINE_LINE_MAX_VISIBLE_POINTS = 640;
export const SINE_LINE_POINTS_PER_CYCLE = 64;
export const GANN_FAN_LEVELS = [
  { ratio: 0.125, label: '1/8' },
  { ratio: 0.25, label: '1/4' },
  { ratio: 1 / 3, label: '1/3' },
  { ratio: 0.5, label: '1/2' },
  { ratio: 1, label: '1/1' },
  { ratio: 2, label: '2/1' },
  { ratio: 3, label: '3/1' },
  { ratio: 4, label: '4/1' },
  { ratio: 8, label: '8/1' },
] as const;
export const GANN_BOX_LEVELS = [0, 0.125, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 0.875, 1] as const;

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

export function resolveFibFanFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibFan {
  return resolveFibFanWithLevelsFromAnchors(first, second, space, FIB_FAN_LEVELS);
}

export function resolveFibSpeedResistanceFanFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibFan {
  return resolveFibFanWithLevelsFromAnchors(first, second, space, FIB_SPEED_RESISTANCE_FAN_LEVELS);
}

function resolveFibFanWithLevelsFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
  levels: readonly number[],
): DrawingScreenFibFan {
  const origin = anchorToScreenPoint(first, space);
  const targetStart = anchorToScreenPoint({ time: second.time, price: first.price }, space);
  const targetEnd = anchorToScreenPoint(second, space);

  return {
    origin,
    targetStart,
    targetEnd,
    rays: levels.map((ratio) => {
      const target = {
        x: targetEnd.x,
        y: targetStart.y + (targetEnd.y - targetStart.y) * ratio,
      };
      return {
        ratio,
        target,
        segment: resolveRaySegment(origin, target, space.chartLeft, space.chartRight, space.pane.top, space.pane.bottom),
      };
    }),
  };
}

export function resolveGannFanFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenGannFan {
  const origin = anchorToScreenPoint(first, space);
  const reference = anchorToScreenPoint(second, space);
  const deltaY = reference.y - origin.y;

  return {
    origin,
    reference,
    rays: GANN_FAN_LEVELS.map((level) => {
      const target = {
        x: reference.x,
        y: origin.y + deltaY * level.ratio,
      };
      return {
        ratio: level.ratio,
        target,
        segment: resolveRaySegment(origin, target, space.chartLeft, space.chartRight, space.pane.top, space.pane.bottom),
      };
    }),
  };
}

export function resolveGannBoxFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenGannBox {
  const rect = resolveRectFromAnchors(first, second, space);
  return resolveGannBoxFromRect(rect);
}

export function resolveGannSquareFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenGannBox {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const side = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  const rect = {
    x: end.x >= start.x ? start.x : start.x - side,
    y: end.y >= start.y ? start.y : start.y - side,
    width: side,
    height: side,
  };
  return resolveGannBoxFromRect(rect);
}

function resolveGannBoxFromRect(rect: DrawingScreenRect): DrawingScreenGannBox {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const levels = GANN_BOX_LEVELS.map((ratio) => {
    const x = left + rect.width * ratio;
    const y = top + rect.height * ratio;
    return {
      ratio,
      horizontal: { start: { x: left, y }, end: { x: right, y } },
      vertical: { start: { x, y: top }, end: { x, y: bottom } },
    };
  });

  return {
    rect,
    levels,
    angles: [
      { start: { x: left, y: top }, end: { x: right, y: bottom } },
      { start: { x: left, y: bottom }, end: { x: right, y: top } },
      { start: { x: left + rect.width / 2, y: top }, end: { x: right, y: top + rect.height / 2 } },
      { start: { x: right, y: top + rect.height / 2 }, end: { x: left + rect.width / 2, y: bottom } },
      { start: { x: left + rect.width / 2, y: bottom }, end: { x: left, y: top + rect.height / 2 } },
      { start: { x: left, y: top + rect.height / 2 }, end: { x: left + rect.width / 2, y: top } },
    ],
  };
}

export function resolveFibChannelFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  offset: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibChannel {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const offsetPoint = anchorToScreenPoint(offset, space);
  const dx = offsetPoint.x - start.x;
  const dy = offsetPoint.y - start.y;
  const levelSegment = (ratio: number): DrawingScreenSegment => ({
    start: { x: start.x + dx * ratio, y: start.y + dy * ratio },
    end: { x: end.x + dx * ratio, y: end.y + dy * ratio },
  });
  const levels = FIB_CHANNEL_LEVELS.map((ratio) => ({
    ratio,
    segment: levelSegment(ratio),
  }));
  const outer = levelSegment(1);

  return {
    base: { start, end },
    levels,
    polygon: { points: [start, end, outer.end, outer.start] },
  };
}

export function resolveFibTimeZoneFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibTimeZone {
  const interval = second.time - first.time;

  return {
    levels: FIB_TIME_ZONE_LEVELS.map((ratio) => {
      const time = first.time + interval * ratio;
      const x = timeToDrawingX(time, space);
      return {
        ratio,
        time,
        x,
        segment: { start: { x, y: space.pane.top }, end: { x, y: space.pane.bottom } },
      };
    }),
  };
}

export function resolveTrendBasedFibTimeFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  origin: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenFibTimeZone {
  const interval = second.time - first.time;

  return {
    levels: FIB_TIME_ZONE_LEVELS.map((ratio) => {
      const time = origin.time + interval * ratio;
      const x = timeToDrawingX(time, space);
      return {
        ratio,
        time,
        x,
        segment: { start: { x, y: space.pane.top }, end: { x, y: space.pane.bottom } },
      };
    }),
  };
}

export function resolveCyclicLinesFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenCyclicLines {
  const anchor = anchorToScreenPoint(first, space);
  const interval = Math.abs(second.time - first.time);
  if (interval <= 0) {
    const x = timeToDrawingX(first.time, space);
    return {
      anchor,
      interval,
      levels: [
        {
          ratio: 0,
          time: first.time,
          x,
          segment: { start: { x, y: space.pane.top }, end: { x, y: space.pane.bottom } },
        },
      ],
    };
  }

  const startIndex = Math.floor((space.viewport.startTime - first.time) / interval) - 1;
  const endIndex = Math.ceil((space.viewport.endTime - first.time) / interval) + 1;
  const rawCount = Math.max(0, endIndex - startIndex + 1);
  const step = Math.max(1, Math.ceil(rawCount / CYCLIC_LINES_MAX_VISIBLE_LEVELS));
  const visibleIndexes = new Set<number>();

  for (let index = startIndex; index <= endIndex; index += step) {
    visibleIndexes.add(index);
  }
  visibleIndexes.add(0);
  visibleIndexes.add(second.time >= first.time ? 1 : -1);

  const levels: DrawingScreenCyclicLineLevel[] = [];
  for (const index of Array.from(visibleIndexes).sort((a, b) => a - b)) {
    const time = first.time + interval * index;
    const x = timeToDrawingX(time, space);
    levels.push({
      ratio: index,
      time,
      x,
      segment: { start: { x, y: space.pane.top }, end: { x, y: space.pane.bottom } },
    });
  }

  return {
    anchor,
    interval,
    levels,
  };
}

function resolveVisibleCycleIndexes(
  firstTime: number,
  secondTime: number,
  interval: number,
  space: DrawingCoordinateSpace,
): number[] {
  const startIndex = Math.floor((space.viewport.startTime - firstTime) / interval) - 1;
  const endIndex = Math.ceil((space.viewport.endTime - firstTime) / interval) + 1;
  const rawCount = Math.max(0, endIndex - startIndex + 1);
  const step = Math.max(1, Math.ceil(rawCount / TIME_CYCLES_MAX_VISIBLE_CYCLES));
  const visibleIndexes = new Set<number>();
  for (let index = startIndex; index <= endIndex; index += step) {
    visibleIndexes.add(index);
  }
  visibleIndexes.add(0);
  visibleIndexes.add(secondTime >= firstTime ? 1 : -1);
  return Array.from(visibleIndexes).sort((a, b) => a - b);
}

export function resolveTimeCyclesFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenTimeCycles {
  const baseline = anchorToScreenPoint(first, space);
  const peak = anchorToScreenPoint(second, space);
  const interval = Math.abs(second.time - first.time);
  if (interval <= 0) {
    return {
      baseline,
      peak,
      interval,
      cycles: [],
    };
  }

  const cycles = resolveVisibleCycleIndexes(first.time, second.time, interval, space).map((ratio) => {
    const startTime = first.time + interval * ratio;
    const endTime = startTime + interval;
    const startX = timeToDrawingX(startTime, space);
    const endX = timeToDrawingX(endTime, space);
    const points: DrawingScreenPoint[] = [];
    for (let step = 0; step <= TIME_CYCLES_POINTS_PER_CYCLE; step++) {
      const t = step / TIME_CYCLES_POINTS_PER_CYCLE;
      points.push({
        x: startX + (endX - startX) * t,
        y: baseline.y + (peak.y - baseline.y) * Math.sin(Math.PI * t),
      });
    }
    return {
      ratio,
      startTime,
      endTime,
      startBoundary: { start: { x: startX, y: space.pane.top }, end: { x: startX, y: space.pane.bottom } },
      endBoundary: { start: { x: endX, y: space.pane.top }, end: { x: endX, y: space.pane.bottom } },
      points,
    };
  });

  return {
    baseline,
    peak,
    interval,
    cycles,
  };
}

export function resolveSineLineFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenSineLine {
  const baseline = anchorToScreenPoint(first, space);
  const amplitudePoint = anchorToScreenPoint(second, space);
  const quarterCycle = Math.abs(second.time - first.time);
  const cycleLength = quarterCycle * 4;
  if (cycleLength <= 0) {
    return {
      baseline,
      amplitudePoint,
      cycleLength,
      points: [baseline],
    };
  }

  const direction = second.time >= first.time ? 1 : -1;
  const startCycle = Math.floor((space.viewport.startTime - first.time) / cycleLength) - 1;
  const endCycle = Math.ceil((space.viewport.endTime - first.time) / cycleLength) + 1;
  const rawPoints = Math.max(2, (endCycle - startCycle + 1) * SINE_LINE_POINTS_PER_CYCLE + 1);
  const pointStep = Math.max(1, Math.ceil(rawPoints / SINE_LINE_MAX_VISIBLE_POINTS));
  const pointsByTime = new Map<number, DrawingScreenPoint>();

  for (let index = 0; index < rawPoints; index += pointStep) {
    const cycleOffset = startCycle + index / SINE_LINE_POINTS_PER_CYCLE;
    const time = first.time + cycleLength * cycleOffset;
    const x = timeToDrawingX(time, space);
    const phase = ((time - first.time) * direction * Math.PI * 2) / cycleLength;
    pointsByTime.set(time, {
      x,
      y: baseline.y + (amplitudePoint.y - baseline.y) * Math.sin(phase),
    });
  }

  for (const time of [first.time, second.time]) {
    const x = timeToDrawingX(time, space);
    const phase = ((time - first.time) * direction * Math.PI * 2) / cycleLength;
    pointsByTime.set(time, {
      x,
      y: baseline.y + (amplitudePoint.y - baseline.y) * Math.sin(phase),
    });
  }

  return {
    baseline,
    amplitudePoint,
    cycleLength,
    points: Array.from(pointsByTime.entries())
      .sort(([a], [b]) => a - b)
      .map(([, point]) => point),
  };
}

export function resolveAnchoredVwapFromAnchor(
  anchor: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenAnchoredVwap {
  const anchorPoint = anchorToScreenPoint(anchor, space);
  const points: DrawingScreenPoint[] = [];
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (const bar of space.bars ?? []) {
    if (bar.time < anchor.time || bar.volume <= 0) continue;
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumulativeTypicalVolume += typicalPrice * bar.volume;
    cumulativeVolume += bar.volume;
    points.push({
      x: timeToDrawingX(bar.time, space),
      y: priceToDrawingY(cumulativeTypicalVolume / cumulativeVolume, space),
    });
  }

  return {
    anchor: anchorPoint,
    points,
  };
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

export function resolveRotatedRectangleFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  width: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenParallelChannel {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const widthPoint = anchorToScreenPoint(width, space);
  const edgeX = end.x - start.x;
  const edgeY = end.y - start.y;
  const length = Math.hypot(edgeX, edgeY);

  if (length === 0) {
    return {
      base: { start, end },
      parallel: { start, end },
      polygon: { points: [start, end, end, start] },
    };
  }

  const normal = { x: -edgeY / length, y: edgeX / length };
  const widthOffset = (widthPoint.x - start.x) * normal.x + (widthPoint.y - start.y) * normal.y;
  const offset = { x: normal.x * widthOffset, y: normal.y * widthOffset };
  const oppositeStart = { x: start.x + offset.x, y: start.y + offset.y };
  const oppositeEnd = { x: end.x + offset.x, y: end.y + offset.y };

  return {
    base: { start, end },
    parallel: { start: oppositeStart, end: oppositeEnd },
    polygon: {
      points: [start, end, oppositeEnd, oppositeStart],
    },
  };
}

export function resolvePitchforkFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  third: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
  variant: DrawingPitchforkVariant = 'original',
): DrawingScreenPitchfork {
  const firstPoint = anchorToScreenPoint(first, space);
  const secondPoint = anchorToScreenPoint(second, space);
  const thirdPoint = anchorToScreenPoint(third, space);
  const midpoint12 = {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  };
  const midpoint23 = {
    x: (secondPoint.x + thirdPoint.x) / 2,
    y: (secondPoint.y + thirdPoint.y) / 2,
  };
  const schiffOrigin = { x: firstPoint.x, y: midpoint12.y };
  const config =
    variant === 'schiff'
      ? { origin: schiffOrigin, midpoint: midpoint23, upperAnchor: secondPoint, lowerAnchor: thirdPoint }
      : variant === 'modifiedSchiff'
        ? { origin: midpoint12, midpoint: midpoint23, upperAnchor: secondPoint, lowerAnchor: thirdPoint }
        : variant === 'inside'
          ? { origin: midpoint12, midpoint: thirdPoint, upperAnchor: firstPoint, lowerAnchor: secondPoint }
          : { origin: firstPoint, midpoint: midpoint23, upperAnchor: secondPoint, lowerAnchor: thirdPoint };
  const direction = {
    x: config.midpoint.x - config.origin.x,
    y: config.midpoint.y - config.origin.y,
  };
  const rayDirection = direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction;

  const through = (start: DrawingScreenPoint): DrawingScreenPoint => ({
    x: start.x + rayDirection.x,
    y: start.y + rayDirection.y,
  });
  const medianThrough = direction.x === 0 && direction.y === 0 ? through(config.origin) : config.midpoint;

  return {
    median: resolveRaySegment(config.origin, medianThrough, space.chartLeft, space.chartRight, space.pane.top, space.pane.bottom),
    upper: resolveRaySegment(
      config.upperAnchor,
      through(config.upperAnchor),
      space.chartLeft,
      space.chartRight,
      space.pane.top,
      space.pane.bottom,
    ),
    lower: resolveRaySegment(
      config.lowerAnchor,
      through(config.lowerAnchor),
      space.chartLeft,
      space.chartRight,
      space.pane.top,
      space.pane.bottom,
    ),
    origin: config.origin,
    midpoint: config.midpoint,
  };
}

export const PITCHFAN_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

export function resolvePitchfanFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  third: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenPitchfan {
  const origin = anchorToScreenPoint(first, space);
  const targetStart = anchorToScreenPoint(second, space);
  const targetEnd = anchorToScreenPoint(third, space);

  return {
    origin,
    targetStart,
    targetEnd,
    rays: PITCHFAN_LEVELS.map((ratio) => {
      const target = {
        x: targetEnd.x,
        y: targetStart.y + (targetEnd.y - targetStart.y) * ratio,
      };
      return {
        ratio,
        target,
        segment: resolveRaySegment(origin, target, space.chartLeft, space.chartRight, space.pane.top, space.pane.bottom),
      };
    }),
  };
}

function pitchforkVariantForDrawingKind(kind: UserDrawing['kind']): DrawingPitchforkVariant {
  switch (kind) {
    case 'schiffPitchfork':
      return 'schiff';
    case 'modifiedSchiffPitchfork':
      return 'modifiedSchiff';
    case 'insidePitchfork':
      return 'inside';
    default:
      return 'original';
  }
}

export function resolveFlatTopBottomFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  flat: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenParallelChannel {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const flatPoint = anchorToScreenPoint(flat, space);
  const flatStart = { x: start.x, y: flatPoint.y };
  const flatEnd = { x: end.x, y: flatPoint.y };

  return {
    base: { start, end },
    parallel: { start: flatStart, end: flatEnd },
    polygon: {
      points: [start, end, flatEnd, flatStart],
    },
  };
}

export function resolveDisjointChannelFromAnchors(
  first: UserDrawingAnchor,
  second: UserDrawingAnchor,
  third: UserDrawingAnchor,
  fourth: UserDrawingAnchor,
  space: DrawingCoordinateSpace,
): DrawingScreenParallelChannel {
  const start = anchorToScreenPoint(first, space);
  const end = anchorToScreenPoint(second, space);
  const oppositeStart = anchorToScreenPoint(third, space);
  const oppositeEnd = anchorToScreenPoint(fourth, space);

  return {
    base: { start, end },
    parallel: { start: oppositeStart, end: oppositeEnd },
    polygon: {
      points: [start, end, oppositeEnd, oppositeStart],
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
    case 'forecast':
      return {
        kind: 'forecast',
        drawing,
        forecast: resolveForecastFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'projection':
      return {
        kind: 'projection',
        drawing,
        projection: resolveProjectionFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'barsPattern':
      return {
        kind: 'barsPattern',
        drawing,
        pattern: resolveBarsPatternFromAnchors(
          drawing.points[0],
          drawing.points[1],
          drawing.points[2],
          space,
          drawing.bars,
          false,
        ),
      };
    case 'xabcdPattern':
      return {
        kind: 'xabcdPattern',
        drawing,
        pattern: resolveXabcdPatternFromAnchors(drawing.points, space),
      };
    case 'abcdPattern':
      return {
        kind: 'abcdPattern',
        drawing,
        pattern: resolveAbcdPatternFromAnchors(drawing.points, space),
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
    case 'fibFan':
      return {
        kind: 'fibFan',
        drawing,
        fibFan: resolveFibFanFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'fibSpeedResistanceFan':
      return {
        kind: 'fibSpeedResistanceFan',
        drawing,
        fibSpeedResistanceFan: resolveFibSpeedResistanceFanFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'fibSpeedResistanceArcs':
      return {
        kind: 'fibSpeedResistanceArcs',
        drawing,
        fibSpeedResistanceArcs: resolveFibSpeedResistanceArcsFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'fibCircles':
      return {
        kind: 'fibCircles',
        drawing,
        fibCircles: resolveFibCirclesFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'fibWedge':
      return {
        kind: 'fibWedge',
        drawing,
        fibWedge: resolveFibWedgeFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'fibSpiral':
      return {
        kind: 'fibSpiral',
        drawing,
        fibSpiral: resolveFibSpiralFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'fibChannel':
      return {
        kind: 'fibChannel',
        drawing,
        fibChannel: resolveFibChannelFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'fibTimeZone':
      return {
        kind: 'fibTimeZone',
        drawing,
        fibTimeZone: resolveFibTimeZoneFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'trendBasedFibTime':
      return {
        kind: 'trendBasedFibTime',
        drawing,
        trendBasedFibTime: resolveTrendBasedFibTimeFromAnchors(
          drawing.points[0],
          drawing.points[1],
          drawing.points[2],
          space,
        ),
      };
    case 'cyclicLines':
      return {
        kind: 'cyclicLines',
        drawing,
        cyclicLines: resolveCyclicLinesFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'timeCycles':
      return {
        kind: 'timeCycles',
        drawing,
        timeCycles: resolveTimeCyclesFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'sineLine':
      return {
        kind: 'sineLine',
        drawing,
        sineLine: resolveSineLineFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'gannFan':
      return {
        kind: 'gannFan',
        drawing,
        gannFan: resolveGannFanFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'gannBox':
      return {
        kind: 'gannBox',
        drawing,
        gannBox: resolveGannBoxFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'gannSquare':
      return {
        kind: 'gannSquare',
        drawing,
        gannBox: resolveGannSquareFromAnchors(drawing.points[0], drawing.points[1], space),
      };
    case 'path':
    case 'brush':
    case 'highlighter':
    case 'polyline':
      return {
        kind: drawing.kind === 'polyline' ? 'path' : drawing.kind,
        drawing,
        polyline: resolvePolylineFromAnchors(drawing.points, space),
      };
    case 'curve':
      return {
        kind: 'curve',
        drawing,
        curve: resolveCurveFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'arc':
      return {
        kind: 'arc',
        drawing,
        arc: resolveArcFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'anchoredVwap':
      return {
        kind: 'anchoredVwap',
        drawing,
        vwap: resolveAnchoredVwapFromAnchor(drawing.point, space),
      };
    case 'triangle':
      return {
        kind: 'triangle',
        drawing,
        polygon: resolvePolylineFromAnchors(drawing.points, space),
      };
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
      return {
        kind: 'pitchfork',
        drawing,
        pitchfork: resolvePitchforkFromAnchors(
          drawing.points[0],
          drawing.points[1],
          drawing.points[2],
          space,
          pitchforkVariantForDrawingKind(drawing.kind),
        ),
      };
    case 'pitchfan':
      return {
        kind: 'pitchfan',
        drawing,
        pitchfan: resolvePitchfanFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'rotatedRectangle':
      return {
        kind: 'rotatedRectangle',
        drawing,
        channel: resolveRotatedRectangleFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'parallelChannel':
      return {
        kind: drawing.kind,
        drawing,
        channel: resolveParallelChannelFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'flatTopBottom':
      return {
        kind: 'flatTopBottom',
        drawing,
        channel: resolveFlatTopBottomFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'disjointChannel':
      return {
        kind: 'disjointChannel',
        drawing,
        channel: resolveDisjointChannelFromAnchors(
          drawing.points[0],
          drawing.points[1],
          drawing.points[2],
          drawing.points[3],
          space,
        ),
      };
    case 'regressionTrend':
      return {
        kind: drawing.kind,
        drawing,
        channel: resolveRegressionTrendFromAnchors(drawing.points[0], drawing.points[1], drawing.points[2], space),
      };
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'balloon':
      return {
        kind: drawing.kind,
        drawing,
        point: anchorToScreenPoint(drawing.point, space),
      };
    case 'pin':
      return {
        kind: 'pin',
        drawing,
        point: anchorToScreenPoint(drawing.point, space),
      };
    case 'icon':
      return {
        kind: 'icon',
        drawing,
        icon: resolveUserDrawingIconGeometry({
          name: drawing.iconName,
          center: anchorToScreenPoint(drawing.point, space),
        }),
      };
    case 'callout':
    case 'priceNote':
      return {
        kind: drawing.kind,
        drawing,
        tip: anchorToScreenPoint(drawing.points[0], space),
        point: anchorToScreenPoint(drawing.points[1], space),
      };
  }
}
