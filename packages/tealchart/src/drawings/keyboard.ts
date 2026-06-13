import type { UserDrawingState } from './types';

export interface UserDrawingKeyboardInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export type UserDrawingKeyboardActionType =
  | 'undo'
  | 'redo'
  | 'copySelected'
  | 'paste'
  | 'deleteSelected'
  | 'cancelDraft';

export interface UserDrawingKeyboardAction {
  type: UserDrawingKeyboardActionType;
  preventDefault: boolean;
}

function hasPrimaryModifier(input: UserDrawingKeyboardInput): boolean {
  return input.ctrlKey === true || input.metaKey === true;
}

function hasAnyModifier(input: UserDrawingKeyboardInput): boolean {
  return input.ctrlKey === true || input.metaKey === true || input.altKey === true || input.shiftKey === true;
}

export function resolveUserDrawingKeyboardAction(
  state: UserDrawingState,
  input: UserDrawingKeyboardInput,
): UserDrawingKeyboardAction | null {
  const key = input.key.toLowerCase();

  if (hasPrimaryModifier(input) && !input.altKey && !input.shiftKey && key === 'z') {
    return { type: 'undo', preventDefault: true };
  }

  if (
    hasPrimaryModifier(input) &&
    !input.altKey &&
    ((input.shiftKey === true && key === 'z') || (input.shiftKey !== true && key === 'y'))
  ) {
    return { type: 'redo', preventDefault: true };
  }

  if (hasPrimaryModifier(input) && !input.altKey && !input.shiftKey && key === 'c' && state.selection) {
    return { type: 'copySelected', preventDefault: true };
  }

  if (hasPrimaryModifier(input) && !input.altKey && !input.shiftKey && key === 'v') {
    return { type: 'paste', preventDefault: true };
  }

  if ((input.key === 'Delete' || input.key === 'Backspace') && !hasAnyModifier(input) && state.selection) {
    return { type: 'deleteSelected', preventDefault: true };
  }

  if (input.key === 'Escape' && !hasAnyModifier(input) && state.draft) {
    return { type: 'cancelDraft', preventDefault: true };
  }

  return null;
}
