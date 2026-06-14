import { afterEach, describe, expect, it } from 'vitest';

import { resolveUserDrawingKeyboardAction } from './keyboard';
import { createUserDrawingState, setUserDrawingTool, handleUserDrawingInput } from './input';
import { clearChartStoreCache } from '../state/chartState';
import type { UserDrawingState } from './types';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };

afterEach(() => {
  clearChartStoreCache();
});

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
  it('ignores drawing shortcuts when chart does not own keyboard focus', () => {
    const state = withSelection();

    for (const focusOwner of ['textInput', 'appControl'] as const) {
      expect(resolveUserDrawingKeyboardAction(state, { key: 'Delete', focusOwner })).toBeNull();
      expect(resolveUserDrawingKeyboardAction(state, { key: 'z', metaKey: true, focusOwner })).toBeNull();
      expect(resolveUserDrawingKeyboardAction(state, { key: 'ArrowDown', focusOwner })).toBeNull();
      expect(resolveUserDrawingKeyboardAction(withDraft(), { key: 'Escape', focusOwner })).toBeNull();
    }
  });

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

  it('maps primary-modifier copy and paste shortcuts', () => {
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'c', metaKey: true })).toEqual({
      type: 'copySelected',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'c', metaKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'V', ctrlKey: true })).toEqual({
      type: 'paste',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'c', metaKey: true, shiftKey: true })).toBeNull();
  });

  it('maps primary-modifier duplicate only when a drawing is selected', () => {
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'd', metaKey: true })).toEqual({
      type: 'duplicateSelected',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'd', metaKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'd', metaKey: true, shiftKey: true })).toBeNull();
  });

  it('maps primary-modifier select all only when drawings exist', () => {
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'a', metaKey: true })).toEqual({
      type: 'selectAll',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'a', metaKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'a', metaKey: true, shiftKey: true })).toBeNull();
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

  it('maps arrow-key nudge only when a drawing is selected', () => {
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'ArrowLeft' })).toEqual({
      type: 'nudge',
      delta: { x: -1, y: 0 },
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'ArrowDown', shiftKey: true })).toEqual({
      type: 'nudge',
      delta: { x: 0, y: 10 },
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'ArrowRight', metaKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'ArrowRight' })).toBeNull();
  });

  it('maps bare escape to cancel drafts before clearing selection', () => {
    expect(resolveUserDrawingKeyboardAction(withDraft(), { key: 'Escape' })).toEqual({
      type: 'cancelDraft',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withSelection(), { key: 'Escape' })).toEqual({
      type: 'clearSelection',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(withDraft(), { key: 'Escape', shiftKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(createUserDrawingState(), { key: 'Escape' })).toBeNull();
  });
});
