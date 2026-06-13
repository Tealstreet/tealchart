import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  ResolveUserDrawingEditIntentOptions,
  UserDrawingEditIntent,
  UserDrawingCommandEvent,
  UserDrawingPropertiesIntent,
  UserDrawingState,
} from '../../drawings';

import {
  dispatchUserDrawingCommand,
  createUserDrawingCommandEvent,
  resolveUserDrawingEditIntentAtPoint,
  resolveUserDrawingPropertiesIntent,
} from '../../drawings';

export interface ResolveMobileUserDrawingDoubleTapEditIntentResult {
  intent: UserDrawingEditIntent;
  state: UserDrawingState;
  changed: boolean;
  events: readonly UserDrawingCommandEvent[];
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
      events: [],
      propertiesIntent: null,
    };
  }

  let nextState = state;
  let changed = false;
  const events: UserDrawingCommandEvent[] = [];
  for (const command of intent.commands) {
    const previousState = nextState;
    const result = dispatchUserDrawingCommand(nextState, command);
    nextState = result.state;
    changed = result.changed || changed;
    const event = createUserDrawingCommandEvent(previousState, result);
    if (event) {
      events.push(event);
    }
  }

  return {
    intent,
    state: nextState,
    changed,
    events,
    propertiesIntent:
      intent.type === 'properties' ? resolveUserDrawingPropertiesIntent(nextState, { drawingId: intent.drawingId }) : null,
  };
}
