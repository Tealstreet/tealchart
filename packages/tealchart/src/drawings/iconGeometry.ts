import type { DrawingScreenPoint, DrawingScreenRect } from './coordinates';
import type { UserDrawingIconName } from './types';
import { normalizeUserDrawingIconName } from './types';

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

function resolveCirclePoints(center: DrawingScreenPoint, size: number): DrawingScreenPoint[] {
  const radius = size / 2;
  const points: DrawingScreenPoint[] = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 16;
    points.push({
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

function resolveSquarePoints(center: DrawingScreenPoint, size: number): DrawingScreenPoint[] {
  const radius = size / 2;
  return [
    { x: center.x - radius, y: center.y - radius },
    { x: center.x + radius, y: center.y - radius },
    { x: center.x + radius, y: center.y + radius },
    { x: center.x - radius, y: center.y + radius },
  ];
}

function resolveTrianglePoints(center: DrawingScreenPoint, size: number): DrawingScreenPoint[] {
  const radius = size / 2;
  return [
    { x: center.x, y: center.y - radius },
    { x: center.x + radius, y: center.y + radius },
    { x: center.x - radius, y: center.y + radius },
  ];
}

function resolveFlagPoints(center: DrawingScreenPoint, size: number): DrawingScreenPoint[] {
  const radius = size / 2;
  return [
    { x: center.x - radius, y: center.y - radius },
    { x: center.x + radius, y: center.y - radius },
    { x: center.x + radius * 0.35, y: center.y },
    { x: center.x + radius, y: center.y + radius },
    { x: center.x - radius, y: center.y + radius },
  ];
}

function resolveArrowPoints(center: DrawingScreenPoint, size: number, direction: 'up' | 'down'): DrawingScreenPoint[] {
  const radius = size / 2;
  const sign = direction === 'up' ? 1 : -1;
  return [
    { x: center.x, y: center.y - radius * sign },
    { x: center.x + radius, y: center.y },
    { x: center.x + radius * 0.35, y: center.y },
    { x: center.x + radius * 0.35, y: center.y + radius * sign },
    { x: center.x - radius * 0.35, y: center.y + radius * sign },
    { x: center.x - radius * 0.35, y: center.y },
    { x: center.x - radius, y: center.y },
  ];
}

function resolveIconPoints(name: UserDrawingIconName, center: DrawingScreenPoint, size: number): DrawingScreenPoint[] {
  switch (name) {
    case 'circle':
      return resolveCirclePoints(center, size);
    case 'square':
      return resolveSquarePoints(center, size);
    case 'triangle':
      return resolveTrianglePoints(center, size);
    case 'flag':
      return resolveFlagPoints(center, size);
    case 'arrowUp':
      return resolveArrowPoints(center, size, 'up');
    case 'arrowDown':
      return resolveArrowPoints(center, size, 'down');
    case 'star':
      return resolveStarPoints(center, size);
  }
}

export function resolveUserDrawingIconGeometry({
  name = DEFAULT_USER_DRAWING_ICON_NAME,
  center,
  size = DEFAULT_USER_DRAWING_ICON_SIZE,
}: ResolveUserDrawingIconGeometryOptions): UserDrawingIconGeometry {
  const normalizedSize = Number.isFinite(size) ? Math.max(6, size) : DEFAULT_USER_DRAWING_ICON_SIZE;
  const normalizedName = normalizeUserDrawingIconName(name);
  const points = resolveIconPoints(normalizedName, center, normalizedSize);

  return {
    name: normalizedName,
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
