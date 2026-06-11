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
