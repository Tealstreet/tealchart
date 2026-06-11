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

import {
  normalizeUserDrawingFontSize,
  resolveUserDrawingGeometry,
  resolveUserDrawingHandlePoints,
  resolveUserDrawingRenderEntries,
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

export interface MobileUserDrawingTextLabelLayout {
  fontSize: number;
  labelPadding: number;
  labelHeight: number;
  box: { x: number; y: number; width: number; height: number };
  text: { x: number; y: number };
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
    case 'horizontalLine':
    case 'verticalLine':
      return {
        kind: 'line',
        id: geometry.drawing.id,
        phase,
        selected,
        opacity,
        clip,
        start: geometry.segment.start,
        end: geometry.segment.end,
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
        entry.phase === 'draft' ? draftOpacity : 1,
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
  measuredTextWidth: number,
  options: {
    labelPadding?: number;
    labelHeight?: number;
  } = {},
): MobileUserDrawingTextLabelLayout {
  const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
  const labelPadding = options.labelPadding ?? DEFAULT_TEXT_LABEL_PADDING;
  const labelHeight = options.labelHeight ?? DEFAULT_TEXT_LABEL_HEIGHT;
  const width = Math.ceil(measuredTextWidth + labelPadding * 2);
  const height = labelHeight;
  const x = primitive.point.x - width / 2;
  const y = primitive.point.y - height / 2;
  const textX =
    primitive.textAlign === 'left'
      ? x + labelPadding
      : primitive.textAlign === 'right'
        ? x + width - labelPadding - measuredTextWidth
        : primitive.point.x - measuredTextWidth / 2;

  return {
    fontSize,
    labelPadding,
    labelHeight,
    box: { x, y, width, height },
    text: { x: textX, y: primitive.point.y },
  };
}
