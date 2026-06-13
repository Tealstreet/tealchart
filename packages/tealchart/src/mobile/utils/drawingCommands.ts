import type {
  UserDrawingCommand,
  UserDrawingCommandDispatchResult,
  UserDrawingCommandHistory,
  UserDrawingHistoryDispatchResult,
  UserDrawingKeyboardAction,
  UserDrawingKeyboardInput,
  UserDrawingState,
} from '../../drawings';

import {
  dispatchUserDrawingCommand,
  dispatchUserDrawingCommandWithHistory,
  redoUserDrawingCommand,
  resolveUserDrawingKeyboardAction,
  undoUserDrawingCommand,
} from '../../drawings';

export type MobileUserDrawingCommit = (state: UserDrawingState) => void;

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

export interface MobileUserDrawingKeyboardDispatchResult {
  state: UserDrawingState;
  history: UserDrawingCommandHistory;
  changed: boolean;
  action: UserDrawingKeyboardAction | null;
}

export function dispatchMobileUserDrawingKeyboardAction(
  state: UserDrawingState,
  history: UserDrawingCommandHistory,
  input: UserDrawingKeyboardInput,
): MobileUserDrawingKeyboardDispatchResult {
  const action = resolveUserDrawingKeyboardAction(state, input);
  if (!action) return { state, history, changed: false, action: null };

  if (action.type === 'undo') {
    return { ...undoUserDrawingCommand(state, history), action };
  }

  if (action.type === 'redo') {
    return { ...redoUserDrawingCommand(state, history), action };
  }

  const command: UserDrawingCommand =
    action.type === 'deleteSelected'
      ? { type: 'delete', meta: { source: 'keyboard' } }
      : { type: 'cancelDraft', meta: { source: 'keyboard' } };
  return { ...dispatchUserDrawingCommandWithHistory(state, history, command), action };
}
