import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawing, UserDrawingAnchor, UserDrawingHandleRole, UserDrawingSelection, UserDrawingState } from './types';

import { resolveUserDrawingGeometry, screenPointToAnchor } from './coordinates';
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

function movePathAnchors(points: readonly UserDrawingAnchor[], delta: AnchorDelta): UserDrawingAnchor[] {
  return points.map((point) => moveAnchor(point, delta));
}

function shiftRegressionTrendTimeRange(
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor],
  delta: AnchorDelta,
): [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor] {
  return points.map((point) => ({ ...point, time: point.time + delta.time })) as [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

function moveRegressionTrend(
  drawing: Extract<UserDrawing, { kind: 'regressionTrend' }>,
  delta: AnchorDelta,
  space: DrawingCoordinateSpace,
  updatedAt: number,
): UserDrawing {
  if (delta.time === 0) return drawing;

  const oldGeometry = resolveUserDrawingGeometry(drawing, space);
  if (oldGeometry.kind !== 'regressionTrend') return drawing;

  const shiftedPoints = shiftRegressionTrendTimeRange(drawing.points, delta);
  const shiftedDrawing = { ...drawing, points: shiftedPoints };
  const newGeometry = resolveUserDrawingGeometry(shiftedDrawing, space);
  if (newGeometry.kind !== 'regressionTrend') return drawing;

  const offset = {
    x: oldGeometry.channel.parallel.start.x - oldGeometry.channel.base.start.x,
    y: oldGeometry.channel.parallel.start.y - oldGeometry.channel.base.start.y,
  };
  const shiftedOffsetAnchor = screenPointToAnchor(
    {
      x: newGeometry.channel.base.start.x + offset.x,
      y: newGeometry.channel.base.start.y + offset.y,
    },
    space,
  );

  return {
    ...drawing,
    points: [shiftedPoints[0], shiftedPoints[1], shiftedOffsetAnchor],
    updatedAt,
  };
}

function moveDrawing(drawing: UserDrawing, delta: AnchorDelta, space: DrawingCoordinateSpace, updatedAt: number): UserDrawing {
  switch (drawing.kind) {
    case 'trendLine':
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'ray':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
    case 'datePriceRange':
    case 'forecast':
    case 'fibRetracement':
    case 'fibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'gannFan':
    case 'gannBox':
    case 'gannSquare':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
      return { ...drawing, points: [moveAnchor(drawing.points[0], delta), moveAnchor(drawing.points[1], delta)], updatedAt };
    case 'path':
    case 'brush':
    case 'highlighter':
      return { ...drawing, points: movePathAnchors(drawing.points, delta), updatedAt };
    case 'polyline':
    case 'curve':
    case 'arc':
      {
        const points = movePathAnchors(drawing.points, delta);
        return { ...drawing, points: [points[0]!, points[1]!, points[2]!], updatedAt };
      }
    case 'disjointChannel':
      {
        const points = movePathAnchors(drawing.points, delta);
        return { ...drawing, points: [points[0]!, points[1]!, points[2]!, points[3]!], updatedAt };
      }
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
    case 'projection':
    case 'longPosition':
    case 'shortPosition':
    case 'barsPattern':
      {
        const points = movePathAnchors(drawing.points, delta);
        return { ...drawing, points: [points[0]!, points[1]!, points[2]!], updatedAt };
      }
    case 'regressionTrend':
      return moveRegressionTrend(drawing, delta, space, updatedAt);
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
    case 'horizontalRay':
    case 'crossLine':
      return { ...drawing, point: moveAnchor(drawing.point, delta), updatedAt };
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'textLabel':
    case 'anchoredVwap':
      return { ...drawing, point: moveAnchor(drawing.point, delta), updatedAt };
  }
}

function editLineEndpoint(
  drawing: Extract<
    UserDrawing,
    {
      kind:
        | 'trendLine'
        | 'trendAngle'
        | 'extendedLine'
        | 'infoLine'
        | 'arrowLine'
        | 'arrowMarker'
        | 'ray'
        | 'forecast'
        | 'fibRetracement'
        | 'fibExtension'
        | 'fibFan'
        | 'fibSpeedResistanceFan'
        | 'fibSpeedResistanceArcs'
        | 'fibCircles'
        | 'fibSpiral'
        | 'gannFan'
        | 'fibTimeZone'
        | 'cyclicLines'
        | 'timeCycles'
        | 'sineLine';
    }
  >,
  handle: UserDrawingHandleRole,
  anchor: UserDrawingAnchor,
  updatedAt: number,
): UserDrawing {
  if (handle === 'start') return { ...drawing, points: [anchor, drawing.points[1]], updatedAt };
  if (handle === 'end') return { ...drawing, points: [drawing.points[0], anchor], updatedAt };
  return drawing;
}

function editRectangleCorner(
  drawing: Extract<
    UserDrawing,
    { kind: 'rectangle' | 'circle' | 'ellipse' | 'priceRange' | 'datePriceRange' | 'gannBox' | 'gannSquare' }
  >,
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
  if (drawing.kind === 'barsPattern' && pointIndex !== undefined) {
    if (pointIndex !== 2) return drawing;
    return {
      ...drawing,
      points: [drawing.points[0], drawing.points[1], anchor],
      updatedAt,
    };
  }

  if (
    (drawing.kind === 'path' ||
      drawing.kind === 'brush' ||
      drawing.kind === 'highlighter' ||
      drawing.kind === 'polyline' ||
      drawing.kind === 'curve' ||
      drawing.kind === 'arc' ||
      drawing.kind === 'triangle' ||
      drawing.kind === 'fibWedge' ||
      drawing.kind === 'trendBasedFibTime' ||
      drawing.kind === 'pitchfork' ||
      drawing.kind === 'schiffPitchfork' ||
      drawing.kind === 'modifiedSchiffPitchfork' ||
      drawing.kind === 'insidePitchfork' ||
      drawing.kind === 'pitchfan' ||
      drawing.kind === 'rotatedRectangle' ||
      drawing.kind === 'parallelChannel' ||
      drawing.kind === 'flatTopBottom' ||
      drawing.kind === 'disjointChannel' ||
      drawing.kind === 'regressionTrend' ||
      drawing.kind === 'longPosition' ||
      drawing.kind === 'shortPosition' ||
      drawing.kind === 'projection') &&
    pointIndex !== undefined
  ) {
    if (pointIndex < 0 || pointIndex >= drawing.points.length) return drawing;
    const points = drawing.points.slice() as UserDrawingAnchor[];
    points[pointIndex] = anchor;
    if (drawing.kind === 'path' || drawing.kind === 'brush' || drawing.kind === 'highlighter') {
      return {
        ...drawing,
        points,
        updatedAt,
      };
    }
    if (drawing.kind === 'polyline') {
      return {
        ...drawing,
        points: [points[0]!, points[1]!, points[2]!],
        updatedAt,
      };
    }
    if (drawing.kind === 'curve') {
      return {
        ...drawing,
        points: [points[0]!, points[1]!, points[2]!],
        updatedAt,
      };
    }
    if (drawing.kind === 'arc') {
      return {
        ...drawing,
        points: [points[0]!, points[1]!, points[2]!],
        updatedAt,
      };
    }
    if (drawing.kind === 'disjointChannel') {
      return {
        ...drawing,
        points: [points[0]!, points[1]!, points[2]!, points[3]!],
        updatedAt,
      };
    }
    return {
      ...drawing,
      points: [points[0]!, points[1]!, points[2]!],
      updatedAt,
    };
  }

  if (!handle || handle === 'center') return drawing;

  switch (drawing.kind) {
    case 'trendLine':
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray':
    case 'forecast':
    case 'fibRetracement':
    case 'fibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'gannFan':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
      return editLineEndpoint(drawing, handle, anchor, updatedAt);
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
    case 'datePriceRange':
    case 'gannBox':
    case 'gannSquare':
      return editRectangleCorner(drawing, handle, anchor, updatedAt);
    case 'dateRange':
      return editDateRangeBoundary(drawing, handle, anchor, updatedAt);
    case 'horizontalLine':
    case 'verticalLine':
    case 'horizontalRay':
    case 'crossLine':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'textLabel':
    case 'anchoredVwap':
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
    case 'regressionTrend':
    case 'projection':
    case 'longPosition':
    case 'shortPosition':
    case 'barsPattern':
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
      : moveDrawing(drag.startDrawing, delta, drag.space, updatedAt);

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
