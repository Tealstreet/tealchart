import { describe, expect, it } from 'vitest';

import { resolveUserDrawingKeyboardAction } from './keyboard';
import { createUserDrawingState, setUserDrawingTool, handleUserDrawingInput } from './input';
import type { UserDrawingState } from './types';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };

function withSelection(): UserDrawingState {
  return {
    ...createUserDrawingState(),
    selection: { drawingId: 'line' },
    drawings: [
      {
        id: 'line',
        kind: 'horizontalLine',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style,
        price: 100,
      },
    ],
  };
}

function withDraft(): UserDrawingState {
  return handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'rectangle'),
    { paneId: 'main', anchor: { time: 1_000, price: 100 } },
    { createId: () => 'rect', now: () => 2, style },
  );
}

describe('user drawing keyboard actions', () => {
  it('maps primary-modifier undo and redo shortcuts', () => {
    const state = createUserDrawingState();

    expect(resolveUserDrawingKeyboardAction(state, { key: 'z', metaKey: true })).toEqual({
      type: 'undo',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(state, { key: 'Y', ctrlKey: true })).toEqual({
      type: 'redo',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(state, { key: 'Z', metaKey: true, shiftKey: true })).toEqual({
      type: 'redo',
      preventDefault: true,
    });
  });

  it('maps bare delete/backspace only when a drawing is selected', () => {
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'Delete' })).toEqual({
      type: 'deleteSelected',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'Backspace' })).toEqual({
      type: 'deleteSelected',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'Delete', metaKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'Delete' })).toBeNull();
  });

  it('maps bare escape only while a draft is active', () => {
    expect(resolveUserDrawingKeyboardAction(withDraft(), { key: 'Escape' })).toEqual({
      type: 'cancelDraft',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withDraft(), { key: 'Escape', shiftKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'Escape' })).toBeNull();
  });
});
