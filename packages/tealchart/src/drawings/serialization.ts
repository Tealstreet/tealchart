import type { UserDrawing, UserDrawingState } from './types';

import { createUserDrawingState } from './input';

function cloneUserDrawing(drawing: UserDrawing): UserDrawing {
  switch (drawing.kind) {
    case 'trendLine':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'ray':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'rectangle':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        points: [{ ...drawing.points[0] }, { ...drawing.points[1] }],
      };
    case 'horizontalLine':
    case 'verticalLine':
      return {
        ...drawing,
        style: { ...drawing.style },
      };
    case 'textLabel':
      return {
        ...drawing,
        style: { ...drawing.style },
        kind: drawing.kind,
        point: { ...drawing.point },
      };
  }
}

export function serializeUserDrawingStateForLayout(state?: UserDrawingState | null): UserDrawingState | undefined {
  if (!state || state.drawings.length === 0) return undefined;

  return createUserDrawingState({
    version: state.version,
    drawings: state.drawings.map(cloneUserDrawing),
  });
}

export function deserializeUserDrawingStateFromLayout(state?: UserDrawingState | null): UserDrawingState | undefined {
  return serializeUserDrawingStateForLayout(state);
}

export function isUserDrawingLayoutStateEqual(
  previous?: UserDrawingState | null,
  next?: UserDrawingState | null,
): boolean {
  return (
    JSON.stringify(serializeUserDrawingStateForLayout(previous) ?? null) ===
    JSON.stringify(serializeUserDrawingStateForLayout(next) ?? null)
  );
}
