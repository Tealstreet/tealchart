import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  DrawingScreenRect,
  DrawingScreenSegment,
  ResolvedUserDrawingGeometry,
} from './coordinates';
import type { UserDrawing, UserDrawingHandleRole } from './types';

import { anchorToScreenPoint, resolveUserDrawingGeometry } from './coordinates';

export interface UserDrawingHitTestOptions {
  tolerance?: number;
  handleTolerance?: number;
  labelWidth?: number;
  labelHeight?: number;
}

export interface UserDrawingHitResult {
  drawing: UserDrawing;
  handle?: UserDrawingHandleRole;
  distance: number;
}

const DEFAULT_TOLERANCE = 6;
const DEFAULT_HANDLE_TOLERANCE = 8;
const DEFAULT_LABEL_WIDTH = 72;
const DEFAULT_LABEL_HEIGHT = 24;

export function distanceBetweenPoints(a: DrawingScreenPoint, b: DrawingScreenPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceToSegment(point: DrawingScreenPoint, segment: DrawingScreenSegment): number {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return distanceBetweenPoints(point, segment.start);

  const rawT = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  return distanceBetweenPoints(point, {
    x: segment.start.x + t * dx,
    y: segment.start.y + t * dy,
  });
}

export function distanceToRectEdge(point: DrawingScreenPoint, rect: DrawingScreenRect): number {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  const insideX = point.x >= left && point.x <= right;
  const insideY = point.y >= top && point.y <= bottom;

  if (insideX && insideY) {
    return Math.min(point.x - left, right - point.x, point.y - top, bottom - point.y);
  }

  const clampedX = Math.max(left, Math.min(right, point.x));
  const clampedY = Math.max(top, Math.min(bottom, point.y));
  return Math.hypot(point.x - clampedX, point.y - clampedY);
}

function hitTestResolvedGeometry(
  geometry: ResolvedUserDrawingGeometry,
  point: DrawingScreenPoint,
  space: DrawingCoordinateSpace,
  options: Required<UserDrawingHitTestOptions>,
): UserDrawingHitResult | null {
  if (!geometry.drawing.visible || geometry.drawing.locked) return null;

  const handleHit = hitTestUserDrawingHandle(geometry, point, space, options.handleTolerance);
  if (handleHit) return handleHit;

  if (geometry.kind === 'rectangle') {
    const distance = distanceToRectEdge(point, geometry.rect);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'textLabel') {
    const rect = {
      x: geometry.point.x - options.labelWidth / 2,
      y: geometry.point.y - options.labelHeight / 2,
      width: options.labelWidth,
      height: options.labelHeight,
    };
    const inside =
      point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
    return inside ? { drawing: geometry.drawing, distance: 0 } : null;
  }

  const distance = distanceToSegment(point, geometry.segment);
  return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
}

function hitTestUserDrawingHandle(
  geometry: ResolvedUserDrawingGeometry,
  point: DrawingScreenPoint,
  space: DrawingCoordinateSpace,
  tolerance: number,
): UserDrawingHitResult | null {
  const handles: Array<{ handle: UserDrawingHandleRole; point: DrawingScreenPoint }> = [];

  switch (geometry.kind) {
    case 'line':
    case 'ray': {
      if (geometry.drawing.kind === 'trendLine' || geometry.drawing.kind === 'ray') {
        handles.push(
          { handle: 'start', point: anchorToScreenPoint(geometry.drawing.points[0], space) },
          { handle: 'end', point: anchorToScreenPoint(geometry.drawing.points[1], space) },
        );
      }
      break;
    }
    case 'rectangle':
      handles.push(
        { handle: 'topLeft', point: { x: geometry.rect.x, y: geometry.rect.y } },
        { handle: 'topRight', point: { x: geometry.rect.x + geometry.rect.width, y: geometry.rect.y } },
        {
          handle: 'bottomRight',
          point: { x: geometry.rect.x + geometry.rect.width, y: geometry.rect.y + geometry.rect.height },
        },
        { handle: 'bottomLeft', point: { x: geometry.rect.x, y: geometry.rect.y + geometry.rect.height } },
      );
      break;
    case 'textLabel':
      handles.push({ handle: 'center', point: geometry.point });
      break;
    case 'horizontalLine':
    case 'verticalLine':
      break;
  }

  for (const candidate of handles) {
    const distance = distanceBetweenPoints(point, candidate.point);
    if (distance <= tolerance) {
      return { drawing: geometry.drawing, handle: candidate.handle, distance };
    }
  }

  return null;
}

export function hitTestUserDrawing(
  drawing: UserDrawing,
  point: DrawingScreenPoint,
  space: DrawingCoordinateSpace,
  options: UserDrawingHitTestOptions = {},
): UserDrawingHitResult | null {
  if (
    point.x < space.chartLeft ||
    point.x >= space.chartRight ||
    point.y < space.pane.top ||
    point.y >= space.pane.bottom
  ) {
    return null;
  }

  return hitTestResolvedGeometry(resolveUserDrawingGeometry(drawing, space), point, space, {
    tolerance: options.tolerance ?? DEFAULT_TOLERANCE,
    handleTolerance: options.handleTolerance ?? DEFAULT_HANDLE_TOLERANCE,
    labelWidth: options.labelWidth ?? DEFAULT_LABEL_WIDTH,
    labelHeight: options.labelHeight ?? DEFAULT_LABEL_HEIGHT,
  });
}

export function hitTestUserDrawings(
  drawings: readonly UserDrawing[],
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: UserDrawingHitTestOptions = {},
): UserDrawingHitResult | null {
  for (let index = drawings.length - 1; index >= 0; index--) {
    const drawing = drawings[index]!;
    const space = spacesByPaneId.get(drawing.paneId);
    if (!space) continue;

    const hit = hitTestUserDrawing(drawing, point, space, options);
    if (hit) return hit;
  }

  return null;
}
