import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  ResolvedUserDrawingGeometry,
  ResolveUserDrawingRenderEntriesOptions,
  UserDrawingRenderPhase,
  UserDrawingState,
  UserDrawingStyle,
  TextLabelDrawing,
} from '../../drawings';

import { resolveDrawingArrowHead } from '../../drawings/arrowGeometry';
import {
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  normalizeUserDrawingOpacity,
  resolveUserDrawingInfoLineMetrics,
  resolveUserDrawingDateRangeMetrics,
  resolveUserDrawingVisualPriceRangeMetrics,
  resolveUserDrawingTextLabelLayout,
  resolveUserDrawingGeometry,
  resolveUserDrawingHandlePoints,
  resolveUserDrawingRenderEntries,
  splitUserDrawingTextLines,
} from '../../drawings';

export type MobileUserDrawingPrimitive =
  | {
      kind: 'line';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      arrowHead: {
        left: DrawingScreenPoint;
        right: DrawingScreenPoint;
      } | null;
      style: UserDrawingStyle;
    }
  | {
      kind: 'infoLine';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'arrowMarker';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'arrowMark';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'rectangle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'circle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      radius: number;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'ellipse';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      center: DrawingScreenPoint;
      radiusX: number;
      radiusY: number;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'path';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'triangle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'parallelChannel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      points: readonly DrawingScreenPoint[];
      base: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      parallel: { start: DrawingScreenPoint; end: DrawingScreenPoint };
      style: UserDrawingStyle;
    }
  | {
      kind: 'priceRange';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'dateRange';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      rect: { x: number; y: number; width: number; height: number };
      labelPoint: DrawingScreenPoint;
      label: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'fibRetracement' | 'fibExtension';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      levels: readonly {
        ratio: number;
        label: string;
        price: number;
        start: DrawingScreenPoint;
        end: DrawingScreenPoint;
      }[];
      style: UserDrawingStyle;
    }
  | {
      kind: 'textLabel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      opacity: number;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      text: string;
      editing: boolean;
      editValue: string | null;
      textAlign: TextLabelDrawing['textAlign'];
      style: UserDrawingStyle;
    }
  | {
      kind: 'handle';
      id: string;
      drawingId: string;
      clip: MobileUserDrawingClipRect;
      point: DrawingScreenPoint;
      strokeColor: string;
      fillColor: string;
      radius: number;
    };

export type MobileUserDrawingTextLabelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'textLabel' }>;
export type MobileUserDrawingPriceRangePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'priceRange' }>;
export type MobileUserDrawingPathPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'path' }>;
export type MobileUserDrawingTrianglePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'triangle' }>;
export type MobileUserDrawingParallelChannelPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'parallelChannel' }>;
export type MobileUserDrawingFibRetracementPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibRetracement' }>;
export type MobileUserDrawingFibExtensionPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'fibExtension' }>;
export type MobileUserDrawingArrowMarkerPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arrowMarker' }>;
export type MobileUserDrawingArrowMarkPrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'arrowMark' }>;
export type MobileUserDrawingCirclePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'circle' }>;
export type MobileUserDrawingEllipsePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'ellipse' }>;
export type MobileUserDrawingInfoLinePrimitive = Extract<MobileUserDrawingPrimitive, { kind: 'infoLine' }>;
export type MobileUserDrawingMeasurementLabelPrimitive = Extract<
  MobileUserDrawingPrimitive,
  { kind: 'priceRange' | 'dateRange' }
>;

export interface MobileUserDrawingTextLabelLayout {
  fontSize: number;
  fontFamily: string;
  labelPadding: number;
  labelHeight: number;
  box: { x: number; y: number; width: number; height: number };
  text: { x: number; y: number };
  lines: readonly { text: string; width: number; x: number; y: number }[];
}

export interface MobileUserDrawingPriceRangeLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingInfoLineLabelPosition {
  fontSize: number;
  fontFamily: string;
  x: number;
  y: number;
}

export interface MobileUserDrawingTextBounds {
  x?: number;
  y?: number;
  width: number;
  height?: number;
}

export interface ResolveMobileUserDrawingRenderModelOptions extends ResolveUserDrawingRenderEntriesOptions {
  handleRadius?: number;
  draftOpacity?: number;
}

export interface MobileUserDrawingClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_HANDLE_RADIUS = 4;
const DEFAULT_DRAFT_OPACITY = 0.65;
const DEFAULT_TEXT_LABEL_PADDING = 6;
const DEFAULT_TEXT_LABEL_HEIGHT = 20;

function clipRectFromSpace(space: DrawingCoordinateSpace): MobileUserDrawingClipRect {
  return {
    x: space.chartLeft,
    y: space.pane.top,
    width: space.chartRight - space.chartLeft,
    height: space.pane.height,
  };
}

function primitiveFromGeometry(
  geometry: ResolvedUserDrawingGeometry,
  clip: MobileUserDrawingClipRect,
  phase: UserDrawingRenderPhase,
  selected: boolean,
  opacity: number,
  textEditValue?: string | null,
): MobileUserDrawingPrimitive {
  switch (geometry.kind) {
    case 'line':
    case 'ray':
    case 'horizontalRay':
    case 'horizontalLine':
    case 'verticalLine': {
      return {
        kind: 'line',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
        arrowHead: null,
        style: geometry.drawing.style,
      };
    }
    case 'arrowLine': {
      const arrowHead =
        resolveDrawingArrowHead(geometry.segment, {
          size: Math.max(10, geometry.drawing.style.lineWidth * 5),
        });
      return {
        kind: 'line',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
        arrowHead: arrowHead ? { left: arrowHead.left, right: arrowHead.right } : null,
        style: geometry.drawing.style,
      };
    }
    case 'infoLine': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'infoLine' ? resolveUserDrawingInfoLineMetrics(drawing.points[0], drawing.points[1]).label : '';
      return {
        kind: 'infoLine',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
        labelPoint: {
          x: (geometry.segment.start.x + geometry.segment.end.x) / 2,
          y: (geometry.segment.start.y + geometry.segment.end.y) / 2 - 4,
        },
        label,
        style: geometry.drawing.style,
      };
    }
    case 'arrowMarker':
      return {
        kind: 'arrowMarker',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.marker.points,
        style: geometry.drawing.style,
      };
    case 'arrowMark':
      return {
        kind: 'arrowMark',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.mark.points,
        style: geometry.drawing.style,
      };
    case 'rectangle':
      return {
        kind: 'rectangle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        style: geometry.drawing.style,
      };
    case 'circle':
      return {
        kind: 'circle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.circle.center,
        radius: geometry.circle.radius,
        rect: geometry.circle.rect,
        style: geometry.drawing.style,
      };
    case 'ellipse':
      return {
        kind: 'ellipse',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        center: geometry.ellipse.center,
        radiusX: geometry.ellipse.radiusX,
        radiusY: geometry.ellipse.radiusY,
        rect: geometry.ellipse.rect,
        style: geometry.drawing.style,
      };
    case 'path':
      return {
        kind: 'path',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.polyline.points,
        style: geometry.drawing.style,
      };
    case 'triangle':
      return {
        kind: 'triangle',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.polygon.points,
        style: geometry.drawing.style,
      };
    case 'parallelChannel':
      return {
        kind: 'parallelChannel',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        points: geometry.channel.polygon.points,
        base: geometry.channel.base,
        parallel: geometry.channel.parallel,
        style: geometry.drawing.style,
      };
    case 'priceRange': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'priceRange'
          ? resolveUserDrawingVisualPriceRangeMetrics(drawing.points[0], drawing.points[1]).label
          : '';
      return {
        kind: 'priceRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        labelPoint: {
          x: geometry.rect.x + geometry.rect.width / 2,
          y: geometry.rect.y + geometry.rect.height / 2,
        },
        label,
        style: geometry.drawing.style,
      };
    }
    case 'dateRange': {
      const drawing = geometry.drawing;
      const label =
        drawing.kind === 'dateRange' ? resolveUserDrawingDateRangeMetrics(drawing.points[0], drawing.points[1]).label : '';
      return {
        kind: 'dateRange',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        rect: geometry.rect,
        labelPoint: {
          x: geometry.rect.x + geometry.rect.width / 2,
          y: geometry.rect.y + geometry.rect.height / 2,
        },
        label,
        style: geometry.drawing.style,
      };
    }
    case 'fibRetracement':
    case 'fibExtension':
      return {
        kind: geometry.kind,
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        levels: geometry.fib.levels.map((level) => ({
          ratio: level.ratio,
          label: `${level.label} ${level.price.toFixed(2)}`,
          price: level.price,
          start: level.segment.start,
          end: level.segment.end,
        })),
        style: geometry.drawing.style,
      };
    case 'textLabel':
      const drawing = geometry.drawing as TextLabelDrawing;
      return {
        kind: 'textLabel',
        id: drawing.id,
        phase,
        selected,
        opacity,
        clip,
        point: geometry.point,
        text: drawing.text,
        editing: textEditValue !== undefined,
        editValue: textEditValue ?? null,
        textAlign: drawing.textAlign,
        style: drawing.style,
      };
  }
}

export function resolveMobileUserDrawingRenderModel(
  state: UserDrawingState,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: ResolveMobileUserDrawingRenderModelOptions = {},
): MobileUserDrawingPrimitive[] {
  const entries = resolveUserDrawingRenderEntries(state, options);
  const primitives: MobileUserDrawingPrimitive[] = [];
  const draftOpacity = options.draftOpacity ?? DEFAULT_DRAFT_OPACITY;

  for (const entry of entries) {
    if (!entry.drawing.visible) continue;
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;
    const clip = clipRectFromSpace(space);
    const textEditValue = state.textEdit?.drawingId === entry.drawing.id ? state.textEdit.value : undefined;
    primitives.push(
      primitiveFromGeometry(
        resolveUserDrawingGeometry(entry.drawing, space),
        clip,
        entry.phase,
        entry.selected,
        normalizeUserDrawingOpacity(entry.drawing.style.opacity ?? 1) * (entry.phase === 'draft' ? draftOpacity : 1),
        textEditValue,
      ),
    );
  }

  for (const entry of entries) {
    if (!entry.selected || !entry.drawing.visible) continue;
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;
    const clip = clipRectFromSpace(space);

    for (const [index, point] of resolveUserDrawingHandlePoints(entry.drawing, space).entries()) {
      primitives.push({
        kind: 'handle',
        id: `${entry.drawing.id}:handle:${index}`,
        drawingId: entry.drawing.id,
        clip,
        point,
        strokeColor: entry.drawing.style.lineColor,
        fillColor: '#ffffff',
        radius: options.handleRadius ?? DEFAULT_HANDLE_RADIUS,
      });
    }
  }

  return primitives;
}

export function resolveMobileUserDrawingTextLabelLayout(
  primitive: MobileUserDrawingTextLabelPrimitive,
  measuredTextWidth: number | readonly number[],
  options: {
    labelPadding?: number;
    labelHeight?: number;
  } = {},
): MobileUserDrawingTextLabelLayout {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const labelPadding = options.labelPadding ?? DEFAULT_TEXT_LABEL_PADDING;
  const labelHeight = options.labelHeight ?? DEFAULT_TEXT_LABEL_HEIGHT;
  const lines = splitUserDrawingTextLines(primitive.text);
  const lineWidths = Array.isArray(measuredTextWidth) ? measuredTextWidth : lines.map(() => measuredTextWidth);
  const layout = resolveUserDrawingTextLabelLayout({
    text: primitive.text,
    point: primitive.point,
    textAlign: primitive.textAlign,
    lineWidths,
    labelPadding,
    lineHeight: Math.max(1, labelHeight - 2),
  });
  const firstLine = layout.lines[0] ?? { x: primitive.point.x, y: primitive.point.y };

  return {
    fontSize,
    fontFamily,
    labelPadding,
    labelHeight: layout.box.height,
    box: layout.box,
    text: { x: firstLine.x, y: firstLine.y },
    lines: layout.lines,
  };
}

export function resolveMobileUserDrawingPriceRangeLabelPosition(
  primitive: MobileUserDrawingMeasurementLabelPrimitive,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingPriceRangeLabelPosition {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const textX = measuredTextBounds.x ?? 0;
  const textY = measuredTextBounds.y ?? -fontSize;
  const textHeight = measuredTextBounds.height ?? fontSize;

  return {
    fontSize,
    fontFamily,
    x: primitive.labelPoint.x - textX - measuredTextBounds.width / 2,
    y: primitive.labelPoint.y - textY - textHeight / 2,
  };
}

export function resolveMobileUserDrawingInfoLineLabelPosition(
  primitive: MobileUserDrawingInfoLinePrimitive,
  measuredTextBounds: MobileUserDrawingTextBounds,
): MobileUserDrawingInfoLineLabelPosition {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const fontFamily = normalizeUserDrawingFontFamily(primitive.style.fontFamily ?? 'sans-serif');
  const textX = measuredTextBounds.x ?? 0;
  const textY = measuredTextBounds.y ?? -fontSize;
  const textHeight = measuredTextBounds.height ?? fontSize;

  return {
    fontSize,
    fontFamily,
    x: primitive.labelPoint.x - textX - measuredTextBounds.width / 2,
    y: primitive.labelPoint.y - textY - textHeight,
  };
}
