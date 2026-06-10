import type {
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

export function selectUserDrawingAtPoint(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: UserDrawingSelectionInputOptions = {},
): UserDrawingState {
  const hit = hitTestUserDrawings(state.drawings, point, spacesByPaneId, options.hitTest);
  return selectUserDrawing(state, hit ? { drawingId: hit.drawing.id, handle: hit.handle } : null);
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
