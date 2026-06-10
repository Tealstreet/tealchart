import type { ComputedPane, Viewport } from '../types';
import type { UserDrawing, UserDrawingAnchor } from './types';

export interface DrawingScreenPoint {
  x: number;
  y: number;
}

export interface DrawingScreenSegment {
  start: DrawingScreenPoint;
  end: DrawingScreenPoint;
}

export interface DrawingScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingCoordinateSpace {
  viewport: Viewport;
  pane: Pick<ComputedPane, 'id' | 'top' | 'height' | 'bottom' | 'yMin' | 'yMax'>;
  chartLeft: number;
  chartRight: number;
}

export type ResolvedUserDrawingGeometry =
  | {
      kind: 'line' | 'ray' | 'horizontalLine' | 'verticalLine';
      drawing: UserDrawing;
      segment: DrawingScreenSegment;
    }
  | {
      kind: 'rectangle';
      drawing: UserDrawing;
      rect: DrawingScreenRect;
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
    case 'ray': {
      const start = anchorToScreenPoint(drawing.points[0], space);
      const end = anchorToScreenPoint(drawing.points[1], space);
      return {
        kind: 'ray',
        drawing,
        segment: resolveRaySegment(start, end, space.chartLeft, space.chartRight, space.pane.top, space.pane.bottom),
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
    case 'textLabel':
      return {
        kind: 'textLabel',
        drawing,
        point: anchorToScreenPoint(drawing.point, space),
      };
  }
}
