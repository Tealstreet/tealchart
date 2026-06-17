import type { UserDrawingTool } from './types';
import type { UserDrawingSelectedActionSurfaceCommand, UserDrawingToolbarAction } from './toolbar';

/**
 * Platform-neutral line-icon registry for drawing tools and toolbar actions.
 * Web renders these via inline <svg>; mobile renders the same nodes through
 * react-native-svg, so both platforms draw identical marks from one source.
 *
 * Geometry only — stroke/fill/width are applied by the platform render layer
 * (default: stroke = current color, no fill, round caps). `filled` nodes are
 * filled with the icon color and not stroked (dots, stars).
 */

export type DrawingIconNodeTag = 'path' | 'circle' | 'line' | 'polyline' | 'rect' | 'ellipse';

export interface DrawingIconNode {
  tag: DrawingIconNodeTag;
  attrs: Readonly<Record<string, string | number>>;
  filled?: boolean;
}

export interface DrawingIconDefinition {
  viewBox?: string;
  nodes: readonly DrawingIconNode[];
}

export const DRAWING_ICON_DEFAULT_VIEWBOX = '0 0 24 24';

const p = (d: string): DrawingIconNode => ({ tag: 'path', attrs: { d } });
const line = (x1: number, y1: number, x2: number, y2: number): DrawingIconNode => ({
  tag: 'line',
  attrs: { x1, y1, x2, y2 },
});
const circle = (cx: number, cy: number, r: number, filled = false): DrawingIconNode => ({
  tag: 'circle',
  attrs: { cx, cy, r },
  filled,
});
const dot = (cx: number, cy: number, r = 2): DrawingIconNode => circle(cx, cy, r, true);
const rect = (x: number, y: number, width: number, height: number, rx = 2): DrawingIconNode => ({
  tag: 'rect',
  attrs: { x, y, width, height, rx },
});
const polyline = (points: string): DrawingIconNode => ({ tag: 'polyline', attrs: { points } });
const ellipse = (cx: number, cy: number, rx: number, ry: number): DrawingIconNode => ({
  tag: 'ellipse',
  attrs: { cx, cy, rx, ry },
});

const def = (nodes: DrawingIconNode[]): DrawingIconDefinition => ({ nodes });

export const DRAWING_ICONS = {
  // --- Cursor / selection ---
  select: def([p('M5 3l5 16 2.3-6.7L19 10z')]),
  crosshair: def([
    circle(12, 12, 9),
    line(12, 1.5, 12, 6),
    line(12, 18, 12, 22.5),
    line(1.5, 12, 6, 12),
    line(18, 12, 22.5, 12),
  ]),

  // --- Lines ---
  trendLine: def([line(5, 19, 19, 5), circle(5, 19, 2), circle(19, 5, 2)]),
  trendAngle: def([line(4, 19, 20, 19), line(4, 19, 18, 7), circle(4, 19, 1.8)]),
  extendedLine: def([line(2, 20, 22, 4), circle(8.5, 15, 1.8), circle(15.5, 9, 1.8)]),
  ray: def([line(5, 19, 22, 2), dot(5, 19, 2)]),
  horizontalLine: def([line(3, 12, 21, 12), circle(8, 12, 2)]),
  horizontalRay: def([line(4, 12, 21, 12), dot(4, 12, 2)]),
  verticalLine: def([line(12, 3, 12, 21), circle(12, 12, 2)]),
  crossLine: def([line(12, 3, 12, 21), line(3, 12, 21, 12), dot(12, 12, 2)]),
  arrowLine: def([line(5, 19, 18, 6), polyline('12 6 18 6 18 12'), dot(5, 19, 1.8)]),

  // --- Channels ---
  parallelChannel: def([line(3, 15, 17, 4), line(7, 20, 21, 9)]),
  disjointChannel: def([line(3, 14, 11, 6), line(13, 18, 21, 10)]),
  flatTopBottom: def([line(4, 6, 20, 6), line(4, 18, 20, 18), circle(4, 6, 1.6), circle(20, 18, 1.6)]),
  regressionTrend: def([line(4, 17, 20, 7), line(4, 20, 20, 10), line(4, 14, 20, 4)]),

  // --- Shapes ---
  rectangle: def([rect(4, 6, 16, 12, 1.5)]),
  rotatedRectangle: def([p('M12 3l9 9-9 9-9-9z')]),
  circle: def([circle(12, 12, 8.5)]),
  ellipse: def([ellipse(12, 12, 9, 6)]),
  triangle: def([p('M12 4l8.5 16h-17z')]),

  // --- Measure / position ---
  priceRange: def([
    line(5, 5, 19, 5),
    line(5, 19, 19, 19),
    line(12, 6, 12, 18),
    polyline('9 9 12 6 15 9'),
    polyline('9 15 12 18 15 15'),
  ]),
  dateRange: def([
    line(5, 5, 5, 19),
    line(19, 5, 19, 19),
    line(6, 12, 18, 12),
    polyline('9 9 6 12 9 15'),
    polyline('15 9 18 12 15 15'),
  ]),
  datePriceRange: def([rect(5, 5, 14, 14, 1), line(5, 12, 19, 12), line(12, 5, 12, 19)]),
  longPosition: def([rect(4, 4, 16, 16, 1.5), line(4, 12, 20, 12), polyline('9 11 12 8 15 11')]),
  shortPosition: def([rect(4, 4, 16, 16, 1.5), line(4, 12, 20, 12), polyline('9 13 12 16 15 13')]),

  // --- Fib / forks ---
  fibRetracement: def([
    line(4, 5, 20, 5),
    line(4, 9.7, 20, 9.7),
    line(4, 14.3, 20, 14.3),
    line(4, 19, 20, 19),
    line(4, 19, 20, 5),
  ]),
  pitchfork: def([line(12, 3, 12, 21), line(5, 6, 5, 18), line(19, 6, 19, 18), line(5, 12, 19, 12)]),

  // --- Brushes / annotations ---
  brush: def([
    p('M9.2 12 17 4.2a2.8 2.8 0 0 1 4 4L13.2 16'),
    p('M7.2 14.8c-1.7 0-3 1.4-3 3 0 1.3-2.5 1.5-2 2 1.1 1.1 2.5 2 4 2 2.2 0 4-1.8 4-4a3 3 0 0 0-3-3z'),
  ]),
  highlighter: def([p('M5 16l3 3 11-11-3-3z'), p('M5 16l-1.5 4.5L8 19'), line(14, 6, 18, 10)]),
  path: def([polyline('3 17 9 9 14 13 21 5'), dot(3, 17, 1.6), dot(9, 9, 1.6), dot(14, 13, 1.6), dot(21, 5, 1.6)]),
  note: def([p('M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3.5h.5a8.4 8.4 0 0 1 8.5 8z')]),
  callout: def([p('M4 4h16v11H9l-4 4v-4H4z')]),
  comment: def([p('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')]),
  textLabel: def([line(6, 6, 18, 6), line(12, 6, 12, 19)]),
  anchoredText: def([line(6, 8, 16, 8), line(11, 8, 11, 19), dot(20, 6, 2)]),
  flagMark: def([line(6, 3, 6, 21), p('M6 4h11l-2.5 3.5L17 11H6z')]),

  // --- Patterns / markers ---
  barsPattern: def([line(6, 16, 6, 8), line(10, 19, 10, 5), line(14, 15, 14, 9), line(18, 17, 18, 7)]),
  trianglePattern: def([p('M4 19h16'), line(4, 19, 13, 6), line(20, 19, 13, 6)]),

  // --- Arrow marks ---
  arrowMarker: def([line(4, 12, 14, 12), { tag: 'path', attrs: { d: 'M13 8l5 4-5 4z' }, filled: true }]),
  arrowMarkUp: def([line(12, 20, 12, 5), polyline('6 11 12 5 18 11')]),
  arrowMarkDown: def([line(12, 4, 12, 19), polyline('6 13 12 19 18 13')]),
  arrowMarkLeft: def([line(20, 12, 5, 12), polyline('11 6 5 12 11 18')]),
  arrowMarkRight: def([line(4, 12, 19, 12), polyline('13 6 19 12 13 18')]),

  // --- Info / projection ---
  infoLine: def([line(4, 20, 18, 6), circle(20, 4, 2.5), dot(20, 3.5, 0.8), line(20, 5, 20, 7)]),
  forecast: def([polyline('4 18 10 12 14 15 20 6'), polyline('17 6 20 6 20 9')]),
  projection: def([dot(4, 18, 2), line(4, 18, 20, 6), line(4, 18, 20, 18), p('M20 6 A14 12 0 0 1 20 18')]),
  sector: def([line(5, 19, 5, 7), line(5, 19, 17, 19), p('M5 7 A12 12 0 0 1 17 19')]),

  // --- Fibonacci ---
  fibExtension: def([polyline('5 19 12 10 19 10'), line(5, 19, 19, 19), line(5, 14, 19, 14), line(5, 8, 19, 8), line(5, 3, 19, 3)]),
  trendBasedFibExtension: def([polyline('4 20 12 10 20 10'), dot(4, 20), dot(12, 10), dot(20, 10), line(6, 16, 22, 16), line(6, 12, 22, 12), line(6, 7, 22, 7)]),
  fibFan: def([line(4, 20, 4, 4), line(4, 20, 20, 20), line(4, 20, 20, 4), line(4, 20, 20, 10), line(4, 20, 20, 14)]),
  fibSpeedResistanceFan: def([rect(4, 4, 16, 16), line(4, 20, 20, 4), line(4, 20, 14, 4), line(4, 20, 20, 10)]),
  fibArcs: def([line(4, 20, 20, 20), p('M4 20 Q4 12 12 12'), p('M4 20 Q4 8 16 8'), p('M4 20 Q4 4 20 4')]),
  fibSpeedResistanceArcs: def([line(4, 20, 20, 4), p('M4 20 Q4 12 12 12'), p('M4 20 Q4 6 18 6'), p('M4 20 Q4 4 20 4')]),
  fibCircles: def([dot(12, 12), circle(12, 12, 4), circle(12, 12, 7), circle(12, 12, 11)]),
  fibWedge: def([line(4, 20, 4, 6), line(4, 20, 20, 20), p('M4 6 A16 16 0 0 1 20 20')]),
  fibSpiral: def([p('M12 12 Q12 8 16 8 Q20 8 20 12 Q20 18 12 18 Q4 18 4 12 Q4 4 14 4')]),
  fibChannel: def([line(4, 18, 20, 10), line(4, 14, 20, 6), line(4, 10, 20, 2)]),
  fibTimeZone: def([line(5, 4, 5, 20), line(8, 4, 8, 20), line(11, 4, 11, 20), line(16, 4, 16, 20), line(21, 4, 21, 20)]),
  trendBasedFibTime: def([line(4, 18, 20, 6), dot(4, 18), dot(20, 6), line(8, 4, 8, 20), line(12, 4, 12, 20), line(17, 4, 17, 20)]),

  // --- Gann ---
  gannFan: def([line(3, 21, 3, 3), line(3, 21, 21, 21), line(3, 21, 21, 3), line(3, 21, 19, 9), line(3, 21, 9, 19)]),
  gannBox: def([rect(4, 4, 16, 16, 1), line(4, 4, 20, 20), line(12, 4, 12, 20), line(4, 12, 20, 12)]),
  gannSquare: def([rect(4, 4, 16, 16, 1), line(4, 4, 20, 20), line(4, 20, 20, 4)]),
  gannSquareFixed: def([rect(4, 4, 16, 16, 1), line(4, 4, 20, 20), line(4, 20, 20, 4), dot(4, 20, 2.5)]),

  // --- Pitchfork variants ---
  schiffPitchfork: def([line(8, 18, 12, 12), line(12, 12, 12, 3), line(12, 12, 5, 6), line(12, 12, 19, 6)]),
  modifiedSchiffPitchfork: def([line(5, 20, 10, 14), line(10, 14, 12, 3), line(10, 14, 4, 8), line(10, 14, 18, 8)]),
  insidePitchfork: def([line(12, 3, 12, 12), line(6, 7, 6, 21), line(18, 7, 18, 21), line(6, 12, 18, 12), line(12, 12, 12, 21)]),
  pitchfan: def([line(5, 19, 5, 5), line(5, 19, 19, 5), line(5, 19, 19, 12), line(5, 19, 19, 19)]),

  // --- Harmonic / Elliott patterns ---
  abcdPattern: def([polyline('3 18 9 7 15 18 21 7')]),
  xabcdPattern: def([polyline('2 12 6 19 11 6 16 19 22 8')]),
  cypherPattern: def([polyline('2 10 7 19 13 5 18 16 22 10')]),
  threeDrivesPattern: def([polyline('2 19 6 14 9 17 13 10 16 13 21 5')]),
  headShouldersPattern: def([polyline('2 19 5 19 7 13 9 19 12 6 15 19 17 13 19 19 22 19')]),
  elliottImpulseWave: def([polyline('2 19 6 12 9 16 13 7 17 12 21 4')]),
  elliottCorrectiveWave: def([polyline('3 8 9 18 15 11 21 18')]),
  elliottDoubleComboWave: def([polyline('2 18 5 9 9 16 13 9 17 16 21 8')]),
  elliottTripleComboWave: def([polyline('2 17 5 9 8 15 11 9 14 15 17 9 21 16')]),
  elliottTriangleWave: def([polyline('3 5 7 19 11 9 15 16 19 12')]),

  // --- Volume / VWAP ---
  anchoredVwap: def([dot(4, 12, 2), p('M6 12 C9 8 11 16 14 12 C17 8 19 14 21 12')]),
  anchoredVolumeProfile: def([line(4, 4, 4, 20), line(4, 8, 14, 8), line(4, 12, 18, 12), line(4, 16, 11, 16), line(4, 20, 16, 20)]),
  fixedRangeVolumeProfile: def([rect(3, 3, 18, 18, 1), line(6, 7, 16, 7), line(6, 11, 13, 11), line(6, 15, 18, 15), line(6, 19, 10, 19)]),

  // --- Curves / cycles ---
  curve: def([p('M4 20 Q12 4 20 12')]),
  doubleCurve: def([p('M4 18 Q12 6 20 12'), p('M4 12 Q12 0 20 6')]),
  arc: def([p('M6 18 A10 10 0 0 1 18 6'), dot(6, 18, 2), dot(18, 6, 2)]),
  polyline: def([polyline('4 18 8 10 12 15 16 7 20 12'), dot(4, 18, 1.5), dot(12, 15, 1.5), dot(20, 12, 1.5)]),
  cyclicLines: def([line(5, 4, 5, 20), line(9, 4, 9, 20), line(13, 4, 13, 20), line(17, 4, 17, 20), line(21, 4, 21, 20)]),
  timeCycles: def([line(3, 18, 21, 18), p('M3 18 A4 5 0 0 1 11 18'), p('M11 18 A4 5 0 0 1 19 18')]),
  sineLine: def([p('M3 12 C5 6 7 6 9 12 C11 18 13 18 15 12 C17 6 19 6 21 12')]),

  // --- Annotations / markers ---
  anchoredNote: def([rect(5, 3, 14, 10, 1), line(7, 6, 15, 6), line(7, 9, 13, 9), dot(19, 18, 2), line(15, 12, 19, 16)]),
  priceLabel: def([p('M7 5h12v14H7l-5-7 5-7z')]),
  priceNote: def([p('M7 5h12v14H7l-5-7 5-7z'), line(9, 9, 16, 9), line(9, 12, 14, 12)]),
  pin: def([p('M12 2a6 6 0 0 1 6 6c0 4-6 14-6 14S6 12 6 8a6 6 0 0 1 6-6z'), circle(12, 8, 2)]),
  icon: def([rect(5, 5, 14, 14, 3), p('M12 8l1.2 2.4L16 11l-2 1.9.5 2.7L12 14.4 9.5 15.6l.5-2.7L8 11l2.8-.6z')]),
  image: def([rect(3, 4, 18, 16, 2), circle(8, 9, 2), polyline('3 18 8 12 12 15 16 10 21 18')]),
  emoji: def([circle(12, 12, 9), dot(9, 10, 1.5), dot(15, 10, 1.5), p('M8 14s1.5 3 4 3 4-3 4-3')]),
  sticker: def([p('M4 4h16v10l-6 6H4z'), polyline('20 14 14 14 14 20')]),
  balloon: def([p('M4 4h16v12H13l-3 4-1-4H4z')]),
  signpost: def([line(12, 14, 12, 22), rect(4, 4, 16, 10, 1), line(7, 9, 17, 9)]),
  table: def([rect(3, 3, 18, 18, 1), line(3, 9, 21, 9), line(3, 15, 21, 15), line(9, 3, 9, 21), line(15, 3, 15, 21)]),

  // --- Shared semantic icons (reused by tools + toolbar actions) ---
  eye: def([p('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'), circle(12, 12, 3)]),
  eyeOff: def([
    p('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'),
    line(1, 1, 23, 23),
  ]),
  trash: def([polyline('3 6 5 6 21 6'), p('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2')]),
  lock: def([rect(5, 11, 14, 10, 2), p('M8 11V7a4 4 0 0 1 8 0v4')]),
  unlock: def([rect(5, 11, 14, 10, 2), p('M8 11V7a4 4 0 0 1 7.9-1')]),
  copy: def([rect(9, 9, 12, 12, 2), p('M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1')]),
  gear: def([circle(12, 12, 3), p('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z')]),
  star: def([
    { tag: 'path', attrs: { d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z' }, filled: true },
  ]),
  starOutline: def([p('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z')]),
  magnet: def([
    p('M6 15l-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15'),
    line(5, 8, 9, 12),
    line(12, 15, 16, 19),
  ]),
  pencil: def([p('M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z'), line(15, 5, 19, 9)]),
  more: def([dot(5, 12, 1.6), dot(12, 12, 1.6), dot(19, 12, 1.6)]),
  undo: def([polyline('9 14 4 9 9 4'), p('M4 9h10.5a5.5 5.5 0 0 1 0 11H9')]),
  redo: def([polyline('15 14 20 9 15 4'), p('M20 9H9.5a5.5 5.5 0 0 0 0 11H15')]),
  plus: def([line(12, 5, 12, 19), line(5, 12, 19, 12)]),
  close: def([line(18, 6, 6, 18), line(6, 6, 18, 18)]),
  arrowUp: def([line(12, 19, 12, 5), polyline('6 11 12 5 18 11')]),
  arrowDown: def([line(12, 5, 12, 19), polyline('6 13 12 19 18 13')]),
  layerForward: def([p('M8 4h12v12'), rect(4, 8, 12, 12, 1.5)]),
  layerBackward: def([rect(8, 4, 12, 12, 1.5), p('M16 20H4V8')]),
  layerFront: def([p('M9 3h12v12'), p('M15 9H3v12h12z')]),
  layerBack: def([p('M3 9h12v12H3z'), p('M9 3h12v12')]),
} satisfies Record<string, DrawingIconDefinition>;

export type DrawingIconName = keyof typeof DRAWING_ICONS;

export function getDrawingIconDefinition(name: string): DrawingIconDefinition | undefined {
  return (DRAWING_ICONS as Record<string, DrawingIconDefinition>)[name];
}

/** Toolbar actions that reuse a shared semantic icon rather than an action-named one. */
const TOOLBAR_ACTION_ICON_ALIASES: Partial<Record<UserDrawingToolbarAction, DrawingIconName>> = {
  duplicateSelected: 'copy',
  deleteSelected: 'trash',
  clearAll: 'trash',
  hideAll: 'eyeOff',
  showAll: 'eye',
  lockAll: 'lock',
  unlockAll: 'unlock',
  bringForward: 'layerForward',
  sendBackward: 'layerBackward',
  bringToFront: 'layerFront',
  sendToBack: 'layerBack',
  zoomIn: 'plus',
  cancelDraft: 'close',
  measure: 'priceRange',
};

export function resolveDrawingToolIconName(tool: UserDrawingTool): DrawingIconName | undefined {
  return tool in DRAWING_ICONS ? (tool as DrawingIconName) : undefined;
}

export function resolveDrawingToolbarActionIconName(action: UserDrawingToolbarAction): DrawingIconName | undefined {
  if (action in TOOLBAR_ACTION_ICON_ALIASES) {
    return TOOLBAR_ACTION_ICON_ALIASES[action];
  }
  return action in DRAWING_ICONS ? (action as DrawingIconName) : undefined;
}

/** Resolve the shared icon for a selected-object action surface item (web + mobile). */
export function resolveDrawingSelectedActionIconName(
  command: UserDrawingSelectedActionSurfaceCommand,
  swatchColor?: string,
): DrawingIconName | undefined {
  if (swatchColor) return undefined;
  switch (command.type) {
    case 'toolbarAction':
      return resolveDrawingToolbarActionIconName(command.action);
    case 'styleAction':
      switch (command.action) {
        case 'hideSelected':
          return 'eyeOff';
        case 'showSelected':
          return 'eye';
        case 'lockSelected':
          return 'lock';
        case 'unlockSelected':
          return 'unlock';
        default:
          return undefined;
      }
    case 'openProperties':
      return 'gear';
    case 'editText':
      return 'pencil';
    default:
      return undefined;
  }
}
