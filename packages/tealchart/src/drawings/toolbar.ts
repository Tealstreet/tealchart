import type { UserDrawingZOrderAction } from './input';
import type { UserDrawingSelectionActionAnchor } from './renderModel';
import type {
  UserDrawing,
  UserDrawingFontFamily,
  UserDrawingFontStyle,
  UserDrawingFontWeight,
  UserDrawingIconName,
  UserDrawingLineStyle,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAlign,
  UserDrawingTextMaxWidth,
  UserDrawingTool,
  UserDrawingTrendLineExtend,
} from './types';

import { getUserDrawingSelectionIds, reorderUserDrawings } from './input';
import {
  DEFAULT_USER_DRAWING_STYLE,
  isUserDrawingTextAnnotation,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  normalizeUserDrawingOpacity,
  normalizeUserDrawingTextMaxWidth,
  USER_DRAWING_FONT_FAMILIES,
  USER_DRAWING_FONT_SIZES,
  USER_DRAWING_FONT_STYLES,
  USER_DRAWING_FONT_WEIGHTS,
  USER_DRAWING_ICON_NAMES,
  USER_DRAWING_OPACITIES,
  USER_DRAWING_TEXT_MAX_WIDTHS,
  USER_DRAWING_TREND_LINE_EXTENDS,
} from './types';

export type UserDrawingToolbarAction =
  | 'duplicateSelected'
  | 'deleteSelected'
  | 'bringForward'
  | 'sendBackward'
  | 'bringToFront'
  | 'sendToBack'
  | 'cancelDraft'
  | 'clearAll'
  | 'hideAll'
  | 'showAll'
  | 'lockAll'
  | 'unlockAll';
export type UserDrawingGlobalToolbarAction =
  | 'cancelDraft'
  | 'clearAll'
  | 'hideAll'
  | 'showAll'
  | 'lockAll'
  | 'unlockAll';
export type UserDrawingStyleToolbarAction = 'hideSelected' | 'showSelected' | 'lockSelected' | 'unlockSelected';
export type UserDrawingSelectedActionSurfaceAction =
  | Exclude<UserDrawingToolbarAction, UserDrawingGlobalToolbarAction>
  | UserDrawingStyleToolbarAction
  | 'openProperties'
  | 'openObjectTree'
  | 'editText';
export type UserDrawingSelectedActionSurfaceGroupId = 'primary' | 'style' | 'arrange' | 'visibility';
export type UserDrawingSelectedActionSurfaceCommand =
  | {
      type: 'openProperties';
    }
  | {
      type: 'openObjectTree';
    }
  | {
      type: 'editText';
      drawingId: string;
    }
  | {
      type: 'updateStyle';
      style: Partial<UserDrawingStyle>;
    }
  | {
      type: 'setTextAlign';
      textAlign: UserDrawingTextAlign;
    }
  | {
      type: 'setTrendLineExtend';
      extend: UserDrawingTrendLineExtend;
    }
  | {
      type: 'setIconName';
      iconName: UserDrawingIconName;
    }
  | {
      type: 'toolbarAction';
      action: Exclude<UserDrawingToolbarAction, UserDrawingGlobalToolbarAction>;
    }
  | {
      type: 'styleAction';
      action: UserDrawingStyleToolbarAction;
      visible?: boolean;
      locked?: boolean;
      includeLocked?: boolean;
    };

export interface UserDrawingToolDescriptor {
  tool: UserDrawingTool;
  icon: string;
  label: string;
}

export interface UserDrawingToolCategoryDescriptor {
  id: string;
  label: string;
  tools: readonly UserDrawingTool[];
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

export interface UserDrawingSelectedActionSurfaceItem {
  id: UserDrawingSelectedActionSurfaceAction | string;
  icon: string;
  label: string;
  enabled: boolean;
  command: UserDrawingSelectedActionSurfaceCommand;
  destructive?: boolean;
  swatchColor?: string;
}

export interface UserDrawingSelectedActionSurfaceGroupPresentation {
  type: 'inline' | 'popover';
  triggerIcon?: string;
  triggerLabel?: string;
  popoverLabel?: string;
  popoverWidth?: number;
}

export interface UserDrawingSelectedActionSurfaceGroup {
  id: UserDrawingSelectedActionSurfaceGroupId;
  label: string;
  presentation?: UserDrawingSelectedActionSurfaceGroupPresentation;
  items: readonly UserDrawingSelectedActionSurfaceItem[];
}

export interface UserDrawingSelectedActionSurface {
  selectedDrawing: UserDrawing | null;
  groups: readonly UserDrawingSelectedActionSurfaceGroup[];
}

export interface UserDrawingActionSurfacePositionOptions {
  anchor: { x: number; y: number };
  viewport: { width: number; height: number };
  surface: { width: number; height: number };
  inset?: Partial<{ left: number; right: number; top: number; bottom: number }>;
  offsetY?: number;
}

export interface UserDrawingActionSurfacePosition {
  left: number;
  top: number;
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

export const USER_DRAWING_TOOL_CATEGORY_DESCRIPTORS: readonly UserDrawingToolCategoryDescriptor[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    tools: ['select'],
  },
  {
    id: 'lines',
    label: 'Lines',
    tools: [
      'trendLine',
      'ray',
      'infoLine',
      'extendedLine',
      'trendAngle',
      'horizontalLine',
      'horizontalRay',
      'verticalLine',
      'crossLine',
      'arrowLine',
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    tools: ['parallelChannel', 'regressionTrend', 'flatTopBottom', 'disjointChannel'],
  },
  {
    id: 'pitchforks',
    label: 'Pitchforks',
    tools: ['pitchfork', 'schiffPitchfork', 'modifiedSchiffPitchfork', 'insidePitchfork', 'pitchfan'],
  },
  {
    id: 'gann-and-fibonacci',
    label: 'Gann and Fibonacci',
    tools: [
      'fibRetracement',
      'fibExtension',
      'trendBasedFibExtension',
      'fibFan',
      'fibSpeedResistanceFan',
      'fibArcs',
      'fibSpeedResistanceArcs',
      'fibCircles',
      'fibWedge',
      'fibSpiral',
      'fibChannel',
      'fibTimeZone',
      'trendBasedFibTime',
      'gannFan',
      'gannBox',
      'gannSquare',
      'gannSquareFixed',
    ],
  },
  {
    id: 'patterns',
    label: 'Patterns',
    tools: [
      'barsPattern',
      'trianglePattern',
      'abcdPattern',
      'xabcdPattern',
      'cypherPattern',
      'threeDrivesPattern',
      'headShouldersPattern',
      'elliottImpulseWave',
      'elliottCorrectiveWave',
      'elliottDoubleComboWave',
      'elliottTripleComboWave',
      'elliottTriangleWave',
    ],
  },
  {
    id: 'forecasting-and-measurement',
    label: 'Forecasting and Measurement',
    tools: [
      'priceRange',
      'dateRange',
      'datePriceRange',
      'longPosition',
      'shortPosition',
      'forecast',
      'projection',
      'sector',
      'anchoredVwap',
      'anchoredVolumeProfile',
      'fixedRangeVolumeProfile',
    ],
  },
  {
    id: 'geometric-shapes',
    label: 'Geometric Shapes',
    tools: [
      'rectangle',
      'rotatedRectangle',
      'circle',
      'ellipse',
      'triangle',
      'curve',
      'doubleCurve',
      'arc',
      'polyline',
      'sineLine',
      'cyclicLines',
      'timeCycles',
    ],
  },
  {
    id: 'brushes',
    label: 'Brushes',
    tools: ['path', 'brush', 'highlighter'],
  },
  {
    id: 'annotations',
    label: 'Annotations',
    tools: [
      'textLabel',
      'note',
      'anchoredText',
      'anchoredNote',
      'callout',
      'comment',
      'priceLabel',
      'priceNote',
      'signpost',
      'table',
      'balloon',
    ],
  },
  {
    id: 'icons',
    label: 'Icons',
    tools: [
      'arrowMarker',
      'arrowMarkLeft',
      'arrowMarkRight',
      'arrowMarkUp',
      'arrowMarkDown',
      'pin',
      'icon',
      'flagMark',
      'image',
      'emoji',
      'sticker',
    ],
  },
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
  { action: 'hideAll', icon: '◌', label: 'Hide all drawings' },
  { action: 'showAll', icon: '●', label: 'Show all drawings' },
  { action: 'lockAll', icon: '🔒', label: 'Lock all drawings' },
  { action: 'unlockAll', icon: '🔓', label: 'Unlock all drawings' },
] as const;

const USER_DRAWING_GLOBAL_TOOLBAR_ACTIONS: ReadonlySet<UserDrawingToolbarAction> = new Set([
  'cancelDraft',
  'clearAll',
  'hideAll',
  'showAll',
  'lockAll',
  'unlockAll',
]);

export function isUserDrawingGlobalToolbarAction(
  action: UserDrawingToolbarAction,
): action is UserDrawingGlobalToolbarAction {
  return USER_DRAWING_GLOBAL_TOOLBAR_ACTIONS.has(action);
}

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

const USER_DRAWING_SELECTED_ACTION_SURFACE_ACTIONS: readonly UserDrawingSelectedActionSurfaceGroup[] = [
  {
    id: 'primary',
    label: 'Primary',
    items: [
      {
        id: 'openProperties',
        icon: '⚙',
        label: 'Open selected drawing properties',
        enabled: false,
        command: { type: 'openProperties' },
      },
      {
        id: 'openObjectTree',
        icon: '☰',
        label: 'Open drawing object tree',
        enabled: false,
        command: { type: 'openObjectTree' },
      },
      {
        id: 'editText',
        icon: 'T',
        label: 'Edit drawing text',
        enabled: false,
        command: { type: 'editText', drawingId: '' },
      },
      {
        ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS[0]!,
        id: 'duplicateSelected',
        enabled: false,
        command: { type: 'toolbarAction', action: 'duplicateSelected' },
      },
      {
        ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS[1]!,
        id: 'deleteSelected',
        enabled: false,
        command: { type: 'toolbarAction', action: 'deleteSelected' },
        destructive: true,
      },
    ],
  },
  {
    id: 'arrange',
    label: 'Arrange',
    items: [
      {
        ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS[2]!,
        id: 'bringForward',
        enabled: false,
        command: { type: 'toolbarAction', action: 'bringForward' },
      },
      {
        ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS[3]!,
        id: 'sendBackward',
        enabled: false,
        command: { type: 'toolbarAction', action: 'sendBackward' },
      },
      {
        ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS[4]!,
        id: 'bringToFront',
        enabled: false,
        command: { type: 'toolbarAction', action: 'bringToFront' },
      },
      {
        ...USER_DRAWING_TOOLBAR_ACTION_DESCRIPTORS[5]!,
        id: 'sendToBack',
        enabled: false,
        command: { type: 'toolbarAction', action: 'sendToBack' },
      },
    ],
  },
  {
    id: 'visibility',
    label: 'Visibility',
    items: USER_DRAWING_STYLE_TOOLBAR_ACTION_DESCRIPTORS.map((descriptor) => ({
      ...descriptor,
      id: descriptor.action,
      enabled: false,
      command: { type: 'styleAction', action: descriptor.action },
    })),
  },
] as const;

function getNextUserDrawingLineColor(drawing: UserDrawing): string {
  const currentIndex = USER_DRAWING_LINE_COLOR_DESCRIPTORS.findIndex(
    (descriptor) => descriptor.color.toLowerCase() === drawing.style.lineColor.toLowerCase(),
  );
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % USER_DRAWING_LINE_COLOR_DESCRIPTORS.length : 0;
  return USER_DRAWING_LINE_COLOR_DESCRIPTORS[nextIndex]!.color;
}

function getAdjacentUserDrawingLineWidth(drawing: UserDrawing, direction: -1 | 1): number | null {
  const widths = USER_DRAWING_LINE_WIDTH_DESCRIPTORS.map((descriptor) => descriptor.width);
  const currentIndex = widths.indexOf(drawing.style.lineWidth);
  if (currentIndex === -1) return widths[direction > 0 ? 0 : widths.length - 1] ?? null;
  return widths[currentIndex + direction] ?? null;
}

function getNextUserDrawingLineStyle(drawing: UserDrawing): UserDrawingLineStyle {
  const styles = USER_DRAWING_LINE_STYLE_DESCRIPTORS.map((descriptor) => descriptor.lineStyle);
  const currentIndex = styles.indexOf(drawing.style.lineStyle);
  return styles[currentIndex >= 0 ? (currentIndex + 1) % styles.length : 0]!;
}

function getNextUserDrawingOpacity(drawing: UserDrawing): number {
  const opacities = USER_DRAWING_OPACITY_DESCRIPTORS.map((descriptor) => descriptor.opacity);
  const currentOpacity = normalizeUserDrawingOpacity(drawing.style.opacity ?? DEFAULT_USER_DRAWING_STYLE.opacity ?? 1);
  const currentIndex = opacities.indexOf(currentOpacity);
  return opacities[currentIndex >= 0 ? (currentIndex + 1) % opacities.length : 0]!;
}

function getNextUserDrawingFillColor(drawing: UserDrawing): string {
  const currentFillColor = drawing.style.fillColor?.toLowerCase();
  const currentIndex = USER_DRAWING_FILL_COLOR_DESCRIPTORS.findIndex(
    (descriptor) => descriptor.fillColor.toLowerCase() === currentFillColor,
  );
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % USER_DRAWING_FILL_COLOR_DESCRIPTORS.length : 0;
  return USER_DRAWING_FILL_COLOR_DESCRIPTORS[nextIndex]!.fillColor;
}

function getNextUserDrawingTextColor(drawing: UserDrawing): string {
  const currentTextColor = drawing.style.textColor?.toLowerCase();
  const currentIndex = USER_DRAWING_TEXT_COLOR_DESCRIPTORS.findIndex(
    (descriptor) => descriptor.textColor.toLowerCase() === currentTextColor,
  );
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % USER_DRAWING_TEXT_COLOR_DESCRIPTORS.length : 0;
  return USER_DRAWING_TEXT_COLOR_DESCRIPTORS[nextIndex]!.textColor;
}

function getAdjacentUserDrawingFontSize(drawing: UserDrawing, direction: -1 | 1): number | null {
  const sizes = USER_DRAWING_FONT_SIZE_DESCRIPTORS.map((descriptor) => descriptor.fontSize);
  const currentFontSize = normalizeUserDrawingFontSize(drawing.style.fontSize ?? DEFAULT_USER_DRAWING_STYLE.fontSize!);
  const currentIndex = sizes.indexOf(currentFontSize);
  if (currentIndex === -1) return sizes[direction > 0 ? 0 : sizes.length - 1] ?? null;
  return sizes[currentIndex + direction] ?? null;
}

function getNextUserDrawingFontFamily(drawing: UserDrawing): UserDrawingFontFamily {
  const families = USER_DRAWING_FONT_FAMILY_DESCRIPTORS.map((descriptor) => descriptor.fontFamily);
  const currentFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
  const currentIndex = families.indexOf(currentFamily);
  return families[currentIndex >= 0 ? (currentIndex + 1) % families.length : 0]!;
}

function getNextUserDrawingFontWeight(drawing: UserDrawing): UserDrawingFontWeight {
  const weights = USER_DRAWING_FONT_WEIGHT_DESCRIPTORS.map((descriptor) => descriptor.fontWeight);
  const currentIndex = weights.indexOf(drawing.style.fontWeight ?? 'normal');
  return weights[currentIndex >= 0 ? (currentIndex + 1) % weights.length : 0]!;
}

function getNextUserDrawingFontStyle(drawing: UserDrawing): UserDrawingFontStyle {
  const styles = USER_DRAWING_FONT_STYLE_DESCRIPTORS.map((descriptor) => descriptor.fontStyle);
  const currentIndex = styles.indexOf(drawing.style.fontStyle ?? 'normal');
  return styles[currentIndex >= 0 ? (currentIndex + 1) % styles.length : 0]!;
}

function getAdjacentUserDrawingTextMaxWidth(drawing: UserDrawing, direction: -1 | 1): UserDrawingTextMaxWidth | null {
  const widths = USER_DRAWING_TEXT_MAX_WIDTH_DESCRIPTORS.map((descriptor) => descriptor.textMaxWidth);
  const currentWidth = normalizeUserDrawingTextMaxWidth(drawing.style.textMaxWidth ?? 180);
  const currentIndex = widths.indexOf(currentWidth);
  if (currentIndex === -1) return widths[direction > 0 ? 0 : widths.length - 1] ?? null;
  return widths[currentIndex + direction] ?? null;
}

function getNextUserDrawingTextAlign(drawing: UserDrawing): UserDrawingTextAlign | null {
  if (drawing.kind !== 'table' && !isUserDrawingTextAnnotation(drawing)) return null;
  const aligns = USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.map((descriptor) => descriptor.textAlign);
  const currentIndex = aligns.indexOf(drawing.textAlign);
  return aligns[currentIndex >= 0 ? (currentIndex + 1) % aligns.length : 0]!;
}

function getNextUserDrawingTrendLineExtend(drawing: UserDrawing): UserDrawingTrendLineExtend | null {
  if (drawing.kind !== 'trendLine') return null;
  const extensions = USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS.map((descriptor) => descriptor.extend);
  const currentIndex = extensions.indexOf(drawing.extend);
  return extensions[currentIndex >= 0 ? (currentIndex + 1) % extensions.length : 0]!;
}

function getNextUserDrawingIconName(drawing: UserDrawing): UserDrawingIconName | null {
  if (drawing.kind !== 'icon') return null;
  const iconNames = USER_DRAWING_ICON_NAME_DESCRIPTORS.map((descriptor) => descriptor.iconName);
  const currentIndex = iconNames.indexOf(drawing.iconName);
  return iconNames[currentIndex >= 0 ? (currentIndex + 1) % iconNames.length : 0]!;
}

function resolveUserDrawingSelectedStyleActionSurfaceGroup(
  state: UserDrawingState,
  selectedDrawing: UserDrawing | null,
): UserDrawingSelectedActionSurfaceGroup | null {
  if (!selectedDrawing) return null;

  const styleEnabled = isUserDrawingStyleToolbarEnabled(state);
  const fillColorEnabled = isUserDrawingFillToolbarEnabled(state);
  const fillVisibilityEnabled = isUserDrawingFillVisibilityToolbarEnabled(state);
  const nextLineColor = getNextUserDrawingLineColor(selectedDrawing);
  const thinnerLineWidth = getAdjacentUserDrawingLineWidth(selectedDrawing, -1);
  const thickerLineWidth = getAdjacentUserDrawingLineWidth(selectedDrawing, 1);
  const nextLineStyle = getNextUserDrawingLineStyle(selectedDrawing);
  const nextOpacity = getNextUserDrawingOpacity(selectedDrawing);
  const nextLineVisible = selectedDrawing.style.lineVisible === false;
  const nextFillColor = fillColorEnabled ? getNextUserDrawingFillColor(selectedDrawing) : null;
  const nextFillVisible = selectedDrawing.style.fillVisible === false;
  const textEnabled = isUserDrawingTextToolbarEnabled(state);
  const nextTextColor = textEnabled ? getNextUserDrawingTextColor(selectedDrawing) : null;
  const smallerFontSize = textEnabled ? getAdjacentUserDrawingFontSize(selectedDrawing, -1) : null;
  const largerFontSize = textEnabled ? getAdjacentUserDrawingFontSize(selectedDrawing, 1) : null;
  const richTextEnabled = textEnabled && supportsUserDrawingRichTextControls(selectedDrawing);
  const nextFontFamily = textEnabled ? getNextUserDrawingFontFamily(selectedDrawing) : null;
  const nextFontWeight = richTextEnabled ? getNextUserDrawingFontWeight(selectedDrawing) : null;
  const nextFontStyle = richTextEnabled ? getNextUserDrawingFontStyle(selectedDrawing) : null;
  const textWrapEnabled = richTextEnabled && supportsUserDrawingTextWrapControls(selectedDrawing);
  const nextTextWrap = selectedDrawing.style.textWrap !== true;
  const nextTextMaxWidth = normalizeUserDrawingTextMaxWidth(selectedDrawing.style.textMaxWidth ?? 180);
  const textMaxWidthEnabled = textWrapEnabled && selectedDrawing.style.textWrap === true;
  const narrowerTextMaxWidth = textMaxWidthEnabled ? getAdjacentUserDrawingTextMaxWidth(selectedDrawing, -1) : null;
  const widerTextMaxWidth = textMaxWidthEnabled ? getAdjacentUserDrawingTextMaxWidth(selectedDrawing, 1) : null;
  const nextTextAlign = supportsUserDrawingTextAlignControls(selectedDrawing)
    ? getNextUserDrawingTextAlign(selectedDrawing)
    : null;
  const nextTrendLineExtend = supportsUserDrawingTrendLineExtendControls(selectedDrawing)
    ? getNextUserDrawingTrendLineExtend(selectedDrawing)
    : null;
  const nextIconName = supportsUserDrawingIconControls(selectedDrawing)
    ? getNextUserDrawingIconName(selectedDrawing)
    : null;
  const fillColorItem: UserDrawingSelectedActionSurfaceItem | null = nextFillColor
    ? {
        id: `fillColor:${nextFillColor}`,
        icon: '',
        label: `Cycle selected drawing fill color to ${nextFillColor}`,
        enabled: fillColorEnabled,
        command: { type: 'updateStyle', style: { fillColor: nextFillColor } },
        swatchColor: nextFillColor,
      }
    : null;
  const fillVisibilityItem: UserDrawingSelectedActionSurfaceItem | null = fillVisibilityEnabled
    ? {
        id: 'fillVisible:toggle',
        icon: '◩',
        label: nextFillVisible ? 'Show selected drawing fill' : 'Hide selected drawing fill',
        enabled: fillVisibilityEnabled,
        command: { type: 'updateStyle', style: { fillVisible: nextFillVisible } },
      }
    : null;
  const textColorItem: UserDrawingSelectedActionSurfaceItem | null = nextTextColor
    ? {
        id: `textColor:${nextTextColor}`,
        icon: '',
        label: `Cycle selected drawing text color to ${nextTextColor}`,
        enabled: textEnabled,
        command: { type: 'updateStyle', style: { textColor: nextTextColor } },
        swatchColor: nextTextColor,
      }
    : null;
  const smallerFontSizeItem: UserDrawingSelectedActionSurfaceItem | null = textEnabled
    ? {
        id: 'fontSize:decrease',
        icon: '−',
        label: smallerFontSize === null ? 'Decrease selected drawing font size' : `${smallerFontSize} pixel font size`,
        enabled: smallerFontSize !== null,
        command: { type: 'updateStyle', style: smallerFontSize === null ? {} : { fontSize: smallerFontSize } },
      }
    : null;
  const largerFontSizeItem: UserDrawingSelectedActionSurfaceItem | null = textEnabled
    ? {
        id: 'fontSize:increase',
        icon: '+',
        label: largerFontSize === null ? 'Increase selected drawing font size' : `${largerFontSize} pixel font size`,
        enabled: largerFontSize !== null,
        command: { type: 'updateStyle', style: largerFontSize === null ? {} : { fontSize: largerFontSize } },
      }
    : null;
  const fontFamilyItem: UserDrawingSelectedActionSurfaceItem | null = nextFontFamily
    ? {
        id: `fontFamily:${nextFontFamily}`,
        icon: USER_DRAWING_FONT_FAMILY_DESCRIPTORS.find((descriptor) => descriptor.fontFamily === nextFontFamily)!.icon,
        label: `Cycle selected drawing font family to ${nextFontFamily}`,
        enabled: textEnabled,
        command: { type: 'updateStyle', style: { fontFamily: nextFontFamily } },
      }
    : null;
  const fontWeightItem: UserDrawingSelectedActionSurfaceItem | null = nextFontWeight
    ? {
        id: `fontWeight:${nextFontWeight}`,
        icon: USER_DRAWING_FONT_WEIGHT_DESCRIPTORS.find((descriptor) => descriptor.fontWeight === nextFontWeight)!.icon,
        label: `Cycle selected drawing font weight to ${nextFontWeight}`,
        enabled: textEnabled,
        command: { type: 'updateStyle', style: { fontWeight: nextFontWeight } },
      }
    : null;
  const fontStyleItem: UserDrawingSelectedActionSurfaceItem | null = nextFontStyle
    ? {
        id: `fontStyle:${nextFontStyle}`,
        icon: USER_DRAWING_FONT_STYLE_DESCRIPTORS.find((descriptor) => descriptor.fontStyle === nextFontStyle)!.icon,
        label: `Cycle selected drawing font style to ${nextFontStyle}`,
        enabled: textEnabled,
        command: { type: 'updateStyle', style: { fontStyle: nextFontStyle } },
      }
    : null;
  const textUnderlineItem: UserDrawingSelectedActionSurfaceItem | null = richTextEnabled
    ? {
        id: 'textUnderline:toggle',
        icon: 'U',
        label:
          selectedDrawing.style.textUnderline === true
            ? 'Remove selected drawing underline'
            : 'Underline selected drawing text',
        enabled: richTextEnabled,
        command: { type: 'updateStyle', style: { textUnderline: selectedDrawing.style.textUnderline !== true } },
      }
    : null;
  const textLineThroughItem: UserDrawingSelectedActionSurfaceItem | null = richTextEnabled
    ? {
        id: 'textLineThrough:toggle',
        icon: 'S',
        label:
          selectedDrawing.style.textLineThrough === true
            ? 'Remove selected drawing strike-through'
            : 'Strike selected drawing text',
        enabled: richTextEnabled,
        command: { type: 'updateStyle', style: { textLineThrough: selectedDrawing.style.textLineThrough !== true } },
      }
    : null;
  const textWrapItem: UserDrawingSelectedActionSurfaceItem | null = textWrapEnabled
    ? {
        id: 'textWrap:toggle',
        icon: nextTextWrap ? '↵' : '↔',
        label: nextTextWrap ? 'Wrap selected drawing text' : 'Do not wrap selected drawing text',
        enabled: textWrapEnabled,
        command: {
          type: 'updateStyle',
          style: nextTextWrap ? { textWrap: true, textMaxWidth: nextTextMaxWidth } : { textWrap: false },
        },
      }
    : null;
  const narrowerTextMaxWidthItem: UserDrawingSelectedActionSurfaceItem | null = textMaxWidthEnabled
    ? {
        id: 'textMaxWidth:decrease',
        icon: '↤',
        label:
          narrowerTextMaxWidth === null
            ? 'Decrease selected drawing text box width'
            : `${narrowerTextMaxWidth} pixel text box width`,
        enabled: narrowerTextMaxWidth !== null,
        command: {
          type: 'updateStyle',
          style: narrowerTextMaxWidth === null ? {} : { textMaxWidth: narrowerTextMaxWidth },
        },
      }
    : null;
  const widerTextMaxWidthItem: UserDrawingSelectedActionSurfaceItem | null = textMaxWidthEnabled
    ? {
        id: 'textMaxWidth:increase',
        icon: '↦',
        label:
          widerTextMaxWidth === null
            ? 'Increase selected drawing text box width'
            : `${widerTextMaxWidth} pixel text box width`,
        enabled: widerTextMaxWidth !== null,
        command: {
          type: 'updateStyle',
          style: widerTextMaxWidth === null ? {} : { textMaxWidth: widerTextMaxWidth },
        },
      }
    : null;
  const textAlignItem: UserDrawingSelectedActionSurfaceItem | null = nextTextAlign
    ? {
        id: `textAlign:${nextTextAlign}`,
        icon: USER_DRAWING_TEXT_ALIGN_DESCRIPTORS.find((descriptor) => descriptor.textAlign === nextTextAlign)!.icon,
        label: `Cycle selected drawing text alignment to ${nextTextAlign}`,
        enabled: textEnabled,
        command: { type: 'setTextAlign', textAlign: nextTextAlign },
      }
    : null;
  const trendLineExtendItem: UserDrawingSelectedActionSurfaceItem | null = nextTrendLineExtend
    ? {
        id: `extend:${nextTrendLineExtend}`,
        icon: USER_DRAWING_TREND_LINE_EXTEND_DESCRIPTORS.find(
          (descriptor) => descriptor.extend === nextTrendLineExtend,
        )!.icon,
        label: `Cycle selected trend line extension to ${nextTrendLineExtend}`,
        enabled: styleEnabled,
        command: { type: 'setTrendLineExtend', extend: nextTrendLineExtend },
      }
    : null;
  const iconNameItem: UserDrawingSelectedActionSurfaceItem | null = nextIconName
    ? {
        id: `iconName:${nextIconName}`,
        icon: USER_DRAWING_ICON_NAME_DESCRIPTORS.find((descriptor) => descriptor.iconName === nextIconName)!.icon,
        label: `Cycle selected drawing icon to ${nextIconName}`,
        enabled: styleEnabled,
        command: { type: 'setIconName', iconName: nextIconName },
      }
    : null;

  return {
    id: 'style',
    label: 'Style',
    presentation: {
      type: 'popover',
      triggerIcon: '◐',
      triggerLabel: 'Style selected drawing',
      popoverLabel: 'Selected drawing style controls',
      popoverWidth: 296,
    },
    items: [
      {
        id: `lineColor:${nextLineColor}`,
        icon: '',
        label: `Cycle selected drawing line color to ${nextLineColor}`,
        enabled: styleEnabled,
        command: { type: 'updateStyle', style: { lineColor: nextLineColor } },
        swatchColor: nextLineColor,
      },
      {
        id: 'lineWidth:decrease',
        icon: '−',
        label:
          thinnerLineWidth === null ? 'Decrease selected drawing line width' : `${thinnerLineWidth} pixel line width`,
        enabled: styleEnabled && thinnerLineWidth !== null,
        command: { type: 'updateStyle', style: thinnerLineWidth === null ? {} : { lineWidth: thinnerLineWidth } },
      },
      {
        id: 'lineWidth:increase',
        icon: '+',
        label:
          thickerLineWidth === null ? 'Increase selected drawing line width' : `${thickerLineWidth} pixel line width`,
        enabled: styleEnabled && thickerLineWidth !== null,
        command: { type: 'updateStyle', style: thickerLineWidth === null ? {} : { lineWidth: thickerLineWidth } },
      },
      {
        id: `lineStyle:${nextLineStyle}`,
        icon: USER_DRAWING_LINE_STYLE_DESCRIPTORS.find((descriptor) => descriptor.lineStyle === nextLineStyle)!.icon,
        label: `Cycle selected drawing line style to ${nextLineStyle}`,
        enabled: styleEnabled,
        command: { type: 'updateStyle', style: { lineStyle: nextLineStyle } },
      },
      {
        id: `opacity:${nextOpacity}`,
        icon: '◐',
        label: `Cycle selected drawing opacity to ${Math.round(nextOpacity * 100)} percent`,
        enabled: styleEnabled,
        command: { type: 'updateStyle', style: { opacity: nextOpacity } },
      },
      {
        id: 'lineVisible:toggle',
        icon: '▣',
        label: nextLineVisible ? 'Show selected drawing border' : 'Hide selected drawing border',
        enabled: styleEnabled,
        command: { type: 'updateStyle', style: { lineVisible: nextLineVisible } },
      },
      ...(fillColorItem ? [fillColorItem] : []),
      ...(fillVisibilityItem ? [fillVisibilityItem] : []),
      ...(textColorItem ? [textColorItem] : []),
      ...(smallerFontSizeItem ? [smallerFontSizeItem] : []),
      ...(largerFontSizeItem ? [largerFontSizeItem] : []),
      ...(fontFamilyItem ? [fontFamilyItem] : []),
      ...(fontWeightItem ? [fontWeightItem] : []),
      ...(fontStyleItem ? [fontStyleItem] : []),
      ...(textUnderlineItem ? [textUnderlineItem] : []),
      ...(textLineThroughItem ? [textLineThroughItem] : []),
      ...(textWrapItem ? [textWrapItem] : []),
      ...(narrowerTextMaxWidthItem ? [narrowerTextMaxWidthItem] : []),
      ...(widerTextMaxWidthItem ? [widerTextMaxWidthItem] : []),
      ...(textAlignItem ? [textAlignItem] : []),
      ...(trendLineExtendItem ? [trendLineExtendItem] : []),
      ...(iconNameItem ? [iconNameItem] : []),
    ],
  };
}

function resolveUserDrawingSelectedActionSurfaceStyleCommand(
  state: UserDrawingState,
  action: UserDrawingStyleToolbarAction,
): Extract<UserDrawingSelectedActionSurfaceCommand, { type: 'styleAction' }> {
  const { enabled: _enabled, ...payload } = resolveUserDrawingStyleToolbarAction(state, action);
  return {
    type: 'styleAction',
    action,
    ...payload,
  };
}

export function getUserDrawingToolDescriptor(tool: UserDrawingTool): UserDrawingToolDescriptor {
  return (
    USER_DRAWING_TOOL_DESCRIPTORS.find((descriptor) => descriptor.tool === tool) ?? USER_DRAWING_TOOL_DESCRIPTORS[0]!
  );
}

export function isUserDrawingToolbarActionEnabled(state: UserDrawingState, action: UserDrawingToolbarAction): boolean {
  if (action === 'duplicateSelected' || action === 'deleteSelected') return hasUnlockedSelectedDrawing(state);
  const zOrderAction = getUserDrawingZOrderAction(action);
  if (zOrderAction) return reorderUserDrawings(state, zOrderAction) !== state;
  if (action === 'cancelDraft') return state.draft !== null;
  if (action === 'clearAll') return state.drawings.length > 0;
  if (action === 'hideAll') return state.drawings.some((drawing) => drawing.visible !== false);
  if (action === 'showAll') return state.drawings.some((drawing) => drawing.visible === false);
  if (action === 'lockAll') return state.drawings.some((drawing) => !drawing.locked);
  if (action === 'unlockAll') return state.drawings.some((drawing) => drawing.locked);
  return false;
}

export function resolveUserDrawingSelectedActionSurface(state: UserDrawingState): UserDrawingSelectedActionSurface {
  const selectedDrawing = getSelectedUserDrawing(state);
  const styleGroup = resolveUserDrawingSelectedStyleActionSurfaceGroup(state, selectedDrawing);
  const groups = styleGroup
    ? [
        USER_DRAWING_SELECTED_ACTION_SURFACE_ACTIONS[0]!,
        styleGroup,
        ...USER_DRAWING_SELECTED_ACTION_SURFACE_ACTIONS.slice(1),
      ]
    : USER_DRAWING_SELECTED_ACTION_SURFACE_ACTIONS;

  return {
    selectedDrawing,
    groups: groups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.command.type === 'openProperties') {
          return {
            ...item,
            enabled: selectedDrawing !== null,
          };
        }
        if (item.command.type === 'openObjectTree') {
          return {
            ...item,
            enabled: state.drawings.length > 0,
          };
        }
        if (item.command.type === 'editText') {
          const enabled =
            selectedDrawing !== null && isUserDrawingTextAnnotation(selectedDrawing) && !selectedDrawing.locked;
          return {
            ...item,
            enabled,
            command: { type: 'editText', drawingId: selectedDrawing?.id ?? '' },
          };
        }
        if (
          item.command.type === 'updateStyle' ||
          item.command.type === 'setTextAlign' ||
          item.command.type === 'setTrendLineExtend' ||
          item.command.type === 'setIconName'
        ) {
          return item;
        }
        if (item.command.type === 'styleAction') {
          return {
            ...item,
            enabled: isUserDrawingStyleToolbarActionEnabled(state, item.command.action),
            command: resolveUserDrawingSelectedActionSurfaceStyleCommand(state, item.command.action),
          };
        }
        if (item.command.type === 'toolbarAction') {
          return {
            ...item,
            enabled: isUserDrawingToolbarActionEnabled(state, item.command.action),
          };
        }
        return item;
      }),
    })),
  };
}

export function shouldRenderUserDrawingSelectedActionSurface(
  state: UserDrawingState | null | undefined,
  anchor: UserDrawingSelectionActionAnchor | null | undefined,
): boolean {
  if (!state || !anchor || state.draft || state.textEdit) return false;
  return getSelectedUserDrawing(state) !== null;
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

export function resolveUserDrawingActionSurfacePosition({
  anchor,
  viewport,
  surface,
  inset = {},
  offsetY = -42,
}: UserDrawingActionSurfacePositionOptions): UserDrawingActionSurfacePosition {
  const leftInset = inset.left ?? 8;
  const rightInset = inset.right ?? 8;
  const topInset = inset.top ?? 8;
  const bottomInset = inset.bottom ?? 8;
  const preferredLeft = anchor.x - surface.width / 2;
  const preferredTop = anchor.y + offsetY;

  return {
    left: clampNumber(preferredLeft, leftInset, viewport.width - rightInset - surface.width),
    top: clampNumber(preferredTop, topInset, viewport.height - bottomInset - surface.height),
  };
}

function hasUnlockedSelectedDrawing(state: UserDrawingState): boolean {
  const selectedIds = new Set(getUserDrawingSelectionIds(state.selection));
  return state.drawings.some((drawing) => selectedIds.has(drawing.id) && !drawing.locked);
}

export function getSelectedUserDrawing(state: UserDrawingState) {
  const selectedId = state.selection?.drawingId;
  return selectedId ? (state.drawings.find((drawing) => drawing.id === selectedId) ?? null) : null;
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
    supportsUserDrawingFillColorControls(drawing) || drawing.kind === 'longPosition' || drawing.kind === 'shortPosition'
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
  return (
    selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingFillVisibilityControls(selectedDrawing)
  );
}

export function isUserDrawingTextToolbarEnabled(state: UserDrawingState): boolean {
  const selectedDrawing = getSelectedUserDrawing(state);
  return (
    selectedDrawing !== null && !selectedDrawing.locked && supportsUserDrawingTextAppearanceControls(selectedDrawing)
  );
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
    return action === 'unlockSelected' ? { enabled: true, locked: false, includeLocked: true } : { enabled: false };
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
    state.drawings.some((drawing) => drawing.visible !== false) ? 'has-visible' : 'no-visible',
    state.drawings.some((drawing) => drawing.visible === false) ? 'has-hidden' : 'no-hidden',
    state.drawings.some((drawing) => !drawing.locked) ? 'has-unlocked' : 'no-unlocked',
    state.drawings.some((drawing) => drawing.locked) ? 'has-locked' : 'no-locked',
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
