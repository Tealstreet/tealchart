import type { UserDrawingTool } from './types';

import { getRequiredAnchorCount, isUserDrawingPathFamilyTool } from './types';

export type UserDrawingPlacementMode = 'select' | 'click' | 'dragTwoAnchor' | 'pathDrag';

const DRAG_TWO_ANCHOR_TOOLS = new Set<UserDrawingTool>([
  'trendLine',
  'extendedLine',
  'infoLine',
  'arrowLine',
  'arrowMarker',
  'ray',
  'rectangle',
  'circle',
  'ellipse',
]);

export function getUserDrawingPlacementMode(tool: UserDrawingTool): UserDrawingPlacementMode {
  if (tool === 'select') return 'select';
  if (isUserDrawingPathFamilyTool(tool)) return 'pathDrag';
  if (DRAG_TWO_ANCHOR_TOOLS.has(tool) && getRequiredAnchorCount(tool) === 2) return 'dragTwoAnchor';
  return 'click';
}

export function isUserDrawingDragPlacementTool(tool: UserDrawingTool): boolean {
  return getUserDrawingPlacementMode(tool) === 'dragTwoAnchor';
}
