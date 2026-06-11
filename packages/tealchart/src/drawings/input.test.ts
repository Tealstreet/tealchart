import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import {
  beginUserDrawingTextEdit,
  cancelUserDrawingDraft,
  cancelUserDrawingTextEdit,
  clearUserDrawings,
  commitUserDrawingTextEdit,
  createUserDrawingState,
  deleteUserDrawing,
  handleUserDrawingInput,
  resolveUserDrawingSelectionAtPoint,
  selectUserDrawingAtPoint,
  selectUserDrawingById,
  selectUserDrawing,
  setUserDrawingText,
  setUserDrawingTool,
  updateUserDrawingTextEdit,
} from './input';
import type { DrawingCoordinateSpace } from './coordinates';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
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
const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };

describe('user drawing input controller', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('creates default drawing state', () => {
    expect(createUserDrawingState()).toMatchObject({
      version: 1,
      drawings: [],
      activeTool: 'select',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });

  it('switches tools while clearing active drafts', () => {
    const state = createUserDrawingState({
      activeTool: 'trendLine',
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style: { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' },
        startedAt: 1,
      },
      textEdit: { drawingId: 'label', value: 'A', originalValue: 'A', startedAt: 1 },
    });

    expect(setUserDrawingTool(state, 'rectangle')).toMatchObject({
      activeTool: 'rectangle',
      selection: null,
      draft: null,
      textEdit: null,
    });
  });

  it('clears active text editing even when selecting the current tool again', () => {
    const state = createUserDrawingState({
      activeTool: 'select',
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 1 },
    });

    const next = setUserDrawingTool(state, 'select');

    expect(next).not.toBe(state);
    expect(next.textEdit).toBeNull();
    expect(next.selection).toEqual({ drawingId: 'label' });
  });

  it('accumulates a two-anchor draft then commits a drawing', () => {
    const options = { createId: () => 'drawing-1', now: () => 20 };
    const first = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'trendLine'), {
      paneId: 'main',
      anchor: anchorA,
    }, options);

    expect(first.draft).toMatchObject({
      tool: 'trendLine',
      paneId: 'main',
      anchors: [anchorA],
    });
    expect(first.drawings).toEqual([]);

    const second = handleUserDrawingInput(first, { paneId: 'main', anchor: anchorB }, options);

    expect(second.draft).toBeNull();
    expect(second.selection).toEqual({ drawingId: 'drawing-1' });
    expect(second.drawings[0]).toMatchObject({
      id: 'drawing-1',
      kind: 'trendLine',
      points: [anchorA, anchorB],
      createdAt: 20,
      updatedAt: 20,
    });
  });

  it('commits single-anchor drawings immediately', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'horizontalLine');
    const next = handleUserDrawingInput(state, { paneId: 'main', anchor: anchorA }, { createId: () => 'h' });

    expect(next.draft).toBeNull();
    expect(next.drawings[0]).toMatchObject({
      id: 'h',
      kind: 'horizontalLine',
      price: anchorA.price,
    });
  });

  it('starts a new draft when the pane changes mid-drawing', () => {
    const state = handleUserDrawingInput(setUserDrawingTool(createUserDrawingState(), 'rectangle'), {
      paneId: 'main',
      anchor: anchorA,
    }, { createId: () => 'unused' });

    const next = handleUserDrawingInput(state, { paneId: 'indicator', anchor: anchorB }, { createId: () => 'unused' });

    expect(next.drawings).toEqual([]);
    expect(next.draft).toMatchObject({
      paneId: 'indicator',
      anchors: [anchorB],
    });
  });

  it('selects and cancels without mutating drawings', () => {
    const drawingState = createUserDrawingState({
      drawings: [
        {
          id: 'h',
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
    });

    const selected = selectUserDrawing(drawingState, { drawingId: 'h', handle: 'center' });

    expect(selected.selection).toEqual({ drawingId: 'h', handle: 'center' });
    expect(selected.drawings).toBe(drawingState.drawings);
    expect(cancelUserDrawingDraft(selected)).toBe(selected);
  });

  it('begins, updates, commits, and cancels text label edits', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const state = createUserDrawingState({
      activeTool: 'rectangle',
      drawings: [textLabel],
      draft: {
        tool: 'rectangle',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
    });

    const editing = beginUserDrawingTextEdit(state, 'label', { now: () => 10 });

    expect(editing).toMatchObject({
      activeTool: 'select',
      selection: { drawingId: 'label' },
      draft: null,
      textEdit: {
        drawingId: 'label',
        value: 'Note',
        originalValue: 'Note',
        startedAt: 10,
      },
    });

    const updated = updateUserDrawingTextEdit(editing, 'Updated note');
    const committed = commitUserDrawingTextEdit(updated, { now: () => 11 });

    expect(committed.textEdit).toBeNull();
    expect(committed.selection).toEqual({ drawingId: 'label' });
    expect(committed.drawings[0]).toMatchObject({
      id: 'label',
      text: 'Updated note',
      updatedAt: 11,
    });

    const secondEdit = beginUserDrawingTextEdit(committed, 'label', { now: () => 12 });
    expect(cancelUserDrawingTextEdit(updateUserDrawingTextEdit(secondEdit, 'Draft')).drawings[0]).toMatchObject({
      text: 'Updated note',
    });
  });

  it('sets text directly without changing ids or editing unsupported drawings', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const line = {
      id: 'line',
      kind: 'horizontalLine' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      price: 100,
    };
    const locked = { ...textLabel, id: 'locked', locked: true };
    const state = createUserDrawingState({
      drawings: [textLabel, line, locked],
    });

    const changed = setUserDrawingText(state, 'label', 'Changed', { now: () => 20 });

    expect(changed.drawings.map((drawing) => drawing.id)).toEqual(['label', 'line', 'locked']);
    expect(changed.drawings[0]).toMatchObject({ text: 'Changed', updatedAt: 20 });
    expect(setUserDrawingText(changed, 'line', 'Ignored')).toBe(changed);
    expect(setUserDrawingText(changed, 'locked', 'Ignored')).toBe(changed);
    expect(beginUserDrawingTextEdit(changed, 'line')).toBe(changed);
    expect(beginUserDrawingTextEdit(changed, 'locked')).toBe(changed);
  });

  it('clears stale text edits when the edited drawing is removed or selection changes', () => {
    const textLabel = {
      id: 'label',
      kind: 'textLabel' as const,
      paneId: 'main',
      visible: true,
      locked: false,
      createdAt: 1,
      updatedAt: 1,
      style,
      point: anchorA,
      text: 'Note',
      textAlign: 'center' as const,
    };
    const other = { ...textLabel, id: 'other' };
    const state = createUserDrawingState({
      drawings: [textLabel, other],
      selection: { drawingId: 'label' },
      textEdit: { drawingId: 'label', value: 'Draft', originalValue: 'Note', startedAt: 1 },
    });

    expect(deleteUserDrawing(state).textEdit).toBeNull();
    expect(clearUserDrawings(state).textEdit).toBeNull();
    expect(selectUserDrawing(state, { drawingId: 'other' }).textEdit).toBeNull();
  });

  it('selects an existing drawing by id', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'h',
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
    });

    const selected = selectUserDrawingById(state, 'h', 'center');

    expect(selected.selection).toEqual({ drawingId: 'h', handle: 'center' });
    expect(selected.drawings).toBe(state.drawings);
    expect(selectUserDrawingById(selected, 'missing')).toBe(selected);
  });

  it('deletes the selected drawing while preserving other ids', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'b' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      drawings: [
        {
          id: 'a',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 90,
        },
        {
          id: 'b',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 2,
          updatedAt: 2,
          style,
          price: 100,
        },
      ],
    });

    const next = deleteUserDrawing(state);

    expect(next.drawings.map((drawing) => drawing.id)).toEqual(['a']);
    expect(next.drawings[0]).toBe(state.drawings[0]);
    expect(next.selection).toBeNull();
    expect(next.draft).toBeNull();
  });

  it('does not delete locked drawings unless requested', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'locked' },
      drawings: [
        {
          id: 'locked',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: true,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 100,
        },
      ],
    });

    expect(deleteUserDrawing(state)).toBe(state);
    expect(deleteUserDrawing(state, { includeLocked: true }).drawings).toEqual([]);
  });

  it('clears drawings, selection, and draft', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'h' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      drawings: [
        {
          id: 'h',
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
    });

    expect(clearUserDrawings(state)).toMatchObject({
      drawings: [],
      selection: null,
      draft: null,
    });
    expect(clearUserDrawings(createUserDrawingState())).toEqual(createUserDrawingState());
  });

  it('selects the topmost hit drawing at a screen point', () => {
    const state = createUserDrawingState({
      drawings: [
        {
          id: 'bottom',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
        {
          id: 'top',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 2,
          updatedAt: 2,
          style,
          price: 50,
        },
      ],
    });

    expect(selectUserDrawingAtPoint(state, { x: 40, y: 50 }, new Map([['main', space]])).selection).toEqual({
      drawingId: 'top',
    });
  });

  it('reports hit metadata even when selection is unchanged', () => {
    const state = createUserDrawingState({
      selection: { drawingId: 'h' },
      drawings: [
        {
          id: 'h',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
      ],
    });

    expect(resolveUserDrawingSelectionAtPoint(state, { x: 40, y: 50 }, new Map([['main', space]]))).toEqual({
      state,
      hit: true,
      changed: false,
    });
  });

  it('clears selection and draft when selection misses', () => {
    const state = createUserDrawingState({
      activeTool: 'trendLine',
      selection: { drawingId: 'old' },
      draft: {
        tool: 'trendLine',
        paneId: 'main',
        anchors: [anchorA],
        style,
        startedAt: 1,
      },
      drawings: [
        {
          id: 'old',
          kind: 'horizontalLine',
          paneId: 'main',
          visible: true,
          locked: false,
          createdAt: 1,
          updatedAt: 1,
          style,
          price: 50,
        },
      ],
    });

    const next = selectUserDrawingAtPoint(state, { x: 40, y: 20 }, new Map([['main', space]]));
    const result = resolveUserDrawingSelectionAtPoint(state, { x: 40, y: 20 }, new Map([['main', space]]));

    expect(next.selection).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.activeTool).toBe('select');
    expect(result.hit).toBe(false);
    expect(result.changed).toBe(true);
  });
});
