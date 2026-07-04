import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingInputPoint } from './input';
import type { UserDrawingAnchor, UserDrawingTool } from './types';

import { anchorToScreenPoint, screenPointToAnchor } from './coordinates';
import { isUserDrawingPathFamilyTool } from './types';

export type UserDrawingPlacementMode = 'select' | 'click' | 'pathDrag';

// Every multi-point shape is placed by clicking each anchor in turn (TradingView
// parity) — the shape is built and previewed point by point. Only freehand path
// tools (path/brush/highlighter) still use a continuous drag gesture.
export function getUserDrawingPlacementMode(tool: UserDrawingTool): UserDrawingPlacementMode {
  if (tool === 'select') return 'select';
  if (isUserDrawingPathFamilyTool(tool)) return 'pathDrag';
  return 'click';
}

export interface UserDrawingPlacementConstraintOptions {
  constrainedPlacement?: boolean;
}

export interface ResolveUserDrawingPlacementConstraintOptions {
  tool: UserDrawingTool;
  startPoint: UserDrawingInputPoint | null;
  currentPoint: UserDrawingInputPoint;
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>;
  options?: UserDrawingPlacementConstraintOptions;
}

const SHAPE_CONSTRAINT_TOOLS = new Set<UserDrawingTool>([
  'rectangle',
  'circle',
  'ellipse',
  'fibCircles',
  'fibSpiral',
  'gannSquare',
  'gannSquareFixed',
]);
const LINE_CONSTRAINT_TOOLS = new Set<UserDrawingTool>([
  'trendLine',
  'trendAngle',
  'extendedLine',
  'infoLine',
  'arrowLine',
  'arrowMarker',
  'ray',
]);
const HORIZONTAL_CYCLE_CONSTRAINT_TOOLS = new Set<UserDrawingTool>(['cyclicLines']);

function constrainShapeAnchor(start: { x: number; y: number }, current: { x: number; y: number }): { x: number; y: number } {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + Math.sign(dx) * size,
    y: start.y + Math.sign(dy) * size,
  };
}

function constrainLineAnchor(start: { x: number; y: number }, current: { x: number; y: number }): { x: number; y: number } {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return current;

  const snappedAngle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return {
    x: start.x + Math.cos(snappedAngle) * length,
    y: start.y + Math.sin(snappedAngle) * length,
  };
}

function constrainHorizontalAnchor(start: { x: number; y: number }, current: { x: number; y: number }): { x: number; y: number } {
  return {
    x: current.x,
    y: start.y,
  };
}

export function resolveUserDrawingPlacementConstraint({
  tool,
  startPoint,
  currentPoint,
  spacesByPaneId,
  options,
}: ResolveUserDrawingPlacementConstraintOptions): UserDrawingInputPoint {
  if (!options?.constrainedPlacement || !startPoint || startPoint.paneId !== currentPoint.paneId) {
    return currentPoint;
  }

  const space = spacesByPaneId.get(currentPoint.paneId);
  if (!space) return currentPoint;

  const startScreen = anchorToScreenPoint(startPoint.anchor, space);
  const currentScreen = anchorToScreenPoint(currentPoint.anchor, space);
  let constrainedScreen: { x: number; y: number } | null = null;

  if (SHAPE_CONSTRAINT_TOOLS.has(tool)) {
    constrainedScreen = constrainShapeAnchor(startScreen, currentScreen);
  } else if (LINE_CONSTRAINT_TOOLS.has(tool)) {
    constrainedScreen = constrainLineAnchor(startScreen, currentScreen);
  } else if (HORIZONTAL_CYCLE_CONSTRAINT_TOOLS.has(tool)) {
    constrainedScreen = constrainHorizontalAnchor(startScreen, currentScreen);
  }

  if (!constrainedScreen) return currentPoint;

  const constrainedAnchor: UserDrawingAnchor = screenPointToAnchor(constrainedScreen, space);
  return {
    ...currentPoint,
    anchor: constrainedAnchor,
  };
}
