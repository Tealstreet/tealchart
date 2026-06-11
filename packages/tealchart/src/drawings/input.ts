import type {
  UserDrawingHandleRole,
  UserDrawingAnchor,
  BarsPatternBarSnapshot,
  UserDrawing,
  UserDrawingSelection,
  UserDrawingState,
  UserDrawingIconName,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  UserDrawingTextAnnotation,
} from './types';

import {
  createUserDrawingFromDraft,
  DEFAULT_USER_DRAWING_STYLE,
  isDrawingDraftReady,
  isUserDrawingPathFamilyTool,
  isUserDrawingTextAnnotation,
  normalizeUserDrawingIconName,
  normalizeUserDrawingStyle,
  USER_DRAWING_SCHEMA_VERSION,
} from './types';
import { hitTestUserDrawings } from './hitTesting';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawingHitTestOptions } from './hitTesting';

export interface UserDrawingInputPoint {
  paneId: string;
  anchor: UserDrawingAnchor;
  bars?: readonly BarsPatternBarSnapshot[];
}

export interface UserDrawingInputOptions {
  createId: () => string;
  now?: () => number;
  style?: UserDrawingStyle;
  text?: string;
}

export interface UserDrawingSelectionInputOptions {
  additive?: boolean;
  hitTest?: UserDrawingHitTestOptions;
}

export interface UserDrawingSelectionAtPointResult {
  state: UserDrawingState;
  hit: boolean;
  changed: boolean;
}

export interface DeleteUserDrawingOptions {
  drawingId?: string;
  includeLocked?: boolean;
}

export interface DuplicateUserDrawingOptions extends UpdateUserDrawingOptions {
  createId: () => string;
}

export interface UserDrawingTextEditOptions {
  now?: () => number;
}

export interface UpdateUserDrawingOptions {
  drawingId?: string;
  includeLocked?: boolean;
  now?: () => number;
}

export type UserDrawingZOrderAction = 'bringForward' | 'sendBackward' | 'bringToFront' | 'sendToBack';

export interface UserDrawingPathDragOptions {
  createId: () => string;
  now?: () => number;
  style?: UserDrawingStyle;
}

export function createUserDrawingState(overrides: Partial<UserDrawingState> = {}): UserDrawingState {
  return {
    version: USER_DRAWING_SCHEMA_VERSION,
    drawings: [],
    activeTool: 'select',
    selection: null,
    draft: null,
    textEdit: null,
    ...overrides,
  };
}

export function getUserDrawingSelectionIds(selection: UserDrawingSelection | null): readonly string[] {
  if (!selection) return [];
  const ids = [selection.drawingId, ...(selection.drawingIds ?? [])];
  return [...new Set(ids)];
}

function createUserDrawingSelection(
  drawingIds: readonly string[],
  details: Omit<UserDrawingSelection, 'drawingId' | 'drawingIds'> = {},
): UserDrawingSelection | null {
  const ids = [...new Set(drawingIds)];
  if (ids.length === 0) return null;
  return ids.length === 1 ? { drawingId: ids[0]!, ...details } : { drawingId: ids[0]!, drawingIds: ids, ...details };
}

export function setUserDrawingTool(state: UserDrawingState, tool: UserDrawingTool): UserDrawingState {
  if (state.activeTool === tool && !state.draft && !state.textEdit) return state;

  return {
    ...state,
    activeTool: tool,
    selection: tool === 'select' ? state.selection : null,
    draft: null,
    textEdit: null,
  };
}

export function selectUserDrawing(
  state: UserDrawingState,
  selection: UserDrawingSelection | null,
): UserDrawingState {
  const currentIds = getUserDrawingSelectionIds(state.selection);
  const nextIds = getUserDrawingSelectionIds(selection);
  if (
    state.selection?.drawingId === selection?.drawingId &&
    state.selection?.handle === selection?.handle &&
    state.selection?.pointIndex === selection?.pointIndex &&
    currentIds.length === nextIds.length &&
    currentIds.every((id, index) => id === nextIds[index]) &&
    !state.draft
  ) {
    return state;
  }

  return {
    ...state,
    activeTool: 'select',
    selection,
    draft: null,
    textEdit: null,
  };
}

export function selectUserDrawingById(
  state: UserDrawingState,
  drawingId: string | null,
  handle?: UserDrawingHandleRole,
): UserDrawingState {
  if (!drawingId) return selectUserDrawing(state, null);
  if (!state.drawings.some((drawing) => drawing.id === drawingId)) return state;

  return selectUserDrawing(state, handle ? { drawingId, handle } : { drawingId });
}

export function selectUserDrawingsById(state: UserDrawingState, drawingIds: readonly string[]): UserDrawingState {
  const existingIds = new Set(state.drawings.map((drawing) => drawing.id));
  const selectedIds = [...new Set(drawingIds)].filter((drawingId) => existingIds.has(drawingId));
  return selectUserDrawing(state, createUserDrawingSelection(selectedIds));
}

export function deleteUserDrawing(
  state: UserDrawingState,
  options: DeleteUserDrawingOptions = {},
): UserDrawingState {
  const selectedIds = options.drawingId ? [options.drawingId] : getUserDrawingSelectionIds(state.selection);
  if (selectedIds.length === 0) return state;

  const selectedIdSet = new Set(selectedIds);
  const removableIds = new Set(
    state.drawings
      .filter((drawing) => selectedIdSet.has(drawing.id) && (!drawing.locked || options.includeLocked))
      .map((drawing) => drawing.id),
  );
  if (removableIds.size === 0) return state;

  const drawings = state.drawings.filter((candidate) => !removableIds.has(candidate.id));
  const remainingSelectionIds = getUserDrawingSelectionIds(state.selection).filter((drawingId) => !removableIds.has(drawingId));
  const selection = createUserDrawingSelection(remainingSelectionIds);

  return {
    ...state,
    drawings,
    selection,
    draft: null,
    textEdit: state.textEdit && removableIds.has(state.textEdit.drawingId) ? null : state.textEdit,
  };
}

function cloneAnchor(anchor: UserDrawingAnchor): UserDrawingAnchor {
  return { time: anchor.time, price: anchor.price };
}

function cloneDrawingForDuplicate(drawing: UserDrawing, id: string, now: number): UserDrawing {
  const base = {
    id,
    paneId: drawing.paneId,
    visible: drawing.visible,
    locked: drawing.locked,
    createdAt: now,
    updatedAt: now,
    style: { ...drawing.style },
  };

  switch (drawing.kind) {
    case 'trendLine':
      return {
        ...base,
        kind: 'trendLine',
        points: [cloneAnchor(drawing.points[0]), cloneAnchor(drawing.points[1])],
        extend: drawing.extend,
      };
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray':
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
    case 'dateRange':
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
      return {
        ...base,
        kind: drawing.kind,
        points: [cloneAnchor(drawing.points[0]), cloneAnchor(drawing.points[1])],
      } as UserDrawing;
    case 'triangle':
    case 'curve':
    case 'arc':
    case 'fibWedge':
    case 'fibChannel':
    case 'trendBasedFibTime':
    case 'polyline':
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
    case 'pitchfan':
    case 'parallelChannel':
    case 'regressionTrend':
    case 'flatTopBottom':
    case 'rotatedRectangle':
    case 'longPosition':
    case 'shortPosition':
    case 'projection':
      return {
        ...base,
        kind: drawing.kind,
        points: [cloneAnchor(drawing.points[0]), cloneAnchor(drawing.points[1]), cloneAnchor(drawing.points[2])],
      } as UserDrawing;
    case 'disjointChannel':
    case 'trianglePattern':
      return {
        ...base,
        kind: drawing.kind,
        points: [
          cloneAnchor(drawing.points[0]),
          cloneAnchor(drawing.points[1]),
          cloneAnchor(drawing.points[2]),
          cloneAnchor(drawing.points[3]),
        ],
      };
    case 'barsPattern':
      return {
        ...base,
        kind: 'barsPattern',
        points: [cloneAnchor(drawing.points[0]), cloneAnchor(drawing.points[1]), cloneAnchor(drawing.points[2])],
        bars: drawing.bars.map((bar) => ({ ...bar })),
      };
    case 'abcdPattern':
      return {
        ...base,
        kind: 'abcdPattern',
        points: [
          cloneAnchor(drawing.points[0]),
          cloneAnchor(drawing.points[1]),
          cloneAnchor(drawing.points[2]),
          cloneAnchor(drawing.points[3]),
        ],
      };
    case 'xabcdPattern':
      return {
        ...base,
        kind: 'xabcdPattern',
        points: [
          cloneAnchor(drawing.points[0]),
          cloneAnchor(drawing.points[1]),
          cloneAnchor(drawing.points[2]),
          cloneAnchor(drawing.points[3]),
          cloneAnchor(drawing.points[4]),
        ],
      };
    case 'path':
    case 'brush':
    case 'highlighter':
      return { ...base, kind: drawing.kind, points: drawing.points.map(cloneAnchor) } as UserDrawing;
    case 'horizontalLine':
      return { ...base, kind: 'horizontalLine', price: drawing.price };
    case 'verticalLine':
      return { ...base, kind: 'verticalLine', time: drawing.time };
    case 'horizontalRay':
    case 'crossLine':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'anchoredVwap':
    case 'pin':
      return { ...base, kind: drawing.kind, point: cloneAnchor(drawing.point) } as UserDrawing;
    case 'icon':
      return { ...base, kind: 'icon', point: cloneAnchor(drawing.point), iconName: drawing.iconName };
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'balloon':
      return {
        ...base,
        kind: drawing.kind,
        point: cloneAnchor(drawing.point),
        text: drawing.text,
        textAlign: drawing.textAlign,
      } as UserDrawing;
    case 'callout':
    case 'priceNote':
      return {
        ...base,
        kind: drawing.kind,
        points: [cloneAnchor(drawing.points[0]), cloneAnchor(drawing.points[1])],
        text: drawing.text,
        textAlign: drawing.textAlign,
      } as UserDrawing;
  }
}

export function duplicateUserDrawing(
  state: UserDrawingState,
  options: DuplicateUserDrawingOptions,
): UserDrawingState {
  if (options.drawingId) {
    const target = findUserDrawingForUpdate(state, options);
    if (!target) return state;

    const id = options.createId();
    const now = options.now?.() ?? Date.now();
    const duplicate = cloneDrawingForDuplicate(target.drawing, id, now);
    const drawings = state.drawings.slice();
    drawings.splice(target.index + 1, 0, duplicate);

    return {
      ...state,
      activeTool: 'select',
      drawings,
      selection: { drawingId: id },
      draft: null,
      textEdit: null,
    };
  }

  const selectedIds = new Set(getUserDrawingSelectionIds(state.selection));
  if (selectedIds.size === 0) return state;

  const now = options.now?.() ?? Date.now();
  const duplicatedIds: string[] = [];
  const drawings: UserDrawing[] = [];
  for (const drawing of state.drawings) {
    drawings.push(drawing);
    if (!selectedIds.has(drawing.id) || (drawing.locked && !options.includeLocked)) continue;
    const id = options.createId();
    duplicatedIds.push(id);
    drawings.push(cloneDrawingForDuplicate(drawing, id, now));
  }

  if (duplicatedIds.length === 0) return state;

  return {
    ...state,
    activeTool: 'select',
    drawings,
    selection: createUserDrawingSelection(duplicatedIds),
    draft: null,
    textEdit: null,
  };
}

export function clearUserDrawings(state: UserDrawingState): UserDrawingState {
  if (state.drawings.length === 0 && !state.selection && !state.draft) return state;

  return {
    ...state,
    drawings: [],
    selection: null,
    draft: null,
    textEdit: null,
  };
}

function findUserDrawingForUpdate(
  state: UserDrawingState,
  options: UpdateUserDrawingOptions = {},
): { drawing: UserDrawingState['drawings'][number]; index: number } | null {
  const drawingId = options.drawingId ?? state.selection?.drawingId;
  if (!drawingId) return null;

  const index = state.drawings.findIndex((drawing) => drawing.id === drawingId);
  const drawing = state.drawings[index];
  if (!drawing || (drawing.locked && !options.includeLocked)) return null;
  return { drawing, index };
}

function findUserDrawingsForUpdate(
  state: UserDrawingState,
  options: UpdateUserDrawingOptions = {},
): Array<{ drawing: UserDrawingState['drawings'][number]; index: number }> {
  if (options.drawingId) {
    const target = findUserDrawingForUpdate(state, options);
    return target ? [target] : [];
  }

  const selectedIds = new Set(getUserDrawingSelectionIds(state.selection));
  if (selectedIds.size === 0) return [];

  return state.drawings.flatMap((drawing, index) =>
    selectedIds.has(drawing.id) && (!drawing.locked || options.includeLocked) ? [{ drawing, index }] : [],
  );
}

function replaceUserDrawing(
  state: UserDrawingState,
  index: number,
  drawing: UserDrawingState['drawings'][number],
): UserDrawingState {
  const drawings = state.drawings.slice();
  drawings[index] = drawing;
  return {
    ...state,
    drawings,
  };
}

export function updateUserDrawingStyle(
  state: UserDrawingState,
  style: Partial<UserDrawingStyle>,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const targets = findUserDrawingsForUpdate(state, options);
  if (targets.length === 0) return state;

  const updatedAt = options.now?.() ?? Date.now();
  let changed = false;
  const nextByIndex = new Map<number, UserDrawingState['drawings'][number]>();

  for (const target of targets) {
    const nextStyle = normalizeUserDrawingStyle({
      ...target.drawing.style,
      ...style,
    });
    if (
      nextStyle.lineColor === target.drawing.style.lineColor &&
      nextStyle.lineWidth === target.drawing.style.lineWidth &&
      nextStyle.lineStyle === target.drawing.style.lineStyle &&
      nextStyle.opacity === target.drawing.style.opacity &&
      nextStyle.lineVisible === target.drawing.style.lineVisible &&
      nextStyle.fillVisible === target.drawing.style.fillVisible &&
      nextStyle.fillColor === target.drawing.style.fillColor &&
      nextStyle.textColor === target.drawing.style.textColor &&
      nextStyle.fontSize === target.drawing.style.fontSize &&
      nextStyle.fontFamily === target.drawing.style.fontFamily
    ) {
      continue;
    }
    changed = true;
    nextByIndex.set(target.index, {
      ...target.drawing,
      style: nextStyle,
      updatedAt,
    });
  }

  if (!changed) return state;

  return {
    ...state,
    drawings: state.drawings.map((drawing, index) => nextByIndex.get(index) ?? drawing),
  };
}

export function setUserDrawingVisibility(
  state: UserDrawingState,
  visible: boolean,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const targets = findUserDrawingsForUpdate(state, options).filter((target) => target.drawing.visible !== visible);
  if (targets.length === 0) return state;

  const updatedAt = options.now?.() ?? Date.now();
  const changedIds = new Set(targets.map((target) => target.drawing.id));
  const nextByIndex = new Map<number, UserDrawingState['drawings'][number]>(
    targets.map((target) => [
      target.index,
      {
        ...target.drawing,
        visible,
        updatedAt,
      },
    ]),
  );
  const nextState = {
    ...state,
    drawings: state.drawings.map((drawing, index) => nextByIndex.get(index) ?? drawing),
  };

  if (visible || getUserDrawingSelectionIds(state.selection).every((drawingId) => !changedIds.has(drawingId))) return nextState;
  return {
    ...nextState,
    selection: createUserDrawingSelection(getUserDrawingSelectionIds(state.selection).filter((drawingId) => !changedIds.has(drawingId))),
    textEdit: state.textEdit && changedIds.has(state.textEdit.drawingId) ? null : state.textEdit,
  };
}

export function setUserDrawingLocked(
  state: UserDrawingState,
  locked: boolean,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const targets = findUserDrawingsForUpdate(state, options).filter((target) => target.drawing.locked !== locked);
  if (targets.length === 0) return state;

  const updatedAt = options.now?.() ?? Date.now();
  const changedIds = new Set(targets.map((target) => target.drawing.id));
  const nextByIndex = new Map<number, UserDrawingState['drawings'][number]>(
    targets.map((target) => [
      target.index,
      {
        ...target.drawing,
        locked,
        updatedAt,
      },
    ]),
  );
  const nextState = {
    ...state,
    drawings: state.drawings.map((drawing, index) => nextByIndex.get(index) ?? drawing),
  };

  if (!locked || getUserDrawingSelectionIds(state.selection).every((drawingId) => !changedIds.has(drawingId))) return nextState;
  return {
    ...nextState,
    selection: createUserDrawingSelection(getUserDrawingSelectionIds(state.selection).filter((drawingId) => !changedIds.has(drawingId))),
    textEdit: state.textEdit && changedIds.has(state.textEdit.drawingId) ? null : state.textEdit,
  };
}

function getUserDrawingReorderTargetIds(state: UserDrawingState, options: UpdateUserDrawingOptions = {}): Set<string> {
  const selectedIds = options.drawingId ? [options.drawingId] : getUserDrawingSelectionIds(state.selection);
  if (selectedIds.length === 0) return new Set();

  const candidateIds = new Set(selectedIds);
  return new Set(
    state.drawings
      .filter((drawing) => candidateIds.has(drawing.id) && (!drawing.locked || options.includeLocked))
      .map((drawing) => drawing.id),
  );
}

function moveUserDrawingTargetsForward(drawings: readonly UserDrawing[], targetIds: ReadonlySet<string>): UserDrawing[] {
  const next = drawings.slice();
  for (let index = next.length - 2; index >= 0; index--) {
    const drawing = next[index]!;
    const neighbor = next[index + 1]!;
    if (!targetIds.has(drawing.id) || targetIds.has(neighbor.id)) continue;
    next[index] = neighbor;
    next[index + 1] = drawing;
  }
  return next;
}

function moveUserDrawingTargetsBackward(drawings: readonly UserDrawing[], targetIds: ReadonlySet<string>): UserDrawing[] {
  const next = drawings.slice();
  for (let index = 1; index < next.length; index++) {
    const drawing = next[index]!;
    const neighbor = next[index - 1]!;
    if (!targetIds.has(drawing.id) || targetIds.has(neighbor.id)) continue;
    next[index] = neighbor;
    next[index - 1] = drawing;
  }
  return next;
}

export function reorderUserDrawings(
  state: UserDrawingState,
  action: UserDrawingZOrderAction,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const targetIds = getUserDrawingReorderTargetIds(state, options);
  if (targetIds.size === 0) return state;

  let drawings: UserDrawing[];
  switch (action) {
    case 'bringForward':
      drawings = moveUserDrawingTargetsForward(state.drawings, targetIds);
      break;
    case 'sendBackward':
      drawings = moveUserDrawingTargetsBackward(state.drawings, targetIds);
      break;
    case 'bringToFront': {
      const targets: UserDrawing[] = [];
      const others: UserDrawing[] = [];
      for (const drawing of state.drawings) {
        (targetIds.has(drawing.id) ? targets : others).push(drawing);
      }
      drawings = [...others, ...targets];
      break;
    }
    case 'sendToBack': {
      const targets: UserDrawing[] = [];
      const others: UserDrawing[] = [];
      for (const drawing of state.drawings) {
        (targetIds.has(drawing.id) ? targets : others).push(drawing);
      }
      drawings = [...targets, ...others];
      break;
    }
  }

  if (drawings.length === state.drawings.length && drawings.every((drawing, index) => drawing === state.drawings[index])) {
    return state;
  }

  return {
    ...state,
    drawings,
    draft: null,
  };
}

export function selectUserDrawingAtPoint(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: UserDrawingSelectionInputOptions = {},
): UserDrawingState {
  return resolveUserDrawingSelectionAtPoint(state, point, spacesByPaneId, options).state;
}

export function resolveUserDrawingSelectionAtPoint(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: UserDrawingSelectionInputOptions = {},
): UserDrawingSelectionAtPointResult {
  const hit = hitTestUserDrawings(state.drawings, point, spacesByPaneId, options.hitTest);
  if (options.additive) {
    if (!hit) {
      return {
        state,
        hit: false,
        changed: false,
      };
    }

    const selectedIds = getUserDrawingSelectionIds(state.selection);
    const nextIds = selectedIds.includes(hit.drawing.id)
      ? selectedIds.filter((drawingId) => drawingId !== hit.drawing.id)
      : [...selectedIds, hit.drawing.id];
    const nextState = selectUserDrawing(state, createUserDrawingSelection(nextIds));
    return {
      state: nextState,
      hit: true,
      changed: nextState !== state,
    };
  }

  const nextState = selectUserDrawing(
    state,
    hit ? { drawingId: hit.drawing.id, handle: hit.handle, pointIndex: hit.pointIndex } : null,
  );
  return {
    state: nextState,
    hit: hit !== null,
    changed: nextState !== state,
  };
}

export function cancelUserDrawingDraft(state: UserDrawingState): UserDrawingState {
  if (!state.draft) return state;
  return {
    ...state,
    draft: null,
  };
}

export function handleUserDrawingInput(
  state: UserDrawingState,
  point: UserDrawingInputPoint,
  options: UserDrawingInputOptions,
): UserDrawingState {
  if (state.activeTool === 'select') {
    return selectUserDrawing(state, null);
  }

  const startedAt = options.now?.() ?? Date.now();
  const draft =
    state.draft && state.draft.tool === state.activeTool && state.draft.paneId === point.paneId
      ? {
          ...state.draft,
          anchors: [...state.draft.anchors, point.anchor],
          text: options.text ?? state.draft.text,
          barsPatternBars: state.activeTool === 'barsPattern' ? point.bars ?? state.draft.barsPatternBars : undefined,
        }
      : {
          tool: state.activeTool,
          paneId: point.paneId,
          anchors: [point.anchor],
          style: normalizeUserDrawingStyle(options.style ?? DEFAULT_USER_DRAWING_STYLE),
          text: options.text,
          barsPatternBars: state.activeTool === 'barsPattern' ? point.bars : undefined,
          startedAt,
        };

  if (!isDrawingDraftReady(draft)) {
    return {
      ...state,
      selection: null,
      draft,
      textEdit: null,
    };
  }

  const drawing = createUserDrawingFromDraft(draft, {
    id: options.createId(),
    now: options.now?.() ?? startedAt,
  });

  if (!drawing) {
    return {
      ...state,
      selection: null,
      draft: null,
      textEdit: null,
    };
  }

  return {
    ...state,
    drawings: [...state.drawings, drawing],
    selection: { drawingId: drawing.id },
    draft: null,
    textEdit: null,
  };
}

function isSameDrawingAnchor(a: UserDrawingAnchor, b: UserDrawingAnchor): boolean {
  return a.time === b.time && a.price === b.price;
}

export function beginUserDrawingPathDrag(
  state: UserDrawingState,
  point: UserDrawingInputPoint,
  options: Omit<UserDrawingPathDragOptions, 'createId'> = {},
): UserDrawingState {
  if (!isUserDrawingPathFamilyTool(state.activeTool)) return state;

  return {
    ...state,
    selection: null,
    draft: {
      tool: state.activeTool,
      paneId: point.paneId,
      anchors: [point.anchor],
      style: normalizeUserDrawingStyle(options.style ?? DEFAULT_USER_DRAWING_STYLE),
      startedAt: options.now?.() ?? Date.now(),
    },
    textEdit: null,
  };
}

export function appendUserDrawingPathDragPoint(
  state: UserDrawingState,
  point: UserDrawingInputPoint,
): UserDrawingState {
  const draft = state.draft;
  if (
    !isUserDrawingPathFamilyTool(state.activeTool) ||
    !draft ||
    !isUserDrawingPathFamilyTool(draft.tool) ||
    draft.paneId !== point.paneId
  )
    return state;

  const lastAnchor = draft.anchors[draft.anchors.length - 1];
  if (lastAnchor && isSameDrawingAnchor(lastAnchor, point.anchor)) return state;

  return {
    ...state,
    draft: {
      ...draft,
      anchors: [...draft.anchors, point.anchor],
    },
  };
}

export function commitUserDrawingPathDrag(
  state: UserDrawingState,
  options: UserDrawingPathDragOptions,
): UserDrawingState {
  const draft = state.draft;
  if (!isUserDrawingPathFamilyTool(state.activeTool) || !draft || !isUserDrawingPathFamilyTool(draft.tool)) return state;

  if (draft.anchors.length < 2) {
    return {
      ...state,
      draft: null,
      textEdit: null,
    };
  }

  const now = options.now?.() ?? Date.now();
  const drawing = {
    id: options.createId(),
    kind: draft.tool,
    paneId: draft.paneId,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: normalizeUserDrawingStyle({ ...draft.style }),
    points: draft.anchors.slice(),
  };

  return {
    ...state,
    drawings: [...state.drawings, drawing],
    selection: { drawingId: drawing.id },
    draft: null,
    textEdit: null,
  };
}

function findEditableTextDrawing(
  state: UserDrawingState,
  drawingId: string | null | undefined,
): { drawing: UserDrawingTextAnnotation; index: number } | null {
  if (!drawingId) return null;
  const index = state.drawings.findIndex((drawing) => drawing.id === drawingId);
  const drawing = state.drawings[index];
  if (!drawing || !isUserDrawingTextAnnotation(drawing) || drawing.locked) return null;
  return { drawing, index };
}

export function beginUserDrawingTextEdit(
  state: UserDrawingState,
  drawingId = state.selection?.drawingId,
  options: UserDrawingTextEditOptions = {},
): UserDrawingState {
  const editable = findEditableTextDrawing(state, drawingId);
  if (!editable) return state;

  const { drawing } = editable;
  const textEdit = {
    drawingId: drawing.id,
    value: drawing.text,
    originalValue: drawing.text,
    startedAt: options.now?.() ?? Date.now(),
  };

  if (
    state.textEdit?.drawingId === textEdit.drawingId &&
    state.textEdit.value === textEdit.value &&
    state.textEdit.originalValue === textEdit.originalValue &&
    !state.draft
  ) {
    return state;
  }

  return {
    ...state,
    activeTool: 'select',
    selection: { drawingId: drawing.id },
    draft: null,
    textEdit,
  };
}

export function updateUserDrawingTextEdit(state: UserDrawingState, value: string): UserDrawingState {
  if (!state.textEdit || state.textEdit.value === value) return state;
  return {
    ...state,
    textEdit: {
      ...state.textEdit,
      value,
    },
  };
}

export function cancelUserDrawingTextEdit(state: UserDrawingState): UserDrawingState {
  if (!state.textEdit) return state;
  return {
    ...state,
    textEdit: null,
  };
}

export function commitUserDrawingTextEdit(
  state: UserDrawingState,
  options: UserDrawingTextEditOptions = {},
): UserDrawingState {
  if (!state.textEdit) return state;

  const editable = findEditableTextDrawing(state, state.textEdit.drawingId);
  if (!editable) {
    return {
      ...state,
      textEdit: null,
    };
  }

  if (editable.drawing.text === state.textEdit.value) {
    return {
      ...state,
      selection: { drawingId: editable.drawing.id },
      textEdit: null,
    };
  }

  const drawings = state.drawings.slice();
  drawings[editable.index] = {
    ...editable.drawing,
    text: state.textEdit.value,
    updatedAt: options.now?.() ?? Date.now(),
  };

  return {
    ...state,
    drawings,
    selection: { drawingId: editable.drawing.id },
    textEdit: null,
  };
}

export function setUserDrawingText(
  state: UserDrawingState,
  drawingId: string,
  text: string,
  options: UserDrawingTextEditOptions = {},
): UserDrawingState {
  const editable = findEditableTextDrawing(state, drawingId);
  if (!editable || editable.drawing.text === text) return state;

  const drawings = state.drawings.slice();
  drawings[editable.index] = {
    ...editable.drawing,
    text,
    updatedAt: options.now?.() ?? Date.now(),
  };

  return {
    ...state,
    drawings,
    selection: { drawingId: editable.drawing.id },
    textEdit: state.textEdit?.drawingId === drawingId ? null : state.textEdit,
  };
}

export function setUserDrawingTextAlign(
  state: UserDrawingState,
  textAlign: UserDrawingTextAlign,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || !isUserDrawingTextAnnotation(target.drawing) || target.drawing.textAlign === textAlign) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    textAlign,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function setUserDrawingIconName(
  state: UserDrawingState,
  iconName: UserDrawingIconName,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  const nextIconName = normalizeUserDrawingIconName(iconName);
  if (!target || target.drawing.kind !== 'icon' || target.drawing.iconName === nextIconName) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    iconName: nextIconName,
    updatedAt: options.now?.() ?? Date.now(),
  });
}
