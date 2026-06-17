import { afterEach, describe, expect, it } from 'vitest';

import { resolveUserDrawingKeyboardAction } from './keyboard';
import type { UserDrawingKeyboardActionType } from './keyboard';
import { createUserDrawingState, setUserDrawingTool, handleUserDrawingInput } from './input';
import { clearChartStoreCache } from '../state/chartState';
import type { UserDrawingState } from './types';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
const coveredUserDrawingKeyboardActionTypes = [
  'undo',
  'redo',
  'copySelected',
  'paste',
  'duplicateSelected',
  'nudge',
  'selectAll',
  'clearSelection',
  'deleteSelected',
  'cancelDraft',
  'selectTool',
] as const satisfies readonly UserDrawingKeyboardActionType[];
type MissingUserDrawingKeyboardActionType = Exclude<
  UserDrawingKeyboardActionType,
  (typeof coveredUserDrawingKeyboardActionTypes)[number]
>;
const allUserDrawingKeyboardActionTypesCovered: Record<MissingUserDrawingKeyboardActionType, never> = {};

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
  it('keeps the Epic E keyboard action checklist exhaustive', () => {
    expect(allUserDrawingKeyboardActionTypesCovered).toEqual({});
    expect(coveredUserDrawingKeyboardActionTypes).toEqual([
      'undo',
      'redo',
      'copySelected',
      'paste',
      'duplicateSelected',
      'nudge',
      'selectAll',
      'clearSelection',
      'deleteSelected',
      'cancelDraft',
      'selectTool',
    ]);
  });

  it('selects a drawing tool from Alt + physical key, by code not key char', () => {
    const state = createUserDrawingState();

    // macOS yields a special character in `key` (e.g. Alt+T -> '†'); match on code.
    expect(resolveUserDrawingKeyboardAction(state, { key: '†', code: 'KeyT', altKey: true })).toEqual({
      type: 'selectTool',
      tool: 'trendLine',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(state, { key: 'h', code: 'KeyH', altKey: true })).toEqual({
      type: 'selectTool',
      tool: 'horizontalLine',
      preventDefault: true,
    });
    expect(resolveUserDrawingKeyboardAction(state, { key: 'f', code: 'KeyF', altKey: true })).toEqual({
      type: 'selectTool',
      tool: 'fibRetracement',
      preventDefault: true,
    });
  });

  it('does not fire tool hotkeys without Alt, with extra modifiers, or for unmapped keys', () => {
    const state = createUserDrawingState();

    expect(resolveUserDrawingKeyboardAction(state, { key: 't', code: 'KeyT' })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(state, { key: 't', code: 'KeyT', altKey: true, ctrlKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(state, { key: 't', code: 'KeyT', altKey: true, shiftKey: true })).toBeNull();
    expect(resolveUserDrawingKeyboardAction(state, { key: 'k', code: 'KeyK', altKey: true })).toBeNull();
  });

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
