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
      start: DrawingScreenPoint;
      end: DrawingScreenPoint;
      style: UserDrawingStyle;
    }
  | {
      kind: 'rectangle';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      rect: { x: number; y: number; width: number; height: number };
      style: UserDrawingStyle;
    }
  | {
      kind: 'textLabel';
      id: string;
      phase: UserDrawingRenderPhase;
      selected: boolean;
      point: DrawingScreenPoint;
      text: string;
      style: UserDrawingStyle;
    }
  | {
      kind: 'handle';
      id: string;
      drawingId: string;
      point: DrawingScreenPoint;
      strokeColor: string;
      fillColor: string;
      radius: number;
    };

export interface ResolveMobileUserDrawingRenderModelOptions extends ResolveUserDrawingRenderEntriesOptions {
  handleRadius?: number;
}

const DEFAULT_HANDLE_RADIUS = 4;

function primitiveFromGeometry(
  geometry: ResolvedUserDrawingGeometry,
  phase: UserDrawingRenderPhase,
  selected: boolean,
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
        point: geometry.point,
        text: drawing.text,
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

  for (const entry of entries) {
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;
    primitives.push(primitiveFromGeometry(resolveUserDrawingGeometry(entry.drawing, space), entry.phase, entry.selected));
  }

  for (const entry of entries) {
    if (!entry.selected) continue;
    const space = spacesByPaneId.get(entry.drawing.paneId);
    if (!space) continue;

    for (const [index, point] of resolveUserDrawingHandlePoints(entry.drawing, space).entries()) {
      primitives.push({
        kind: 'handle',
        id: `${entry.drawing.id}:handle:${index}`,
        drawingId: entry.drawing.id,
        point,
        strokeColor: entry.drawing.style.lineColor,
        fillColor: '#ffffff',
        radius: options.handleRadius ?? DEFAULT_HANDLE_RADIUS,
      });
    }
  }

  return primitives;
}
