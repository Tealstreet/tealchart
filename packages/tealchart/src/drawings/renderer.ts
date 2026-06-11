import type { CanvasContext } from '../rendering/CanvasContext';
import type { DrawingCoordinateSpace, ResolvedUserDrawingGeometry } from './coordinates';
import type { ResolveUserDrawingRenderEntriesOptions } from './renderModel';
import type { TextLabelDrawing, UserDrawing, UserDrawingLineStyle } from './types';
import type { UserDrawingState } from './types';

import { resolveDrawingArrowHead } from './arrowGeometry';
import { resolveUserDrawingDateRangeMetrics } from './dateRange';
import { resolveUserDrawingInfoLineMetrics } from './infoLine';
import { resolveUserDrawingVisualPriceRangeMetrics } from './priceRange';
import { resolveUserDrawingHandlePoints, resolveUserDrawingRenderEntries } from './renderModel';
import { resolveUserDrawingGeometry } from './coordinates';
import { resolveUserDrawingTextLabelLayout, splitUserDrawingTextLines } from './textLayout';
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

function renderPathGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'path' }>,
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

function renderPolygonGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'arrowMarker' | 'arrowMark' | 'triangle' | 'parallelChannel' }>,
): void {
  const points =
    geometry.kind === 'arrowMarker'
      ? geometry.marker.points
      : geometry.kind === 'arrowMark'
        ? geometry.mark.points
        : geometry.kind === 'parallelChannel'
          ? geometry.channel.polygon.points
        : geometry.polygon.points;
  const [firstPoint, ...remainingPoints] = points;
  if (!firstPoint) return;

  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  for (const point of remainingPoints) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();

  const fillColor =
    geometry.kind === 'parallelChannel'
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
  const label = resolveUserDrawingInfoLineMetrics(geometry.drawing.points[0], geometry.drawing.points[1]).label;

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
  const label = resolveUserDrawingDateRangeMetrics(drawing.points[0], drawing.points[1]).label;

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
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

function renderTextLabelGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'textLabel' }>,
  options: Required<UserDrawingRenderOptions>,
): void {
  const drawing = geometry.drawing as TextLabelDrawing;
  const { point } = geometry;
  const fontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const padding = options.labelPadding;
  const text = drawing.text;

  ctx.font = `${fontSize}px ${fontFamily}`;
  const textLines = splitUserDrawingTextLines(text);
  const layout = resolveUserDrawingTextLabelLayout({
    text,
    point,
    textAlign: drawing.textAlign,
    lineWidths: textLines.map((line) => ctx.measureText(line).width),
    labelPadding: padding,
    lineHeight: Math.max(1, options.labelHeight - 2),
  });

  if (drawing.style.fillVisible !== false && drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(layout.box.x, layout.box.y, layout.box.width, layout.box.height);
  }

  if (drawing.style.lineVisible !== false) {
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
      case 'arrowLine':
        if (drawing.style.lineVisible !== false) {
          renderLineGeometry(ctx, geometry);
        }
        break;
      case 'arrowMarker':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'arrowMark':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'triangle':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'parallelChannel':
        renderPolygonGeometry(ctx, geometry);
        break;
      case 'infoLine':
        renderInfoLineGeometry(ctx, geometry);
        break;
      case 'path':
        if (drawing.style.lineVisible !== false) {
          renderPathGeometry(ctx, geometry);
        }
        break;
      case 'rectangle':
        renderRectangleGeometry(ctx, geometry);
        break;
      case 'circle':
        renderCircleGeometry(ctx, geometry);
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
      case 'fibRetracement':
      case 'fibExtension':
        renderFibLevelGeometry(ctx, geometry);
        break;
      case 'textLabel':
        renderTextLabelGeometry(ctx, geometry, resolvedOptions);
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
