import type { UserDrawingTool } from './types';
import type { UserDrawingState } from './types';

export type UserDrawingToolbarAction = 'deleteSelected' | 'cancelDraft' | 'clearAll';

export interface UserDrawingToolDescriptor {
  tool: UserDrawingTool;
  icon: string;
  label: string;
}

export interface UserDrawingToolbarActionDescriptor {
  action: UserDrawingToolbarAction;
  icon: string;
  label: string;
}

export const USER_DRAWING_TOOL_DESCRIPTORS: readonly UserDrawingToolDescriptor[] = [
  { tool: 'select', icon: '⌖', label: 'Select' },
  { tool: 'trendLine', icon: '╱', label: 'Trend line' },
  { tool: 'ray', icon: '↗', label: 'Ray' },
  { tool: 'horizontalLine', icon: 'H', label: 'Horizontal line' },
  { tool: 'verticalLine', icon: 'V', label: 'Vertical line' },
  { tool: 'rectangle', icon: '□', label: 'Rectangle' },
  { tool: 'textLabel', icon: 'T', label: 'Text label' },
] as const;

export const USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS: readonly UserDrawingToolbarActionDescriptor[] = [
  { action: 'deleteSelected', icon: '⌫', label: 'Delete selected drawing' },
  { action: 'cancelDraft', icon: '×', label: 'Cancel draft drawing' },
  { action: 'clearAll', icon: '⌧', label: 'Clear all drawings' },
] as const;

export function getUserDrawingToolDescriptor(tool: UserDrawingTool): UserDrawingToolDescriptor {
  return USER_DRAWING_TOOL_DESCRIPTORS.find((descriptor) => descriptor.tool === tool) ?? USER_DRAWING_TOOL_DESCRIPTORS[0]!;
}

export function isUserDrawingToolbarActionEnabled(
  state: UserDrawingState,
  action: UserDrawingToolbarAction,
): boolean {
  if (action === 'deleteSelected') return state.selection !== null;
  if (action === 'cancelDraft') return state.draft !== null;
  return state.drawings.length > 0;
}

export function getUserDrawingToolbarStateKey(state: UserDrawingState): string {
  return [
    state.activeTool,
    state.selection?.drawingId ?? '',
    state.selection?.handle ?? '',
    state.draft ? 'draft' : '',
    state.drawings.length,
  ].join('|');
}
