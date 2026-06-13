import type { UserDrawingCommand, UserDrawingCommandSource } from './commands';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawingHitResult, UserDrawingHitTestOptions } from './hitTesting';
import type { UserDrawing, UserDrawingState, UserDrawingTextAnnotation } from './types';

import { hitTestUserDrawings } from './hitTesting';
import { isUserDrawingTextAnnotation } from './types';

export type UserDrawingEditIntentKind = 'text' | 'properties' | 'point' | 'pane';

export type UserDrawingEditIntent =
  | {
      type: 'text';
      drawingId: string;
      drawing: UserDrawingTextAnnotation;
      hit: UserDrawingHitResult;
      commands: readonly UserDrawingCommand[];
    }
  | {
      type: 'properties';
      drawingId: string;
      drawing: UserDrawing;
      hit: UserDrawingHitResult;
      commands: readonly UserDrawingCommand[];
    }
  | {
      type: 'point';
      drawingId: string;
      hit: UserDrawingHitResult;
      commands: readonly UserDrawingCommand[];
    }
  | {
      type: 'pane';
      commands: readonly UserDrawingCommand[];
    };

export interface ResolveUserDrawingEditIntentOptions {
  hitTest?: UserDrawingHitTestOptions;
  source?: Extract<UserDrawingCommandSource, 'pointer' | 'touch' | 'api'>;
}

export interface UserDrawingPropertiesIntent {
  type: 'properties';
  drawingId: string;
  drawing: UserDrawing;
  selected: boolean;
  editable: boolean;
}

export interface ResolveUserDrawingPropertiesIntentOptions {
  drawingId?: string;
}

export function resolveUserDrawingPropertiesIntent(
  state: UserDrawingState,
  options: ResolveUserDrawingPropertiesIntentOptions = {},
): UserDrawingPropertiesIntent | null {
  const drawingId = options.drawingId ?? state.selection?.drawingId;
  if (!drawingId) return null;

  const drawing = state.drawings.find((candidate) => candidate.id === drawingId);
  if (!drawing) return null;

  const selectedIds = state.selection?.drawingIds ?? (state.selection ? [state.selection.drawingId] : []);
  return {
    type: 'properties',
    drawingId,
    drawing,
    selected: selectedIds.includes(drawingId),
    editable: !drawing.locked,
  };
}

export function resolveUserDrawingEditIntentAtPoint(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: ResolveUserDrawingEditIntentOptions = {},
): UserDrawingEditIntent {
  if (state.activeTool !== 'select') return { type: 'pane', commands: [] };

  const hit = hitTestUserDrawings(state.drawings, point, spacesByPaneId, options.hitTest);
  if (!hit) return { type: 'pane', commands: [] };

  const source = options.source ?? 'api';
  const selectCommand: UserDrawingCommand = {
    type: 'selectAtPoint',
    point,
    spacesByPaneId,
    options: { hitTest: options.hitTest },
    meta: { source },
  };
  const commands: UserDrawingCommand[] = [selectCommand];

  if (isUserDrawingTextAnnotation(hit.drawing) && !hit.drawing.locked) {
    commands.push({
      type: 'beginTextEdit',
      drawingId: hit.drawing.id,
      meta: { source },
    });
    return {
      type: 'text',
      drawingId: hit.drawing.id,
      drawing: hit.drawing,
      hit,
      commands,
    };
  }

  if (hit.handle || hit.pointIndex !== undefined) {
    return {
      type: 'point',
      drawingId: hit.drawing.id,
      hit,
      commands,
    };
  }

  return {
    type: 'properties',
    drawingId: hit.drawing.id,
    drawing: hit.drawing,
    hit,
    commands,
  };
}
