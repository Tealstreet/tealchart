import type { UserDrawingState } from '../../drawings';

import {
  createUserDrawingState,
  deserializeUserDrawingStateFromLayout,
  serializeUserDrawingStateForLayout,
} from '../../drawings';

export function exportMobileUserDrawingStateForLayout(state: UserDrawingState): UserDrawingState | undefined {
  return serializeUserDrawingStateForLayout(state);
}

export function importMobileUserDrawingStateFromLayout(state?: UserDrawingState | null): UserDrawingState {
  return deserializeUserDrawingStateFromLayout(state) ?? createUserDrawingState();
}
