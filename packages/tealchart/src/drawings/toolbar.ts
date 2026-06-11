import type { UserDrawingLineStyle, UserDrawingState, UserDrawingTool } from './types';

export type UserDrawingToolbarAction = 'deleteSelected' | 'cancelDraft' | 'clearAll';
export type UserDrawingStyleToolbarAction = 'toggleVisibility' | 'toggleLocked';

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

export interface UserDrawingLineColorDescriptor {
  color: string;
  label: string;
}

export interface UserDrawingLineWidthDescriptor {
  width: number;
  label: string;
}

export interface UserDrawingLineStyleDescriptor {
  lineStyle: UserDrawingLineStyle;
  icon: string;
  label: string;
}

export interface UserDrawingStyleToolbarActionDescriptor {
  action: UserDrawingStyleToolbarAction;
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

export const USER_DRAWING_LINE_COLOR_DESCRIPTORS: readonly UserDrawingLineColorDescriptor[] = [
  { color: '#f5c542', label: 'Amber line color' },
  { color: '#22c55e', label: 'Green line color' },
  { color: '#38bdf8', label: 'Blue line color' },
  { color: '#f43f5e', label: 'Red line color' },
  { color: '#d1d4dc', label: 'Light line color' },
] as const;

export const USER_DRAWING_LINE_WIDTH_DESCRIPTORS: readonly UserDrawingLineWidthDescriptor[] = [
  { width: 1, label: '1 pixel line width' },
  { width: 2, label: '2 pixel line width' },
  { width: 3, label: '3 pixel line width' },
] as const;

export const USER_DRAWING_LINE_STYLE_DESCRIPTORS: readonly UserDrawingLineStyleDescriptor[] = [
  { lineStyle: 'solid', icon: '━', label: 'Solid line style' },
  { lineStyle: 'dashed', icon: '┄', label: 'Dashed line style' },
  { lineStyle: 'dotted', icon: '┈', label: 'Dotted line style' },
] as const;

export const USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS: readonly UserDrawingStyleToolbarActionDescriptor[] = [
  { action: 'toggleVisibility', icon: '◉', label: 'Toggle selected drawing visibility' },
  { action: 'toggleLocked', icon: '🔒', label: 'Toggle selected drawing lock' },
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

export function getSelectedUserDrawing(state: UserDrawingState) {
  const selectedId = state.selection?.drawingId;
  return selectedId ? state.drawings.find((drawing) => drawing.id === selectedId) ?? null : null;
}

export function isUserDrawingStyleToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked;
}

export function isUserDrawingStyleToolbarActionEnabled(
  state: UserDrawingState,
  action: UserDrawingStyleToolbarAction,
): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  if (!selectedDrawing) return false;
  if (action === 'toggleLocked') return true;
  return !selectedDrawing.locked;
}

export function getUserDrawingToolbarStateKey(state: UserDrawingState): string {
  const selectedDrawing = getSelectedUserDrawing(state);

  return [
    state.activeTool,
    state.selection?.drawingId ?? '',
    state.selection?.handle ?? '',
    state.draft ? 'draft' : '',
    state.drawings.length,
    selectedDrawing?.visible === false ? 'hidden' : 'visible',
    selectedDrawing?.locked ? 'locked' : 'unlocked',
    selectedDrawing?.style.lineColor ?? '',
    selectedDrawing?.style.lineWidth ?? '',
    selectedDrawing?.style.lineStyle ?? '',
  ].join('|');
}
