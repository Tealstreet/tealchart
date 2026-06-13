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
  | 'duplicateSelected'
  | 'nudge'
  | 'selectAll'
  | 'clearSelection'
  | 'deleteSelected'
  | 'cancelDraft';

export interface UserDrawingKeyboardAction {
  type: UserDrawingKeyboardActionType;
  preventDefault: boolean;
  delta?: { x: number; y: number };
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

  if (hasPrimaryModifier(input) && !input.altKey && !input.shiftKey && key === 'd' && state.selection) {
    return { type: 'duplicateSelected', preventDefault: true };
  }

  if (hasPrimaryModifier(input) && !input.altKey && !input.shiftKey && key === 'v') {
    return { type: 'paste', preventDefault: true };
  }

  if (hasPrimaryModifier(input) && !input.altKey && !input.shiftKey && key === 'a' && state.drawings.length > 0) {
    return { type: 'selectAll', preventDefault: true };
  }

  const nudgeStep = input.shiftKey === true ? 10 : 1;
  if (!input.ctrlKey && !input.metaKey && !input.altKey && state.selection) {
    if (input.key === 'ArrowLeft') return { type: 'nudge', delta: { x: -nudgeStep, y: 0 }, preventDefault: true };
    if (input.key === 'ArrowRight') return { type: 'nudge', delta: { x: nudgeStep, y: 0 }, preventDefault: true };
    if (input.key === 'ArrowUp') return { type: 'nudge', delta: { x: 0, y: -nudgeStep }, preventDefault: true };
    if (input.key === 'ArrowDown') return { type: 'nudge', delta: { x: 0, y: nudgeStep }, preventDefault: true };
  }

  if ((input.key === 'Delete' || input.key === 'Backspace') && !hasAnyModifier(input) && state.selection) {
    return { type: 'deleteSelected', preventDefault: true };
  }

  if (input.key === 'Escape' && !hasAnyModifier(input) && state.draft) {
    return { type: 'cancelDraft', preventDefault: true };
  }

  if (input.key === 'Escape' && !hasAnyModifier(input) && state.selection) {
    return { type: 'clearSelection', preventDefault: true };
  }

  return null;
}
