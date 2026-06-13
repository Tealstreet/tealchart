import { afterEach, describe, expect, it } from 'vitest';

import type { DrawingCoordinateSpace } from './coordinates';

import {
  createUserDrawingCommandHistory,
  dispatchUserDrawingCommandWithHistory,
  redoUserDrawingCommand,
  undoUserDrawingCommand,
} from './history';
import { createUserDrawingState, handleUserDrawingInput, setUserDrawingTool } from './input';
import { clearChartStoreCache } from '../state/chartState';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 2_500, price: 115 };
const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
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

describe('user drawing command history', () => {
  it('records committed drawing creation while excluding tool and draft state', () => {
    let state = createUserDrawingState();
    let history = createUserDrawingCommandHistory();

    let result = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setActiveTool',
      tool: 'rectangle',
      meta: { source: 'toolbar' },
    });
    state = result.state;
    history = result.history;
    expect(history.undoStack).toHaveLength(0);

    result = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'rect', now: () => 10, style },
      meta: { source: 'pointer', transactionKey: 'rect-placement' },
    });
    state = result.state;
    history = result.history;
    expect(state.draft).not.toBeNull();
    expect(history.undoStack).toHaveLength(0);

    result = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'rect', now: () => 11, style },
      meta: { source: 'pointer', transactionKey: 'rect-placement' },
    });
    state = result.state;
    history = result.history;

    expect(state.drawings).toHaveLength(1);
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings).toHaveLength(0);
    expect(undo.state.draft).toBeNull();

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.changed).toBe(true);
    expect(redo.state.drawings).toHaveLength(1);
    expect(redo.state.selection).toEqual({ drawingId: 'rect' });
  });

  it('clears redo when a new committed command is recorded', () => {
    let state = createUserDrawingState();
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setActiveTool',
      tool: 'trendLine',
      meta: { source: 'toolbar' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line', now: () => 20, style },
      meta: { source: 'pointer' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'line', now: () => 21, style },
      meta: { source: 'pointer' },
    }));

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.history.redoStack).toHaveLength(1);

    const next = dispatchUserDrawingCommandWithHistory(undo.state, undo.history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line-2', now: () => 22, style },
      meta: { source: 'pointer' },
    });
    const committed = dispatchUserDrawingCommandWithHistory(next.state, next.history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorC },
      options: { createId: () => 'line-2', now: () => 23, style },
      meta: { source: 'pointer' },
    });

    expect(committed.history.redoStack).toHaveLength(0);
    expect(committed.history.undoStack).toHaveLength(1);
  });

  it('coalesces repeated commands with the same transaction key', () => {
    let state = createUserDrawingState();
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setActiveTool',
      tool: 'trendLine',
      meta: { source: 'toolbar' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line', now: () => 30, style },
      meta: { source: 'pointer' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'line', now: () => 31, style },
      meta: { source: 'pointer' },
    }));
    expect(history.undoStack).toHaveLength(1);

    const editStart = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginEditDragAtPoint',
      point: { x: 100, y: 200 },
      spacesByPaneId,
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    });
    expect(editStart.history.undoStack).toHaveLength(1);
    expect(editStart.editDrag).not.toBeNull();
    if (!editStart.editDrag) throw new Error('expected edit drag');

    ({ state, history } = dispatchUserDrawingCommandWithHistory(editStart.state, editStart.history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 110, y: 190 },
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 120, y: 180 },
      meta: { source: 'pointer', transactionKey: 'edit-drag' },
    }));

    expect(history.undoStack).toHaveLength(2);
    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]).toEqual(editStart.state.drawings[0]);
  });

  it('bounds undo stack capacity', () => {
    let state = createUserDrawingState();
    let history = createUserDrawingCommandHistory({ capacity: 1 });

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setActiveTool',
      tool: 'trendLine',
      meta: { source: 'toolbar' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line-1', now: () => 40, style },
      meta: { source: 'pointer' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'line-1', now: () => 41, style },
      meta: { source: 'pointer' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line-2', now: () => 42, style },
      meta: { source: 'pointer' },
    }));
    ({ history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorC },
      options: { createId: () => 'line-2', now: () => 43, style },
      meta: { source: 'pointer' },
    }));

    expect(history.undoStack).toHaveLength(1);
    expect(history.undoStack[0]?.after.drawings.map((drawing) => drawing.id)).toEqual(['line-1', 'line-2']);
  });

  it('records committed text edits as one undoable transaction', () => {
    let state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'textLabel'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'label', now: () => 50, style, text: 'Initial' },
    );
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      options: { now: () => 51 },
      meta: { source: 'api', transactionKey: 'label-edit' },
    }));
    expect(state.textEdit).toMatchObject({ drawingId: 'label', value: 'Initial' });
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'updateTextEdit',
      value: 'Changed',
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'updateTextEdit',
      value: 'Changed again',
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));
    expect(state.textEdit).toMatchObject({ drawingId: 'label', value: 'Changed again' });
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'commitTextEdit',
      options: { now: () => 52 },
      meta: { source: 'textEditor', transactionKey: 'label-edit' },
    }));

    expect(history.undoStack).toHaveLength(1);
    expect(state.textEdit).toBeNull();
    expect(state.drawings[0]).toMatchObject({ id: 'label', text: 'Changed again' });

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]).toMatchObject({ id: 'label', text: 'Initial' });
    expect(undo.state.textEdit).toBeNull();

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]).toMatchObject({ id: 'label', text: 'Changed again' });
    expect(redo.state.textEdit).toBeNull();
  });

  it('does not record canceled or unchanged text edits', () => {
    let state = handleUserDrawingInput(
      setUserDrawingTool(createUserDrawingState(), 'textLabel'),
      { paneId: 'main', anchor: anchorA },
      { createId: () => 'label', now: () => 60, style, text: 'Initial' },
    );
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'cancelTextEdit',
      meta: { source: 'textEditor' },
    }));
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginTextEdit',
      drawingId: 'label',
      meta: { source: 'api' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'commitTextEdit',
      meta: { source: 'textEditor' },
    }));
    expect(state.drawings[0]).toMatchObject({ id: 'label', text: 'Initial' });
    expect(state.textEdit).toBeNull();
    expect(history.undoStack).toHaveLength(0);
  });
});
