import type {
  UpdateUserDrawingOptions,
  UserDrawingIconName,
  UserDrawingImageSourceInput,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTableCellInput,
  UserDrawingTableCellsInput,
  UserDrawingTextAlign,
} from '../../drawings';

import {
  setUserDrawingIconName,
  setUserDrawingImageSource,
  setUserDrawingTableCell,
  setUserDrawingTableCells,
  setUserDrawingTableDimensions,
  setUserDrawingTextContent,
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

export function setMobileUserDrawingTextContent(
  state: UserDrawingState,
  text: string,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingTextContent(state, text, options);
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

export function setMobileUserDrawingTableCells(
  state: UserDrawingState,
  cells: UserDrawingTableCellsInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingTableCells(state, cells, options);
}

export function setMobileUserDrawingTableCell(
  state: UserDrawingState,
  row: number,
  column: number,
  value: UserDrawingTableCellInput,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingTableCell(state, row, column, value, options);
}

export function setMobileUserDrawingTableDimensions(
  state: UserDrawingState,
  rows: number,
  columns: number,
  options: UpdateUserDrawingOptions = {},
): UserDrawingState {
  return setUserDrawingTableDimensions(state, rows, columns, options);
}
