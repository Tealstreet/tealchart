import type { UserDrawingCommandEvent, UserDrawingCommandHistory, UserDrawingState } from '../../drawings';

import {
  clearUserDrawingCommandHistory,
  createUserDrawingReplaceStateCommandEvent,
  createUserDrawingState,
  deserializeUserDrawingStateFromLayout,
  isUserDrawingLayoutStateEqual,
  serializeUserDrawingStateForLayout,
} from '../../drawings';

export function exportMobileUserDrawingStateForLayout(state: UserDrawingState): UserDrawingState | undefined {
  return serializeUserDrawingStateForLayout(state);
}

export function importMobileUserDrawingStateFromLayout(state?: unknown): UserDrawingState {
  return deserializeUserDrawingStateFromLayout(state) ?? createUserDrawingState();
}

export function createMobileUserDrawingReplaceStateCommandEvent(
  previousState: UserDrawingState,
  state: UserDrawingState,
  source: 'api' | 'layout',
): UserDrawingCommandEvent | null {
  return createUserDrawingReplaceStateCommandEvent(previousState, state, {
    type: 'replaceState',
    meta: { source },
  });
}

export interface MobileUserDrawingReplaceStateResult {
  state: UserDrawingState;
  history: UserDrawingCommandHistory;
  event: UserDrawingCommandEvent | null;
}

export function replaceMobileUserDrawingState(
  previousState: UserDrawingState,
  history: UserDrawingCommandHistory,
  state: UserDrawingState,
  source: 'api' | 'layout',
): MobileUserDrawingReplaceStateResult {
  return {
    state,
    history: clearUserDrawingCommandHistory(history),
    event: isUserDrawingLayoutStateEqual(previousState, state)
      ? null
      : createMobileUserDrawingReplaceStateCommandEvent(previousState, state, source),
  };
}
