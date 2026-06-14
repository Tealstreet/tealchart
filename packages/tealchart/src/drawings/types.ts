export const USER_DRAWING_SCHEMA_VERSION = 1;

export type UserDrawingTool =
  | 'select'
  | 'trendLine'
  | 'trendAngle'
  | 'extendedLine'
  | 'infoLine'
  | 'arrowLine'
  | 'arrowMarker'
  | 'arrowMarkLeft'
  | 'arrowMarkRight'
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
  | 'sector'
  | 'barsPattern'
  | 'trianglePattern'
  | 'abcdPattern'
  | 'xabcdPattern'
  | 'cypherPattern'
  | 'threeDrivesPattern'
  | 'headShouldersPattern'
  | 'elliottImpulseWave'
  | 'elliottCorrectiveWave'
  | 'elliottDoubleComboWave'
  | 'elliottTripleComboWave'
  | 'elliottTriangleWave'
  | 'anchoredVwap'
  | 'anchoredVolumeProfile'
  | 'fixedRangeVolumeProfile'
  | 'fibRetracement'
  | 'fibExtension'
  | 'trendBasedFibExtension'
  | 'fibFan'
  | 'fibSpeedResistanceFan'
  | 'fibArcs'
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
  | 'gannSquareFixed'
  | 'triangle'
  | 'curve'
  | 'doubleCurve'
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
  | 'anchoredText'
  | 'anchoredNote'
  | 'priceLabel'
  | 'priceNote'
  | 'pin'
  | 'icon'
  | 'flagMark'
  | 'image'
  | 'emoji'
  | 'sticker'
  | 'balloon'
  | 'signpost'
  | 'table'
  | 'textLabel';

export type UserDrawingKind = Exclude<UserDrawingTool, 'select'>;
export type UserDrawingPathFamilyKind = 'path' | 'brush' | 'highlighter';
export type UserDrawingTextAnnotationKind =
  | 'textLabel'
  | 'note'
  | 'callout'
  | 'comment'
  | 'anchoredText'
  | 'anchoredNote'
  | 'priceLabel'
  | 'priceNote'
  | 'emoji'
  | 'sticker'
  | 'balloon'
  | 'signpost';
export const USER_DRAWING_ICON_NAMES = ['star', 'circle', 'square', 'triangle', 'flag', 'arrowUp', 'arrowDown'] as const;
export type UserDrawingIconName = (typeof USER_DRAWING_ICON_NAMES)[number];

export type UserDrawingLineStyle = 'solid' | 'dashed' | 'dotted';
export const USER_DRAWING_TREND_LINE_EXTENDS = ['none', 'left', 'right', 'both'] as const;
export type UserDrawingTrendLineExtend = (typeof USER_DRAWING_TREND_LINE_EXTENDS)[number];

export type UserDrawingHandleRole = 'start' | 'end' | 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface UserDrawingAnchor {
  time: number;
  price: number;
  pressure?: number;
}

export function normalizeUserDrawingAnchorPressure(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(1, value));
}

export interface UserDrawingPanePosition {
  x: number;
  y: number;
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
  fontWeight?: UserDrawingFontWeight;
  fontStyle?: UserDrawingFontStyle;
  textUnderline?: boolean;
  textLineThrough?: boolean;
  textWrap?: boolean;
  textMaxWidth?: number;
}

export interface UserDrawingBase {
  id: string;
  kind: UserDrawingKind;
  name?: string;
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
  extend: UserDrawingTrendLineExtend;
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

export interface ArrowMarkLeftDrawing extends UserDrawingBase {
  kind: 'arrowMarkLeft';
  point: UserDrawingAnchor;
}

export interface ArrowMarkRightDrawing extends UserDrawingBase {
  kind: 'arrowMarkRight';
  point: UserDrawingAnchor;
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

export interface ImageDrawing extends UserDrawingBase {
  kind: 'image';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
  src: string;
  alt: string;
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

export interface SectorDrawing extends UserDrawingBase {
  kind: 'sector';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface BarsPatternDrawing extends UserDrawingBase {
  kind: 'barsPattern';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
  bars: readonly BarsPatternBarSnapshot[];
}

export interface TrianglePatternDrawing extends UserDrawingBase {
  kind: 'trianglePattern';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface AbcdPatternDrawing extends UserDrawingBase {
  kind: 'abcdPattern';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface XabcdPatternDrawing extends UserDrawingBase {
  kind: 'xabcdPattern';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface CypherPatternDrawing extends UserDrawingBase {
  kind: 'cypherPattern';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface ThreeDrivesPatternDrawing extends UserDrawingBase {
  kind: 'threeDrivesPattern';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface HeadShouldersPatternDrawing extends UserDrawingBase {
  kind: 'headShouldersPattern';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface ElliottImpulseWaveDrawing extends UserDrawingBase {
  kind: 'elliottImpulseWave';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface ElliottCorrectiveWaveDrawing extends UserDrawingBase {
  kind: 'elliottCorrectiveWave';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface ElliottDoubleComboWaveDrawing extends UserDrawingBase {
  kind: 'elliottDoubleComboWave';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface ElliottTripleComboWaveDrawing extends UserDrawingBase {
  kind: 'elliottTripleComboWave';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface ElliottTriangleWaveDrawing extends UserDrawingBase {
  kind: 'elliottTriangleWave';
  points: readonly [
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
    UserDrawingAnchor,
  ];
}

export interface AnchoredVwapDrawing extends UserDrawingBase {
  kind: 'anchoredVwap';
  point: UserDrawingAnchor;
}

export interface AnchoredVolumeProfileDrawing extends UserDrawingBase {
  kind: 'anchoredVolumeProfile';
  point: UserDrawingAnchor;
}

export interface FixedRangeVolumeProfileDrawing extends UserDrawingBase {
  kind: 'fixedRangeVolumeProfile';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibRetracementDrawing extends UserDrawingBase {
  kind: 'fibRetracement';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibExtensionDrawing extends UserDrawingBase {
  kind: 'fibExtension';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface TrendBasedFibExtensionDrawing extends UserDrawingBase {
  kind: 'trendBasedFibExtension';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibFanDrawing extends UserDrawingBase {
  kind: 'fibFan';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibSpeedResistanceFanDrawing extends UserDrawingBase {
  kind: 'fibSpeedResistanceFan';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor];
}

export interface FibArcsDrawing extends UserDrawingBase {
  kind: 'fibArcs';
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

export interface GannSquareFixedDrawing extends UserDrawingBase {
  kind: 'gannSquareFixed';
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

export interface DoubleCurveDrawing extends UserDrawingBase {
  kind: 'doubleCurve';
  points: readonly [UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor, UserDrawingAnchor];
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

export interface AnchoredTextDrawing extends UserDrawingBase {
  kind: 'anchoredText';
  position: UserDrawingPanePosition;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface AnchoredNoteDrawing extends UserDrawingBase {
  kind: 'anchoredNote';
  position: UserDrawingPanePosition;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface PriceLabelDrawing extends UserDrawingBase {
  kind: 'priceLabel';
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

export interface FlagMarkDrawing extends UserDrawingBase {
  kind: 'flagMark';
  point: UserDrawingAnchor;
}

export interface EmojiDrawing extends UserDrawingBase {
  kind: 'emoji';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface StickerDrawing extends UserDrawingBase {
  kind: 'sticker';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface BalloonDrawing extends UserDrawingBase {
  kind: 'balloon';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface SignpostDrawing extends UserDrawingBase {
  kind: 'signpost';
  point: UserDrawingAnchor;
  text: string;
  textAlign: UserDrawingTextAlign;
}

export interface TableDrawing extends UserDrawingBase {
  kind: 'table';
  point: UserDrawingAnchor;
  cells: readonly (readonly string[])[];
  textAlign: UserDrawingTextAlign;
}

export type UserDrawingTextAnnotation =
  | TextLabelDrawing
  | NoteDrawing
  | CalloutDrawing
  | CommentDrawing
  | AnchoredTextDrawing
  | AnchoredNoteDrawing
  | PriceLabelDrawing
  | PriceNoteDrawing
  | EmojiDrawing
  | StickerDrawing
  | BalloonDrawing
  | SignpostDrawing;

export const DEFAULT_USER_DRAWING_TABLE_CELLS: readonly (readonly string[])[] = [
  ['Label', 'Value'],
  ['Price', ''],
] as const;

const MAX_USER_DRAWING_TABLE_ROWS = 12;
const MAX_USER_DRAWING_TABLE_COLUMNS = 8;

export function normalizeUserDrawingTableCells(cells?: readonly (readonly unknown[])[] | null): readonly (readonly string[])[] {
  if (!cells || cells.length === 0) return DEFAULT_USER_DRAWING_TABLE_CELLS.map((row) => row.slice());

  const rows = cells.slice(0, MAX_USER_DRAWING_TABLE_ROWS);
  const maxColumns = Math.max(
    1,
    Math.min(
      MAX_USER_DRAWING_TABLE_COLUMNS,
      rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0),
    ),
  );

  return rows.map((row) => {
    const source = Array.isArray(row) ? row : [];
    return Array.from({ length: maxColumns }, (_, index) => {
      const value = source[index];
      return typeof value === 'string' ? value : value == null ? '' : String(value);
    });
  });
}

export type UserDrawing =
  | TrendLineDrawing
  | TrendAngleDrawing
  | ExtendedLineDrawing
  | InfoLineDrawing
  | ArrowLineDrawing
  | ArrowMarkerDrawing
  | ArrowMarkLeftDrawing
  | ArrowMarkRightDrawing
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
  | SectorDrawing
  | BarsPatternDrawing
  | TrianglePatternDrawing
  | AbcdPatternDrawing
  | XabcdPatternDrawing
  | CypherPatternDrawing
  | ThreeDrivesPatternDrawing
  | HeadShouldersPatternDrawing
  | ElliottImpulseWaveDrawing
  | ElliottCorrectiveWaveDrawing
  | ElliottDoubleComboWaveDrawing
  | ElliottTripleComboWaveDrawing
  | ElliottTriangleWaveDrawing
  | AnchoredVwapDrawing
  | AnchoredVolumeProfileDrawing
  | FixedRangeVolumeProfileDrawing
  | FibRetracementDrawing
  | FibExtensionDrawing
  | TrendBasedFibExtensionDrawing
  | FibFanDrawing
  | FibSpeedResistanceFanDrawing
  | FibArcsDrawing
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
  | GannSquareFixedDrawing
  | TriangleDrawing
  | CurveDrawing
  | DoubleCurveDrawing
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
  | AnchoredTextDrawing
  | AnchoredNoteDrawing
  | PriceLabelDrawing
  | PriceNoteDrawing
  | PinDrawing
  | IconDrawing
  | FlagMarkDrawing
  | ImageDrawing
  | EmojiDrawing
  | StickerDrawing
  | BalloonDrawing
  | SignpostDrawing
  | TableDrawing
  | TextLabelDrawing;

export interface UserDrawingDraft {
  tool: UserDrawingTool;
  paneId: string;
  anchors: readonly UserDrawingAnchor[];
  positions?: readonly UserDrawingPanePosition[];
  style: UserDrawingStyle;
  text?: string;
  barsPatternBars?: readonly BarsPatternBarSnapshot[];
  startedAt: number;
}

export interface UserDrawingSelection {
  drawingId: string;
  drawingIds?: readonly string[];
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
  stayInDrawingMode: boolean;
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

export const DEFAULT_USER_DRAWING_PATH_STYLE: UserDrawingStyle = {
  ...DEFAULT_USER_DRAWING_STYLE,
  lineWidth: 2,
};

export const DEFAULT_USER_DRAWING_BRUSH_STYLE: UserDrawingStyle = {
  ...DEFAULT_USER_DRAWING_STYLE,
  lineWidth: 4,
};

export const DEFAULT_USER_DRAWING_HIGHLIGHTER_STYLE: UserDrawingStyle = {
  ...DEFAULT_USER_DRAWING_STYLE,
  lineWidth: 8,
  opacity: 0.35,
};

export function getDefaultUserDrawingStyleForTool(tool: UserDrawingTool): UserDrawingStyle {
  if (tool === 'path') return DEFAULT_USER_DRAWING_PATH_STYLE;
  if (tool === 'brush') return DEFAULT_USER_DRAWING_BRUSH_STYLE;
  if (tool === 'highlighter') return DEFAULT_USER_DRAWING_HIGHLIGHTER_STYLE;
  return DEFAULT_USER_DRAWING_STYLE;
}

export const USER_DRAWING_FONT_SIZES = [8, 10, 12, 14, 16, 20, 24, 28, 32, 40] as const;
export const USER_DRAWING_FONT_FAMILIES = ['sans-serif', 'serif', 'monospace'] as const;
export const USER_DRAWING_FONT_WEIGHTS = ['normal', 'bold'] as const;
export const USER_DRAWING_FONT_STYLES = ['normal', 'italic'] as const;
export const USER_DRAWING_TEXT_MAX_WIDTHS = [120, 180, 240, 320, 480] as const;
export type UserDrawingFontSize = (typeof USER_DRAWING_FONT_SIZES)[number];
export type UserDrawingFontFamily = (typeof USER_DRAWING_FONT_FAMILIES)[number];
export type UserDrawingFontWeight = (typeof USER_DRAWING_FONT_WEIGHTS)[number];
export type UserDrawingFontStyle = (typeof USER_DRAWING_FONT_STYLES)[number];
export type UserDrawingTextMaxWidth = (typeof USER_DRAWING_TEXT_MAX_WIDTHS)[number];
export const USER_DRAWING_OPACITIES = [1, 0.75, 0.5, 0.25, 0.1] as const;

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

export function normalizeUserDrawingFontWeight(fontWeight: string): UserDrawingFontWeight {
  return USER_DRAWING_FONT_WEIGHTS.includes(fontWeight as UserDrawingFontWeight)
    ? (fontWeight as UserDrawingFontWeight)
    : 'normal';
}

export function normalizeUserDrawingFontStyle(fontStyle: string): UserDrawingFontStyle {
  return USER_DRAWING_FONT_STYLES.includes(fontStyle as UserDrawingFontStyle)
    ? (fontStyle as UserDrawingFontStyle)
    : 'normal';
}

export function normalizeUserDrawingOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) return 1;
  return Math.max(0, Math.min(1, opacity));
}

export function normalizeUserDrawingTextMaxWidth(textMaxWidth: number): UserDrawingTextMaxWidth {
  if (!Number.isFinite(textMaxWidth)) return 180;
  return USER_DRAWING_TEXT_MAX_WIDTHS.reduce((nearest, candidate) =>
    Math.abs(candidate - textMaxWidth) < Math.abs(nearest - textMaxWidth) ? candidate : nearest,
  );
}

export function normalizeUserDrawingIconName(iconName: unknown): UserDrawingIconName {
  return USER_DRAWING_ICON_NAMES.includes(iconName as UserDrawingIconName)
    ? (iconName as UserDrawingIconName)
    : 'star';
}

export function normalizeUserDrawingPanePosition(position: UserDrawingPanePosition): UserDrawingPanePosition {
  return {
    x: Number.isFinite(position.x) ? Math.max(0, Math.min(1, position.x)) : 0.5,
    y: Number.isFinite(position.y) ? Math.max(0, Math.min(1, position.y)) : 0.5,
  };
}

export function normalizeUserDrawingStyle(style: UserDrawingStyle): UserDrawingStyle {
  const fontSize = style.fontSize === undefined ? undefined : normalizeUserDrawingFontSize(style.fontSize);
  const fontFamily =
    style.fontFamily === undefined ? undefined : normalizeUserDrawingFontFamily(style.fontFamily);
  const fontWeight =
    style.fontWeight === undefined ? undefined : normalizeUserDrawingFontWeight(style.fontWeight);
  const fontStyle = style.fontStyle === undefined ? undefined : normalizeUserDrawingFontStyle(style.fontStyle);
  const opacity = style.opacity === undefined ? undefined : normalizeUserDrawingOpacity(style.opacity);
  const textMaxWidth =
    style.textMaxWidth === undefined ? undefined : normalizeUserDrawingTextMaxWidth(style.textMaxWidth);
  if (
    fontSize === style.fontSize &&
    fontFamily === style.fontFamily &&
    fontWeight === style.fontWeight &&
    fontStyle === style.fontStyle &&
    opacity === style.opacity &&
    textMaxWidth === style.textMaxWidth
  ) {
    return style;
  }

  return {
    ...style,
    ...(fontSize === undefined ? {} : { fontSize }),
    ...(fontFamily === undefined ? {} : { fontFamily }),
    ...(fontWeight === undefined ? {} : { fontWeight }),
    ...(fontStyle === undefined ? {} : { fontStyle }),
    ...(opacity === undefined ? {} : { opacity }),
    ...(textMaxWidth === undefined ? {} : { textMaxWidth }),
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
  stayInDrawingMode: true,
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
    case 'image':
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
    case 'fibArcs':
    case 'fibSpeedResistanceArcs':
    case 'fibCircles':
    case 'fibSpiral':
    case 'gannFan':
    case 'gannBox':
    case 'gannSquare':
    case 'gannSquareFixed':
    case 'fibTimeZone':
    case 'cyclicLines':
    case 'timeCycles':
    case 'sineLine':
    case 'callout':
    case 'priceNote':
    case 'fixedRangeVolumeProfile':
      return 2;
    case 'triangle':
    case 'curve':
    case 'arc':
    case 'polyline':
    case 'fibWedge':
    case 'fibChannel':
    case 'trendBasedFibExtension':
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
    case 'sector':
    case 'longPosition':
    case 'shortPosition':
    case 'barsPattern':
    case 'elliottCorrectiveWave':
    case 'elliottDoubleComboWave':
    case 'path':
    case 'brush':
    case 'highlighter':
      return 3;
    case 'doubleCurve':
    case 'disjointChannel':
    case 'trianglePattern':
    case 'abcdPattern':
      return 4;
    case 'threeDrivesPattern':
    case 'headShouldersPattern':
    case 'elliottImpulseWave':
    case 'elliottTripleComboWave':
    case 'elliottTriangleWave':
    case 'xabcdPattern':
    case 'cypherPattern':
      return 5;
    case 'horizontalLine':
    case 'verticalLine':
    case 'arrowMarkLeft':
    case 'arrowMarkRight':
    case 'arrowMarkUp':
    case 'arrowMarkDown':
    case 'horizontalRay':
    case 'crossLine':
    case 'note':
    case 'comment':
    case 'anchoredText':
    case 'anchoredNote':
    case 'priceLabel':
    case 'pin':
    case 'icon':
    case 'flagMark':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost':
    case 'table':
    case 'textLabel':
    case 'anchoredVwap':
    case 'anchoredVolumeProfile':
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
    drawing.kind === 'anchoredText' ||
    drawing.kind === 'anchoredNote' ||
    drawing.kind === 'priceLabel' ||
    drawing.kind === 'priceNote' ||
    drawing.kind === 'emoji' ||
    drawing.kind === 'sticker' ||
    drawing.kind === 'balloon' ||
    drawing.kind === 'signpost'
  );
}

export function getUserDrawingTextAnnotationPoint(drawing: UserDrawingTextAnnotation): UserDrawingAnchor | null {
  if (drawing.kind === 'anchoredText' || drawing.kind === 'anchoredNote') {
    return null;
  }
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
    case 'arrowMarkLeft':
      return {
        ...base,
        kind: 'arrowMarkLeft',
        point: draft.anchors[0]!,
      };
    case 'arrowMarkRight':
      return {
        ...base,
        kind: 'arrowMarkRight',
        point: draft.anchors[0]!,
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
    case 'image':
      return {
        ...base,
        kind: 'image',
        points: [draft.anchors[0]!, draft.anchors[1]!],
        src: draft.text ?? '',
        alt: draft.text ? 'Image' : 'Image placeholder',
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
    case 'sector':
      return {
        ...base,
        kind: 'sector',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'elliottCorrectiveWave':
      return {
        ...base,
        kind: 'elliottCorrectiveWave',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
      };
    case 'elliottDoubleComboWave':
      return {
        ...base,
        kind: 'elliottDoubleComboWave',
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
    case 'trianglePattern':
      return {
        ...base,
        kind: 'trianglePattern',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!, draft.anchors[3]!],
      };
    case 'abcdPattern':
      return {
        ...base,
        kind: 'abcdPattern',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!, draft.anchors[3]!],
      };
    case 'xabcdPattern':
    case 'cypherPattern':
      return {
        ...base,
        kind: draft.tool,
        points: [
          draft.anchors[0]!,
          draft.anchors[1]!,
          draft.anchors[2]!,
          draft.anchors[3]!,
          draft.anchors[4]!,
        ],
      };
    case 'threeDrivesPattern':
      return {
        ...base,
        kind: 'threeDrivesPattern',
        points: [
          draft.anchors[0]!,
          draft.anchors[1]!,
          draft.anchors[2]!,
          draft.anchors[3]!,
          draft.anchors[4]!,
        ],
      };
    case 'headShouldersPattern':
      return {
        ...base,
        kind: 'headShouldersPattern',
        points: [
          draft.anchors[0]!,
          draft.anchors[1]!,
          draft.anchors[2]!,
          draft.anchors[3]!,
          draft.anchors[4]!,
        ],
      };
    case 'elliottImpulseWave':
      return {
        ...base,
        kind: 'elliottImpulseWave',
        points: [
          draft.anchors[0]!,
          draft.anchors[1]!,
          draft.anchors[2]!,
          draft.anchors[3]!,
          draft.anchors[4]!,
        ],
      };
    case 'elliottTripleComboWave':
      return {
        ...base,
        kind: 'elliottTripleComboWave',
        points: [
          draft.anchors[0]!,
          draft.anchors[1]!,
          draft.anchors[2]!,
          draft.anchors[3]!,
          draft.anchors[4]!,
        ],
      };
    case 'elliottTriangleWave':
      return {
        ...base,
        kind: 'elliottTriangleWave',
        points: [
          draft.anchors[0]!,
          draft.anchors[1]!,
          draft.anchors[2]!,
          draft.anchors[3]!,
          draft.anchors[4]!,
        ],
      };
    case 'anchoredVwap':
      return {
        ...base,
        kind: 'anchoredVwap',
        point: draft.anchors[0]!,
      };
    case 'anchoredVolumeProfile':
      return {
        ...base,
        kind: 'anchoredVolumeProfile',
        point: draft.anchors[0]!,
      };
    case 'fixedRangeVolumeProfile':
      return {
        ...base,
        kind: 'fixedRangeVolumeProfile',
        points: [draft.anchors[0]!, draft.anchors[1]!],
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
    case 'trendBasedFibExtension':
      return {
        ...base,
        kind: 'trendBasedFibExtension',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!],
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
    case 'fibArcs':
      return {
        ...base,
        kind: 'fibArcs',
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
    case 'gannSquareFixed':
      return {
        ...base,
        kind: 'gannSquareFixed',
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
    case 'doubleCurve':
      return {
        ...base,
        kind: 'doubleCurve',
        points: [draft.anchors[0]!, draft.anchors[1]!, draft.anchors[2]!, draft.anchors[3]!],
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
    case 'priceLabel':
    case 'emoji':
    case 'sticker':
    case 'balloon':
    case 'signpost':
    case 'textLabel':
      return {
        ...base,
        kind: draft.tool,
        point: draft.anchors[0]!,
        text: draft.text ?? (draft.tool === 'emoji' ? '👍' : draft.tool === 'sticker' ? '★' : ''),
        textAlign: 'center',
      };
    case 'table':
      return {
        ...base,
        kind: 'table',
        point: draft.anchors[0]!,
        cells: normalizeUserDrawingTableCells(),
        textAlign: 'left',
      };
    case 'anchoredText':
    case 'anchoredNote':
      return {
        ...base,
        kind: draft.tool,
        position: normalizeUserDrawingPanePosition(draft.positions?.[0] ?? { x: 0.5, y: 0.5 }),
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
    case 'flagMark':
      return {
        ...base,
        kind: 'flagMark',
        point: draft.anchors[0]!,
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
