import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingInputPoint } from './input';
import type { UserDrawingAnchor, UserDrawingTool } from './types';

import { anchorToScreenPoint, screenPointToAnchor } from './coordinates';
import { getRequiredAnchorCount, isUserDrawingPathFamilyTool } from './types';

export type UserDrawingPlacementMode = 'select' | 'click' | 'dragTwoAnchor' | 'dragSeed' | 'pathDrag';

const DRAG_TWO_ANCHOR_TOOLS = new Set<UserDrawingTool>([
  'trendLine',
  'trendAngle',
  'extendedLine',
  'infoLine',
  'arrowLine',
  'arrowMarker',
  'ray',
  'rectangle',
  'circle',
  'ellipse',
  'priceRange',
  'dateRange',
  'datePriceRange',
  'forecast',
  'fixedRangeVolumeProfile',
  'callout',
  'priceNote',
  'image',
  'fibRetracement',
  'fibExtension',
  'fibFan',
  'fibSpeedResistanceFan',
  'fibArcs',
  'fibSpeedResistanceArcs',
  'fibCircles',
  'fibSpiral',
  'gannFan',
  'gannBox',
  'gannSquare',
  'gannSquareFixed',
  'fibTimeZone',
  'cyclicLines',
  'timeCycles',
  'sineLine',
]);

const DRAG_SEED_MULTI_ANCHOR_TOOLS = new Set<UserDrawingTool>([
  'triangle',
  'curve',
  'arc',
  'polyline',
  'rotatedRectangle',
  'parallelChannel',
  'regressionTrend',
  'flatTopBottom',
  'pitchfork',
  'schiffPitchfork',
  'modifiedSchiffPitchfork',
  'insidePitchfork',
  'pitchfan',
  'trendBasedFibExtension',
  'fibWedge',
  'fibChannel',
  'trendBasedFibTime',
  'doubleCurve',
  'disjointChannel',
]);

export function getUserDrawingPlacementMode(tool: UserDrawingTool): UserDrawingPlacementMode {
  if (tool === 'select') return 'select';
  if (isUserDrawingPathFamilyTool(tool)) return 'pathDrag';
  if (DRAG_TWO_ANCHOR_TOOLS.has(tool) && getRequiredAnchorCount(tool) === 2) return 'dragTwoAnchor';
  if (DRAG_SEED_MULTI_ANCHOR_TOOLS.has(tool) && getRequiredAnchorCount(tool) > 2) return 'dragSeed';
  return 'click';
}

export function isUserDrawingDragPlacementTool(tool: UserDrawingTool): boolean {
  const mode = getUserDrawingPlacementMode(tool);
  return mode === 'dragTwoAnchor' || mode === 'dragSeed';
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

const SHAPE_CONSTRAINT_TOOLS = new Set<UserDrawingTool>(['rectangle', 'circle', 'ellipse']);
const LINE_CONSTRAINT_TOOLS = new Set<UserDrawingTool>([
  'trendLine',
  'trendAngle',
  'extendedLine',
  'infoLine',
  'arrowLine',
  'arrowMarker',
  'ray',
]);

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
  }

  if (!constrainedScreen) return currentPoint;

  const constrainedAnchor: UserDrawingAnchor = screenPointToAnchor(constrainedScreen, space);
  return {
    ...currentPoint,
    anchor: constrainedAnchor,
  };
}
