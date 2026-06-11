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
  | 'rotatedRectangle'
  | 'priceRange'
  | 'dateRange'
  | 'datePriceRange'
  | 'longPosition'
  | 'shortPosition'
  | 'forecast'
  | 'projection'
  | 'barsPattern'
  | 'anchoredVwap'
  | 'fibRetracement'
  | 'fibExtension'
  | 'fibFan'
  | 'fibSpeedResistanceFan'
  | 'fibSpeedResistanceArcs'
  | 'fibCircles'
  | 'fibWedge'
  | 'fibSpiral'
  | 'fibChannel'
  | 'fibTimeZone'
  | 'trendBasedFibTime'
  | 'cyclicLines'
  | 'timeCycles'
  | 'sineLine'
  | 'gannFan'
  | 'gannBox'
  | 'gannSquare'
  | 'triangle'
  | 'curve'
  | 'arc'
  | 'polyline'
  | 'pitchfork'
  | 'schiffPitchfork'
  | 'modifiedSchiffPitchfork'
  | 'insidePitchfork'
  | 'pitchfan'
  | 'parallelChannel'
  | 'regressionTrend'
  | 'flatTopBottom'
  | 'disjointChannel'
  | 'path'
  | 'brush'
  | 'highlighter'
  | 'note'
  | 'callout'
  | 'comment'
  | 'priceNote'
  | 'pin'
  | 'icon'
  | 'balloon'
  | 'textLabel';

export type UserDrawingKind = Exclude<UserDrawingTool, 'select'>;
export type UserDrawingPathFamilyKind = 'path' | 'brush' | 'highlighter';
export type UserDrawingTextAnnotationKind = 'textLabel' | 'note' | 'callout' | 'comment' | 'priceNote' | 'balloon';
export const USER_DRAWING_ICON_NAMES = ['star', 'circle', 'square', 'triangle', 'flag', 'arrowUp', 'arrowDown'] as const;
export type UserDrawingIconName = (typeof USER_DRAWING_ICON_NAMES)[number];

export type UserDrawingLineStyle = 'solid' | 'dashed' | 'dotted';

export type UserDrawingHandleRole = 'start' | 'end' | 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface UserDrawingAnchor {
  time: number;
  price: number;
}

export interface BarsPatternBarSnapshot {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
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

export interface RotatedRectangleDrawing extends UserDrawingBase {
  kind: 'rotatedRectangle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
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

export interface ForecastDrawing extends UserDrawingBase {
  kind: 'forecast';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface ProjectionDrawing extends UserDrawingBase {
  kind: 'projection';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface BarsPatternDrawing extends UserDrawingBase {
  kind: 'barsPattern';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
  bars: readonly BarsPatternBarSnapshot[];
}

export interface AnchoredVwapDrawing extends UserDrawingBase {
  kind: 'anchoredVwap';
  point: UserDrawingAnchor;
}

export interface FibRetracementDrawing extends UserDrawingBase {
  kind: 'fibRetracement';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibExtensionDrawing extends UserDrawingBase {
  kind: 'fibExtension';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibFanDrawing extends UserDrawingBase {
  kind: 'fibFan';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibSpeedResistanceFanDrawing extends UserDrawingBase {
  kind: 'fibSpeedResistanceFan';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibSpeedResistanceArcsDrawing extends UserDrawingBase {
  kind: 'fibSpeedResistanceArcs';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibCirclesDrawing extends UserDrawingBase {
  kind: 'fibCircles';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibWedgeDrawing extends UserDrawingBase {
  kind: 'fibWedge';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibSpiralDrawing extends UserDrawingBase {
  kind: 'fibSpiral';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface GannFanDrawing extends UserDrawingBase {
  kind: 'gannFan';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface GannBoxDrawing extends UserDrawingBase {
  kind: 'gannBox';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface GannSquareDrawing extends UserDrawingBase {
  kind: 'gannSquare';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibChannelDrawing extends UserDrawingBase {
  kind: 'fibChannel';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibTimeZoneDrawing extends UserDrawingBase {
  kind: 'fibTimeZone';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface TrendBasedFibTimeDrawing extends UserDrawingBase {
  kind: 'trendBasedFibTime';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface CyclicLinesDrawing extends UserDrawingBase {
  kind: 'cyclicLines';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface TimeCyclesDrawing extends UserDrawingBase {
  kind: 'timeCycles';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface SineLineDrawing extends UserDrawingBase {
  kind: 'sineLine';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface TriangleDrawing extends UserDrawingBase {
  kind: 'triangle';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface CurveDrawing extends UserDrawingBase {
  kind: 'curve';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface ArcDrawing extends UserDrawingBase {
  kind: 'arc';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface PolylineDrawing extends UserDrawingBase {
  kind: 'polyline';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export type PitchforkDrawingKind = 'pitchfork' | 'schiffPitchfork' | 'modifiedSchiffPitchfork' | 'insidePitchfork';

export interface PitchforkDrawing extends UserDrawingBase {
  kind: PitchforkDrawingKind;
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface PitchfanDrawing extends UserDrawingBase {
  kind: 'pitchfan';
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

export interface FlatTopBottomDrawing extends UserDrawingBase {
  kind: 'flatTopBottom';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface DisjointChannelDrawing extends UserDrawingBase {
  kind: 'disjointChannel';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface PathDrawing extends UserDrawingBase {
  kind: 'path';
  points: readonly UserDrawingAnchor[];
}

export interface BrushDrawing extends UserDrawingBase {
  kind: 'brush';
  points: readonly UserDrawingAnchor[];
}

export interface HighlighterDrawing extends UserDrawingBase {
  kind: 'highlighter';
  points: readonly UserDrawingAnchor[];
}

export type UserDrawingTextAlign = 'left' | 'center' | 'right';

export interface TextLabelDrawing extends UserDrawingBase {
  kind: 'textLabel';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface NoteDrawing extends UserDrawingBase {
  kind: 'note';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface CalloutDrawing extends UserDrawingBase {
  kind: 'callout';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface CommentDrawing extends UserDrawingBase {
  kind: 'comment';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface PriceNoteDrawing extends UserDrawingBase {
  kind: 'priceNote';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface PinDrawing extends UserDrawingBase {
  kind: 'pin';
  point: UserDrawingAnchor;
}

export interface IconDrawing extends UserDrawingBase {
  kind: 'icon';
  point: UserDrawingAnchor;
  iconName: UserDrawingIconName;
}

export interface BalloonDrawing extends UserDrawingBase {
  kind: 'balloon';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export type UserDrawingTextAnnotation =
  | TextLabelDrawing
  | NoteDrawing
  | CalloutDrawing
  | CommentDrawing
  | PriceNoteDrawing
  | BalloonDrawing;

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
  | RotatedRectangleDrawing
  | PriceRangeDrawing
  | DateRangeDrawing
  | DatePriceRangeDrawing
  | LongPositionDrawing
  | ShortPositionDrawing
  | ForecastDrawing
  | ProjectionDrawing
  | BarsPatternDrawing
  | AnchoredVwapDrawing
  | FibRetracementDrawing
  | FibExtensionDrawing
  | FibFanDrawing
  | FibSpeedResistanceFanDrawing
  | FibSpeedResistanceArcsDrawing
  | FibCirclesDrawing
  | FibWedgeDrawing
  | FibSpiralDrawing
  | FibChannelDrawing
  | FibTimeZoneDrawing
  | TrendBasedFibTimeDrawing
  | CyclicLinesDrawing
  | TimeCyclesDrawing
  | SineLineDrawing
  | GannFanDrawing
  | GannBoxDrawing
  | GannSquareDrawing
  | TriangleDrawing
  | CurveDrawing
  | ArcDrawing
  | PolylineDrawing
  | PitchforkDrawing
  | PitchfanDrawing
  | ParallelChannelDrawing
  | RegressionTrendDrawing
  | FlatTopBottomDrawing
  | DisjointChannelDrawing
  | PathDrawing
  | BrushDrawing
  | HighlighterDrawing
  | NoteDrawing
  | CalloutDrawing
  | CommentDrawing
  | PriceNoteDrawing
  | PinDrawing
  | IconDrawing
  | BalloonDrawing
  | TextLabelDrawing;

export interface UserDrawingDraft {
  tool: UserDrawingTool;
  paneId: string;
  anchors: readonly UserDrawingAnchor[];
  style: UserDrawingStyle;
  text?: string;
  barsPatternBars?: readonly BarsPatternBarSnapshot[];
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

export function normalizeUserDrawingIconName(iconName: unknown): UserDrawingIconName {
  return USER_DRAWING_ICON_NAMES.includes(iconName as UserDrawingIconName)
    ? (iconName as UserDrawingIconName)
    : 'star';
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

function isFiniteBarsPatternBar(bar: BarsPatternBarSnapshot): boolean {
  return (
    Number.isFinite(bar.time) &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close)
  );
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
    case 'forecast':
    case 'fibRetracement':
    case 'fibExtension':
    case 'fibFan':
    case 'fibSpeedResistanceFan':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'gannFan':
    case 'gannBox':
    case 'gannSquare':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
    case 'callout':
    case 'priceNote':
      return 2;
    case 'triangle':
    case 'curve':
    case 'arc':
    case 'polyline':
    case 'fibWedge':
    case 'fibChannel':
    case 'trendBasedFibTime':
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
    case 'pitchfan':
    case 'rotatedRectangle':
    case 'parallelChannel':
    case 'regressionTrend':
    case 'flatTopBottom':
    case 'projection':
    case 'longPosition':
    case 'shortPosition':
    case 'barsPattern':
    case 'path':
    case 'brush':
    case 'highlighter':
      return 3;
    case 'disjointChannel':
      return 4;
    case 'horizontalLine':
    case 'verticalLine':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'horizontalRay':
    case 'crossLine':
    case 'note':
    case 'comment':
    case 'pin':
    case 'icon':
    case 'balloon':
    case 'textLabel':
    case 'anchoredVwap':
      return 1;
    case 'select':
      return 0;
  }
}

export function isUserDrawingPathFamilyTool(tool: UserDrawingTool): tool is UserDrawingPathFamilyKind {
  return tool === 'path' || tool === 'brush' || tool === 'highlighter';
}

export function isUserDrawingTextAnnotation(drawing: UserDrawing): drawing is UserDrawingTextAnnotation {
  return (
    drawing.kind === 'textLabel' ||
    drawing.kind === 'note' ||
    drawing.kind === 'callout' ||
    drawing.kind === 'comment' ||
    drawing.kind === 'priceNote' ||
    drawing.kind === 'balloon'
  );
}

export function getUserDrawingTextAnnotationPoint(drawing: UserDrawingTextAnnotation): UserDrawingAnchor {
  return drawing.kind === 'callout' || drawing.kind === 'priceNote' ? drawing.points[1] : drawing.point;
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
    case 'rotatedRectangle':
      return {
        ...base,
        kind: 'rotatedRectangle',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
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
    case 'forecast':
      return {
        ...base,
        kind: 'forecast',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'projection':
      return {
        ...base,
        kind: 'projection',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'barsPattern': {
      const sourceStartTime = Math.min(draft.anchors[0]!.time, draft.anchors[1]!.time);
      const sourceEndTime = Math.max(draft.anchors[0]!.time, draft.anchors[1]!.time);
      const bars = (draft.barsPatternBars ?? [])
        .filter((bar) => isFiniteBarsPatternBar(bar) && bar.time >= sourceStartTime && bar.time <= sourceEndTime)
        .map((bar) => ({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close }))
        .sort((a, b) => a.time - b.time);
      if (bars.length === 0) return null;
      return {
        ...base,
        kind: 'barsPattern',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
        bars,
      };
    }
    case 'anchoredVwap':
      return {
        ...base,
        kind: 'anchoredVwap',
        point: draft.anchors[0]!,
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
    case 'fibFan':
      return {
        ...base,
        kind: 'fibFan',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'fibSpeedResistanceFan':
      return {
        ...base,
        kind: 'fibSpeedResistanceFan',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'fibSpeedResistanceArcs':
      return {
        ...base,
        kind: 'fibSpeedResistanceArcs',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'fibCircles':
      return {
        ...base,
        kind: 'fibCircles',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'fibWedge':
      return {
        ...base,
        kind: 'fibWedge',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'fibSpiral':
      return {
        ...base,
        kind: 'fibSpiral',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'gannFan':
      return {
        ...base,
        kind: 'gannFan',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'gannBox':
      return {
        ...base,
        kind: 'gannBox',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'gannSquare':
      return {
        ...base,
        kind: 'gannSquare',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'fibTimeZone':
      return {
        ...base,
        kind: 'fibTimeZone',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'trendBasedFibTime':
      return {
        ...base,
        kind: 'trendBasedFibTime',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'cyclicLines':
      return {
        ...base,
        kind: 'cyclicLines',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'timeCycles':
      return {
        ...base,
        kind: 'timeCycles',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'sineLine':
      return {
        ...base,
        kind: 'sineLine',
        points: [draft.anchors[0]!, draft.anchors[1]!],
      };
    case 'triangle':
      return {
        ...base,
        kind: 'triangle',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'curve':
      return {
        ...base,
        kind: 'curve',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'arc':
      return {
        ...base,
        kind: 'arc',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'fibChannel':
      return {
        ...base,
        kind: 'fibChannel',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'polyline':
      return {
        ...base,
        kind: 'polyline',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'pitchfork':
    case 'schiffPitchfork':
    case 'modifiedSchiffPitchfork':
    case 'insidePitchfork':
    case 'pitchfan':
      return {
        ...base,
        kind: draft.tool,
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'parallelChannel':
    case 'regressionTrend':
    case 'flatTopBottom':
      return {
        ...base,
        kind: draft.tool,
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'disjointChannel':
      return {
        ...base,
        kind: 'disjointChannel',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!, draft.anchors[3]!],
      };
    case 'path':
    case 'brush':
    case 'highlighter':
      return {
        ...base,
        kind: draft.tool,
        points: draft.anchors.slice(),
      };
    case 'note':
    case 'comment':
    case 'balloon':
    case 'textLabel':
      return {
        ...base,
        kind: draft.tool,
        point: draft.anchors[0]!,
        text: draft.text ?? '',
        textAlign: 'center',
      };
    case 'pin':
      return {
        ...base,
        kind: 'pin',
        point: draft.anchors[0]!,
      };
    case 'icon':
      return {
        ...base,
        kind: 'icon',
        point: draft.anchors[0]!,
        iconName: normalizeUserDrawingIconName('star'),
      };
    case 'callout':
    case 'priceNote':
      return {
        ...base,
        kind: draft.tool,
        points: [draft.anchors[0]!, draft.anchors[1]!],
        text: draft.text ?? '',
        textAlign: 'center',
      };
  }
}

export function getUserDrawingPaneId(drawing: UserDrawing): string {
  return drawing.paneId;
}
