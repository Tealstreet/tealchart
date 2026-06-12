import type {
  UpdateUserDrawingOptions,
  UserDrawingIconName,
  UserDrawingImageSourceInput,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
} from '../../drawings';

import {
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingTextAlign,
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

export function setMobileUserDrawingTextAlign(
  state: UserDrawingState,
  textAlign: UserDrawingTextAlign,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingTextAlign(state, textAlign, options);
}

export function setMobileUserDrawingIconName(
  state: UserDrawingState,
  iconName: UserDrawingIconName,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingIconName(state, iconName, options);
}

export function setMobileUserDrawingImageSource(
  state: UserDrawingState,
  source: UserDrawingImageSourceInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingImageSource(state, source, options);
}
