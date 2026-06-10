import type { CanvasContext } from '../rendering/CanvasContext';
import type { DrawingCoordinateSpace, ResolvedUserDrawingGeometry } from './coordinates';
import type { TextLabelDrawing, UserDrawing, UserDrawingLineStyle } from './types';

import { resolveUserDrawingGeometry } from './coordinates';

export interface UserDrawingRenderOptions {
  labelPadding?: number;
  labelHeight?: number;
}

const DEFAULT_LABEL_PADDING = 6;
const DEFAULT_LABEL_HEIGHT = 20;

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
}

function renderRectangleGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'rectangle' }>,
): void {
  const { rect, drawing } = geometry;
  if (drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  applyStrokeStyle(ctx, drawing);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function renderTextLabelGeometry(
  ctx: CanvasContext,
  geometry: Extract<ResolvedUserDrawingGeometry, { kind: 'textLabel' }>,
  options: Required<UserDrawingRenderOptions>,
): void {
  const drawing = geometry.drawing as TextLabelDrawing;
  const { point } = geometry;
  const fontSize = drawing.style.fontSize ?? 12;
  const fontFamily = drawing.style.fontFamily ?? 'sans-serif';
  const padding = options.labelPadding;
  const text = drawing.text;

  ctx.font = `${fontSize}px ${fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = Math.ceil(textWidth + padding * 2);
  const boxHeight = options.labelHeight;
  const x = point.x - boxWidth / 2;
  const y = point.y - boxHeight / 2;

  if (drawing.style.fillColor) {
    ctx.fillStyle = drawing.style.fillColor;
    ctx.fillRect(x, y, boxWidth, boxHeight);
  }

  applyStrokeStyle(ctx, drawing);
  ctx.strokeRect(x, y, boxWidth, boxHeight);

  ctx.fillStyle = drawing.style.textColor ?? drawing.style.lineColor;
  ctx.textAlign = drawing.textAlign;
  ctx.textBaseline = 'middle';
  const textX =
    drawing.textAlign === 'left' ? x + padding : drawing.textAlign === 'right' ? x + boxWidth - padding : point.x;
  ctx.fillText(text, textX, point.y);
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
  };
  const geometry = resolveUserDrawingGeometry(drawing, space);

  ctx.save();
  try {
    switch (geometry.kind) {
      case 'line':
      case 'ray':
      case 'horizontalLine':
      case 'verticalLine':
        renderLineGeometry(ctx, geometry);
        break;
      case 'rectangle':
        renderRectangleGeometry(ctx, geometry);
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
