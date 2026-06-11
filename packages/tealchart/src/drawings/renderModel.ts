import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawing, UserDrawingAnchor, UserDrawingState } from './types';

import {
  anchorToScreenPoint,
  priceToDrawingY,
  resolveDateRangeRectFromAnchors,
  resolveCircleFromAnchors,
  resolveEllipseFromAnchors,
  resolvePolylineFromAnchors,
  resolveRectFromAnchors,
  resolveUserDrawingGeometry,
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
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray':
    case 'fibRetracement':
    case 'fibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
    case 'forecast':
    case 'gannFan':
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
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'horizontalRay':
    case 'crossLine':
    case 'anchoredVwap':
      return [anchorToScreenPoint(drawing.point, space)];
    case 'rectangle': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'circle': {
      const rect = resolveCircleFromAnchors(drawing.points[0], drawing.points[1], space).rect;
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'ellipse': {
      const rect = resolveEllipseFromAnchors(drawing.points[0], drawing.points[1], space).rect;
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
    case 'gannBox': {
      const rect = resolveRectFromAnchors(drawing.points[0], drawing.points[1], space);
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'gannSquare': {
      const geometry = resolveUserDrawingGeometry(drawing, space);
      if (geometry.kind !== 'gannSquare') return [];
      const rect = geometry.gannBox.rect;
      return [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }
    case 'datePriceRange': {
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
    case 'brush':
    case 'highlighter':
    case 'polyline':
    case 'curve':
    case 'arc':
    case 'triangle':
    case 'fibWedge':
    case 'fibChannel':
    case 'trendBasedFibTime':
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
    case 'pitchfan':
    case 'rotatedRectangle':
    case 'parallelChannel':
    case 'flatTopBottom':
    case 'disjointChannel':
    case 'projection':
    case 'longPosition':
    case 'shortPosition':
      return resolvePolylineFromAnchors(drawing.points, space).points.slice();
    case 'barsPattern':
      return [anchorToScreenPoint(drawing.points[2], space)];
    case 'regressionTrend':
      {
        const geometry = resolveUserDrawingGeometry(drawing, space);
        if (geometry.kind !== 'regressionTrend') return [];
        return [
          geometry.channel.base.start,
          geometry.channel.base.end,
          geometry.channel.parallel.start,
        ];
      }
    case 'textLabel':
    case 'note':
      return [anchorToScreenPoint(drawing.point, space)];
  }
}
