import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawing, UserDrawingState, UserDrawingStyle, UserDrawingTextAnnotationKind } from './types';

import { describe, expect, it } from 'vitest';

import { createUserDrawingState } from './input';
import { resolveUserDrawingEditIntentAtPoint, resolveUserDrawingPropertiesIntent } from './editIntent';

const style: UserDrawingStyle = {
  lineColor: '#f5c542',
  lineWidth: 2,
  lineStyle: 'solid',
  textColor: '#ffffff',
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

function createText(overrides: Partial<Extract<UserDrawing, { kind: 'textLabel' }>> = {}): UserDrawing {
  return {
    id: 'label',
    kind: 'textLabel',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    point: { time: 50, price: 50 },
    text: 'Note',
    textAlign: 'center',
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

function createRectangle(overrides: Partial<Extract<UserDrawing, { kind: 'rectangle' }>> = {}): UserDrawing {
  return {
    id: 'rect',
    kind: 'rectangle',
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 1,
    updatedAt: 1,
    style,
    points: [
      { time: 25, price: 75 },
      { time: 75, price: 25 },
    ],
    ...overrides,
  };
}

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

describe('user drawing edit intent', () => {
  it('resolves editable text hits to select and begin text edit commands', () => {
    const intent = resolveUserDrawingEditIntentAtPoint(stateWith([createText()]), { x: 50, y: 50 }, spacesByPaneId, {
      source: 'pointer',
      hitTest: { labelWidth: 48, labelHeight: 20 },
    });

    expect(intent.type).toBe('text');
    expect(intent.commands.map((command) => command.type)).toEqual(['selectAtPoint', 'beginTextEdit']);
    expect(intent.commands[0]).toMatchObject({ meta: { source: 'pointer' } });
    expect(intent.commands[1]).toMatchObject({ drawingId: 'label', meta: { source: 'pointer' } });
  });

  it('resolves every text annotation kind to text edit intent', () => {
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
      const intent = resolveUserDrawingEditIntentAtPoint(
        stateWith([createTextAnnotation(kind)]),
        textHitPoint(kind),
        spacesByPaneId,
        {
          source: 'pointer',
          hitTest: {
            labelWidth: 64,
            labelHeight: 24,
            measureTextLabelLine: (_drawing, line) => line.length * 7,
          },
        },
      );

      expect(intent.type, kind).toBe('text');
      if (intent.type === 'text') {
        expect(intent.drawing.kind).toBe(kind);
        expect(intent.commands.map((command) => command.type)).toEqual(['selectAtPoint', 'beginTextEdit']);
        expect(intent.commands[1]).toMatchObject({ drawingId: kind, meta: { source: 'pointer' } });
      }
    }
  });

  it('resolves non-text drawing body hits to properties intent', () => {
    const intent = resolveUserDrawingEditIntentAtPoint(stateWith([createHorizontalLine()]), { x: 50, y: 50 }, spacesByPaneId);

    expect(intent.type).toBe('properties');
    if (intent.type === 'properties') {
      expect(intent.drawing).toMatchObject({ id: 'line', kind: 'horizontalLine' });
    }
    expect(intent.commands.map((command) => command.type)).toEqual(['selectAtPoint']);
    expect(intent.commands[0]).toMatchObject({ meta: { source: 'api' } });
  });

  it('resolves handle hits separately from body properties hits', () => {
    const intent = resolveUserDrawingEditIntentAtPoint(stateWith([createRectangle()]), { x: 25, y: 25 }, spacesByPaneId);

    expect(intent.type).toBe('point');
    expect(intent.commands.map((command) => command.type)).toEqual(['selectAtPoint']);
  });

  it('falls back to pane behavior outside select mode, on misses, and for invisible drawings', () => {
    expect(
      resolveUserDrawingEditIntentAtPoint(
        stateWith([createText()], { activeTool: 'rectangle' }),
        { x: 50, y: 50 },
        spacesByPaneId,
      ).type,
    ).toBe('pane');
    expect(resolveUserDrawingEditIntentAtPoint(stateWith([createText()]), { x: 2, y: 2 }, spacesByPaneId).type).toBe('pane');
    expect(
      resolveUserDrawingEditIntentAtPoint(stateWith([createText({ visible: false })]), { x: 50, y: 50 }, spacesByPaneId).type,
    ).toBe('pane');
  });

  it('falls back to pane behavior for locked text drawings under default hit testing', () => {
    const intent = resolveUserDrawingEditIntentAtPoint(stateWith([createText({ locked: true })]), { x: 50, y: 50 }, spacesByPaneId, {
      hitTest: { labelWidth: 48, labelHeight: 20 },
    });

    expect(intent.type).toBe('pane');
    expect(intent.commands).toEqual([]);
  });

  it('resolves selected drawing properties intent', () => {
    const intent = resolveUserDrawingPropertiesIntent(
      stateWith([createHorizontalLine(), createRectangle()], { selection: { drawingId: 'line' } }),
    );

    expect(intent).toMatchObject({
      type: 'properties',
      drawingId: 'line',
      selected: true,
      editable: true,
      drawing: expect.objectContaining({ id: 'line', kind: 'horizontalLine' }),
    });
  });

  it('resolves explicit drawing properties intent independently from selection', () => {
    const intent = resolveUserDrawingPropertiesIntent(
      stateWith([createHorizontalLine(), createRectangle()], { selection: { drawingId: 'line' } }),
      { drawingId: 'rect' },
    );

    expect(intent).toMatchObject({
      drawingId: 'rect',
      selected: false,
      editable: true,
      drawing: expect.objectContaining({ id: 'rect', kind: 'rectangle' }),
    });
  });

  it('marks locked drawing properties intent as read-only', () => {
    const intent = resolveUserDrawingPropertiesIntent(
      stateWith([createRectangle({ locked: true })], { selection: { drawingId: 'rect' } }),
    );

    expect(intent).toMatchObject({
      drawingId: 'rect',
      selected: true,
      editable: false,
    });
  });

  it('returns null for missing properties targets', () => {
    expect(resolveUserDrawingPropertiesIntent(stateWith([createRectangle()]))).toBeNull();
    expect(resolveUserDrawingPropertiesIntent(stateWith([createRectangle()]), { drawingId: 'missing' })).toBeNull();
  });
});
