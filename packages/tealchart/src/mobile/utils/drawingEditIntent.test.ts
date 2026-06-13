import type { DrawingCoordinateSpace, UserDrawing, UserDrawingState, UserDrawingStyle } from '../../drawings';

import { describe, expect, it } from 'vitest';

import { createUserDrawingState } from '../../drawings';
import { resolveMobileUserDrawingDoubleTapEditIntent } from './drawingEditIntent';

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
  lineStyle: 'solid',
};

const space: DrawingCoordinateSpace = {
  viewport: {
    startTime: 0,
    endTime: 100,
    priceMin: 0,
    priceMax: 100,
  },
  pane: {
    id: 'main',
    top: 0,
    height: 100,
    bottom: 100,
    yMin: 0,
    yMax: 100,
  },
  chartLeft: 0,
  chartRight: 100,
};

const spacesByPaneId = new Map([[space.pane.id, space]]);

function createHorizontalLine(overrides: Partial<Extract<UserDrawing, { kind: 'horizontalLine' }>> = {}): UserDrawing {
  return {
    id: 'line',
    kind: 'horizontalLine',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    price: 50,
    ...overrides,
  };
}

function stateWith(drawings: readonly UserDrawing[], overrides: Partial<UserDrawingState> = {}): UserDrawingState {
  return createUserDrawingState({
    drawings,
    activeTool: 'select',
    ...overrides,
  });
}

describe('mobile user drawing edit intent', () => {
  it('applies double-tap selection commands and returns a properties intent', () => {
    const result = resolveMobileUserDrawingDoubleTapEditIntent(
      stateWith([createHorizontalLine()]),
      { x: 50, y: 50 },
      spacesByPaneId,
    );

    expect(result.intent.type).toBe('properties');
    expect(result.changed).toBe(true);
    expect(result.state.selection).toEqual({ drawingId: 'line', handle: undefined });
    expect(result.propertiesIntent).toMatchObject({
      type: 'properties',
      drawingId: 'line',
      selected: true,
      editable: true,
      drawing: expect.objectContaining({ id: 'line', kind: 'horizontalLine' }),
    });
  });

  it('returns pane fallback without mutating state when double-tap misses drawings', () => {
    const state = stateWith([createHorizontalLine()]);
    const result = resolveMobileUserDrawingDoubleTapEditIntent(state, { x: 2, y: 2 }, spacesByPaneId);

    expect(result.intent.type).toBe('pane');
    expect(result.changed).toBe(false);
    expect(result.state).toBe(state);
    expect(result.propertiesIntent).toBeNull();
  });
});
