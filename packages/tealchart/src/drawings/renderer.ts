import type { CanvasContext } from '../rendering/CanvasContext';
import type { DrawingCoordinateSpace, ResolvedUserDrawingGeometry } from './coordinates';
import type { ResolveUserDrawingRenderEntriesOptions } from './renderModel';
import type {
  UserDrawing,
  UserDrawingLineStyle,
  UserDrawingPathFamilyKind,
  UserDrawingTextAnnotation,
  UserDrawingTextAnnotationKind,
} from './types';
import type { UserDrawingState } from './types';

import { resolveDrawingArrowHead } from './arrowGeometry';
import { resolveUserDrawingVisualPriceRangeMetrics } from './priceRange';
import { resolveUserDrawingHandlePoints, resolveUserDrawingRenderEntries } from './renderModel';
import { resolveUserDrawingGeometry } from './coordinates';
import { resolveUserDrawingBalloonLayout, resolveUserDrawingTextLabelLayout, splitUserDrawingTextLines } from './textLayout';
import { normalizeUserDrawingFontFamily, normalizeUserDrawingFontSize, normalizeUserDrawingOpacity } from './types';

export interface UserDrawingRenderOptions {
  labelPadding?: number;
  labelHeight?: number;
  selectionHandleRadius?: number;
  draftOpacity?: number;
}

const DEFAULT_LABEL_PADDING = 6;
const DEFAULT_LABEL_HEIGHT = 20;
const DEFAULT_SELECTION_HANDLE_RADIUS = 4;
const DEFAULT_DRAFT_OPACITY = 0.65;
const RISK_REWARD_PROFIT_FILL = 'rgba(34, 197, 94, 0.18)';
const RISK_REWARD_RISK_FILL = 'rgba(244, 63, 94, 0.18)';
const RISK_REWARD_PROFIT_STROKE = '#22c55e';
const RISK_REWARD_RISK_STROKE = '#f43f5e';
const BARS_PATTERN_UP_COLOR = '#22c55e';
const BARS_PATTERN_DOWN_COLOR = '#f43f5e';

function dashForLineStyle(style: UserDrawingLineStyle): number[] {
  switch (style) {
    case 'dashed':
      return [6, 4];
    case 'dotted':
      return [2, 4];
    case 'solid':
      return [];
  }
}

function applyStrokeStyle(ctx: CanvasContext, drawing: UserDrawing): void {
  ctx.strokeStyle = drawing.style.lineColor;
  ctx.lineWidth = Math.max(1, drawing.style.lineWidth);
  ctx.setLineDash(dashForLineStyle(drawing.style.lineStyle));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function renderLineGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { segment: unknown }>,
): void {
  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(geometry.segment.start.x, geometry.segment.start.y);
  ctx.lineTo(geometry.segment.end.x, geometry.segment.end.y);
  ctx.stroke();

  if (geometry.kind === 'arrowLine') {
    const arrowHead = resolveDrawingArrowHead(geometry.segment, {
      size: Math.max(10, geometry.drawing.style.lineWidth * 5),
    });
    if (arrowHead) {
      ctx.beginPath();
      ctx.moveTo(arrowHead.left.x, arrowHead.left.y);
      ctx.lineTo(arrowHead.end.x, arrowHead.end.y);
      ctx.lineTo(arrowHead.right.x, arrowHead.right.y);
      ctx.stroke();
    }
  }
}

function renderTrendAngleGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'trendAngle' }>,
): void {
  if (geometry.drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, geometry.drawing);
    ctx.beginPath();
    ctx.moveTo(geometry.angle.segment.start.x, geometry.angle.segment.start.y);
    ctx.lineTo(geometry.angle.segment.end.x, geometry.angle.segment.end.y);
    ctx.stroke();
  }

  const fontSize = normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(geometry.drawing.style.fontFamily ?? 'sans-serif');
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = geometry.drawing.style.textColor ?? geometry.drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(geometry.angle.label, geometry.angle.labelPoint.x, geometry.angle.labelPoint.y);
}

function renderCrossLineGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'crossLine' }>,
): void {
  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(geometry.crossLine.horizontal.start.x, geometry.crossLine.horizontal.start.y);
  ctx.lineTo(geometry.crossLine.horizontal.end.x, geometry.crossLine.horizontal.end.y);
  ctx.moveTo(geometry.crossLine.vertical.start.x, geometry.crossLine.vertical.start.y);
  ctx.lineTo(geometry.crossLine.vertical.end.x, geometry.crossLine.vertical.end.y);
  ctx.stroke();
}

function renderPathGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: UserDrawingPathFamilyKind }>,
): void {
  const [firstPoint, ...remainingPoints] = geometry.polyline.points;
  if (!firstPoint) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  for (const point of remainingPoints) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function renderCurveGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'curve' }>,
): void {
  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(geometry.curve.start.x, geometry.curve.start.y);
  ctx.quadraticCurveTo(geometry.curve.control.x, geometry.curve.control.y, geometry.curve.end.x, geometry.curve.end.y);
  ctx.stroke();
}

function renderArcGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'arc' }>,
): void {
  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  if (geometry.arc.radius <= 0) {
    const [firstPoint, ...remainingPoints] = geometry.arc.points;
    if (!firstPoint) return;
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (const point of remainingPoints) {
      ctx.lineTo(point.x, point.y);
    }
  } else {
    ctx.arc(
      geometry.arc.center.x,
      geometry.arc.center.y,
      geometry.arc.radius,
      geometry.arc.startAngle,
      geometry.arc.endAngle,
      geometry.arc.counterclockwise,
    );
  }
  ctx.stroke();
}

function renderAnchoredVwapGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'anchoredVwap' }>,
): void {
  const [firstPoint, ...remainingPoints] = geometry.vwap.points;
  if (!firstPoint) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  for (const point of remainingPoints) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function renderPolygonGeometry(
  ctx: CanvasContext,
  geometry: Extract<
    ResolvedUserDrawingGeometry,
    {
      kind:
        | 'arrowMarker'
        | 'arrowMark'
        | 'icon'
        | 'triangle'
        | 'parallelChannel'
        | 'regressionTrend'
        | 'rotatedRectangle'
        | 'flatTopBottom'
        | 'disjointChannel';
    }
  >,
): void {
  const points =
    geometry.kind === 'arrowMarker'
      ? geometry.marker.points
      : geometry.kind === 'arrowMark'
        ? geometry.mark.points
        : geometry.kind === 'icon'
          ? geometry.icon.points
          : geometry.kind === 'triangle'
            ? geometry.polygon.points
            : geometry.channel.polygon.points;
  const [firstPoint, ...remainingPoints] = points;
  if (!firstPoint) return;

  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  for (const point of remainingPoints) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();

  const fillColor =
    geometry.kind === 'parallelChannel' ||
    geometry.kind === 'regressionTrend' ||
    geometry.kind === 'rotatedRectangle' ||
    geometry.kind === 'flatTopBottom' ||
    geometry.kind === 'disjointChannel'
      ? geometry.drawing.style.fillColor
      : (geometry.drawing.style.fillColor ?? geometry.drawing.style.lineColor);

  if (geometry.drawing.style.fillVisible !== false && fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  if (geometry.drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, geometry.drawing);
    ctx.stroke();
  }
}

function renderPitchforkGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'pitchfork' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(geometry.pitchfork.median.start.x, geometry.pitchfork.median.start.y);
  ctx.lineTo(geometry.pitchfork.median.end.x, geometry.pitchfork.median.end.y);
  ctx.moveTo(geometry.pitchfork.upper.start.x, geometry.pitchfork.upper.start.y);
  ctx.lineTo(geometry.pitchfork.upper.end.x, geometry.pitchfork.upper.end.y);
  ctx.moveTo(geometry.pitchfork.lower.start.x, geometry.pitchfork.lower.start.y);
  ctx.lineTo(geometry.pitchfork.lower.end.x, geometry.pitchfork.lower.end.y);
  ctx.stroke();
}

function renderPitchfanGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'pitchfan' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const ray of geometry.pitchfan.rays) {
    ctx.moveTo(ray.segment.start.x, ray.segment.start.y);
    ctx.lineTo(ray.segment.end.x, ray.segment.end.y);
  }
  ctx.stroke();
}

function renderFibFanGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibFan' | 'fibSpeedResistanceFan' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  const rays = geometry.kind === 'fibFan' ? geometry.fibFan.rays : geometry.fibSpeedResistanceFan.rays;
  ctx.beginPath();
  for (const ray of rays) {
    ctx.moveTo(ray.segment.start.x, ray.segment.start.y);
    ctx.lineTo(ray.segment.end.x, ray.segment.end.y);
  }
  ctx.stroke();
}

function renderGannFanGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'gannFan' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const ray of geometry.gannFan.rays) {
    ctx.moveTo(ray.segment.start.x, ray.segment.start.y);
    ctx.lineTo(ray.segment.end.x, ray.segment.end.y);
  }
  ctx.stroke();
}

function renderGannBoxGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'gannBox' | 'gannSquare' }>,
): void {
  const { drawing, gannBox } = geometry;
  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(gannBox.rect.x, gannBox.rect.y, gannBox.rect.width, gannBox.rect.height);
  }

  if (drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, drawing);
  ctx.beginPath();
  for (const level of gannBox.levels) {
    ctx.moveTo(level.horizontal.start.x, level.horizontal.start.y);
    ctx.lineTo(level.horizontal.end.x, level.horizontal.end.y);
    ctx.moveTo(level.vertical.start.x, level.vertical.start.y);
    ctx.lineTo(level.vertical.end.x, level.vertical.end.y);
  }
  for (const angle of gannBox.angles) {
    ctx.moveTo(angle.start.x, angle.start.y);
    ctx.lineTo(angle.end.x, angle.end.y);
  }
  ctx.stroke();
}

function renderFibChannelGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibChannel' }>,
): void {
  if (geometry.drawing.style.fillVisible !== false && geometry.drawing.style.fillColor) {
    const [firstPoint, ...remainingPoints] = geometry.fibChannel.polygon.points;
    if (firstPoint) {
      ctx.beginPath();
      ctx.moveTo(firstPoint.x, firstPoint.y);
      for (const point of remainingPoints) {
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.fillStyle = geometry.drawing.style.fillColor;
      ctx.fill();
    }
  }

  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const level of geometry.fibChannel.levels) {
    ctx.moveTo(level.segment.start.x, level.segment.start.y);
    ctx.lineTo(level.segment.end.x, level.segment.end.y);
  }
  ctx.stroke();
}

function renderFibTimeZoneGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibTimeZone' | 'trendBasedFibTime' | 'cyclicLines' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  const levels =
    geometry.kind === 'fibTimeZone'
      ? geometry.fibTimeZone.levels
      : geometry.kind === 'trendBasedFibTime'
        ? geometry.trendBasedFibTime.levels
        : geometry.cyclicLines.levels;
  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const level of levels) {
    ctx.moveTo(level.segment.start.x, level.segment.start.y);
    ctx.lineTo(level.segment.end.x, level.segment.end.y);
  }
  ctx.stroke();
}

function renderTimeCyclesGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'timeCycles' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const cycle of geometry.timeCycles.cycles) {
    ctx.moveTo(cycle.startBoundary.start.x, cycle.startBoundary.start.y);
    ctx.lineTo(cycle.startBoundary.end.x, cycle.startBoundary.end.y);
    ctx.moveTo(cycle.endBoundary.start.x, cycle.endBoundary.start.y);
    ctx.lineTo(cycle.endBoundary.end.x, cycle.endBoundary.end.y);
    const [first, ...rest] = cycle.points;
    if (!first) continue;
    ctx.moveTo(first.x, first.y);
    for (const point of rest) {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();
}

function renderSineLineGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'sineLine' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  const [first, ...rest] = geometry.sineLine.points;
  if (!first) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const point of rest) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function renderInfoLineGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'infoLine' }>,
): void {
  if (geometry.drawing.style.lineVisible !== false) {
    renderLineGeometry(ctx, geometry);
  }

  if (geometry.drawing.kind !== 'infoLine') return;
  const fontSize = normalizeUserDrawingFontSize(geometry.drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(geometry.drawing.style.fontFamily ?? 'sans-serif');
  const label = geometry.infoMetrics.label;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = geometry.drawing.style.textColor ?? geometry.drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    label,
    (geometry.segment.start.x + geometry.segment.end.x) / 2,
    (geometry.segment.start.y + geometry.segment.end.y) / 2 - 4,
  );
}

function renderForecastGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'forecast' }>,
): void {
  const { forecast, drawing } = geometry;
  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.beginPath();
    ctx.moveTo(forecast.segment.start.x, forecast.segment.start.y);
    ctx.lineTo(forecast.segment.end.x, forecast.segment.end.y);
    ctx.stroke();
  }

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(forecast.sourceLabel, forecast.source.x + 4, forecast.source.y - 4);
  ctx.textAlign = 'right';
  ctx.fillText(forecast.targetLabel, forecast.target.x - 4, forecast.target.y - 4);
  ctx.textAlign = 'center';
  ctx.fillText(forecast.changeLabel, forecast.labelPoint.x, forecast.labelPoint.y);
}

function renderProjectionGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'projection' }>,
): void {
  const { projection, drawing } = geometry;
  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.beginPath();
    ctx.moveTo(projection.baseSegment.start.x, projection.baseSegment.start.y);
    ctx.lineTo(projection.baseSegment.end.x, projection.baseSegment.end.y);
    ctx.lineTo(projection.projectionSegment.end.x, projection.projectionSegment.end.y);
    ctx.stroke();
  }

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(projection.startLabel, projection.start.x + 4, projection.start.y - 4);
  ctx.fillText(projection.pivotLabel, projection.pivot.x + 4, projection.pivot.y - 4);
  ctx.textAlign = 'right';
  ctx.fillText(projection.targetLabel, projection.target.x - 4, projection.target.y - 4);
  ctx.textAlign = 'center';
  ctx.fillText(projection.changeLabel, projection.labelPoint.x, projection.labelPoint.y);
}

function renderPatternGeometry(
  ctx: CanvasContext,
  geometry: Extract<
    ResolvedUserDrawingGeometry,
    {
      kind:
        | 'xabcdPattern'
        | 'abcdPattern'
        | 'threeDrivesPattern'
        | 'elliottImpulseWave'
        | 'elliottCorrectiveWave'
        | 'elliottTriangleWave';
    }
  >,
): void {
  const { drawing, pattern } = geometry;
  const [firstPoint, ...remainingPoints] = pattern.polyline.points;
  if (!firstPoint) return;

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (const point of remainingPoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const label of pattern.labels) {
    ctx.fillText(label.text, label.point.x, label.point.y - 6);
  }
}

function renderTrianglePatternGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'trianglePattern' }>,
): void {
  const { drawing, pattern } = geometry;
  const [firstFillPoint, ...remainingFillPoints] = pattern.polygon.points;
  if (!firstFillPoint) return;

  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.beginPath();
    ctx.moveTo(firstFillPoint.x, firstFillPoint.y);
    for (const point of remainingFillPoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fill();
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.beginPath();
    for (const boundary of pattern.boundaries) {
      ctx.moveTo(boundary.start.x, boundary.start.y);
      ctx.lineTo(boundary.end.x, boundary.end.y);
    }
    ctx.stroke();
  }

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const label of pattern.labels) {
    ctx.fillText(label.text, label.point.x, label.point.y - 6);
  }
}

function renderHeadShouldersPatternGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'headShouldersPattern' }>,
): void {
  const { drawing, pattern } = geometry;
  const [firstPoint, ...remainingPoints] = pattern.polyline.points;
  if (!firstPoint) return;

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (const point of remainingPoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.moveTo(pattern.neckline.start.x, pattern.neckline.start.y);
    ctx.lineTo(pattern.neckline.end.x, pattern.neckline.end.y);
    ctx.stroke();
  }

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const label of pattern.labels) {
    ctx.fillText(label.text, label.point.x, label.point.y - 6);
  }
}

function renderRectangleGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'rectangle' }>,
): void {
  const { rect, drawing } = geometry;
  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
}

function renderCircleGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'circle' }>,
): void {
  const { circle, drawing } = geometry;
  ctx.beginPath();
  ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);

  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fill();
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.stroke();
  }
}

function renderFibCirclesGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibCircles' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const circle of geometry.fibCircles.circles) {
    ctx.moveTo(geometry.fibCircles.center.x + circle.radius, geometry.fibCircles.center.y);
    ctx.arc(geometry.fibCircles.center.x, geometry.fibCircles.center.y, circle.radius, 0, Math.PI * 2);
  }
  ctx.stroke();
}

function renderFibSpeedResistanceArcsGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibSpeedResistanceArcs' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const arc of geometry.fibSpeedResistanceArcs.arcs) {
    ctx.arc(geometry.fibSpeedResistanceArcs.center.x, geometry.fibSpeedResistanceArcs.center.y, arc.radius, arc.startAngle, arc.endAngle);
  }
  ctx.stroke();
}

function renderFibWedgeGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibWedge' }>,
): void {
  if (geometry.drawing.style.fillVisible !== false && geometry.drawing.style.fillColor) {
    const radius = geometry.fibWedge.baseRadius;
    ctx.beginPath();
    ctx.moveTo(geometry.fibWedge.center.x, geometry.fibWedge.center.y);
    ctx.lineTo(
      geometry.fibWedge.center.x + Math.cos(geometry.fibWedge.startAngle) * radius,
      geometry.fibWedge.center.y + Math.sin(geometry.fibWedge.startAngle) * radius,
    );
    ctx.arc(
      geometry.fibWedge.center.x,
      geometry.fibWedge.center.y,
      radius,
      geometry.fibWedge.startAngle,
      geometry.fibWedge.endAngle,
    );
    ctx.closePath();
    ctx.fillStyle = geometry.drawing.style.fillColor;
    ctx.fill();
  }

  if (geometry.drawing.style.lineVisible === false) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  for (const boundary of geometry.fibWedge.boundaries) {
    ctx.moveTo(boundary.start.x, boundary.start.y);
    ctx.lineTo(boundary.end.x, boundary.end.y);
  }
  for (const arc of geometry.fibWedge.arcs) {
    ctx.moveTo(
      geometry.fibWedge.center.x + Math.cos(arc.startAngle) * arc.radius,
      geometry.fibWedge.center.y + Math.sin(arc.startAngle) * arc.radius,
    );
    ctx.arc(geometry.fibWedge.center.x, geometry.fibWedge.center.y, arc.radius, arc.startAngle, arc.endAngle);
  }
  ctx.stroke();
}

function renderFibSpiralGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibSpiral' }>,
): void {
  if (geometry.drawing.style.lineVisible === false) return;

  const [firstPoint, ...remainingPoints] = geometry.fibSpiral.points;
  if (!firstPoint) return;

  applyStrokeStyle(ctx, geometry.drawing);
  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  for (const point of remainingPoints) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

function renderEllipseGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'ellipse' }>,
): void {
  const { ellipse, drawing } = geometry;
  ctx.save();
  ctx.translate(ellipse.center.x, ellipse.center.y);
  ctx.scale(ellipse.radiusX, ellipse.radiusY);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.restore();

  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fill();
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.stroke();
  }
}

function renderPriceRangeGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'priceRange' }>,
): void {
  const { rect, drawing } = geometry;
  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.kind !== 'priceRange') return;

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const label = resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function renderDateRangeGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'dateRange' }>,
): void {
  const { rect, drawing } = geometry;
  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.kind !== 'dateRange') return;

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const label = geometry.dateMetrics.label;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

function renderDatePriceRangeGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'datePriceRange' }>,
): void {
  const { rect, drawing } = geometry;
  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }

  if (drawing.kind !== 'datePriceRange') return;

  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const priceLabel = resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label;
  const dateLabel = geometry.dateMetrics.label;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceLabel, rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.fillText(dateLabel, rect.x + rect.width / 2, rect.y + rect.height - fontSize);
}

function renderRiskRewardPositionGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'longPosition' | 'shortPosition' }>,
): void {
  const { drawing, position } = geometry;
  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const labelX = position.entryLine.start.x + (position.entryLine.end.x - position.entryLine.start.x) / 2;

  if (drawing.style.fillVisible !== false) {
    ctx.fillStyle = RISK_REWARD_PROFIT_FILL;
    ctx.fillRect(position.profitRect.x, position.profitRect.y, position.profitRect.width, position.profitRect.height);
    ctx.fillStyle = RISK_REWARD_RISK_FILL;
    ctx.fillRect(position.riskRect.x, position.riskRect.y, position.riskRect.width, position.riskRect.height);
  }

  if (drawing.style.lineVisible !== false) {
    ctx.lineWidth = Math.max(1, drawing.style.lineWidth);
    ctx.setLineDash(dashForLineStyle(drawing.style.lineStyle));
    ctx.strokeStyle = RISK_REWARD_PROFIT_STROKE;
    ctx.strokeRect(position.profitRect.x, position.profitRect.y, position.profitRect.width, position.profitRect.height);
    ctx.strokeStyle = RISK_REWARD_RISK_STROKE;
    ctx.strokeRect(position.riskRect.x, position.riskRect.y, position.riskRect.width, position.riskRect.height);
    ctx.strokeStyle = drawing.style.lineColor;
    for (const segment of [position.targetLine, position.entryLine, position.stopLine]) {
      ctx.beginPath();
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);
      ctx.stroke();
    }
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(position.rewardLabel, labelX, position.profitRect.y + position.profitRect.height / 2);
  ctx.fillText(position.riskLabel, labelX, position.riskRect.y + position.riskRect.height / 2);
  ctx.fillText(position.ratioLabel, labelX, position.entry.y - fontSize);
}

function renderFibLevelGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'fibRetracement' | 'fibExtension' }>,
): void {
  const { drawing, fib } = geometry;
  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');

  if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    for (const level of fib.levels) {
      ctx.beginPath();
      ctx.moveTo(level.segment.start.x, level.segment.start.y);
      ctx.lineTo(level.segment.end.x, level.segment.end.y);
      ctx.stroke();
    }
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  for (const level of fib.levels) {
    ctx.fillText(`${level.label} ${level.price.toFixed(2)}`, level.segment.start.x + 4, level.y - 2);
  }
}

function renderBarsPatternGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'barsPattern' }>,
): void {
  if (geometry.drawing.style.lineVisible === false && geometry.drawing.style.fillVisible === false) return;

  ctx.setLineDash([]);
  ctx.lineWidth = Math.max(1, geometry.drawing.style.lineWidth);
  for (const bar of geometry.pattern.bars) {
    const color = bar.up ? BARS_PATTERN_UP_COLOR : BARS_PATTERN_DOWN_COLOR;
    const bodyTop = Math.min(bar.openY, bar.closeY);
    const bodyHeight = Math.max(1, Math.abs(bar.closeY - bar.openY));
    const bodyX = bar.x - bar.bodyWidth / 2;

    if (geometry.drawing.style.lineVisible !== false) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(bar.x, bar.highY);
      ctx.lineTo(bar.x, bar.lowY);
      ctx.stroke();
    }

    if (geometry.drawing.style.fillVisible !== false) {
      ctx.fillStyle = color;
      ctx.fillRect(bodyX, bodyTop, bar.bodyWidth, bodyHeight);
    }

    if (geometry.drawing.style.lineVisible !== false) {
      ctx.strokeStyle = geometry.drawing.style.lineColor;
      ctx.strokeRect(bodyX, bodyTop, bar.bodyWidth, bodyHeight);
    }
  }
}

function renderTextLabelGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: UserDrawingTextAnnotationKind }>,
  options: Required<UserDrawingRenderOptions>,
): void {
  const drawing = geometry.drawing as UserDrawingTextAnnotation;
  const { point } = geometry;
  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const padding = options.labelPadding;
  const text = drawing.text;

  ctx.font = `${fontSize}px ${fontFamily}`;
  const textLines = splitUserDrawingTextLines(text);
  const lineWidths = textLines.map((line) => ctx.measureText(line).width);
  const lineHeight = Math.max(1, options.labelHeight - 2);
  const balloonLayout =
    geometry.kind === 'balloon'
      ? resolveUserDrawingBalloonLayout({
          text,
          point,
          textAlign: drawing.textAlign,
          lineWidths,
          labelPadding: padding,
          lineHeight,
        })
      : null;
  const layout =
    balloonLayout ??
    resolveUserDrawingTextLabelLayout({
      text,
      point,
      textAlign: drawing.textAlign,
      lineWidths,
      labelPadding: padding,
      lineHeight,
    });

  if (geometry.kind === 'callout' || geometry.kind === 'priceNote') {
    applyStrokeStyle(ctx, drawing);
    ctx.beginPath();
    ctx.moveTo(geometry.tip.x, geometry.tip.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  if (balloonLayout && drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(layout.box.x, layout.box.y, layout.box.width, layout.box.height);
    ctx.beginPath();
    ctx.moveTo(balloonLayout.tail.left.x, balloonLayout.tail.left.y);
    ctx.lineTo(balloonLayout.tail.tip.x, balloonLayout.tail.tip.y);
    ctx.lineTo(balloonLayout.tail.right.x, balloonLayout.tail.right.y);
    ctx.closePath();
    ctx.fill();
  } else if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(layout.box.x, layout.box.y, layout.box.width, layout.box.height);
  }

  if (balloonLayout && drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.strokeRect(layout.box.x, layout.box.y, layout.box.width, layout.box.height);
    ctx.beginPath();
    ctx.moveTo(balloonLayout.tail.left.x, balloonLayout.tail.left.y);
    ctx.lineTo(balloonLayout.tail.tip.x, balloonLayout.tail.tip.y);
    ctx.lineTo(balloonLayout.tail.right.x, balloonLayout.tail.right.y);
    ctx.stroke();
  } else if (drawing.style.lineVisible !== false) {
    applyStrokeStyle(ctx, drawing);
    ctx.strokeRect(layout.box.x, layout.box.y, layout.box.width, layout.box.height);
  }

  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const line of layout.lines) {
    ctx.fillText(line.text, line.x, line.y);
  }
}

function renderPinGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'pin' }>,
  options: Required<UserDrawingRenderOptions>,
): void {
  const radius = Math.max(4, options.selectionHandleRadius);
  const stem = radius * 1.8;
  const { point, drawing } = geometry;

  applyStrokeStyle(ctx, drawing);
  ctx.fillStyle = drawing.style.fillColor ?? drawing.style.lineColor;
  ctx.beginPath();
  ctx.arc(point.x, point.y - stem, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(point.x, point.y - stem + radius);
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

function renderSelectionHandles(
  ctx: CanvasContext,
  drawing: UserDrawing,
  space: DrawingCoordinateSpace,
  options: Required<UserDrawingRenderOptions>,
): void {
  const points = resolveUserDrawingHandlePoints(drawing, space);
  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(space.chartLeft, space.pane.top, space.chartRight - space.chartLeft, space.pane.height);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = drawing.style.lineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, options.selectionHandleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } finally {
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export function renderUserDrawing(
  ctx: CanvasContext,
  drawing: UserDrawing,
  space: DrawingCoordinateSpace,
  options: UserDrawingRenderOptions = {},
): void {
  if (!drawing.visible) return;

  const resolvedOptions = {
    labelPadding: options.labelPadding ?? DEFAULT_LABEL_PADDING,
    labelHeight: options.labelHeight ?? DEFAULT_LABEL_HEIGHT,
    selectionHandleRadius: options.selectionHandleRadius ?? DEFAULT_SELECTION_HANDLE_RADIUS,
    draftOpacity: options.draftOpacity ?? DEFAULT_DRAFT_OPACITY,
  };
  const geometry = resolveUserDrawingGeometry(drawing, space);

  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(space.chartLeft, space.pane.top, space.chartRight - space.chartLeft, space.pane.height);
    ctx.clip();
    ctx.globalAlpha *= normalizeUserDrawingOpacity(drawing.style.opacity ?? 1);

    switch (geometry.kind) {
      case 'line':
      case 'ray':
      case 'horizontalRay':
      case 'horizontalLine':
      case 'verticalLine':
        if (drawing.style.lineVisible !== false) {
          renderLineGeometry(ctx, geometry);
        }
        break;
      case 'crossLine':
        if (drawing.style.lineVisible !== false) {
          renderCrossLineGeometry(ctx, geometry);
        }
        break;
      case 'arrowLine':
        if (drawing.style.lineVisible !== false) {
          renderLineGeometry(ctx, geometry);
        }
        break;
      case 'trendAngle':
        renderTrendAngleGeometry(ctx, geometry);
        break;
      case 'arrowMarker':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'arrowMark':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'icon':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'triangle':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'pitchfork':
        renderPitchforkGeometry(ctx, geometry);
        break;
      case 'pitchfan':
        renderPitchfanGeometry(ctx, geometry);
        break;
      case 'fibFan':
      case 'fibSpeedResistanceFan':
        renderFibFanGeometry(ctx, geometry);
        break;
      case 'gannFan':
        renderGannFanGeometry(ctx, geometry);
        break;
      case 'gannBox':
      case 'gannSquare':
        renderGannBoxGeometry(ctx, geometry);
        break;
      case 'fibChannel':
        renderFibChannelGeometry(ctx, geometry);
        break;
      case 'fibTimeZone':
      case 'trendBasedFibTime':
      case 'cyclicLines':
        renderFibTimeZoneGeometry(ctx, geometry);
        break;
      case 'timeCycles':
        renderTimeCyclesGeometry(ctx, geometry);
        break;
      case 'sineLine':
        renderSineLineGeometry(ctx, geometry);
        break;
      case 'forecast':
        renderForecastGeometry(ctx, geometry);
        break;
      case 'projection':
        renderProjectionGeometry(ctx, geometry);
        break;
      case 'trianglePattern':
        renderTrianglePatternGeometry(ctx, geometry);
        break;
      case 'xabcdPattern':
        renderPatternGeometry(ctx, geometry);
        break;
      case 'threeDrivesPattern':
        renderPatternGeometry(ctx, geometry);
        break;
      case 'elliottImpulseWave':
        renderPatternGeometry(ctx, geometry);
        break;
      case 'elliottCorrectiveWave':
        renderPatternGeometry(ctx, geometry);
        break;
      case 'elliottTriangleWave':
        renderPatternGeometry(ctx, geometry);
        break;
      case 'headShouldersPattern':
        renderHeadShouldersPatternGeometry(ctx, geometry);
        break;
      case 'abcdPattern':
        renderPatternGeometry(ctx, geometry);
        break;
      case 'parallelChannel':
      case 'regressionTrend':
      case 'rotatedRectangle':
      case 'flatTopBottom':
      case 'disjointChannel':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'infoLine':
        renderInfoLineGeometry(ctx, geometry);
        break;
      case 'path':
      case 'brush':
      case 'highlighter':
        if (drawing.style.lineVisible !== false) {
          renderPathGeometry(ctx, geometry);
        }
        break;
      case 'curve':
        if (drawing.style.lineVisible !== false) {
          renderCurveGeometry(ctx, geometry);
        }
        break;
      case 'arc':
        if (drawing.style.lineVisible !== false) {
          renderArcGeometry(ctx, geometry);
        }
        break;
      case 'anchoredVwap':
        if (drawing.style.lineVisible !== false) {
          renderAnchoredVwapGeometry(ctx, geometry);
        }
        break;
      case 'rectangle':
        renderRectangleGeometry(ctx, geometry);
        break;
      case 'circle':
        renderCircleGeometry(ctx, geometry);
        break;
      case 'fibCircles':
        renderFibCirclesGeometry(ctx, geometry);
        break;
      case 'fibSpeedResistanceArcs':
        renderFibSpeedResistanceArcsGeometry(ctx, geometry);
        break;
      case 'fibWedge':
        renderFibWedgeGeometry(ctx, geometry);
        break;
      case 'fibSpiral':
        renderFibSpiralGeometry(ctx, geometry);
        break;
      case 'ellipse':
        renderEllipseGeometry(ctx, geometry);
        break;
      case 'priceRange':
        renderPriceRangeGeometry(ctx, geometry);
        break;
      case 'dateRange':
        renderDateRangeGeometry(ctx, geometry);
        break;
      case 'datePriceRange':
        renderDatePriceRangeGeometry(ctx, geometry);
        break;
      case 'longPosition':
      case 'shortPosition':
        renderRiskRewardPositionGeometry(ctx, geometry);
        break;
      case 'fibRetracement':
      case 'fibExtension':
        renderFibLevelGeometry(ctx, geometry);
        break;
      case 'barsPattern':
        renderBarsPatternGeometry(ctx, geometry);
        break;
      case 'textLabel':
      case 'note':
      case 'callout':
      case 'comment':
      case 'priceNote':
      case 'balloon':
        renderTextLabelGeometry(ctx, geometry, resolvedOptions);
        break;
      case 'pin':
        renderPinGeometry(ctx, geometry, resolvedOptions);
        break;
    }
  } finally {
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export function renderUserDrawings(
  ctx: CanvasContext,
  drawings: readonly UserDrawing[],
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: UserDrawingRenderOptions = {},
): void {
  for (const drawing of drawings) {
    const space = spacesByPaneId.get(drawing.paneId);
    if (!space) continue;
    renderUserDrawing(ctx, drawing, space, options);
  }
}

export function renderUserDrawingLayer(
  ctx: CanvasContext,
  state: UserDrawingState,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: UserDrawingRenderOptions & ResolveUserDrawingRenderEntriesOptions = {},
): void {
  const resolvedOptions = {
    labelPadding: options.labelPadding ?? DEFAULT_LABEL_PADDING,
    labelHeight: options.labelHeight ?? DEFAULT_LABEL_HEIGHT,
    selectionHandleRadius: options.selectionHandleRadius ?? DEFAULT_SELECTION_HANDLE_RADIUS,
    draftOpacity: options.draftOpacity ?? DEFAULT_DRAFT_OPACITY,
  };

  const entries = resolveUserDrawingRenderEntries(state, options);

  for (const entry of entries) {
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;

    if (entry.phase === 'draft') {
      ctx.save();
      try {
        ctx.globalAlpha *= resolvedOptions.draftOpacity;
        renderUserDrawing(ctx, entry.drawing, space, resolvedOptions);
      } finally {
        ctx.restore();
      }
      continue;
    }

    renderUserDrawing(ctx, entry.drawing, space, resolvedOptions);
  }

  for (const entry of entries) {
    if (!entry.selected || !entry.drawing.visible) continue;
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;
    renderSelectionHandles(ctx, entry.drawing, space, resolvedOptions);
  }
}
