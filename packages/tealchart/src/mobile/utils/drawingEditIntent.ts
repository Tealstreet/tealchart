import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  ResolveUserDrawingEditIntentOptions,
  UserDrawingEditIntent,
  UserDrawingPropertiesIntent,
  UserDrawingState,
} from '../../drawings';

import {
  dispatchUserDrawingCommand,
  resolveUserDrawingEditIntentAtPoint,
  resolveUserDrawingPropertiesIntent,
} from '../../drawings';

export interface ResolveMobileUserDrawingDoubleTapEditIntentResult {
  intent: UserDrawingEditIntent;
  state: UserDrawingState;
  changed: boolean;
  propertiesIntent: UserDrawingPropertiesIntent | null;
}

export function resolveMobileUserDrawingDoubleTapEditIntent(
  state: UserDrawingState,
  point: DrawingScreenPoint,
  spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  options: ResolveUserDrawingEditIntentOptions = {},
): ResolveMobileUserDrawingDoubleTapEditIntentResult {
  const intent = resolveUserDrawingEditIntentAtPoint(state, point, spacesByPaneId, {
    ...options,
    source: options.source ?? 'touch',
  });

  if (intent.type === 'pane') {
    return {
      intent,
      state,
      changed: false,
      propertiesIntent: null,
    };
  }

  let nextState = state;
  let changed = false;
  for (const command of intent.commands) {
    const result = dispatchUserDrawingCommand(nextState, command);
    nextState = result.state;
    changed = result.changed || changed;
  }

  return {
    intent,
    state: nextState,
    changed,
    propertiesIntent:
      intent.type === 'properties' ? resolveUserDrawingPropertiesIntent(nextState, { drawingId: intent.drawingId }) : null,
  };
}
