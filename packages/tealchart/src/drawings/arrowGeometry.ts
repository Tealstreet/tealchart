import type { DrawingScreenPoint, DrawingScreenSegment } from './coordinates';

export interface DrawingArrowHead {
  end: DrawingScreenPoint;
  left: DrawingScreenPoint;
  right: DrawingScreenPoint;
}

export interface DrawingArrowMarker {
  points: readonly DrawingScreenPoint[];
  segment: DrawingScreenSegment;
}

export function resolveDrawingArrowHead(
  segment: DrawingScreenSegment,
  options: {
    size?: number;
    angle?: number;
  } = {},
): DrawingArrowHead | null {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const size = options.size ?? 10;
  const angle = options.angle ?? Math.PI / 7;
  const direction = Math.atan2(dy, dx);

  return {
    end: segment.end,
    left: {
      x: segment.end.x - size * Math.cos(direction - angle),
      y: segment.end.y - size * Math.sin(direction - angle),
    },
    right: {
      x: segment.end.x - size * Math.cos(direction + angle),
      y: segment.end.y - size * Math.sin(direction + angle),
    },
  };
}

export function resolveDrawingArrowMarker(
  segment: DrawingScreenSegment,
  options: {
    headLength?: number;
    headWidth?: number;
    tailWidth?: number;
  } = {},
): DrawingArrowMarker | null {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const headLength = Math.min(options.headLength ?? 22, length * 0.75);
  const headHalfWidth = (options.headWidth ?? 18) / 2;
  const tailHalfWidth = Math.min((options.tailWidth ?? 7) / 2, headHalfWidth);
  const shoulder = {
    x: segment.end.x - ux * headLength,
    y: segment.end.y - uy * headLength,
  };

  return {
    segment,
    points: [
      segment.end,
      { x: shoulder.x + px * headHalfWidth, y: shoulder.y + py * headHalfWidth },
      { x: segment.start.x + px * tailHalfWidth, y: segment.start.y + py * tailHalfWidth },
      { x: segment.start.x - px * tailHalfWidth, y: segment.start.y - py * tailHalfWidth },
      { x: shoulder.x - px * headHalfWidth, y: shoulder.y - py * headHalfWidth },
    ],
  };
}
