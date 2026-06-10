import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawing, UserDrawingAnchor, UserDrawingHandleRole, UserDrawingSelection, UserDrawingState } from './types';

import { screenPointToAnchor } from './coordinates';

export interface UserDrawingEditDrag {
  selection: UserDrawingSelection;
  startPoint: DrawingScreenPoint;
  startDrawing: UserDrawing;
  space: DrawingCoordinateSpace;
}

export interface ApplyUserDrawingEditDragOptions {
  now?: () => number;
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

function moveDrawing(drawing: UserDrawing, delta: AnchorDelta, updatedAt: number): UserDrawing {
  switch (drawing.kind) {
    case 'trendLine':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'ray':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'rectangle':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'horizontalLine':
      return { ...drawing, price: drawing.price + delta.price, updatedAt };
    case 'verticalLine':
      return { ...drawing, time: drawing.time + delta.time, updatedAt };
    case 'textLabel':
      return { ...drawing, point: moveAnchor(drawing.point, delta), updatedAt };
  }
}

function editLineEndpoint(
  drawing: Extract<UserDrawing, { kind: 'trendLine' | 'ray' }>,
  handle: UserDrawingHandleRole,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  if (handle === 'start') return { ...drawing, points: [anchor, drawing.points[1]], updatedAt };
  if (handle === 'end') return { ...drawing, points: [drawing.points[0], anchor], updatedAt };
  return drawing;
}

function editRectangleCorner(
  drawing: Extract<UserDrawing, { kind: 'rectangle' }>,
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

function editDrawingHandle(
  drawing: UserDrawing,
  handle: UserDrawingHandleRole | undefined,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  if (!handle || handle === 'center') return drawing;

  switch (drawing.kind) {
    case 'trendLine':
    case 'ray':
      return editLineEndpoint(drawing, handle, anchor, updatedAt);
    case 'rectangle':
      return editRectangleCorner(drawing, handle, anchor, updatedAt);
    case 'horizontalLine':
    case 'verticalLine':
    case 'textLabel':
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
    drag.selection.handle && drag.selection.handle !== 'center'
      ? editDrawingHandle(drag.startDrawing, drag.selection.handle, currentAnchor, updatedAt)
      : moveDrawing(drag.startDrawing, delta, updatedAt);

  if (nextDrawing === state.drawings[drawingIndex]) return state;

  const drawings = state.drawings.slice();
  drawings[drawingIndex] = nextDrawing;

  return {
    ...state,
    drawings,
    selection: drag.selection,
    draft: null,
  };
}
