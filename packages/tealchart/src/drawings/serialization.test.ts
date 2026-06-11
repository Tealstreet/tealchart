import { describe, expect, it } from 'vitest';

import { createUserDrawingState } from './input';
import {
  deserializeUserDrawingStateFromLayout,
  isUserDrawingLayoutStateEqual,
  serializeUserDrawingStateForLayout,
} from './serialization';
import type { UserDrawingState } from './types';

function createStateWithTransientFields(): UserDrawingState {
  const drawing = {
    id: 'trend_1',
    kind: 'trendLine' as const,
    paneId: 'main',
    visible: true,
    locked: false,
    createdAt: 100,
    updatedAt: 200,
    style: {
      lineColor: '#ffcc00',
      lineWidth: 2,
      lineStyle: 'dashed' as const,
      opacity: 0.75,
      lineVisible: false,
      fillVisible: true,
    },
    points: [
      { time: 1000, price: 10 },
      { time: 2000, price: 20 },
    ] as const,
    extend: 'none' as const,
  };

  return createUserDrawingState({
    drawings: [drawing],
    activeTool: 'rectangle',
    selection: { drawingId: drawing.id, handle: 'start' },
    draft: {
      tool: 'rectangle',
      paneId: 'main',
      anchors: [{ time: 3000, price: 30 }],
      style: drawing.style,
      startedAt: 300,
    },
    textEdit: {
      drawingId: drawing.id,
      value: 'draft text',
      originalValue: '',
      startedAt: 400,
    },
  });
}

describe('drawing layout serialization', () => {
  it('persists committed drawings and clears transient editing state', () => {
    const persisted = serializeUserDrawingStateForLayout(createStateWithTransientFields());

    expect(persisted?.drawings).toHaveLength(1);
    expect(persisted?.drawings[0]?.id).toBe('trend_1');
    expect(persisted?.activeTool).toBe('select');
    expect(persisted?.selection).toBeNull();
    expect(persisted?.draft).toBeNull();
    expect(persisted?.textEdit).toBeNull();
  });

  it('returns undefined when there are no committed drawings', () => {
    expect(serializeUserDrawingStateForLayout(createUserDrawingState())).toBeUndefined();
  });

  it('deserializes through the same idle persisted state contract', () => {
    const restored = deserializeUserDrawingStateFromLayout(createStateWithTransientFields());

    expect(restored?.drawings).toHaveLength(1);
    expect(restored?.activeTool).toBe('select');
    expect(restored?.selection).toBeNull();
  });

  it('ignores malformed layout payloads without throwing', () => {
    expect(deserializeUserDrawingStateFromLayout({ drawings: 'not-an-array' })).toBeUndefined();
    expect(
      deserializeUserDrawingStateFromLayout({
        version: 1,
        drawings: [
          null,
          { kind: 'futureTool', id: 'future' },
          {
            id: 'broken',
            kind: 'trendLine',
            paneId: 'main',
            visible: true,
            locked: false,
            createdAt: 1,
            updatedAt: 1,
            style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
            points: [{ time: 1, price: 10 }],
            extend: 'none',
          },
        ],
      }),
    ).toBeUndefined();
  });

  it('filters invalid drawings while restoring valid layout payloads', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'rectangle',
      selection: { drawingId: 'valid' },
      drawings: [
        {
          id: 'invalid',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'unknown' },
          price: 10,
        },
        {
          id: 'valid',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored',
          textAlign: 'unexpected',
        },
      ],
    });

    expect(restored?.drawings).toEqual([
      expect.objectContaining({
        id: 'valid',
        kind: 'textLabel',
        textAlign: 'center',
      }),
    ]);
    expect(restored?.selection).toBeNull();
  });

  it('preserves restored multiline text labels', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
          point: { time: 1, price: 10 },
          text: 'Restored\nSecond line',
          textAlign: 'center',
        },
      ],
    });

    expect(restored?.drawings[0]).toMatchObject({
      kind: 'textLabel',
      text: 'Restored\nSecond line',
    });
  });

  it('normalizes restored text label font sizes', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fontSize: 15 },
          point: { time: 1, price: 10 },
          text: 'Restored',
          textAlign: 'center',
        },
      ],
    });

    expect(restored?.drawings[0]?.style.fontSize).toBe(14);
  });

  it('normalizes restored text label font families', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'label',
          kind: 'textLabel',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', fontFamily: 'cursive' },
          point: { time: 1, price: 10 },
          text: 'Restored',
          textAlign: 'center',
        },
      ],
    });

    expect(restored?.drawings[0]?.style.fontFamily).toBe('sans-serif');
  });

  it('normalizes restored drawing opacity', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'rect',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid', opacity: 2 },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]?.style.opacity).toBe(1);
  });

  it('restores drawing fill and line visibility flags', () => {
    const restored = deserializeUserDrawingStateFromLayout({
      version: 1,
      drawings: [
        {
          id: 'rect',
          kind: 'rectangle',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style: {
            lineColor: '#fff',
            lineWidth: 1,
            lineStyle: 'solid',
            lineVisible: false,
            fillVisible: false,
            fillColor: '#123456',
          },
          points: [
            { time: 1, price: 10 },
            { time: 2, price: 12 },
          ],
        },
      ],
    });

    expect(restored?.drawings[0]?.style).toMatchObject({
      lineVisible: false,
      fillVisible: false,
    });
  });

  it('compares only committed drawing payloads', () => {
    const previous = createStateWithTransientFields();
    const next = {
      ...previous,
      activeTool: 'select' as const,
      selection: null,
      draft: null,
      textEdit: null,
    };

    expect(isUserDrawingLayoutStateEqual(previous, next)).toBe(true);
    expect(isUserDrawingLayoutStateEqual(previous, { ...next, drawings: [] })).toBe(false);
  });
});
