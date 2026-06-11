import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawing, UserDrawingAnchor, UserDrawingState } from './types';

import {
  anchorToScreenPoint,
  priceToDrawingY,
  resolveDateRangeRectFromAnchors,
  resolvePolylineFromAnchors,
  resolveRectFromAnchors,
  timeToDrawingX,
} from './coordinates';
import { createUserDrawingFromDraft, getRequiredAnchorCount } from './types';

export type UserDrawingRenderPhase = 'committed' | 'draft';

export interface UserDrawingRenderEntry {
  drawing: UserDrawing;
  phase: UserDrawingRenderPhase;
  selected: boolean;
}

export interface ResolveUserDrawingRenderEntriesOptions {
  draftPreviewAnchor?: UserDrawingAnchor;
  draftId?: string;
  now?: number;
}

export function resolveUserDrawingRenderEntries(
  state: UserDrawingState,
  options: ResolveUserDrawingRenderEntriesOptions = {},
): UserDrawingRenderEntry[] {
  const entries = state.drawings.map((drawing) => ({
    drawing,
    phase: 'committed' as const,
    selected: state.selection?.drawingId === drawing.id,
  }));

  if (!state.draft) return entries;

  const requiredAnchorCount = getRequiredAnchorCount(state.draft.tool);
  const draftAnchors =
    state.draft.anchors.length < requiredAnchorCount && options.draftPreviewAnchor
      ? [...state.draft.anchors, options.draftPreviewAnchor]
      : state.draft.anchors;

  const draftDrawing = createUserDrawingFromDraft(
    {
      ...state.draft,
      anchors: draftAnchors,
    },
    {
      id: options.draftId ?? '__draft__',
      now: options.now ?? state.draft.startedAt,
    },
  );

  if (!draftDrawing) return entries;

  return [
    ...entries,
    {
      drawing: draftDrawing,
      phase: 'draft',
      selected: false,
    },
  ];
}

export function resolveUserDrawingHandlePoints(
  drawing: UserDrawing,
  space: DrawingCoordinateSpace,
): DrawingScreenPoint[] {
  switch (drawing.kind) {
    case 'trendLine':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'ray':
      return drawing.points.map((point) => anchorToScreenPoint(point, space));
    case 'horizontalLine': {
      const y = priceToDrawingY(drawing.price, space);
      return [
        { x: space.chartLeft, y },
        { x: space.chartRight, y },
      ];
    }
    case 'verticalLine': {
      const x = timeToDrawingX(drawing.time, space);
      return [
        { x, y: space.pane.top },
        { x, y: space.pane.bottom },
      ];
    }
    case 'rectangle': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'priceRange': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'dateRange': {
      const rect = resolveDateRangeRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y + rect.height / 2 },
        { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      ];
    }
    case 'path':
      return resolvePolylineFromAnchors(drawing.points, space).points.slice();
    case 'textLabel':
      return [anchorToScreenPoint(drawing.point, space)];
  }
}
