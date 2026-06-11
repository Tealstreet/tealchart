import type { DrawingScreenPoint, DrawingScreenRect } from './coordinates';
import type { UserDrawingIconName } from './types';

export const DEFAULT_USER_DRAWING_ICON_NAME: UserDrawingIconName = 'star';
export const DEFAULT_USER_DRAWING_ICON_SIZE = 18;

export interface UserDrawingIconGeometry {
  name: UserDrawingIconName;
  center: DrawingScreenPoint;
  size: number;
  points: readonly DrawingScreenPoint[];
  bounds: DrawingScreenRect;
}

export interface ResolveUserDrawingIconGeometryOptions {
  name?: UserDrawingIconName;
  center: DrawingScreenPoint;
  size?: number;
}

function resolveStarPoints(center: DrawingScreenPoint, size: number): DrawingScreenPoint[] {
  const outerRadius = size / 2;
  const innerRadius = outerRadius * 0.45;
  const points: DrawingScreenPoint[] = [];

  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }

  return points;
}

export function resolveUserDrawingIconGeometry({
  name = DEFAULT_USER_DRAWING_ICON_NAME,
  center,
  size = DEFAULT_USER_DRAWING_ICON_SIZE,
}: ResolveUserDrawingIconGeometryOptions): UserDrawingIconGeometry {
  const normalizedSize = Math.max(6, size);
  const points = resolveStarPoints(center, normalizedSize);

  return {
    name,
    center,
    size: normalizedSize,
    points,
    bounds: {
      x: center.x - normalizedSize / 2,
      y: center.y - normalizedSize / 2,
      width: normalizedSize,
      height: normalizedSize,
    },
  };
}
