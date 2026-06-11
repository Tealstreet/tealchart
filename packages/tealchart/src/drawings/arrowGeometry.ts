import type { DrawingScreenPoint, DrawingScreenSegment } from './coordinates';

export interface DrawingArrowHead {
  end: DrawingScreenPoint;
  left: DrawingScreenPoint;
  right: DrawingScreenPoint;
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
