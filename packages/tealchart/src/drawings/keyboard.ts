import type { UserDrawingState, UserDrawingTool } from './types';

export type UserDrawingKeyboardFocusOwner = 'chart' | 'textInput' | 'appControl';

export interface UserDrawingKeyboardInput {
  key: string;
  // Physical key code (e.g. 'KeyT'), layout-independent. Tool hotkeys match on
  // this because Alt+letter yields a special character in `key` on macOS.
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  focusOwner?: UserDrawingKeyboardFocusOwner;
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
  | 'cancelDraft'
  | 'selectTool';

export interface UserDrawingKeyboardAction {
  type: UserDrawingKeyboardActionType;
  preventDefault: boolean;
  delta?: { x: number; y: number };
  tool?: UserDrawingTool;
}

// Alt + physical key → drawing tool, TradingView-style. Keyed by `code` so it is
// independent of keyboard layout and the special characters Alt/Option produces.
export const USER_DRAWING_TOOL_HOTKEYS: Readonly<Record<string, UserDrawingTool>> = {
  KeyT: 'trendLine',
  KeyH: 'horizontalLine',
  KeyV: 'verticalLine',
  KeyC: 'crossLine',
  KeyR: 'ray',
  KeyE: 'extendedLine',
  KeyF: 'fibRetracement',
  KeyP: 'parallelChannel',
  KeyB: 'brush',
  KeyI: 'infoLine',
};

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
  if (input.focusOwner && input.focusOwner !== 'chart') return null;

  // Alt + letter selects a drawing tool. Alt-only (no Ctrl/Meta/Shift) so it
  // never collides with the editing shortcuts below, all of which require !alt.
  if (input.altKey === true && !input.ctrlKey && !input.metaKey && !input.shiftKey && input.code) {
    const tool = USER_DRAWING_TOOL_HOTKEYS[input.code];
    if (tool) return { type: 'selectTool', tool, preventDefault: true };
  }

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
