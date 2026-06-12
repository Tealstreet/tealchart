import type {
  UserDrawing,
  UserDrawingFontFamily,
  UserDrawingFontStyle,
  UserDrawingFontWeight,
  UserDrawingIconName,
  UserDrawingLineStyle,
  UserDrawingState,
  UserDrawingTextAlign,
  UserDrawingTextMaxWidth,
  UserDrawingTrendLineExtend,
  UserDrawingTool,
} from './types';
import type { UserDrawingZOrderAction } from './input';

import {
  USER_DRAWING_ICON_NAMES,
  isUserDrawingTextAnnotation,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_STYLES,
  USER_DRAWING_FONT_WEIGHTS,
  USER_DRAWING_FONT_SIZES,
  USER_DRAWING_OPACITIES,
  USER_DRAWING_TEXT_MAX_WIDTHS,
  USER_DRAWING_TREND_LINE_EXTENDS,
} from './types';
import { getUserDrawingSelectionIds, reorderUserDrawings } from './input';

export type UserDrawingToolbarAction =
  | 'duplicateSelected'
  | 'deleteSelected'
  | 'bringForward'
  | 'sendBackward'
  | 'bringToFront'
  | 'sendToBack'
  | 'cancelDraft'
  | 'clearAll';
export type UserDrawingStyleToolbarAction = 'hideSelected' | 'showSelected' | 'lockSelected' | 'unlockSelected';

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

export interface UserDrawingFontWeightDescriptor {
  fontWeight: UserDrawingFontWeight;
  icon: string;
  label: string;
}

export interface UserDrawingFontStyleDescriptor {
  fontStyle: UserDrawingFontStyle;
  icon: string;
  label: string;
}

export interface UserDrawingTextDecorationDescriptor {
  textUnderline?: boolean;
  textLineThrough?: boolean;
  icon: string;
  label: string;
}

export interface UserDrawingTextWrapDescriptor {
  textWrap: boolean;
  icon: string;
  label: string;
}

export interface UserDrawingTextMaxWidthDescriptor {
  textMaxWidth: UserDrawingTextMaxWidth;
  label: string;
}

export interface UserDrawingTextAlignDescriptor {
  textAlign: UserDrawingTextAlign;
  icon: string;
  label: string;
}

export interface UserDrawingTrendLineExtendDescriptor {
  extend: UserDrawingTrendLineExtend;
  icon: string;
  label: string;
}

export interface UserDrawingIconNameDescriptor {
  iconName: UserDrawingIconName;
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
  { tool: 'arrowMarkLeft', icon: '←', label: 'Arrow mark left' },
  { tool: 'arrowMarkRight', icon: '→', label: 'Arrow mark right' },
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
  { tool: 'sector', icon: '◔', label: 'Sector' },
  { tool: 'barsPattern', icon: '▥', label: 'Bars pattern' },
  { tool: 'trianglePattern', icon: '△', label: 'Triangle pattern' },
  { tool: 'abcdPattern', icon: 'A', label: 'ABCD pattern' },
  { tool: 'xabcdPattern', icon: 'X', label: 'XABCD pattern' },
  { tool: 'cypherPattern', icon: 'Cy', label: 'Cypher pattern' },
  { tool: 'threeDrivesPattern', icon: '3', label: 'Three drives pattern' },
  { tool: 'headShouldersPattern', icon: 'HS', label: 'Head and shoulders pattern' },
  { tool: 'elliottImpulseWave', icon: '123', label: 'Elliott impulse wave' },
  { tool: 'elliottCorrectiveWave', icon: 'ABC', label: 'Elliott corrective wave' },
  { tool: 'elliottDoubleComboWave', icon: 'WXY', label: 'Elliott double combo wave' },
  { tool: 'elliottTripleComboWave', icon: 'WXYXZ', label: 'Elliott triple combo wave' },
  { tool: 'elliottTriangleWave', icon: 'ABCDE', label: 'Elliott triangle wave' },
  { tool: 'anchoredVwap', icon: '∿', label: 'Anchored VWAP' },
  { tool: 'anchoredVolumeProfile', icon: 'AVP', label: 'Anchored volume profile' },
  { tool: 'fixedRangeVolumeProfile', icon: 'VP', label: 'Fixed range volume profile' },
  { tool: 'fibRetracement', icon: 'F', label: 'Fib retracement' },
  { tool: 'fibExtension', icon: 'E', label: 'Fib extension' },
  { tool: 'trendBasedFibExtension', icon: 'TBE', label: 'Trend-based fib extension' },
  { tool: 'fibFan', icon: 'F', label: 'Fib fan' },
  { tool: 'fibSpeedResistanceFan', icon: 'S', label: 'Fib speed resistance fan' },
  { tool: 'fibArcs', icon: 'A', label: 'Fib arcs' },
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
  { tool: 'gannSquareFixed', icon: '◇F', label: 'Gann square fixed' },
  { tool: 'triangle', icon: '△', label: 'Triangle' },
  { tool: 'curve', icon: '⌒', label: 'Curve' },
  { tool: 'doubleCurve', icon: '≈', label: 'Double curve' },
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
  { tool: 'anchoredText', icon: 'AT', label: 'Anchored text' },
  { tool: 'anchoredNote', icon: 'AN', label: 'Anchored note' },
  { tool: 'callout', icon: 'C', label: 'Callout' },
  { tool: 'comment', icon: '!', label: 'Comment' },
  { tool: 'priceLabel', icon: 'PL', label: 'Price label' },
  { tool: 'priceNote', icon: '$', label: 'Price note' },
  { tool: 'pin', icon: 'P', label: 'Pin' },
  { tool: 'icon', icon: '*', label: 'Icon' },
  { tool: 'flagMark', icon: '⚑', label: 'Flag mark' },
  { tool: 'image', icon: 'IMG', label: 'Image' },
  { tool: 'emoji', icon: '☺', label: 'Emoji' },
  { tool: 'sticker', icon: '★', label: 'Sticker' },
  { tool: 'balloon', icon: 'B', label: 'Balloon' },
  { tool: 'signpost', icon: 'S', label: 'Signpost' },
  { tool: 'table', icon: 'TBL', label: 'Table' },
  { tool: 'textLabel', icon: 'T', label: 'Text label' },
] as const;

export const USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS: readonly UserDrawingToolbarActionDescriptor[] = [
  { action: 'duplicateSelected', icon: '⧉', label: 'Duplicate selected drawing' },
  { action: 'deleteSelected', icon: '⌫', label: 'Delete selected drawing' },
  { action: 'bringForward', icon: '↑', label: 'Bring selected drawing forward' },
  { action: 'sendBackward', icon: '↓', label: 'Send selected drawing backward' },
  { action: 'bringToFront', icon: '⇧', label: 'Bring selected drawing to front' },
  { action: 'sendToBack', icon: '⇩', label: 'Send selected drawing to back' },
  { action: 'cancelDraft', icon: '×', label: 'Cancel draft drawing' },
  { action: 'clearAll', icon: '⌧', label: 'Clear all drawings' },
] as const;

export function getUserDrawingZOrderAction(action: UserDrawingToolbarAction): UserDrawingZOrderAction | null {
  switch (action) {
    case 'bringForward':
    case 'sendBackward':
    case 'bringToFront':
    case 'sendToBack':
      return action;
    default:
      return null;
  }
}

export const USER_DRAWING_LINE_COLOR_DESCRIPTORS: readonly UserDrawingLineColorDescriptor[] = [
  { color: '#f5c542', label: 'Amber line color' },
  { color: '#22c55e', label: 'Green line color' },
  { color: '#38bdf8', label: 'Blue line color' },
  { color: '#f43f5e', label: 'Red line color' },
  { color: '#f97316', label: 'Orange line color' },
  { color: '#a855f7', label: 'Purple line color' },
  { color: '#d1d4dc', label: 'Light line color' },
] as const;

export const USER_DRAWING_FILL_COLOR_DESCRIPTORS: readonly UserDrawingFillColorDescriptor[] = [
  { fillColor: 'rgba(245, 197, 66, 0.12)', label: 'Amber fill color' },
  { fillColor: 'rgba(34, 197, 94, 0.12)', label: 'Green fill color' },
  { fillColor: 'rgba(56, 189, 248, 0.12)', label: 'Blue fill color' },
  { fillColor: 'rgba(244, 63, 94, 0.12)', label: 'Red fill color' },
  { fillColor: 'rgba(249, 115, 22, 0.12)', label: 'Orange fill color' },
  { fillColor: 'rgba(168, 85, 247, 0.12)', label: 'Purple fill color' },
  { fillColor: 'rgba(209, 212, 220, 0.12)', label: 'Light fill color' },
] as const;

export const USER_DRAWING_TEXT_COLOR_DESCRIPTORS: readonly UserDrawingTextColorDescriptor[] = [
  { textColor: '#f5c542', label: 'Amber text color' },
  { textColor: '#22c55e', label: 'Green text color' },
  { textColor: '#38bdf8', label: 'Blue text color' },
  { textColor: '#f43f5e', label: 'Red text color' },
  { textColor: '#f97316', label: 'Orange text color' },
  { textColor: '#a855f7', label: 'Purple text color' },
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

export const USER_DRAWING_FONT_WEIGHT_DESCRIPTORS: readonly UserDrawingFontWeightDescriptor[] =
  USER_DRAWING_FONT_WEIGHTS.map((fontWeight) => ({
    fontWeight,
    icon: fontWeight === 'bold' ? 'B' : 'N',
    label: fontWeight === 'bold' ? 'Bold text' : 'Normal text',
  }));

export const USER_DRAWING_FONT_STYLE_DESCRIPTORS: readonly UserDrawingFontStyleDescriptor[] =
  USER_DRAWING_FONT_STYLES.map((fontStyle) => ({
    fontStyle,
    icon: fontStyle === 'italic' ? 'I' : 'R',
    label: fontStyle === 'italic' ? 'Italic text' : 'Regular text',
  }));

export const USER_DRAWING_TEXT_DECORATION_DESCRIPTORS: readonly UserDrawingTextDecorationDescriptor[] = [
  { textUnderline: true, icon: 'U', label: 'Underline text' },
  { textLineThrough: true, icon: 'S', label: 'Strike-through text' },
] as const;

export const USER_DRAWING_TEXT_WRAP_DESCRIPTORS: readonly UserDrawingTextWrapDescriptor[] = [
  { textWrap: false, icon: '↔', label: 'Do not wrap text' },
  { textWrap: true, icon: '↵', label: 'Wrap text' },
] as const;

export const USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS: readonly UserDrawingTextMaxWidthDescriptor[] = [
  ...USER_DRAWING_TEXT_MAX_WIDTHS.map((textMaxWidth) => ({
    textMaxWidth,
    label: `${textMaxWidth} pixel text box width`,
  })),
];

export const USER_DRAWING_TEXT_ALIGN_DESCRIPTORS: readonly UserDrawingTextAlignDescriptor[] = [
  { textAlign: 'left', icon: 'L', label: 'Left text alignment' },
  { textAlign: 'center', icon: 'C', label: 'Center text alignment' },
  { textAlign: 'right', icon: 'R', label: 'Right text alignment' },
] as const;

export const USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS: readonly UserDrawingTrendLineExtendDescriptor[] =
  USER_DRAWING_TREND_LINE_EXTENDS.map((extend) => ({
    extend,
    icon: extend === 'none' ? '—' : extend === 'left' ? '←' : extend === 'right' ? '→' : '↔',
    label:
      extend === 'none'
        ? 'Do not extend trend line'
        : extend === 'left'
          ? 'Extend trend line left'
          : extend === 'right'
            ? 'Extend trend line right'
            : 'Extend trend line both ways',
  }));

export const USER_DRAWING_ICON_NAME_DESCRIPTORS: readonly UserDrawingIconNameDescriptor[] = USER_DRAWING_ICON_NAMES.map(
  (iconName) => ({
    iconName,
    icon:
      iconName === 'star'
        ? '*'
        : iconName === 'circle'
          ? '○'
          : iconName === 'square'
            ? '□'
            : iconName === 'triangle'
              ? '△'
              : iconName === 'flag'
                ? '⚑'
                : iconName === 'arrowUp'
                  ? '↑'
                  : '↓',
    label:
      iconName === 'arrowUp'
        ? 'Arrow up icon'
        : iconName === 'arrowDown'
          ? 'Arrow down icon'
          : `${iconName.charAt(0).toUpperCase()}${iconName.slice(1)} icon`,
  }),
);

export const USER_DRAWING_LINE_WIDTH_DESCRIPTORS: readonly UserDrawingLineWidthDescriptor[] = [
  { width: 1, label: '1 pixel line width' },
  { width: 2, label: '2 pixel line width' },
  { width: 3, label: '3 pixel line width' },
  { width: 4, label: '4 pixel line width' },
  { width: 5, label: '5 pixel line width' },
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
  { action: 'showSelected', icon: '●', label: 'Show selected drawing' },
  { action: 'lockSelected', icon: '🔒', label: 'Lock selected drawing' },
  { action: 'unlockSelected', icon: '🔓', label: 'Unlock selected drawing' },
] as const;

export function getUserDrawingToolDescriptor(tool: UserDrawingTool): UserDrawingToolDescriptor {
  return USER_DRAWING_TOOL_DESCRIPTORS.find((descriptor) => descriptor.tool === tool) ?? USER_DRAWING_TOOL_DESCRIPTORS[0]!;
}

export function isUserDrawingToolbarActionEnabled(
  state: UserDrawingState,
  action: UserDrawingToolbarAction,
): boolean {
  if (action === 'duplicateSelected' || action === 'deleteSelected') return hasUnlockedSelectedDrawing(state);
  const zOrderAction = getUserDrawingZOrderAction(action);
  if (zOrderAction) return reorderUserDrawings(state, zOrderAction) !== state;
  if (action === 'cancelDraft') return state.draft !== null;
  return state.drawings.length > 0;
}

function hasUnlockedSelectedDrawing(state: UserDrawingState): boolean {
  const selectedIds = new Set(getUserDrawingSelectionIds(state.selection));
  return state.drawings.some((drawing) => selectedIds.has(drawing.id) && !drawing.locked);
}

export function getSelectedUserDrawing(state: UserDrawingState) {
  const selectedId = state.selection?.drawingId;
  return selectedId ? state.drawings.find((drawing) => drawing.id === selectedId) ?? null : null;
}

export function isUserDrawingStyleToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked;
}

export function supportsUserDrawingFillColorControls(drawing: UserDrawing): boolean {
  return (
    drawing.kind === 'icon' ||
    drawing.kind === 'image' ||
    drawing.kind === 'arrowMarker' ||
    drawing.kind === 'arrowMarkLeft' ||
    drawing.kind === 'arrowMarkRight' ||
    drawing.kind === 'arrowMarkUp' ||
    drawing.kind === 'arrowMarkDown' ||
    drawing.kind === 'flagMark' ||
    drawing.kind === 'rectangle' ||
    drawing.kind === 'circle' ||
    drawing.kind === 'ellipse' ||
    drawing.kind === 'priceRange' ||
    drawing.kind === 'dateRange' ||
    drawing.kind === 'datePriceRange' ||
    drawing.kind === 'projection' ||
    drawing.kind === 'sector' ||
    drawing.kind === 'triangle' ||
    drawing.kind === 'trianglePattern' ||
    drawing.kind === 'fibWedge' ||
    drawing.kind === 'gannBox' ||
    drawing.kind === 'gannSquare' ||
    drawing.kind === 'gannSquareFixed' ||
    drawing.kind === 'rotatedRectangle' ||
    drawing.kind === 'parallelChannel' ||
    drawing.kind === 'regressionTrend' ||
    drawing.kind === 'flatTopBottom' ||
    drawing.kind === 'disjointChannel' ||
    drawing.kind === 'table' ||
    isUserDrawingTextAnnotation(drawing)
  );
}

export function supportsUserDrawingFillVisibilityControls(drawing: UserDrawing): boolean {
  return (
    supportsUserDrawingFillColorControls(drawing) ||
    drawing.kind === 'longPosition' ||
    drawing.kind === 'shortPosition'
  );
}

export function supportsUserDrawingFillControls(drawing: UserDrawing): boolean {
  return supportsUserDrawingFillColorControls(drawing);
}

export function supportsUserDrawingTextControls(drawing: UserDrawing): boolean {
  return supportsUserDrawingTextStyleControls(drawing);
}

export function supportsUserDrawingTextStyleControls(drawing: UserDrawing): boolean {
  return supportsUserDrawingTextAppearanceControls(drawing);
}

export function supportsUserDrawingTextAppearanceControls(drawing: UserDrawing): boolean {
  return GENERATED_LABEL_TEXT_APPEARANCE_DRAWING_KINDS.has(drawing.kind) || isUserDrawingTextAnnotation(drawing);
}

const GENERATED_LABEL_TEXT_APPEARANCE_DRAWING_KINDS = new Set<UserDrawing['kind']>([
  'table',
  'infoLine',
  'trendAngle',
  'priceRange',
  'dateRange',
  'datePriceRange',
  'longPosition',
  'shortPosition',
  'forecast',
  'projection',
  'fibRetracement',
  'fibExtension',
  'trendBasedFibExtension',
  'fibFan',
  'fibSpeedResistanceFan',
  'fibChannel',
  'fibTimeZone',
  'trendBasedFibTime',
  'cyclicLines',
  'timeCycles',
  'gannFan',
  'gannBox',
  'gannSquare',
  'gannSquareFixed',
  'fibCircles',
  'fibArcs',
  'fibSpeedResistanceArcs',
  'fibWedge',
  'fibSpiral',
]);

export function supportsUserDrawingRichTextControls(drawing: UserDrawing): boolean {
  return drawing.kind === 'table' || isUserDrawingTextAnnotation(drawing);
}

export function supportsUserDrawingTextAlignControls(drawing: UserDrawing): boolean {
  return drawing.kind === 'table' || isUserDrawingTextAnnotation(drawing);
}

export function supportsUserDrawingTextWrapControls(drawing: UserDrawing): boolean {
  return isUserDrawingTextAnnotation(drawing);
}

export function supportsUserDrawingTrendLineExtendControls(drawing: UserDrawing): boolean {
  return drawing.kind === 'trendLine';
}

export function supportsUserDrawingIconControls(drawing: UserDrawing): boolean {
  return drawing.kind === 'icon';
}

export function isUserDrawingFillToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingFillColorControls(selectedDrawing);
}

export function isUserDrawingFillVisibilityToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingFillVisibilityControls(selectedDrawing);
}

export function isUserDrawingTextToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingTextAppearanceControls(selectedDrawing);
}

export function isUserDrawingIconToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingIconControls(selectedDrawing);
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
  if (!selectedDrawing) return { enabled: false };

  if (selectedDrawing.locked) {
    return action === 'unlockSelected'
      ? { enabled: true, locked: false, includeLocked: true }
      : { enabled: false };
  }

  if (action === 'hideSelected') {
    return selectedDrawing.visible ? { enabled: true, visible: false } : { enabled: false };
  }
  if (action === 'showSelected') {
    return !selectedDrawing.visible ? { enabled: true, visible: true } : { enabled: false };
  }
  if (action === 'lockSelected') return { enabled: true, locked: true };
  return { enabled: false };
}

export function getUserDrawingToolbarStateKey(state: UserDrawingState): string {
  const selectedDrawing = getSelectedUserDrawing(state);

  return [
    state.activeTool,
    state.selection?.drawingId ?? '',
    state.selection?.handle ?? '',
    state.draft ? 'draft' : '',
    state.drawings.length,
    state.drawings.map((drawing) => drawing.id).join(','),
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
    selectedDrawing?.style.fontWeight ?? '',
    selectedDrawing?.style.fontStyle ?? '',
    selectedDrawing?.style.textUnderline ?? '',
    selectedDrawing?.style.textLineThrough ?? '',
    selectedDrawing?.style.textWrap ?? '',
    selectedDrawing?.style.textMaxWidth ?? '',
    selectedDrawing && (selectedDrawing.kind === 'table' || isUserDrawingTextAnnotation(selectedDrawing))
      ? selectedDrawing.textAlign
      : '',
    selectedDrawing?.kind === 'trendLine' ? selectedDrawing.extend : '',
    selectedDrawing?.kind === 'icon' ? selectedDrawing.iconName : '',
  ].join('|');
}
