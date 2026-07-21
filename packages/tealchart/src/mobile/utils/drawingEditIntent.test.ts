import type {
  DrawingCoordinateSpace,
  UserDrawing,
  UserDrawingState,
  UserDrawingStyle,
  UserDrawingTextAnnotationKind,
} from '../../drawings';

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

function createTextAnnotation(kind: UserDrawingTextAnnotationKind): UserDrawing {
  const base = {
    id: kind,
    kind,
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    text: 'Note',
    textAlign: 'center' as const,
  };

  if (kind === 'anchoredText' || kind === 'anchoredNote') {
    return {
      ...base,
      position: { x: 0.5, y: 0.5 },
    } as UserDrawing;
  }

  if (kind === 'callout' || kind === 'priceNote') {
    return {
      ...base,
      points: [
        { time: 35, price: 65 },
        { time: 50, price: 50 },
      ],
    } as UserDrawing;
  }

  return {
    ...base,
    point: { time: 50, price: 50 },
  } as UserDrawing;
}

function textHitPoint(kind: UserDrawingTextAnnotationKind): { x: number; y: number } {
  return kind === 'balloon' ? { x: 50, y: 25 } : { x: 50, y: 50 };
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

  it('applies double-tap text edit intent for every text annotation kind', () => {
    const kinds: UserDrawingTextAnnotationKind[] = [
      'textLabel',
      'note',
      'callout',
      'comment',
      'anchoredText',
      'anchoredNote',
      'priceLabel',
      'priceNote',
      'emoji',
      'sticker',
      'balloon',
      'signpost',
    ];

    for (const kind of kinds) {
      const result = resolveMobileUserDrawingDoubleTapEditIntent(
        stateWith([createTextAnnotation(kind)]),
        textHitPoint(kind),
        spacesByPaneId,
        {
          hitTest: {
            labelWidth: 64,
            labelHeight: 24,
            measureTextLabelLine: (_drawing, line) => line.length * 7,
          },
        },
      );

      expect(result.intent.type, kind).toBe('text');
      expect(result.changed, kind).toBe(true);
      expect(result.propertiesIntent, kind).toBeNull();
      expect(result.state.selection, kind).toEqual({ drawingId: kind });
      expect(result.state.textEdit, kind).toMatchObject({ drawingId: kind, value: 'Note' });
    }
  });

  it('returns pane fallback without mutating state when double-tap misses drawings', () => {
    const state = stateWith([createHorizontalLine()]);
    const result = resolveMobileUserDrawingDoubleTapEditIntent(state, { x: 2, y: 2 }, spacesByPaneId);

    expect(result.intent.type).toBe('pane');
    expect(result.changed).toBe(false);
    expect(result.state).toBe(state);
    expect(result.propertiesIntent).toBeNull();
  });

  it('keeps locked text double-tap aligned with shared pane fallback behavior', () => {
    const state = stateWith([createTextAnnotation('textLabel')]);
    const lockedState = {
      ...state,
      drawings: state.drawings.map((drawing) => ({ ...drawing, locked: true })),
    };
    const result = resolveMobileUserDrawingDoubleTapEditIntent(lockedState, { x: 50, y: 50 }, spacesByPaneId, {
      hitTest: { labelWidth: 64, labelHeight: 24 },
    });

    expect(result.intent.type).toBe('pane');
    expect(result.changed).toBe(false);
    expect(result.state).toBe(lockedState);
    expect(result.propertiesIntent).toBeNull();
  });
});
