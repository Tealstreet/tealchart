import type {
  UserDrawingCommand,
  UserDrawingCommandDispatchResult,
  UserDrawingCommandEvent,
  UserDrawingCommandHistory,
  UserDrawingHistoryDispatchResult,
  UserDrawingClipboard,
  DrawingCoordinateSpace,
  UserDrawingKeyboardAction,
  UserDrawingKeyboardInput,
  UserDrawingState,
} from '../../drawings';

import {
  createUserDrawingClipboard,
  createUserDrawingCommandEvent,
  dispatchUserDrawingCommand,
  dispatchUserDrawingCommandWithHistory,
  redoUserDrawingCommand,
  resolveUserDrawingKeyboardAction,
  undoUserDrawingCommand,
} from '../../drawings';

export type MobileUserDrawingCommit = (state: UserDrawingState) => void;
export type MobileUserDrawingCommandEventListener = (event: UserDrawingCommandEvent) => void;

export function dispatchMobileUserDrawingHandleCommand(
  state: UserDrawingState,
  command: UserDrawingCommand,
): UserDrawingCommandDispatchResult {
  return dispatchUserDrawingCommand(state, command);
}

export function commitMobileUserDrawingHandleCommand(
  state: UserDrawingState,
  command: UserDrawingCommand,
  commit: MobileUserDrawingCommit,
): boolean {
  const result = dispatchMobileUserDrawingHandleCommand(state, command);
  if (result.changed) {
    commit(result.state);
  }
  return result.changed;
}

export function dispatchMobileUserDrawingHistoryCommand(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
  command: UserDrawingCommand,
): UserDrawingHistoryDispatchResult {
  return dispatchUserDrawingCommandWithHistory(state, history, command);
}

export function dispatchMobileUserDrawingHistoryCommandWithEvent(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
  command: UserDrawingCommand,
  onEvent?: MobileUserDrawingCommandEventListener,
): UserDrawingHistoryDispatchResult {
  const result = dispatchMobileUserDrawingHistoryCommand(state, history, command);
  const event = createUserDrawingCommandEvent(state, result);
  if (event) {
    onEvent?.(event);
  }
  return result;
}

export interface MobileUserDrawingKeyboardDispatchResult {
  state: UserDrawingState;
  history: UserDrawingCommandHistory;
  changed: boolean;
  action: UserDrawingKeyboardAction | null;
}

export interface MobileUserDrawingKeyboardDispatchOptions {
  clipboard?: UserDrawingClipboard | null;
  createId: () => string;
  setClipboard?: (clipboard: UserDrawingClipboard | null) => void;
  spacesByPaneId?: ReadonlyMap<string, DrawingCoordinateSpace>;
}

export function dispatchMobileUserDrawingKeyboardAction(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
  input: UserDrawingKeyboardInput,
  options: MobileUserDrawingKeyboardDispatchOptions,
): MobileUserDrawingKeyboardDispatchResult {
  const action = resolveUserDrawingKeyboardAction(state, input);
  if (!action) return { state, history, changed: false, action: null };

  if (action.type === 'undo') {
    return { ...undoUserDrawingCommand(state, history), action };
  }

  if (action.type === 'redo') {
    return { ...redoUserDrawingCommand(state, history), action };
  }

  if (action.type === 'copySelected') {
    const clipboard = createUserDrawingClipboard(state);
    if (!clipboard) return { state, history, changed: false, action };
    options.setClipboard?.(clipboard);
    return { state, history, changed: true, action };
  }

  if (action.type === 'duplicateSelected') {
    return {
      ...dispatchUserDrawingCommandWithHistory(state, history, {
        type: 'duplicate',
        options: { createId: options.createId },
        meta: { source: 'keyboard' },
      }),
      action,
    };
  }

  if (action.type === 'paste') {
    return {
      ...dispatchUserDrawingCommandWithHistory(state, history, {
        type: 'paste',
        clipboard: options.clipboard,
        options: { createId: options.createId },
        meta: { source: 'keyboard' },
      }),
      action,
    };
  }

  if (action.type === 'nudge') {
    if (!action.delta || !options.spacesByPaneId) return { state, history, changed: false, action };
    return {
      ...dispatchUserDrawingCommandWithHistory(state, history, {
        type: 'nudge',
        spacesByPaneId: options.spacesByPaneId,
        options: { delta: action.delta },
        meta: { source: 'keyboard' },
      }),
      action,
    };
  }

  const command: UserDrawingCommand =
    action.type === 'deleteSelected'
      ? { type: 'delete', meta: { source: 'keyboard' } }
      : action.type === 'selectAll'
        ? { type: 'selectMany', drawingIds: state.drawings.map((drawing) => drawing.id), meta: { source: 'keyboard' } }
        : { type: 'cancelDraft', meta: { source: 'keyboard' } };
  return { ...dispatchUserDrawingCommandWithHistory(state, history, command), action };
}
