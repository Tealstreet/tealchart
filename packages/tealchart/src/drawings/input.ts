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
  UserDrawingTrendLineExtend,
  UserDrawingTool,
  UserDrawingTextAnnotation,
  UserDrawingPanePosition,
  UserDrawingMagnetMode,
  UserDrawingMeasureMode,
} from './types';

import {
  createUserDrawingFromDraft,
  DEFAULT_USER_DRAWING_STYLE,
  getDefaultUserDrawingStyleForTool,
  isDrawingDraftReady,
  isUserDrawingPathFamilyTool,
  isUserDrawingTextAnnotation,
  normalizeUserDrawingIconName,
  normalizeUserDrawingPanePosition,
  normalizeUserDrawingStyle,
  normalizeUserDrawingTableCells,
  USER_DRAWING_SCHEMA_VERSION,
} from './types';
import { hitTestUserDrawings } from './hitTesting';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawingHitTestOptions } from './hitTesting';
import { isUserDrawingDragPlacementTool } from './placement';

export interface UserDrawingInputPoint {
  paneId: string;
  anchor: UserDrawingAnchor;
  position?: UserDrawingPanePosition;
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

export interface AddUserDrawingOptions {
  select?: boolean;
}

export interface DeleteUserDrawingOptions {
  drawingId?: string;
  drawingIds?: readonly string[];
  includeLocked?: boolean;
}

export interface DuplicateUserDrawingOptions extends UpdateUserDrawingOptions {
  createId: () => string;
}

export interface UserDrawingClipboard {
  drawings: readonly UserDrawing[];
}

export interface CopyUserDrawingOptions {
  drawingId?: string;
  drawingIds?: readonly string[];
  includeLocked?: boolean;
}

export interface PasteUserDrawingOptions {
  createId: () => string;
  now?: () => number;
}

export interface UserDrawingTextEditOptions {
  now?: () => number;
}

export interface UserDrawingImageSourceInput {
  src: string;
  alt?: string;
}

export type UserDrawingTableCellsInput = readonly (readonly unknown[])[];
export type UserDrawingTableCellInput = unknown;
export type UserDrawingTableRowInput = readonly unknown[];
export type UserDrawingTableColumnInput = readonly unknown[];
type UserDrawingTableTarget = { index: number; drawing: Extract<UserDrawing, { kind: 'table' }> };

export interface UpdateUserDrawingOptions {
  drawingId?: string;
  drawingIds?: readonly string[];
  includeLocked?: boolean;
  now?: () => number;
}

export type UserDrawingZOrderAction = 'bringForward' | 'sendBackward' | 'bringToFront' | 'sendToBack';

export interface UserDrawingPathDragOptions {
  createId: () => string;
  now?: () => number;
  style?: UserDrawingStyle;
}

export interface UserDrawingPlacementDragStartOptions {
  now?: () => number;
  style?: UserDrawingStyle;
  text?: string;
}

export type UserDrawingPlacementDragCommitOptions = UserDrawingInputOptions;

export function createUserDrawingState(overrides: Partial<UserDrawingState> = {}): UserDrawingState {
  return {
    version: USER_DRAWING_SCHEMA_VERSION,
    drawings: [],
    activeTool: 'select',
    stayInDrawingMode: true,
    magnetMode: 'off',
    measureMode: 'off',
    measure: null,
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
    measureMode: 'off',
    measure: null,
    draft: null,
    textEdit: null,
  };
}

export function setUserDrawingStayInDrawingMode(state: UserDrawingState, stayInDrawingMode: boolean): UserDrawingState {
  if ((state.stayInDrawingMode !== false) === stayInDrawingMode) return state;
  return {
    ...state,
    stayInDrawingMode,
  };
}

export function setUserDrawingMagnetMode(state: UserDrawingState, magnetMode: UserDrawingMagnetMode): UserDrawingState {
  if ((state.magnetMode ?? 'off') === magnetMode) return state;
  return {
    ...state,
    magnetMode,
  };
}

export function setUserDrawingMeasureMode(state: UserDrawingState, measureMode: UserDrawingMeasureMode): UserDrawingState {
  if ((state.measureMode ?? 'off') === measureMode && !state.measure) return state;
  return {
    ...state,
    activeTool: measureMode === 'on' ? 'select' : state.activeTool,
    measureMode,
    measure: null,
    selection: measureMode === 'on' ? null : state.selection,
    draft: null,
    textEdit: null,
  };
}

function resolveUserDrawingActiveToolAfterPlacement(state: UserDrawingState): UserDrawingTool {
  return state.stayInDrawingMode !== false ? state.activeTool : 'select';
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
    measure: null,
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

export function addUserDrawing(
  state: UserDrawingState,
  drawing: UserDrawing,
  options: AddUserDrawingOptions = {},
): UserDrawingState {
  if (state.drawings.some((existingDrawing) => existingDrawing.id === drawing.id)) return state;
  const drawingSnapshot = cloneUserDrawingSnapshot(drawing);

  return {
    ...state,
    activeTool: 'select',
    drawings: [...state.drawings, drawingSnapshot],
    selection: options.select === false ? state.selection : { drawingId: drawing.id },
    draft: null,
    textEdit: null,
  };
}

export function deleteUserDrawing(
  state: UserDrawingState,
  options: DeleteUserDrawingOptions = {},
): UserDrawingState {
  const selectedIds =
    options.drawingIds !== undefined ? [...new Set(options.drawingIds)] : options.drawingId ? [options.drawingId] : getUserDrawingSelectionIds(state.selection);
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
  return anchor.pressure === undefined
    ? { time: anchor.time, price: anchor.price }
    : { time: anchor.time, price: anchor.price, pressure: anchor.pressure };
}

function cloneDrawingForDuplicate(drawing: UserDrawing, id: string, now: number): UserDrawing {
  const base = {
    id,
    name: drawing.name,
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
    case 'image':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
    case 'dateRange':
    case 'datePriceRange':
    case 'forecast':
    case 'fixedRangeVolumeProfile':
    case 'fibRetracement':
    case 'fibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibArcs':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'gannFan':
    case 'gannBox':
    case 'gannSquare':
    case 'gannSquareFixed':
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
    case 'trendBasedFibExtension':
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
    case 'sector':
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave':
      return {
        ...base,
        kind: drawing.kind,
        points: [cloneAnchor(drawing.points[0]), cloneAnchor(drawing.points[1]), cloneAnchor(drawing.points[2])],
      } as UserDrawing;
    case 'doubleCurve':
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
    case 'cypherPattern':
    case 'threeDrivesPattern':
    case 'headShouldersPattern':
    case 'elliottImpulseWave':
    case 'elliottTripleComboWave':
    case 'elliottTriangleWave':
      return {
        ...base,
        kind: drawing.kind,
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
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'anchoredVwap':
    case 'anchoredVolumeProfile':
    case 'pin':
      return { ...base, kind: drawing.kind, point: cloneAnchor(drawing.point) } as UserDrawing;
    case 'table':
      return {
        ...base,
        kind: 'table',
        point: cloneAnchor(drawing.point),
        cells: normalizeUserDrawingTableCells(drawing.cells),
        textAlign: drawing.textAlign,
      };
    case 'icon':
      return { ...base, kind: 'icon', point: cloneAnchor(drawing.point), iconName: drawing.iconName };
    case 'flagMark':
      return { ...base, kind: 'flagMark', point: cloneAnchor(drawing.point) };
    case 'textLabel':
    case 'note':
    case 'comment':
    case 'anchoredText':
    case 'anchoredNote':
    case 'priceLabel':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost':
      if (drawing.kind === 'anchoredText' || drawing.kind === 'anchoredNote') {
        return {
          ...base,
          kind: drawing.kind,
          position: normalizeUserDrawingPanePosition(drawing.position),
          text: drawing.text,
          textAlign: drawing.textAlign,
        };
      }
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

export function cloneUserDrawingSnapshot(drawing: UserDrawing): UserDrawing {
  return {
    ...cloneDrawingForDuplicate(drawing, drawing.id, drawing.createdAt),
    updatedAt: drawing.updatedAt,
  };
}

export function createUserDrawingClipboard(
  state: UserDrawingState,
  options: CopyUserDrawingOptions = {},
): UserDrawingClipboard | null {
  const selectedIds = new Set(
    options.drawingId !== undefined
      ? [options.drawingId]
      : options.drawingIds !== undefined
        ? [...new Set(options.drawingIds)]
        : getUserDrawingSelectionIds(state.selection),
  );
  if (selectedIds.size === 0) return null;

  const drawings = state.drawings
    .filter((drawing) => selectedIds.has(drawing.id) && (!drawing.locked || options.includeLocked))
    .map(cloneUserDrawingSnapshot);

  return drawings.length === 0 ? null : { drawings };
}

export function pasteUserDrawingClipboard(
  state: UserDrawingState,
  clipboard: UserDrawingClipboard | null | undefined,
  options: PasteUserDrawingOptions,
): UserDrawingState {
  if (!clipboard || clipboard.drawings.length === 0) return state;

  const now = options.now?.() ?? Date.now();
  const pastedIds: string[] = [];
  const drawings = state.drawings.slice();
  for (const drawing of clipboard.drawings) {
    const id = options.createId();
    pastedIds.push(id);
    drawings.push(cloneDrawingForDuplicate(drawing, id, now));
  }

  return {
    ...state,
    activeTool: 'select',
    drawings,
    selection: createUserDrawingSelection(pastedIds),
    draft: null,
    textEdit: null,
  };
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

  const selectedIds = new Set(
    options.drawingIds !== undefined ? [...new Set(options.drawingIds)] : getUserDrawingSelectionIds(state.selection),
  );
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

export function setUserDrawingName(
  state: UserDrawingState,
  drawingId: string,
  name: string | null,
  options: Pick<UpdateUserDrawingOptions, 'includeLocked' | 'now'> = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, { drawingId, includeLocked: options.includeLocked });
  if (!target) return state;

  const normalizedName = name?.trim() || undefined;
  if (target.drawing.name === normalizedName) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    name: normalizedName,
    updatedAt: options.now?.() ?? Date.now(),
  });
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
  if (options.drawingIds !== undefined) {
    const targetIds = new Set(options.drawingIds);
    if (targetIds.size === 0) return [];
    return state.drawings.flatMap((drawing, index) =>
      targetIds.has(drawing.id) && (!drawing.locked || options.includeLocked) ? [{ drawing, index }] : [],
    );
  }

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
      nextStyle.fontFamily === target.drawing.style.fontFamily &&
      nextStyle.fontWeight === target.drawing.style.fontWeight &&
      nextStyle.fontStyle === target.drawing.style.fontStyle &&
      nextStyle.textUnderline === target.drawing.style.textUnderline &&
      nextStyle.textLineThrough === target.drawing.style.textLineThrough &&
      nextStyle.textWrap === target.drawing.style.textWrap &&
      nextStyle.textMaxWidth === target.drawing.style.textMaxWidth
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
  const selectedIds =
    options.drawingIds !== undefined ? [...new Set(options.drawingIds)] : options.drawingId ? [options.drawingId] : getUserDrawingSelectionIds(state.selection);
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
  if (!state.draft && !state.measure) return state;
  return {
    ...state,
    draft: null,
    measure: null,
  };
}

export function beginUserDrawingMeasure(
  state: UserDrawingState,
  point: UserDrawingInputPoint,
  options: UserDrawingPlacementDragStartOptions = {},
): UserDrawingState {
  if ((state.measureMode ?? 'off') !== 'on') return state;
  const anchor: readonly [UserDrawingAnchor, UserDrawingAnchor] = [point.anchor, point.anchor];
  return {
    ...state,
    activeTool: 'select',
    selection: null,
    draft: null,
    textEdit: null,
    measure: {
      paneId: point.paneId,
      anchors: anchor,
      style: normalizeUserDrawingStyle(options.style ?? DEFAULT_USER_DRAWING_STYLE),
      startedAt: options.now?.() ?? Date.now(),
    },
  };
}

export function updateUserDrawingMeasure(state: UserDrawingState, point: UserDrawingInputPoint): UserDrawingState {
  if ((state.measureMode ?? 'off') !== 'on' || !state.measure || state.measure.paneId !== point.paneId) return state;
  const startAnchor = state.measure.anchors[0];
  const nextAnchors: readonly [UserDrawingAnchor, UserDrawingAnchor] = [startAnchor, point.anchor];
  return {
    ...state,
    measure: {
      ...state.measure,
      anchors: nextAnchors,
    },
  };
}

export function endUserDrawingMeasure(state: UserDrawingState): UserDrawingState {
  if (!state.measure) return state;
  return {
    ...state,
    measure: null,
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
          positions: point.position
            ? [...(state.draft.positions ?? []), normalizeUserDrawingPanePosition(point.position)]
            : state.draft.positions,
          text: options.text ?? state.draft.text,
          barsPatternBars: state.activeTool === 'barsPattern' ? point.bars ?? state.draft.barsPatternBars : undefined,
        }
      : {
          tool: state.activeTool,
          paneId: point.paneId,
          anchors: [point.anchor],
          positions: point.position ? [normalizeUserDrawingPanePosition(point.position)] : undefined,
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
    activeTool: resolveUserDrawingActiveToolAfterPlacement(state),
    drawings: [...state.drawings, drawing],
    selection: { drawingId: drawing.id },
    draft: null,
    textEdit: null,
  };
}

function isSameDrawingAnchor(a: UserDrawingAnchor, b: UserDrawingAnchor): boolean {
  return a.time === b.time && a.price === b.price && a.pressure === b.pressure;
}

function interpolateUserDrawingAnchor(a: UserDrawingAnchor, b: UserDrawingAnchor, t: number): UserDrawingAnchor {
  const anchor: UserDrawingAnchor = {
    time: a.time + (b.time - a.time) * t,
    price: a.price + (b.price - a.price) * t,
  };
  if (a.pressure !== undefined || b.pressure !== undefined) {
    const startPressure = a.pressure ?? 1;
    const endPressure = b.pressure ?? 1;
    anchor.pressure = startPressure + (endPressure - startPressure) * t;
  }
  return anchor;
}

export function smoothUserDrawingPathAnchors(anchors: readonly UserDrawingAnchor[]): UserDrawingAnchor[] {
  if (anchors.length < 2) return anchors.map(cloneAnchor);

  const smoothed: UserDrawingAnchor[] = [cloneAnchor(anchors[0]!)];
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const start = anchors[index]!;
    const end = anchors[index + 1]!;
    if (isSameDrawingAnchor(start, end)) continue;
    smoothed.push(interpolateUserDrawingAnchor(start, end, 0.25));
    smoothed.push(interpolateUserDrawingAnchor(start, end, 0.75));
  }
  smoothed.push(cloneAnchor(anchors[anchors.length - 1]!));

  return smoothed.length >= 2 ? smoothed : anchors.map(cloneAnchor);
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
      style: normalizeUserDrawingStyle(options.style ?? getDefaultUserDrawingStyleForTool(state.activeTool)),
      startedAt: options.now?.() ?? Date.now(),
    },
    textEdit: null,
  };
}

export function beginUserDrawingPlacementDrag(
  state: UserDrawingState,
  point: UserDrawingInputPoint,
  options: UserDrawingPlacementDragStartOptions = {},
): UserDrawingState {
  if (!isUserDrawingDragPlacementTool(state.activeTool)) return state;

  return {
    ...state,
    selection: null,
    draft: {
      tool: state.activeTool,
      paneId: point.paneId,
      anchors: [point.anchor],
      positions: point.position ? [normalizeUserDrawingPanePosition(point.position)] : undefined,
      style: normalizeUserDrawingStyle(options.style ?? DEFAULT_USER_DRAWING_STYLE),
      text: options.text,
      barsPatternBars: state.activeTool === 'barsPattern' ? point.bars : undefined,
      startedAt: options.now?.() ?? Date.now(),
    },
    textEdit: null,
  };
}

export function commitUserDrawingPlacementDrag(
  state: UserDrawingState,
  point: UserDrawingInputPoint,
  options: UserDrawingPlacementDragCommitOptions,
): UserDrawingState {
  const draft = state.draft;
  if (
    !isUserDrawingDragPlacementTool(state.activeTool) ||
    !draft ||
    draft.tool !== state.activeTool ||
    draft.paneId !== point.paneId
  ) {
    return state;
  }

  const startAnchor = draft.anchors[0];
  if (!startAnchor || isSameDrawingAnchor(startAnchor, point.anchor)) {
    return {
      ...state,
      draft: null,
      textEdit: null,
    };
  }

  return handleUserDrawingInput(state, point, options);
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
  const points = smoothUserDrawingPathAnchors(draft.anchors);
  const drawing = {
    id: options.createId(),
    kind: draft.tool,
    paneId: draft.paneId,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: normalizeUserDrawingStyle({ ...draft.style }),
    points,
  };

  return {
    ...state,
    activeTool: resolveUserDrawingActiveToolAfterPlacement(state),
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

export function setUserDrawingTextContent(
  state: UserDrawingState,
  text: string,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || !isUserDrawingTextAnnotation(target.drawing) || target.drawing.text === text) return state;

  return {
    ...replaceUserDrawing(state, target.index, {
      ...target.drawing,
      text,
      updatedAt: options.now?.() ?? Date.now(),
    }),
    selection: { drawingId: target.drawing.id },
    textEdit: state.textEdit?.drawingId === target.drawing.id ? null : state.textEdit,
  };
}

export function setUserDrawingTextAlign(
  state: UserDrawingState,
  textAlign: UserDrawingTextAlign,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (
    !target ||
    (target.drawing.kind !== 'table' && !isUserDrawingTextAnnotation(target.drawing)) ||
    target.drawing.textAlign === textAlign
  ) {
    return state;
  }

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    textAlign,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function setUserDrawingTrendLineExtend(
  state: UserDrawingState,
  extend: UserDrawingTrendLineExtend,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'trendLine' || target.drawing.extend === extend) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    extend,
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

export function setUserDrawingImageSource(
  state: UserDrawingState,
  source: UserDrawingImageSourceInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'image') return state;

  const nextAlt = source.alt ?? target.drawing.alt;
  if (target.drawing.src === source.src && target.drawing.alt === nextAlt) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    src: source.src,
    alt: nextAlt,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

function areUserDrawingTableCellsEqual(
  left: readonly (readonly string[])[],
  right: readonly (readonly string[])[],
): boolean {
  if (left.length !== right.length) return false;

  return left.every((row, rowIndex) => {
    const nextRow = right[rowIndex];
    return !!nextRow && row.length === nextRow.length && row.every((cell, cellIndex) => cell === nextRow[cellIndex]);
  });
}

function normalizeUserDrawingTableRowInput(
  values: UserDrawingTableRowInput | undefined,
  columns: number,
): string[] {
  const source = values ?? [];
  return (
    normalizeUserDrawingTableCells([Array.from({ length: columns }, (_, columnIndex) => source[columnIndex])])[0]?.slice() ??
    []
  );
}

function normalizeUserDrawingTableColumnInput(
  values: UserDrawingTableColumnInput | undefined,
  rows: number,
): string[] {
  return Array.from({ length: rows }, (_, rowIndex) => normalizeUserDrawingTableCells([[values?.[rowIndex]]])[0]?.[0] ?? '');
}

function replaceUserDrawingTableCells(
  state: UserDrawingState,
  target: UserDrawingTableTarget,
  cells: readonly (readonly unknown[])[],
  options: UpdateUserDrawingOptions,
): UserDrawingState {
  const nextCells = normalizeUserDrawingTableCells(cells);
  if (areUserDrawingTableCellsEqual(target.drawing.cells, nextCells)) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    cells: nextCells,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function setUserDrawingTableCells(
  state: UserDrawingState,
  cells: UserDrawingTableCellsInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table') return state;

  const nextCells = normalizeUserDrawingTableCells(cells);
  if (areUserDrawingTableCellsEqual(target.drawing.cells, nextCells)) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    cells: nextCells,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function setUserDrawingTableCell(
  state: UserDrawingState,
  row: number,
  column: number,
  value: UserDrawingTableCellInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table') return state;

  const rowIndex = Math.trunc(row);
  const columnIndex = Math.trunc(column);
  if (
    rowIndex < 0 ||
    columnIndex < 0 ||
    !Number.isFinite(rowIndex) ||
    !Number.isFinite(columnIndex) ||
    target.drawing.cells[rowIndex]?.[columnIndex] === undefined
  ) {
    return state;
  }

  const normalizedValue = normalizeUserDrawingTableCells([[value]])[0]?.[0] ?? '';
  if (target.drawing.cells[rowIndex]?.[columnIndex] === normalizedValue) return state;

  const nextCells = target.drawing.cells.map((cellsRow) => cellsRow.slice());
  nextCells[rowIndex]![columnIndex] = normalizedValue;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    cells: nextCells,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function setUserDrawingTableDimensions(
  state: UserDrawingState,
  rows: number,
  columns: number,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table') return state;
  const table = target.drawing;

  const rowCount = Math.trunc(rows);
  const columnCount = Math.trunc(columns);
  if (rowCount < 1 || columnCount < 1 || !Number.isFinite(rowCount) || !Number.isFinite(columnCount)) {
    return state;
  }

  const resized = Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) => table.cells[rowIndex]?.[columnIndex] ?? ''),
  );
  const nextCells = normalizeUserDrawingTableCells(resized);
  if (areUserDrawingTableCellsEqual(table.cells, nextCells)) return state;

  return replaceUserDrawing(state, target.index, {
    ...table,
    cells: nextCells,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function insertUserDrawingTableRow(
  state: UserDrawingState,
  row: number,
  values?: UserDrawingTableRowInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table') return state;
  const tableTarget: UserDrawingTableTarget = { index: target.index, drawing: target.drawing };

  const rowIndex = Math.trunc(row);
  if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex > tableTarget.drawing.cells.length) return state;

  const columnCount = tableTarget.drawing.cells[0]?.length ?? 1;
  const nextCells = tableTarget.drawing.cells.map((cellsRow) => cellsRow.slice());
  nextCells.splice(rowIndex, 0, normalizeUserDrawingTableRowInput(values, columnCount));
  return replaceUserDrawingTableCells(state, tableTarget, nextCells, options);
}

export function deleteUserDrawingTableRow(
  state: UserDrawingState,
  row: number,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table' || target.drawing.cells.length <= 1) return state;
  const tableTarget: UserDrawingTableTarget = { index: target.index, drawing: target.drawing };

  const rowIndex = Math.trunc(row);
  if (!Number.isFinite(rowIndex) || rowIndex < 0 || rowIndex >= tableTarget.drawing.cells.length) return state;

  const nextCells = tableTarget.drawing.cells.map((cellsRow) => cellsRow.slice());
  nextCells.splice(rowIndex, 1);
  return replaceUserDrawingTableCells(state, tableTarget, nextCells, options);
}

export function insertUserDrawingTableColumn(
  state: UserDrawingState,
  column: number,
  values?: UserDrawingTableColumnInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table') return state;
  const tableTarget: UserDrawingTableTarget = { index: target.index, drawing: target.drawing };

  const columnIndex = Math.trunc(column);
  const columnCount = tableTarget.drawing.cells[0]?.length ?? 1;
  if (!Number.isFinite(columnIndex) || columnIndex < 0 || columnIndex > columnCount) return state;

  const columnValues = normalizeUserDrawingTableColumnInput(values, tableTarget.drawing.cells.length);
  const nextCells = tableTarget.drawing.cells.map((cellsRow, rowIndex) => {
    const nextRow = cellsRow.slice();
    nextRow.splice(columnIndex, 0, columnValues[rowIndex] ?? '');
    return nextRow;
  });
  return replaceUserDrawingTableCells(state, tableTarget, nextCells, options);
}

export function deleteUserDrawingTableColumn(
  state: UserDrawingState,
  column: number,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.kind !== 'table') return state;
  const tableTarget: UserDrawingTableTarget = { index: target.index, drawing: target.drawing };
  const columnCount = tableTarget.drawing.cells[0]?.length ?? 0;
  if (columnCount <= 1) return state;

  const columnIndex = Math.trunc(column);
  if (!Number.isFinite(columnIndex) || columnIndex < 0 || columnIndex >= columnCount) return state;

  const nextCells = tableTarget.drawing.cells.map((cellsRow) => {
    const nextRow = cellsRow.slice();
    nextRow.splice(columnIndex, 1);
    return nextRow;
  });
  return replaceUserDrawingTableCells(state, tableTarget, nextCells, options);
}
