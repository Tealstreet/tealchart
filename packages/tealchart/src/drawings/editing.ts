import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawing, UserDrawingAnchor, UserDrawingHandleRole, UserDrawingSelection, UserDrawingState } from './types';

import { screenPointToAnchor } from './coordinates';
import { hitTestUserDrawings } from './hitTesting';
import { selectUserDrawing } from './input';
import type { UserDrawingHitTestOptions } from './hitTesting';

export interface UserDrawingEditDrag {
  selection: UserDrawingSelection;
  startPoint: DrawingScreenPoint;
  startDrawing: UserDrawing;
  space: DrawingCoordinateSpace;
}

export interface ApplyUserDrawingEditDragOptions {
  now?: () => number;
}

export interface BeginUserDrawingEditDragOptions {
  hitTest?: UserDrawingHitTestOptions;
}

export interface BeginUserDrawingEditDragResult {
  state: UserDrawingState;
  drag: UserDrawingEditDrag | null;
  hit: boolean;
  changed: boolean;
}

interface AnchorDelta {
  time: number;
  price: number;
}

function moveAnchor(anchor: UserDrawingAnchor, delta: AnchorDelta): UserDrawingAnchor {
  return {
    time: anchor.time + delta.time,
    price: anchor.price + delta.price,
  };
}

function movePathAnchors(
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor],
  delta: AnchorDelta,
): [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor] {
  return [moveAnchor(points[0], delta), moveAnchor(points[1], delta), moveAnchor(points[2], delta)];
}

function moveDrawing(drawing: UserDrawing, delta: AnchorDelta, updatedAt: number): UserDrawing {
  switch (drawing.kind) {
    case 'trendLine':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'ray':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'rectangle':
    case 'priceRange':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'path':
      return { ...drawing, points: movePathAnchors(drawing.points, delta), updatedAt };
    case 'dateRange':
      return {
        ...drawing,
        points: [
          { ...drawing.points[0], time: drawing.points[0].time + delta.time },
          { ...drawing.points[1], time: drawing.points[1].time + delta.time },
        ],
        updatedAt,
      };
    case 'horizontalLine':
      return { ...drawing, price: drawing.price + delta.price, updatedAt };
    case 'verticalLine':
      return { ...drawing, time: drawing.time + delta.time, updatedAt };
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'textLabel':
      return { ...drawing, point: moveAnchor(drawing.point, delta), updatedAt };
  }
}

function editLineEndpoint(
  drawing: Extract<UserDrawing, { kind: 'trendLine' | 'extendedLine' | 'infoLine' | 'arrowLine' | 'arrowMarker' | 'ray' }>,
  handle: UserDrawingHandleRole,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  if (handle === 'start') return { ...drawing, points: [anchor, drawing.points[1]], updatedAt };
  if (handle === 'end') return { ...drawing, points: [drawing.points[0], anchor], updatedAt };
  return drawing;
}

function editRectangleCorner(
  drawing: Extract<UserDrawing, { kind: 'rectangle' | 'priceRange' }>,
  handle: UserDrawingHandleRole,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  const [first, second] = drawing.points;
  const left = Math.min(first.time, second.time);
  const right = Math.max(first.time, second.time);
  const bottom = Math.min(first.price, second.price);
  const top = Math.max(first.price, second.price);

  switch (handle) {
    case 'topLeft':
      return { ...drawing, points: [{ time: anchor.time, price: anchor.price }, { time: right, price: bottom }], updatedAt };
    case 'topRight':
      return { ...drawing, points: [{ time: left, price: bottom }, { time: anchor.time, price: anchor.price }], updatedAt };
    case 'bottomRight':
      return { ...drawing, points: [{ time: left, price: top }, { time: anchor.time, price: anchor.price }], updatedAt };
    case 'bottomLeft':
      return { ...drawing, points: [{ time: anchor.time, price: anchor.price }, { time: right, price: top }], updatedAt };
    default:
      return drawing;
  }
}

function editDateRangeBoundary(
  drawing: Extract<UserDrawing, { kind: 'dateRange' }>,
  handle: UserDrawingHandleRole,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  if (handle === 'start') return { ...drawing, points: [{ ...drawing.points[0], time: anchor.time }, drawing.points[1]], updatedAt };
  if (handle === 'end') return { ...drawing, points: [drawing.points[0], { ...drawing.points[1], time: anchor.time }], updatedAt };
  return drawing;
}

function editDrawingHandle(
  drawing: UserDrawing,
  handle: UserDrawingHandleRole | undefined,
  pointIndex: number | undefined,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  if (drawing.kind === 'path' && pointIndex !== undefined) {
    if (pointIndex < 0 || pointIndex >= drawing.points.length) return drawing;
    const points = drawing.points.slice() as UserDrawingAnchor[];
    points[pointIndex] = anchor;
    return {
      ...drawing,
      points: [points[0]!, points[1]!, points[2]!],
      updatedAt,
    };
  }

  if (!handle || handle === 'center') return drawing;

  switch (drawing.kind) {
    case 'trendLine':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray':
      return editLineEndpoint(drawing, handle, anchor, updatedAt);
    case 'rectangle':
    case 'priceRange':
      return editRectangleCorner(drawing, handle, anchor, updatedAt);
    case 'dateRange':
      return editDateRangeBoundary(drawing, handle, anchor, updatedAt);
    case 'horizontalLine':
    case 'verticalLine':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'textLabel':
    case 'path':
      return drawing;
  }
}

export function applyUserDrawingEditDrag(
  state: UserDrawingState,
  drag: UserDrawingEditDrag,
  point: DrawingScreenPoint,
  options: ApplyUserDrawingEditDragOptions = {},
): UserDrawingState {
  const drawingIndex = state.drawings.findIndex((drawing) => drawing.id === drag.startDrawing.id);
  if (drawingIndex < 0) return state;
  if (point.x === drag.startPoint.x && point.y === drag.startPoint.y) return state;

  const updatedAt = options.now?.() ?? Date.now();
  const startAnchor = screenPointToAnchor(drag.startPoint, drag.space);
  const currentAnchor = screenPointToAnchor(point, drag.space);
  const delta = {
    time: currentAnchor.time - startAnchor.time,
    price: currentAnchor.price - startAnchor.price,
  };
  const nextDrawing =
    drag.selection.pointIndex !== undefined || (drag.selection.handle && drag.selection.handle !== 'center')
      ? editDrawingHandle(drag.startDrawing, drag.selection.handle, drag.selection.pointIndex, currentAnchor, updatedAt)
      : moveDrawing(drag.startDrawing, delta, updatedAt);

  if (nextDrawing === state.drawings[drawingIndex]) return state;

  const drawings = state.drawings.slice();
  drawings[drawingIndex] = nextDrawing;

  return {
    ...state,
    drawings,
    selection: drag.selection,
    draft: null,
    textEdit: null,
  };
}

export function beginUserDrawingEditDragAtPoint(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: BeginUserDrawingEditDragOptions = {},
): BeginUserDrawingEditDragResult {
  const hit = hitTestUserDrawings(state.drawings, point, spacesByPaneId, options.hitTest);
  if (!hit) {
    const nextState = selectUserDrawing(state, null);
    return {
      state: nextState,
      drag: null,
      hit: false,
      changed: nextState !== state,
    };
  }

  const selection: UserDrawingSelection =
    hit.handle || hit.pointIndex !== undefined
    ? { drawingId: hit.drawing.id, handle: hit.handle, pointIndex: hit.pointIndex }
    : { drawingId: hit.drawing.id };
  const nextState = selectUserDrawing(state, selection);
  const space = spacesByPaneId.get(hit.drawing.paneId);

  return {
    state: nextState,
    drag: space
      ? {
          selection,
          startPoint: point,
          startDrawing: hit.drawing,
          space,
        }
      : null,
    hit: true,
    changed: nextState !== state,
  };
}
