import type {
  UserDrawingHandleRole,
  UserDrawingAnchor,
  UserDrawingSelection,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTool,
} from './types';

import {
  createUserDrawingFromDraft,
  DEFAULT_USER_DRAWING_STYLE,
  isDrawingDraftReady,
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

export function createUserDrawingState(overrides: Partial<UserDrawingState> = {}): UserDrawingState {
  return {
    version: USER_DRAWING_SCHEMA_VERSION,
    drawings: [],
    activeTool: 'select',
    selection: null,
    draft: null,
    ...overrides,
  };
}

export function setUserDrawingTool(state: UserDrawingState, tool: UserDrawingTool): UserDrawingState {
  if (state.activeTool === tool && !state.draft) return state;

  return {
    ...state,
    activeTool: tool,
    selection: tool === 'select' ? state.selection : null,
    draft: null,
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
  };
}

export function clearUserDrawings(state: UserDrawingState): UserDrawingState {
  if (state.drawings.length === 0 && !state.selection && !state.draft) return state;

  return {
    ...state,
    drawings: [],
    selection: null,
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
          style: options.style ?? DEFAULT_USER_DRAWING_STYLE,
          text: options.text,
          startedAt,
        };

  if (!isDrawingDraftReady(draft)) {
    return {
      ...state,
      selection: null,
      draft,
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
    };
  }

  return {
    ...state,
    drawings: [...state.drawings, drawing],
    selection: { drawingId: drawing.id },
    draft: null,
  };
}
