import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  commitMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHistoryCommand,
  dispatchMobileUserDrawingKeyboardAction,
} from './drawingCommands';
import { clearChartStoreCache } from '../../state/chartState';
import {
  createUserDrawingCommandHistory,
  createUserDrawingState,
  duplicateUserDrawing,
  handleUserDrawingInput,
  setUserDrawingTool,
  redoUserDrawingCommand,
  undoUserDrawingCommand,
} from '../../drawings';
import type { DrawingCoordinateSpace, UserDrawingState } from '../../drawings';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const coordinateSpace: DrawingCoordinateSpace = {
  viewport: { startTime: 0, endTime: 3_000, priceMin: 90, priceMax: 120 },
  pane: { id: 'main', top: 0, height: 300, bottom: 300, yMin: 90, yMax: 120 },
  chartLeft: 0,
  chartRight: 300,
};
const spacesByPaneId = new Map([['main', coordinateSpace]]);

afterEach(() => {
  clearChartStoreCache();
});

function createMobileStateWithTrendLine(): UserDrawingState {
  const first = handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'trendLine'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'line', now: () => 10, style },
  );
  return handleUserDrawingInput(
    first,
    { paneId: 'main', anchor: anchorB },
    { createId: () => 'line', now: () => 10, style },
  );
}

function createMobileStateWithTable(): UserDrawingState {
  return handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'table'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'table', now: () => 20, style },
  );
}

describe('mobile drawing handle command dispatch', () => {
  it('commits changed handle commands and preserves boolean results', () => {
    const commit = vi.fn<(state: UserDrawingState) => void>();
    const state = createMobileStateWithTrendLine();

    const changed = commitMobileUserDrawingHandleCommand(
      state,
      { type: 'duplicate', options: { createId: () => 'copy', now: () => 30 }, meta: { source: 'api' } },
      commit,
    );

    expect(changed).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0]?.[0].drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);

    const unchanged = commitMobileUserDrawingHandleCommand(
      commit.mock.calls[0]![0],
      { type: 'delete', options: { drawingId: 'missing' }, meta: { source: 'api' } },
      commit,
    );

    expect(unchanged).toBe(false);
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('routes representative mobile style, visibility, and table commands through shared dispatch', () => {
    const state = createMobileStateWithTable();
    const styleResult = dispatchMobileUserDrawingHandleCommand(state, {
      type: 'updateStyle',
      style: { lineColor: '#00ff88' },
      options: { now: () => 31 },
      meta: { source: 'api' },
    });
    const tableResult = dispatchMobileUserDrawingHandleCommand(styleResult.state, {
      type: 'setTableCell',
      row: 0,
      column: 0,
      value: 'Metric',
      options: { now: () => 32 },
      meta: { source: 'api' },
    });
    const hiddenResult = dispatchMobileUserDrawingHandleCommand(tableResult.state, {
      type: 'setVisibility',
      visible: false,
      options: { now: () => 33 },
      meta: { source: 'api' },
    });

    expect(styleResult.changed).toBe(true);
    expect(tableResult.changed).toBe(true);
    expect(hiddenResult.changed).toBe(true);
    expect(hiddenResult.state.selection).toBeNull();
    expect(hiddenResult.state.drawings[0]).toMatchObject({
      visible: false,
      style: expect.objectContaining({ lineColor: '#00ff88' }),
    });
    expect(hiddenResult.state.drawings[0]).toHaveProperty('cells', [
      ['Metric', 'Value'],
      ['Price', ''],
    ]);
  });

  it('routes mobile commands through shared undo history', () => {
    const state = createMobileStateWithTrendLine();
    const history = createUserDrawingCommandHistory();
    const result = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'duplicate',
      options: { createId: () => 'copy', now: () => 40 },
      meta: { source: 'api' },
    });

    expect(result.changed).toBe(true);
    expect(result.history.undoStack).toHaveLength(1);
    expect(result.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);

    const undo = undoUserDrawingCommand(result.state, result.history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
  });

  it('routes mobile keyboard actions through shared history state', () => {
    const state = createMobileStateWithTrendLine();
    let history = createUserDrawingCommandHistory();
    const keyboardOptions = { createId: () => 'copy' };
    const deleted = dispatchMobileUserDrawingKeyboardAction(state, history, { key: 'Delete' }, keyboardOptions);

    expect(deleted.action?.type).toBe('deleteSelected');
    expect(deleted.changed).toBe(true);
    expect(deleted.state.drawings).toEqual([]);
    expect(deleted.history.undoStack).toHaveLength(1);

    history = deleted.history;
    const undo = dispatchMobileUserDrawingKeyboardAction(deleted.state, history, { key: 'z', metaKey: true }, keyboardOptions);

    expect(undo.action?.type).toBe('undo');
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
    expect(undo.history.redoStack).toHaveLength(1);

    const redo = dispatchMobileUserDrawingKeyboardAction(
      undo.state,
      undo.history,
      { key: 'Z', metaKey: true, shiftKey: true },
      keyboardOptions,
    );

    expect(redo.action?.type).toBe('redo');
    expect(redo.changed).toBe(true);
    expect(redo.state.drawings).toEqual([]);
  });

  it('routes mobile escape keyboard action to draft cancellation without recording undo history', () => {
    const state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'rectangle'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'rect', now: () => 41, style },
    );
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'Escape' },
      { createId: () => 'copy' },
    );

    expect(result.action?.type).toBe('cancelDraft');
    expect(result.changed).toBe(true);
    expect(result.state.draft).toBeNull();
    expect(result.history.undoStack).toHaveLength(0);
  });

  it('routes mobile copy and paste keyboard actions through adapter clipboard state', () => {
    const state = createMobileStateWithTrendLine();
    let clipboard = null;
    const copied = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'c', metaKey: true },
      {
        createId: () => 'copy',
        setClipboard: (nextClipboard) => {
          clipboard = nextClipboard;
        },
      },
    );

    expect(copied.action?.type).toBe('copySelected');
    expect(copied.changed).toBe(true);
    expect(copied.state).toBe(state);
    expect(clipboard).toMatchObject({ drawings: [{ id: 'line' }] });

    const pasted = dispatchMobileUserDrawingKeyboardAction(
      state,
      copied.history,
      { key: 'v', metaKey: true },
      {
        clipboard,
        createId: () => 'copy',
      },
    );

    expect(pasted.action?.type).toBe('paste');
    expect(pasted.changed).toBe(true);
    expect(pasted.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
    expect(pasted.state.selection).toEqual({ drawingId: 'copy' });
    expect(pasted.history.undoStack).toHaveLength(1);
  });

  it('routes mobile select-all keyboard action without recording undo history', () => {
    const state = duplicateUserDrawing(createMobileStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 43,
    });
    const result = dispatchMobileUserDrawingKeyboardAction(
      { ...state, selection: null },
      createUserDrawingCommandHistory(),
      { key: 'a', metaKey: true },
      { createId: () => 'unused' },
    );

    expect(result.action?.type).toBe('selectAll');
    expect(result.changed).toBe(true);
    expect(result.state.selection).toEqual({ drawingId: 'line', drawingIds: ['line', 'copy'] });
    expect(result.history.undoStack).toHaveLength(0);
  });

  it('routes mobile keyboard nudge through shared drawing history', () => {
    const state = createMobileStateWithTrendLine();
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'ArrowRight' },
      {
        createId: () => 'copy',
        spacesByPaneId,
      },
    );

    expect(result.action?.type).toBe('nudge');
    expect(result.changed).toBe(true);
    expect(result.history.undoStack).toHaveLength(1);
    const movedDrawing = result.state.drawings[0];
    expect(movedDrawing?.kind).toBe('trendLine');
    if (movedDrawing?.kind !== 'trendLine') throw new Error('expected trend line drawing');
    expect(movedDrawing.points[0]?.time).toBe(1010);
    expect(movedDrawing.points[1]?.time).toBe(2010);
  });

  it('records mobile two-anchor placement drag as one undoable drawing creation', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    let history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch', transactionKey: 'placement-drag' },
    });

    expect(started.changed).toBe(true);
    expect(started.history.undoStack).toHaveLength(0);
    expect(started.state.draft?.anchors).toEqual([anchorA]);

    history = started.history;
    const committed = dispatchMobileUserDrawingHistoryCommand(started.state, history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'rect', now: () => 42, style },
      meta: { source: 'touch', transactionKey: 'placement-drag' },
    });

    expect(committed.changed).toBe(true);
    expect(committed.history.undoStack).toHaveLength(1);
    expect(committed.state.drawings[0]).toMatchObject({
      id: 'rect',
      kind: 'rectangle',
      points: [anchorA, anchorB],
    });

    const undo = undoUserDrawingCommand(committed.state, committed.history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings).toEqual([]);
  });

  it('does not record a mobile placement drag that ends at the start anchor', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch', transactionKey: 'placement-drag' },
    });
    const cancelled = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'rect', now: () => 42, style },
      meta: { source: 'touch', transactionKey: 'placement-drag' },
    });

    expect(cancelled.changed).toBe(true);
    expect(cancelled.history.undoStack).toHaveLength(0);
    expect(cancelled.state.drawings).toEqual([]);
    expect(cancelled.state.draft).toBeNull();
  });

  it('records mobile edit-drag moves as one coalesced undo entry', () => {
    const state = createMobileStateWithTrendLine();
    let history = createUserDrawingCommandHistory();
    const editStart = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginEditDragAtPoint',
      point: { x: 100, y: 200 },
      spacesByPaneId,
      meta: { source: 'touch', transactionKey: 'edit-drag' },
    });

    expect(editStart.history.undoStack).toHaveLength(0);
    expect(editStart.editDrag).not.toBeNull();
    if (!editStart.editDrag) throw new Error('expected edit drag');

    let moved = dispatchMobileUserDrawingHistoryCommand(editStart.state, editStart.history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 110, y: 190 },
      meta: { source: 'touch', transactionKey: 'edit-drag' },
    });
    history = moved.history;
    moved = dispatchMobileUserDrawingHistoryCommand(moved.state, history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 120, y: 180 },
      meta: { source: 'touch', transactionKey: 'edit-drag' },
    });

    expect(moved.history.undoStack).toHaveLength(1);
    const undo = undoUserDrawingCommand(moved.state, moved.history);
    expect(undo.state.drawings[0]).toEqual(editStart.state.drawings[0]);
  });

  it('records mobile text edit commit as one undoable transaction', () => {
    let state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'textLabel'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'label', now: () => 50, style, text: 'Initial' },
    );
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      options: { now: () => 51 },
      meta: { source: 'api', transactionKey: 'label-edit' },
    }));
    expect(state.textEdit).toMatchObject({ drawingId: 'label', value: 'Initial' });
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateTextEdit',
      value: 'Changed',
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateTextEdit',
      value: 'Changed again',
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'commitTextEdit',
      options: { now: () => 52 },
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));

    expect(state.drawings[0]).toMatchObject({ id: 'label', text: 'Changed again' });
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]).toMatchObject({ id: 'label', text: 'Initial' });
    expect(undo.state.textEdit).toBeNull();

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]).toMatchObject({ id: 'label', text: 'Changed again' });
    expect(redo.state.textEdit).toBeNull();
  });

  it('does not record mobile canceled or unchanged text edits', () => {
    let state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'textLabel'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'label', now: () => 60, style, text: 'Initial' },
    );
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'cancelTextEdit',
      meta: { source: 'textEditor' },
    }));
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(0);
    expect(history.redoStack).toHaveLength(0);

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'commitTextEdit',
      meta: { source: 'textEditor' },
    }));
    expect(state.drawings[0]).toMatchObject({ id: 'label', text: 'Initial' });
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(0);
    expect(history.redoStack).toHaveLength(0);
  });
});
