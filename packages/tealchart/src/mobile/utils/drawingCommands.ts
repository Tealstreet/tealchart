import type {
  UserDrawingCommand,
  UserDrawingCommandDispatchResult,
  UserDrawingCommandHistory,
  UserDrawingHistoryDispatchResult,
  UserDrawingState,
} from '../../drawings';

import {
  dispatchUserDrawingCommand,
  dispatchUserDrawingCommandWithHistory,
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
