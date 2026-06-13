import type { UserDrawingCommand, UserDrawingCommandSource } from './commands';
import type { DrawingCoordinateSpace, DrawingScreenPoint } from './coordinates';
import type { UserDrawingHitResult, UserDrawingHitTestOptions } from './hitTesting';
import type { UserDrawingState, UserDrawingTextAnnotation } from './types';

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
    hit,
    commands,
  };
}
