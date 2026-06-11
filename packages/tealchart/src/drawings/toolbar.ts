import type {
  UserDrawing,
  UserDrawingFontFamily,
  UserDrawingLineStyle,
  UserDrawingState,
  UserDrawingTextAlign,
  UserDrawingTool,
} from './types';

import {
  isUserDrawingTextAnnotation,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_SIZES,
  USER_DRAWING_OPACITIES,
} from './types';

export type UserDrawingToolbarAction = 'deleteSelected' | 'cancelDraft' | 'clearAll';
export type UserDrawingStyleToolbarAction = 'hideSelected' | 'lockSelected';

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

export interface UserDrawingFillColorDescriptor {
  fillColor: string;
  label: string;
}

export interface UserDrawingTextColorDescriptor {
  textColor: string;
  label: string;
}

export interface UserDrawingFontSizeDescriptor {
  fontSize: number;
  label: string;
}

export interface UserDrawingFontFamilyDescriptor {
  fontFamily: UserDrawingFontFamily;
  icon: string;
  label: string;
}

export interface UserDrawingTextAlignDescriptor {
  textAlign: UserDrawingTextAlign;
  icon: string;
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

export interface UserDrawingOpacityDescriptor {
  opacity: number;
  label: string;
}

export interface UserDrawingStyleToggleDescriptor {
  style: 'lineVisible' | 'fillVisible';
  icon: string;
  label: string;
}

export interface UserDrawingStyleToolbarActionDescriptor {
  action: UserDrawingStyleToolbarAction;
  icon: string;
  label: string;
}

export type UserDrawingStyleToolbarActionState =
  | {
      enabled: true;
      style?: never;
      visible?: boolean;
      locked?: boolean;
      includeLocked?: boolean;
    }
  | {
      enabled: false;
      style?: never;
      visible?: never;
      locked?: never;
      includeLocked?: never;
    };

export const USER_DRAWING_TOOL_DESCRIPTORS: readonly UserDrawingToolDescriptor[] = [
  { tool: 'select', icon: '⌖', label: 'Select' },
  { tool: 'trendLine', icon: '╱', label: 'Trend line' },
  { tool: 'trendAngle', icon: '∠', label: 'Trend angle' },
  { tool: 'extendedLine', icon: '⟷', label: 'Extended line' },
  { tool: 'infoLine', icon: 'i', label: 'Info line' },
  { tool: 'arrowLine', icon: '↗', label: 'Arrow line' },
  { tool: 'arrowMarker', icon: '➤', label: 'Arrow marker' },
  { tool: 'arrowMarkUp', icon: '↑', label: 'Arrow mark up' },
  { tool: 'arrowMarkDown', icon: '↓', label: 'Arrow mark down' },
  { tool: 'ray', icon: '↗', label: 'Ray' },
  { tool: 'horizontalRay', icon: '↦', label: 'Horizontal ray' },
  { tool: 'crossLine', icon: '⊕', label: 'Cross line' },
  { tool: 'horizontalLine', icon: 'H', label: 'Horizontal line' },
  { tool: 'verticalLine', icon: 'V', label: 'Vertical line' },
  { tool: 'rectangle', icon: '□', label: 'Rectangle' },
  { tool: 'circle', icon: '○', label: 'Circle' },
  { tool: 'ellipse', icon: '⬭', label: 'Ellipse' },
  { tool: 'rotatedRectangle', icon: '▱', label: 'Rotated rectangle' },
  { tool: 'priceRange', icon: 'Δ', label: 'Price range' },
  { tool: 'dateRange', icon: '↔', label: 'Date range' },
  { tool: 'datePriceRange', icon: '⊞', label: 'Date and price range' },
  { tool: 'longPosition', icon: 'L', label: 'Long position' },
  { tool: 'shortPosition', icon: 'S', label: 'Short position' },
  { tool: 'forecast', icon: '↗', label: 'Forecast' },
  { tool: 'projection', icon: '⌁', label: 'Projection' },
  { tool: 'barsPattern', icon: '▥', label: 'Bars pattern' },
  { tool: 'anchoredVwap', icon: '∿', label: 'Anchored VWAP' },
  { tool: 'fibRetracement', icon: 'F', label: 'Fib retracement' },
  { tool: 'fibExtension', icon: 'E', label: 'Fib extension' },
  { tool: 'fibFan', icon: 'F', label: 'Fib fan' },
  { tool: 'fibSpeedResistanceFan', icon: 'S', label: 'Fib speed resistance fan' },
  { tool: 'fibSpeedResistanceArcs', icon: 'A', label: 'Fib speed resistance arcs' },
  { tool: 'fibCircles', icon: 'O', label: 'Fib circles' },
  { tool: 'fibWedge', icon: 'W', label: 'Fib wedge' },
  { tool: 'fibSpiral', icon: 'S', label: 'Fib spiral' },
  { tool: 'fibChannel', icon: 'C', label: 'Fib channel' },
  { tool: 'fibTimeZone', icon: 'T', label: 'Fib time zone' },
  { tool: 'trendBasedFibTime', icon: 'B', label: 'Trend-based fib time' },
  { tool: 'cyclicLines', icon: '|', label: 'Cyclic lines' },
  { tool: 'timeCycles', icon: '∩', label: 'Time cycles' },
  { tool: 'sineLine', icon: '∿', label: 'Sine line' },
  { tool: 'gannFan', icon: 'G', label: 'Gann fan' },
  { tool: 'gannBox', icon: '□', label: 'Gann box' },
  { tool: 'gannSquare', icon: '◇', label: 'Gann square' },
  { tool: 'triangle', icon: '△', label: 'Triangle' },
  { tool: 'curve', icon: '⌒', label: 'Curve' },
  { tool: 'arc', icon: '◜', label: 'Arc' },
  { tool: 'polyline', icon: '⌁', label: 'Polyline' },
  { tool: 'pitchfork', icon: 'Ψ', label: 'Pitchfork' },
  { tool: 'schiffPitchfork', icon: 'S', label: 'Schiff pitchfork' },
  { tool: 'modifiedSchiffPitchfork', icon: 'M', label: 'Modified Schiff pitchfork' },
  { tool: 'insidePitchfork', icon: 'I', label: 'Inside pitchfork' },
  { tool: 'pitchfan', icon: 'F', label: 'Pitchfan' },
  { tool: 'parallelChannel', icon: '▱', label: 'Parallel channel' },
  { tool: 'regressionTrend', icon: '≋', label: 'Regression trend' },
  { tool: 'flatTopBottom', icon: '▰', label: 'Flat top/bottom' },
  { tool: 'disjointChannel', icon: '◇', label: 'Disjoint channel' },
  { tool: 'path', icon: '⌁', label: 'Path' },
  { tool: 'brush', icon: '✎', label: 'Brush' },
  { tool: 'highlighter', icon: '▰', label: 'Highlighter' },
  { tool: 'note', icon: 'N', label: 'Note' },
  { tool: 'callout', icon: 'C', label: 'Callout' },
  { tool: 'comment', icon: '!', label: 'Comment' },
  { tool: 'priceNote', icon: '$', label: 'Price note' },
  { tool: 'pin', icon: 'P', label: 'Pin' },
  { tool: 'icon', icon: '*', label: 'Icon' },
  { tool: 'balloon', icon: 'B', label: 'Balloon' },
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

export const USER_DRAWING_FILL_COLOR_DESCRIPTORS: readonly UserDrawingFillColorDescriptor[] = [
  { fillColor: 'rgba(245, 197, 66, 0.12)', label: 'Amber fill color' },
  { fillColor: 'rgba(34, 197, 94, 0.12)', label: 'Green fill color' },
  { fillColor: 'rgba(56, 189, 248, 0.12)', label: 'Blue fill color' },
  { fillColor: 'rgba(244, 63, 94, 0.12)', label: 'Red fill color' },
  { fillColor: 'rgba(209, 212, 220, 0.12)', label: 'Light fill color' },
] as const;

export const USER_DRAWING_TEXT_COLOR_DESCRIPTORS: readonly UserDrawingTextColorDescriptor[] = [
  { textColor: '#f5c542', label: 'Amber text color' },
  { textColor: '#22c55e', label: 'Green text color' },
  { textColor: '#38bdf8', label: 'Blue text color' },
  { textColor: '#f43f5e', label: 'Red text color' },
  { textColor: '#d1d4dc', label: 'Light text color' },
] as const;

export const USER_DRAWING_FONT_SIZE_DESCRIPTORS: readonly UserDrawingFontSizeDescriptor[] = [
  ...USER_DRAWING_FONT_SIZES.map((fontSize) => ({ fontSize, label: `${fontSize} pixel font size` })),
];

export const USER_DRAWING_FONT_FAMILY_DESCRIPTORS: readonly UserDrawingFontFamilyDescriptor[] =
  USER_DRAWING_FONT_FAMILIES.map((fontFamily) => ({
    fontFamily,
    icon: fontFamily === 'monospace' ? 'M' : fontFamily === 'serif' ? 'R' : 'S',
    label: `${fontFamily} font family`,
  }));

export const USER_DRAWING_TEXT_ALIGN_DESCRIPTORS: readonly UserDrawingTextAlignDescriptor[] = [
  { textAlign: 'left', icon: 'L', label: 'Left text alignment' },
  { textAlign: 'center', icon: 'C', label: 'Center text alignment' },
  { textAlign: 'right', icon: 'R', label: 'Right text alignment' },
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

export const USER_DRAWING_OPACITY_DESCRIPTORS: readonly UserDrawingOpacityDescriptor[] = [
  ...USER_DRAWING_OPACITIES.map((opacity) => ({
    opacity,
    label: `${Math.round(opacity * 100)} percent opacity`,
  })),
];

export const USER_DRAWING_STYLE_TOGGLE_DESCRIPTORS: readonly UserDrawingStyleToggleDescriptor[] = [
  { style: 'lineVisible', icon: '▣', label: 'Toggle drawing border' },
  { style: 'fillVisible', icon: '◩', label: 'Toggle drawing fill' },
] as const;

export const USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS: readonly UserDrawingStyleToolbarActionDescriptor[] = [
  { action: 'hideSelected', icon: '◌', label: 'Hide selected drawing' },
  { action: 'lockSelected', icon: '🔒', label: 'Lock selected drawing' },
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

export function supportsUserDrawingFillControls(drawing: UserDrawing): boolean {
  return (
    drawing.kind === 'icon' ||
    drawing.kind === 'arrowMarker' ||
    drawing.kind === 'arrowMarkUp' ||
    drawing.kind === 'arrowMarkDown' ||
    drawing.kind === 'rectangle' ||
    drawing.kind === 'circle' ||
    drawing.kind === 'ellipse' ||
    drawing.kind === 'priceRange' ||
    drawing.kind === 'dateRange' ||
    drawing.kind === 'datePriceRange' ||
    drawing.kind === 'triangle' ||
    drawing.kind === 'fibWedge' ||
    drawing.kind === 'gannBox' ||
    drawing.kind === 'gannSquare' ||
    drawing.kind === 'rotatedRectangle' ||
    drawing.kind === 'parallelChannel' ||
    drawing.kind === 'regressionTrend' ||
    drawing.kind === 'flatTopBottom' ||
    drawing.kind === 'disjointChannel' ||
    isUserDrawingTextAnnotation(drawing)
  );
}

export function supportsUserDrawingTextControls(drawing: UserDrawing): boolean {
  return isUserDrawingTextAnnotation(drawing);
}

export function isUserDrawingFillToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingFillControls(selectedDrawing);
}

export function isUserDrawingTextToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingTextControls(selectedDrawing);
}

export function isUserDrawingStyleToolbarActionEnabled(
  state: UserDrawingState,
  action: UserDrawingStyleToolbarAction,
): boolean {
  return resolveUserDrawingStyleToolbarAction(state, action).enabled;
}

export function resolveUserDrawingStyleToolbarAction(
  state: UserDrawingState,
  action: UserDrawingStyleToolbarAction,
): UserDrawingStyleToolbarActionState {
  const selectedDrawing = getSelectedUserDrawing(state);
  if (!selectedDrawing || selectedDrawing.locked) return { enabled: false };

  if (action === 'hideSelected') return { enabled: true, visible: false };
  return { enabled: true, locked: true };
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
    selectedDrawing?.style.opacity ?? '',
    selectedDrawing?.style.lineVisible ?? '',
    selectedDrawing?.style.fillVisible ?? '',
    selectedDrawing?.style.fillColor ?? '',
    selectedDrawing?.style.textColor ?? '',
    selectedDrawing?.style.fontSize ?? '',
    selectedDrawing?.style.fontFamily ?? '',
    selectedDrawing && isUserDrawingTextAnnotation(selectedDrawing) ? selectedDrawing.textAlign : '',
  ].join('|');
}
