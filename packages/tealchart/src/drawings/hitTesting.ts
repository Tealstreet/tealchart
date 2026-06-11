import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  DrawingScreenRect,
  DrawingScreenSegment,
  ResolvedUserDrawingGeometry,
} from './coordinates';
import type { TextLabelDrawing, UserDrawing, UserDrawingHandleRole } from './types';

import { anchorToScreenPoint, resolveUserDrawingGeometry } from './coordinates';
import { resolveUserDrawingTextLabelLayout, splitUserDrawingTextLines } from './textLayout';

export interface UserDrawingHitTestOptions {
  tolerance?: number;
  handleTolerance?: number;
  labelWidth?: number;
  labelHeight?: number;
  measureTextLabelLine?: UserDrawingHitTestTextMeasure;
}

export interface UserDrawingHitResult {
  drawing: UserDrawing;
  handle?: UserDrawingHandleRole;
  pointIndex?: number;
  distance: number;
}

export type UserDrawingHitTestTextMeasure = (drawing: TextLabelDrawing, line: string) => number;

interface ResolvedUserDrawingHitTestOptions {
  tolerance: number;
  handleTolerance: number;
  labelWidth: number;
  labelHeight: number;
  measureTextLabelLine?: UserDrawingHitTestTextMeasure;
}

const DEFAULT_TOLERANCE = 6;
const DEFAULT_HANDLE_TOLERANCE = 8;
const DEFAULT_LABEL_WIDTH = 72;
const DEFAULT_LABEL_HEIGHT = 20;
const ELLIPSE_HIT_TEST_SEGMENTS = 96;

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

function distanceToCircleEdge(point: DrawingScreenPoint, center: DrawingScreenPoint, radius: number): number {
  return Math.abs(distanceBetweenPoints(point, center) - radius);
}

function distanceToEllipseEdge(
  point: DrawingScreenPoint,
  center: DrawingScreenPoint,
  radiusX: number,
  radiusY: number,
): number {
  if (radiusX <= 0 || radiusY <= 0) return distanceBetweenPoints(point, center);

  let distance = Number.POSITIVE_INFINITY;
  let previous = {
    x: center.x + radiusX,
    y: center.y,
  };

  for (let index = 1; index <= ELLIPSE_HIT_TEST_SEGMENTS; index++) {
    const angle = (index / ELLIPSE_HIT_TEST_SEGMENTS) * Math.PI * 2;
    const current = {
      x: center.x + radiusX * Math.cos(angle),
      y: center.y + radiusY * Math.sin(angle),
    };
    distance = Math.min(distance, distanceToSegment(point, { start: previous, end: current }));
    previous = current;
  }

  return distance;
}

function distanceToPolyline(point: DrawingScreenPoint, points: readonly DrawingScreenPoint[]): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return distanceBetweenPoints(point, points[0]!);

  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index++) {
    distance = Math.min(
      distance,
      distanceToSegment(point, {
        start: points[index - 1]!,
        end: points[index]!,
      }),
    );
  }
  return distance;
}

function pointInPolygon(point: DrawingScreenPoint, polygon: readonly DrawingScreenPoint[]): boolean {
  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current = polygon[index]!;
    const previous = polygon[previousIndex]!;
    if (
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function distanceToClosedPolyline(point: DrawingScreenPoint, points: readonly DrawingScreenPoint[]): number {
  if (points.length < 2) return Number.POSITIVE_INFINITY;

  let distance = distanceToPolyline(point, points);
  distance = Math.min(
    distance,
    distanceToSegment(point, {
      start: points[points.length - 1]!,
      end: points[0]!,
    }),
  );
  return distance;
}

function hitTestResolvedGeometry(
  geometry: ResolvedUserDrawingGeometry,
  point: DrawingScreenPoint,
  space: DrawingCoordinateSpace,
  options: ResolvedUserDrawingHitTestOptions,
): UserDrawingHitResult | null {
  if (!geometry.drawing.visible || geometry.drawing.locked) return null;

  const handleHit = hitTestUserDrawingHandle(geometry, point, space, options.handleTolerance);
  if (handleHit) return handleHit;

  if (geometry.kind === 'rectangle' || geometry.kind === 'priceRange' || geometry.kind === 'dateRange') {
    const distance = distanceToRectEdge(point, geometry.rect);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'circle') {
    const distance = distanceToCircleEdge(point, geometry.circle.center, geometry.circle.radius);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'ellipse') {
    const distance = distanceToEllipseEdge(
      point,
      geometry.ellipse.center,
      geometry.ellipse.radiusX,
      geometry.ellipse.radiusY,
    );
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'textLabel') {
    const drawing = geometry.drawing as TextLabelDrawing;
    const lines = splitUserDrawingTextLines(drawing.text);
    const layout = resolveUserDrawingTextLabelLayout({
      text: drawing.text,
      point: geometry.point,
      textAlign: drawing.textAlign,
      lineWidths: lines.map((line) => Math.max(0, options.measureTextLabelLine?.(drawing, line) ?? line.length * 6)),
      labelPadding: 6,
      lineHeight: Math.max(1, options.labelHeight - 2),
    });
    const labelWidth = Math.max(options.labelWidth, layout.box.width);
    const labelHeight = Math.max(options.labelHeight, layout.box.height);
    const rect = {
      x: geometry.point.x - labelWidth / 2,
      y: geometry.point.y - labelHeight / 2,
      width: labelWidth,
      height: labelHeight,
    };
    const inside =
      point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
    return inside ? { drawing: geometry.drawing, distance: 0 } : null;
  }

  if (geometry.kind === 'path') {
    const distance = distanceToPolyline(point, geometry.polyline.points);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'triangle') {
    const distance = pointInPolygon(point, geometry.polygon.points) ? 0 : distanceToClosedPolyline(point, geometry.polygon.points);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'parallelChannel') {
    const distance = pointInPolygon(point, geometry.channel.polygon.points)
      ? 0
      : Math.min(
          distanceToSegment(point, geometry.channel.base),
          distanceToSegment(point, geometry.channel.parallel),
          distanceToClosedPolyline(point, geometry.channel.polygon.points),
        );
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'fibRetracement' || geometry.kind === 'fibExtension') {
    const distance = Math.min(...geometry.fib.levels.map((level) => distanceToSegment(point, level.segment)));
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'trendAngle') {
    const distance = distanceToSegment(point, geometry.angle.segment);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'crossLine') {
    const distance = Math.min(
      distanceToSegment(point, geometry.crossLine.horizontal),
      distanceToSegment(point, geometry.crossLine.vertical),
    );
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'arrowMarker') {
    const distance = pointInPolygon(point, geometry.marker.points) ? 0 : distanceToClosedPolyline(point, geometry.marker.points);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if (geometry.kind === 'arrowMark') {
    const distance = pointInPolygon(point, geometry.mark.points) ? 0 : distanceToClosedPolyline(point, geometry.mark.points);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  if ('segment' in geometry) {
    const distance = distanceToSegment(point, geometry.segment);
    return distance <= options.tolerance ? { drawing: geometry.drawing, distance } : null;
  }

  return null;
}

function hitTestUserDrawingHandle(
  geometry: ResolvedUserDrawingGeometry,
  point: DrawingScreenPoint,
  space: DrawingCoordinateSpace,
  tolerance: number,
): UserDrawingHitResult | null {
  const handles: Array<{ handle: UserDrawingHandleRole; point: DrawingScreenPoint; pointIndex?: number }> = [];

  switch (geometry.kind) {
    case 'line':
    case 'trendAngle':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray': {
      if (
        geometry.drawing.kind === 'trendLine' ||
        geometry.drawing.kind === 'trendAngle' ||
        geometry.drawing.kind === 'extendedLine' ||
        geometry.drawing.kind === 'infoLine' ||
        geometry.drawing.kind === 'arrowLine' ||
        geometry.drawing.kind === 'arrowMarker' ||
        geometry.drawing.kind === 'ray'
      ) {
        handles.push(
          { handle: 'start', point: anchorToScreenPoint(geometry.drawing.points[0], space) },
          { handle: 'end', point: anchorToScreenPoint(geometry.drawing.points[1], space) },
        );
      }
      break;
    }
    case 'horizontalRay':
      if (geometry.drawing.kind === 'horizontalRay') {
        handles.push({ handle: 'center', point: anchorToScreenPoint(geometry.drawing.point, space) });
      }
      break;
    case 'crossLine':
      if (geometry.drawing.kind === 'crossLine') {
        handles.push({ handle: 'center', point: anchorToScreenPoint(geometry.drawing.point, space) });
      }
      break;
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
      {
        const rect =
          geometry.kind === 'circle'
            ? geometry.circle.rect
            : geometry.kind === 'ellipse'
              ? geometry.ellipse.rect
              : geometry.rect;
        handles.push(
          { handle: 'topLeft', point: { x: rect.x, y: rect.y } },
          { handle: 'topRight', point: { x: rect.x + rect.width, y: rect.y } },
          {
            handle: 'bottomRight',
            point: { x: rect.x + rect.width, y: rect.y + rect.height },
          },
          { handle: 'bottomLeft', point: { x: rect.x, y: rect.y + rect.height } },
        );
      }
      break;
    case 'dateRange':
      handles.push(
        { handle: 'start', point: { x: geometry.rect.x, y: geometry.rect.y + geometry.rect.height / 2 } },
        {
          handle: 'end',
          point: { x: geometry.rect.x + geometry.rect.width, y: geometry.rect.y + geometry.rect.height / 2 },
        },
      );
      break;
    case 'fibRetracement':
    case 'fibExtension':
      if (geometry.drawing.kind === 'fibRetracement' || geometry.drawing.kind === 'fibExtension') {
        handles.push(
          { handle: 'start', point: anchorToScreenPoint(geometry.drawing.points[0], space) },
          { handle: 'end', point: anchorToScreenPoint(geometry.drawing.points[1], space) },
        );
      }
      break;
    case 'path':
      geometry.polyline.points.forEach((pathPoint, pointIndex) => {
        handles.push({ handle: 'center', point: pathPoint, pointIndex });
      });
      break;
    case 'triangle':
      geometry.polygon.points.forEach((trianglePoint, pointIndex) => {
        handles.push({ handle: 'center', point: trianglePoint, pointIndex });
      });
      break;
    case 'parallelChannel':
      if (geometry.drawing.kind === 'parallelChannel') {
        geometry.drawing.points.forEach((anchor, pointIndex) => {
          handles.push({ handle: 'center', point: anchorToScreenPoint(anchor, space), pointIndex });
        });
      }
      break;
    case 'textLabel':
      handles.push({ handle: 'center', point: geometry.point });
      break;
    case 'arrowMark':
      handles.push({ handle: 'center', point: geometry.mark.point });
      break;
    case 'horizontalLine':
    case 'verticalLine':
      break;
  }

  for (const candidate of handles) {
    const distance = distanceBetweenPoints(point, candidate.point);
    if (distance <= tolerance) {
      return {
        drawing: geometry.drawing,
        handle: candidate.handle,
        pointIndex: candidate.pointIndex,
        distance,
      };
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
    measureTextLabelLine: options.measureTextLabelLine,
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
