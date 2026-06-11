import type {
  UserDrawingHandleRole,
  UserDrawingAnchor,
  UserDrawingSelection,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTool,
  TextLabelDrawing,
} from './types';

import {
  createUserDrawingFromDraft,
  DEFAULT_USER_DRAWING_STYLE,
  isDrawingDraftReady,
  normalizeUserDrawingStyle,
  USER_DRAWING_SCHEMA_VERSION,
} from './types';
import { hitTestUserDrawings } from './hitTesting';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawingHitTestOptions } from './hitTesting';

export interface UserDrawingInputPoint {
  paneId: string;
  anchor: UserDrawingAnchor;
}

export interface UserDrawingInputOptions {
  createId: () => string;
  now?: () => number;
  style?: UserDrawingStyle;
  text?: string;
}

export interface UserDrawingSelectionInputOptions {
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

export interface UserDrawingTextEditOptions {
  now?: () => number;
}

export interface UpdateUserDrawingOptions {
  drawingId?: string;
  includeLocked?: boolean;
  now?: () => number;
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
  if (state.selection?.drawingId === selection?.drawingId && state.selection?.handle === selection?.handle && !state.draft) {
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

export function deleteUserDrawing(
  state: UserDrawingState,
  options: DeleteUserDrawingOptions = {},
): UserDrawingState {
  const drawingId = options.drawingId ?? state.selection?.drawingId;
  if (!drawingId) return state;

  const drawing = state.drawings.find((candidate) => candidate.id === drawingId);
  if (!drawing || (drawing.locked && !options.includeLocked)) return state;

  const drawings = state.drawings.filter((candidate) => candidate.id !== drawingId);
  const selection = state.selection?.drawingId === drawingId ? null : state.selection;

  return {
    ...state,
    drawings,
    selection,
    draft: null,
    textEdit: state.textEdit?.drawingId === drawingId ? null : state.textEdit,
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
  const target = findUserDrawingForUpdate(state, options);
  if (!target) return state;

  const nextStyle = normalizeUserDrawingStyle({
    ...target.drawing.style,
    ...style,
  });
  if (
    nextStyle.lineColor === target.drawing.style.lineColor &&
    nextStyle.lineWidth === target.drawing.style.lineWidth &&
    nextStyle.lineStyle === target.drawing.style.lineStyle &&
    nextStyle.fillColor === target.drawing.style.fillColor &&
    nextStyle.textColor === target.drawing.style.textColor &&
    nextStyle.fontSize === target.drawing.style.fontSize &&
    nextStyle.fontFamily === target.drawing.style.fontFamily
  ) {
    return state;
  }

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    style: nextStyle,
    updatedAt: options.now?.() ?? Date.now(),
  });
}

export function setUserDrawingVisibility(
  state: UserDrawingState,
  visible: boolean,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.visible === visible) return state;

  const drawing = {
    ...target.drawing,
    visible,
    updatedAt: options.now?.() ?? Date.now(),
  };
  const nextState = replaceUserDrawing(state, target.index, drawing);

  if (visible || state.selection?.drawingId !== target.drawing.id) return nextState;
  return {
    ...nextState,
    selection: null,
    textEdit: state.textEdit?.drawingId === target.drawing.id ? null : state.textEdit,
  };
}

export function setUserDrawingLocked(
  state: UserDrawingState,
  locked: boolean,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  const target = findUserDrawingForUpdate(state, options);
  if (!target || target.drawing.locked === locked) return state;

  const drawing = {
    ...target.drawing,
    locked,
    updatedAt: options.now?.() ?? Date.now(),
  };
  const nextState = replaceUserDrawing(state, target.index, drawing);

  if (!locked || state.selection?.drawingId !== target.drawing.id) return nextState;
  return {
    ...nextState,
    selection: null,
    textEdit: state.textEdit?.drawingId === target.drawing.id ? null : state.textEdit,
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
  const nextState = selectUserDrawing(state, hit ? { drawingId: hit.drawing.id, handle: hit.handle } : null);
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
        }
      : {
          tool: state.activeTool,
          paneId: point.paneId,
          anchors: [point.anchor],
          style: normalizeUserDrawingStyle(options.style ?? DEFAULT_USER_DRAWING_STYLE),
          text: options.text,
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

function findEditableTextDrawing(
  state: UserDrawingState,
  drawingId: string | null | undefined,
): { drawing: TextLabelDrawing; index: number } | null {
  if (!drawingId) return null;
  const index = state.drawings.findIndex((drawing) => drawing.id === drawingId);
  const drawing = state.drawings[index];
  if (!drawing || drawing.kind !== 'textLabel' || drawing.locked) return null;
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
  if (!target || target.drawing.kind !== 'textLabel' || target.drawing.textAlign === textAlign) return state;

  return replaceUserDrawing(state, target.index, {
    ...target.drawing,
    textAlign,
    updatedAt: options.now?.() ?? Date.now(),
  });
}
