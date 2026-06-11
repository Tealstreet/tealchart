export const USER_DRAWING_SCHEMA_VERSION = 1;

export type UserDrawingTool =
  | 'select'
  | 'trendLine'
  | 'trendAngle'
  | 'extendedLine'
  | 'infoLine'
  | 'arrowLine'
  | 'arrowMarker'
  | 'arrowMarkUp'
  | 'arrowMarkDown'
  | 'ray'
  | 'horizontalRay'
  | 'crossLine'
  | 'horizontalLine'
  | 'verticalLine'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'priceRange'
  | 'dateRange'
  | 'datePriceRange'
  | 'longPosition'
  | 'shortPosition'
  | 'fibRetracement'
  | 'fibExtension'
  | 'triangle'
  | 'parallelChannel'
  | 'regressionTrend'
  | 'path'
  | 'textLabel';

export type UserDrawingKind = Exclude<UserDrawingTool, 'select'>;

export type UserDrawingLineStyle = 'solid' | 'dashed' | 'dotted';

export type UserDrawingHandleRole = 'start' | 'end' | 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface UserDrawingAnchor {
  time: number;
  price: number;
}

export interface UserDrawingStyle {
  lineColor: string;
  lineWidth: number;
  lineStyle: UserDrawingLineStyle;
  opacity?: number;
  lineVisible?: boolean;
  fillVisible?: boolean;
  fillColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface UserDrawingBase {
  id: string;
  kind: UserDrawingKind;
  paneId: string;
  visible: boolean;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  style: UserDrawingStyle;
}

export interface TrendLineDrawing extends UserDrawingBase {
  kind: 'trendLine';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
  extend: 'none' | 'left' | 'right' | 'both';
}

export interface TrendAngleDrawing extends UserDrawingBase {
  kind: 'trendAngle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface ExtendedLineDrawing extends UserDrawingBase {
  kind: 'extendedLine';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface InfoLineDrawing extends UserDrawingBase {
  kind: 'infoLine';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface ArrowLineDrawing extends UserDrawingBase {
  kind: 'arrowLine';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface ArrowMarkerDrawing extends UserDrawingBase {
  kind: 'arrowMarker';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface ArrowMarkUpDrawing extends UserDrawingBase {
  kind: 'arrowMarkUp';
  point: UserDrawingAnchor;
}

export interface ArrowMarkDownDrawing extends UserDrawingBase {
  kind: 'arrowMarkDown';
  point: UserDrawingAnchor;
}

export interface RayDrawing extends UserDrawingBase {
  kind: 'ray';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface HorizontalRayDrawing extends UserDrawingBase {
  kind: 'horizontalRay';
  point: UserDrawingAnchor;
}

export interface CrossLineDrawing extends UserDrawingBase {
  kind: 'crossLine';
  point: UserDrawingAnchor;
}

export interface HorizontalLineDrawing extends UserDrawingBase {
  kind: 'horizontalLine';
  price: number;
}

export interface VerticalLineDrawing extends UserDrawingBase {
  kind: 'verticalLine';
  time: number;
}

export interface RectangleDrawing extends UserDrawingBase {
  kind: 'rectangle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface CircleDrawing extends UserDrawingBase {
  kind: 'circle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface EllipseDrawing extends UserDrawingBase {
  kind: 'ellipse';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface PriceRangeDrawing extends UserDrawingBase {
  kind: 'priceRange';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface DateRangeDrawing extends UserDrawingBase {
  kind: 'dateRange';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface DatePriceRangeDrawing extends UserDrawingBase {
  kind: 'datePriceRange';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface LongPositionDrawing extends UserDrawingBase {
  kind: 'longPosition';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface ShortPositionDrawing extends UserDrawingBase {
  kind: 'shortPosition';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibRetracementDrawing extends UserDrawingBase {
  kind: 'fibRetracement';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibExtensionDrawing extends UserDrawingBase {
  kind: 'fibExtension';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface TriangleDrawing extends UserDrawingBase {
  kind: 'triangle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface ParallelChannelDrawing extends UserDrawingBase {
  kind: 'parallelChannel';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface RegressionTrendDrawing extends UserDrawingBase {
  kind: 'regressionTrend';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface PathDrawing extends UserDrawingBase {
  kind: 'path';
  points: readonly UserDrawingAnchor[];
}

export type UserDrawingTextAlign = 'left' | 'center' | 'right';

export interface TextLabelDrawing extends UserDrawingBase {
  kind: 'textLabel';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export type UserDrawing =
  | TrendLineDrawing
  | TrendAngleDrawing
  | ExtendedLineDrawing
  | InfoLineDrawing
  | ArrowLineDrawing
  | ArrowMarkerDrawing
  | ArrowMarkUpDrawing
  | ArrowMarkDownDrawing
  | RayDrawing
  | HorizontalRayDrawing
  | CrossLineDrawing
  | HorizontalLineDrawing
  | VerticalLineDrawing
  | RectangleDrawing
  | CircleDrawing
  | EllipseDrawing
  | PriceRangeDrawing
  | DateRangeDrawing
  | DatePriceRangeDrawing
  | LongPositionDrawing
  | ShortPositionDrawing
  | FibRetracementDrawing
  | FibExtensionDrawing
  | TriangleDrawing
  | ParallelChannelDrawing
  | RegressionTrendDrawing
  | PathDrawing
  | TextLabelDrawing;

export interface UserDrawingDraft {
  tool: UserDrawingTool;
  paneId: string;
  anchors: readonly UserDrawingAnchor[];
  style: UserDrawingStyle;
  text?: string;
  startedAt: number;
}

export interface UserDrawingSelection {
  drawingId: string;
  handle?: UserDrawingHandleRole;
  pointIndex?: number;
}

export interface UserDrawingTextEdit {
  drawingId: string;
  value: string;
  originalValue: string;
  startedAt: number;
}

export interface UserDrawingState {
  version: number;
  drawings: readonly UserDrawing[];
  activeTool: UserDrawingTool;
  selection: UserDrawingSelection | null;
  draft: UserDrawingDraft | null;
  textEdit: UserDrawingTextEdit | null;
}

export const DEFAULT_USER_DRAWING_STYLE: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 1,
  lineStyle: 'solid',
  opacity: 1,
  lineVisible: true,
  fillVisible: true,
  fillColor: 'rgba(245, 197, 66, 0.12)',
  textColor: '#f5c542',
  fontSize: 12,
};

export const USER_DRAWING_FONT_SIZES = [10, 12, 14, 16] as const;
export const USER_DRAWING_FONT_FAMILIES = ['sans-serif', 'serif', 'monospace'] as const;
export type UserDrawingFontSize = (typeof USER_DRAWING_FONT_SIZES)[number];
export type UserDrawingFontFamily = (typeof USER_DRAWING_FONT_FAMILIES)[number];
export const USER_DRAWING_OPACITIES = [1, 0.75, 0.5, 0.25] as const;

export function normalizeUserDrawingFontSize(fontSize: number): UserDrawingFontSize {
  return USER_DRAWING_FONT_SIZES.reduce((nearest, candidate) =>
    Math.abs(candidate - fontSize) < Math.abs(nearest - fontSize) ? candidate : nearest,
  );
}

export function normalizeUserDrawingFontFamily(fontFamily: string): UserDrawingFontFamily {
  return USER_DRAWING_FONT_FAMILIES.includes(fontFamily as UserDrawingFontFamily)
    ? (fontFamily as UserDrawingFontFamily)
    : 'sans-serif';
}

export function normalizeUserDrawingOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) return 1;
  return Math.max(0, Math.min(1, opacity));
}

export function normalizeUserDrawingStyle(style: UserDrawingStyle): UserDrawingStyle {
  const fontSize = style.fontSize === undefined ? undefined : normalizeUserDrawingFontSize(style.fontSize);
  const fontFamily =
    style.fontFamily === undefined ? undefined : normalizeUserDrawingFontFamily(style.fontFamily);
  const opacity = style.opacity === undefined ? undefined : normalizeUserDrawingOpacity(style.opacity);
  if (fontSize === style.fontSize && fontFamily === style.fontFamily && opacity === style.opacity) return style;

  return {
    ...style,
    ...(fontSize === undefined ? {} : { fontSize }),
    ...(fontFamily === undefined ? {} : { fontFamily }),
    ...(opacity === undefined ? {} : { opacity }),
  };
}

export const DEFAULT_USER_DRAWING_STATE: UserDrawingState = {
  version: USER_DRAWING_SCHEMA_VERSION,
  drawings: [],
  activeTool: 'select',
  selection: null,
  draft: null,
  textEdit: null,
};

export function getRequiredAnchorCount(tool: UserDrawingTool): number {
  switch (tool) {
    case 'trendLine':
    case 'trendAngle':
    case 'extendedLine':
    case 'infoLine':
    case 'arrowLine':
    case 'arrowMarker':
    case 'ray':
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'priceRange':
    case 'dateRange':
    case 'datePriceRange':
    case 'fibRetracement':
    case 'fibExtension':
      return 2;
    case 'triangle':
    case 'parallelChannel':
    case 'regressionTrend':
    case 'longPosition':
    case 'shortPosition':
    case 'path':
      return 3;
    case 'horizontalLine':
    case 'verticalLine':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'horizontalRay':
    case 'crossLine':
    case 'textLabel':
      return 1;
    case 'select':
      return 0;
  }
}

export function isDrawingDraftReady(draft: UserDrawingDraft): boolean {
  return draft.anchors.length >= getRequiredAnchorCount(draft.tool);
}

export interface CreateUserDrawingFromDraftOptions {
  id: string;
  now?: number;
}

export function createUserDrawingFromDraft(
  draft: UserDrawingDraft,
  options: CreateUserDrawingFromDraftOptions,
): UserDrawing | null {
  if (!isDrawingDraftReady(draft) || draft.tool === 'select') return null;

  const now = options.now ?? Date.now();
  const base = {
    id: options.id,
    paneId: draft.paneId,
    visible: true,
    locked: false,
    createdAt: now,
    updatedAt: now,
    style: normalizeUserDrawingStyle({ ...draft.style }),
  };

  switch (draft.tool) {
    case 'trendLine':
      return {
        ...base,
        kind: 'trendLine',
        points: [draft.anchors[0]!, draft.anchors[1]!],
        extend: 'none',
      };
    case 'trendAngle':
      return {
        ...base,
        kind: 'trendAngle',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'extendedLine':
      return {
        ...base,
        kind: 'extendedLine',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'infoLine':
      return {
        ...base,
        kind: 'infoLine',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'arrowLine':
      return {
        ...base,
        kind: 'arrowLine',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'arrowMarker':
      return {
        ...base,
        kind: 'arrowMarker',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'ray':
      return {
        ...base,
        kind: 'ray',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'horizontalRay':
      return {
        ...base,
        kind: 'horizontalRay',
        point: draft.anchors[0]!,
      };
    case 'crossLine':
      return {
        ...base,
        kind: 'crossLine',
        point: draft.anchors[0]!,
      };
    case 'horizontalLine':
      return {
        ...base,
        kind: 'horizontalLine',
        price: draft.anchors[0]!.price,
      };
    case 'verticalLine':
      return {
        ...base,
        kind: 'verticalLine',
        time: draft.anchors[0]!.time,
      };
    case 'arrowMarkUp':
      return {
        ...base,
        kind: 'arrowMarkUp',
        point: draft.anchors[0]!,
      };
    case 'arrowMarkDown':
      return {
        ...base,
        kind: 'arrowMarkDown',
        point: draft.anchors[0]!,
      };
    case 'rectangle':
      return {
        ...base,
        kind: 'rectangle',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'circle':
      return {
        ...base,
        kind: 'circle',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'ellipse':
      return {
        ...base,
        kind: 'ellipse',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'priceRange':
      return {
        ...base,
        kind: 'priceRange',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'dateRange':
      return {
        ...base,
        kind: 'dateRange',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'datePriceRange':
      return {
        ...base,
        kind: 'datePriceRange',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'longPosition':
    case 'shortPosition':
      return {
        ...base,
        kind: draft.tool,
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'fibRetracement':
      return {
        ...base,
        kind: 'fibRetracement',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'fibExtension':
      return {
        ...base,
        kind: 'fibExtension',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'triangle':
      return {
        ...base,
        kind: 'triangle',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'parallelChannel':
    case 'regressionTrend':
      return {
        ...base,
        kind: draft.tool,
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'path':
      return {
        ...base,
        kind: 'path',
        points: draft.anchors.slice(),
      };
    case 'textLabel':
      return {
        ...base,
        kind: 'textLabel',
        point: draft.anchors[0]!,
        text: draft.text ?? '',
        textAlign: 'center',
      };
  }
}

export function getUserDrawingPaneId(drawing: UserDrawing): string {
  return drawing.paneId;
}
