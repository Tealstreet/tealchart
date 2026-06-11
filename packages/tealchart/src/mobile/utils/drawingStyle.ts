import type { UpdateUserDrawingOptions, UserDrawingState, UserDrawingStyle } from '../../drawings';

import {
  setUserDrawingLocked,
  setUserDrawingVisibility,
  updateUserDrawingStyle,
} from '../../drawings';

export function updateMobileUserDrawingStyle(
  state: UserDrawingState,
  style: Partial<UserDrawingStyle>,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return updateUserDrawingStyle(state, style, options);
}

export function setMobileUserDrawingVisibility(
  state: UserDrawingState,
  visible: boolean,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingVisibility(state, visible, options);
}

export function setMobileUserDrawingLocked(
  state: UserDrawingState,
  locked: boolean,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingLocked(state, locked, options);
}
