import { afterEach, describe, expect, it } from 'vitest';

import type { DrawingCoordinateSpace } from './coordinates';
import type { UserDrawingCommand } from './commands';

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
const undoableUserDrawingHistoryCommandTypes = [
  'handleInput',
  'add',
  'applyEditDrag',
  'beginDuplicateEditDragAtPoint',
  'nudge',
  'delete',
  'duplicate',
  'paste',
  'clear',
  'commitPlacementDrag',
  'commitPathDrag',
  'commitTextEdit',
  'setText',
  'setTextContent',
  'updateStyle',
  'setTextAlign',
  'setTrendLineExtend',
  'setIconName',
  'setImageSource',
  'setName',
  'setTableCells',
  'setTableCell',
  'setTableDimensions',
  'insertTableRow',
  'deleteTableRow',
  'insertTableColumn',
  'deleteTableColumn',
  'setVisibility',
  'setLocked',
  'reorder',
] as const satisfies readonly UserDrawingCommand['type'][];
const transientUserDrawingHistoryCommandTypes = [
  'setActiveTool',
  'setStayInDrawingMode',
  'setMagnetMode',
  'setMeasureMode',
  'select',
  'selectMany',
  'selectAtPoint',
  'beginEditDragAtPoint',
  'cancelDraft',
  'beginPlacementDrag',
  'beginMeasure',
  'updateMeasure',
  'endMeasure',
  'beginPathDrag',
  'appendPathDragPoint',
  'beginTextEdit',
  'updateTextEdit',
  'cancelTextEdit',
] as const satisfies readonly UserDrawingCommand['type'][];
type MissingUserDrawingHistoryCommandType = Exclude<
  UserDrawingCommand['type'],
  | (typeof undoableUserDrawingHistoryCommandTypes)[number]
  | (typeof transientUserDrawingHistoryCommandTypes)[number]
>;
const allUserDrawingHistoryCommandTypesCovered: Record<MissingUserDrawingHistoryCommandType, never> = {};

afterEach(() => {
  clearChartStoreCache();
});

function createStateWithTrendLine() {
  const first = handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'trendLine'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'trend-line', now: () => 10, style },
  );
  return handleUserDrawingInput(
    first,
    { paneId: 'main', anchor: anchorB },
    { createId: () => 'trend-line', now: () => 11, style },
  );
}

describe('user drawing command history', () => {
  it('keeps the Epic E undo/redo command-type checklist classified', () => {
    expect(allUserDrawingHistoryCommandTypesCovered).toEqual({});
    expect(undoableUserDrawingHistoryCommandTypes).toEqual(
      expect.arrayContaining([
        'handleInput',
        'commitPlacementDrag',
        'commitPathDrag',
        'applyEditDrag',
        'beginDuplicateEditDragAtPoint',
        'duplicate',
        'delete',
        'paste',
        'clear',
        'nudge',
        'updateStyle',
        'setVisibility',
        'setLocked',
        'reorder',
        'commitTextEdit',
        'setTableCell',
      ]),
    );
    expect(transientUserDrawingHistoryCommandTypes).toEqual(
      expect.arrayContaining([
        'setActiveTool',
        'selectAtPoint',
        'beginEditDragAtPoint',
        'beginPlacementDrag',
        'beginPathDrag',
        'appendPathDragPoint',
        'beginTextEdit',
        'updateTextEdit',
        'cancelTextEdit',
        'beginMeasure',
        'updateMeasure',
        'endMeasure',
      ]),
    );
  });

  it('records public add drawing commands as undoable creations', () => {
    const state = createUserDrawingState();
    const history = createUserDrawingCommandHistory();

    const result = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'add',
      drawing: {
        id: 'line',
        kind: 'trendLine',
        paneId: 'main',
        visible: true,
        locked: false,
        createdAt: 1,
        updatedAt: 1,
        style,
        points: [anchorA, anchorB],
        extend: 'none',
      },
      meta: { source: 'api', affectedIds: ['line'] },
    });

    expect(result.changed).toBe(true);
    expect(result.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
    expect(result.state.selection).toEqual({ drawingId: 'line' });
    expect(result.history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(result.state, result.history);
    expect(undo.state.drawings).toEqual([]);

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
  });

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
      type: 'setStayInDrawingMode',
      stayInDrawingMode: false,
      meta: { source: 'toolbar' },
    });
    state = result.state;
    history = result.history;
    expect(state.stayInDrawingMode).toBe(false);
    expect(history.undoStack).toHaveLength(0);

    result = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setMagnetMode',
      magnetMode: 'weak',
      meta: { source: 'toolbar' },
    });
    state = result.state;
    history = result.history;
    expect(state.magnetMode).toBe('weak');
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
    expect(state.activeTool).toBe('select');
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings).toHaveLength(0);
    expect(undo.state.draft).toBeNull();
    expect(undo.state.stayInDrawingMode).toBe(false);
    expect(undo.state.magnetMode).toBe('weak');

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.changed).toBe(true);
    expect(redo.state.drawings).toHaveLength(1);
    expect(redo.state.selection).toEqual({ drawingId: 'rect' });
    expect(redo.state.activeTool).toBe('select');
    expect(redo.state.stayInDrawingMode).toBe(false);
    expect(redo.state.magnetMode).toBe('weak');
  });

  it('preserves current non-undoable drawing mode settings across undo and redo snapshots', () => {
    let state = createStateWithTrendLine();
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'delete',
      options: { drawingId: 'trend-line' },
      meta: { source: 'api' },
    }));
    expect(state.drawings).toHaveLength(0);
    expect(history.undoStack).toHaveLength(1);

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setStayInDrawingMode',
      stayInDrawingMode: false,
      meta: { source: 'toolbar' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setMagnetMode',
      magnetMode: 'strong',
      meta: { source: 'toolbar' },
    }));
    expect(state.stayInDrawingMode).toBe(false);
    expect(state.magnetMode).toBe('strong');
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line']);
    expect(undo.state.stayInDrawingMode).toBe(false);
    expect(undo.state.magnetMode).toBe('strong');

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.changed).toBe(true);
    expect(redo.state.drawings).toHaveLength(0);
    expect(redo.state.stayInDrawingMode).toBe(false);
    expect(redo.state.magnetMode).toBe('strong');
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

  it('keeps the Epic D edit-drag transaction checklist in shared history', () => {
    let state = createStateWithTrendLine();
    let history = createUserDrawingCommandHistory();

    const editStart = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginEditDragAtPoint',
      point: { x: 100, y: 200 },
      spacesByPaneId,
      meta: { source: 'pointer', transactionKey: 'edit-drag-checklist' },
    });

    expect(editStart.changed).toBe(true);
    expect(editStart.history.undoStack).toHaveLength(0);
    expect(editStart.editDrag).not.toBeNull();
    if (!editStart.editDrag) throw new Error('expected edit drag');

    ({ state, history } = dispatchUserDrawingCommandWithHistory(editStart.state, editStart.history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 110, y: 190 },
      meta: { source: 'pointer', transactionKey: 'edit-drag-checklist' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'applyEditDrag',
      drag: editStart.editDrag,
      point: { x: 120, y: 180 },
      meta: { source: 'pointer', transactionKey: 'edit-drag-checklist' },
    }));

    expect(history.undoStack).toHaveLength(1);
    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]).toEqual(editStart.state.drawings[0]);

    const stale = dispatchUserDrawingCommandWithHistory(
      { ...state, drawings: [] },
      history,
      {
        type: 'applyEditDrag',
        drag: editStart.editDrag,
        point: { x: 140, y: 160 },
        meta: { source: 'pointer', transactionKey: 'edit-drag-checklist' },
      },
    );
    expect(stale.changed).toBe(false);
    expect(stale.history).toBe(history);
  });

  it('coalesces duplicate edit-drag start and moves into one undo entry', () => {
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

    const duplicateStart = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginDuplicateEditDragAtPoint',
      point: { x: 150, y: 150 },
      spacesByPaneId,
      options: { createId: () => 'line-copy', now: () => 40 },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag' },
    });
    expect(duplicateStart.history.undoStack).toHaveLength(2);
    expect(duplicateStart.editDrag?.startDrawing.id).toBe('line-copy');
    if (!duplicateStart.editDrag) throw new Error('expected duplicate edit drag');

    ({ state, history } = dispatchUserDrawingCommandWithHistory(duplicateStart.state, duplicateStart.history, {
      type: 'applyEditDrag',
      drag: duplicateStart.editDrag,
      point: { x: 170, y: 130 },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag' },
    }));

    expect(history.undoStack).toHaveLength(2);
    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
  });

  it('records duplicate, delete, and nudge commands as independent undoable transactions', () => {
    let state = createStateWithTrendLine();
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'duplicate',
      options: { createId: () => 'copy', now: () => 50 },
      meta: { source: 'toolbar' },
    }));

    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line', 'copy']);
    expect(state.selection).toEqual({ drawingId: 'copy' });
    expect(history.undoStack).toHaveLength(1);

    let undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line']);
    let redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line', 'copy']);
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'delete',
      options: { drawingId: 'copy' },
      meta: { source: 'toolbar' },
    }));

    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line']);
    expect(history.undoStack).toHaveLength(2);

    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line', 'copy']);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings.map((drawing) => drawing.id)).toEqual(['trend-line']);
    state = { ...redo.state, selection: { drawingId: 'trend-line' } };
    history = redo.history;

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'nudge',
      spacesByPaneId,
      options: { delta: { x: 10, y: 10 }, now: () => 51 },
      meta: { source: 'keyboard' },
    }));

    const movedDrawing = state.drawings[0];
    expect(movedDrawing?.kind).toBe('trendLine');
    if (movedDrawing?.kind !== 'trendLine') throw new Error('expected trend line drawing');
    expect(movedDrawing.points).toEqual([
      { time: 1100, price: 99 },
      { time: 2100, price: 109 },
    ]);
    expect(history.undoStack).toHaveLength(3);

    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]).toMatchObject({
      id: 'trend-line',
      points: [anchorA, anchorB],
    });
  });

  it('keeps separate duplicate edit-drag transactions independently undoable', () => {
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

    const first = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginDuplicateEditDragAtPoint',
      point: { x: 150, y: 150 },
      spacesByPaneId,
      options: { createId: () => 'line-copy-1', now: () => 40 },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag-1' },
    });
    expect(first.editDrag).not.toBeNull();
    if (!first.editDrag) throw new Error('expected first duplicate edit drag');
    ({ state, history } = dispatchUserDrawingCommandWithHistory(first.state, first.history, {
      type: 'applyEditDrag',
      drag: first.editDrag,
      point: { x: 170, y: 130 },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag-1' },
    }));

    const second = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginDuplicateEditDragAtPoint',
      point: { x: 170, y: 130 },
      spacesByPaneId,
      options: { createId: () => 'line-copy-2', now: () => 41 },
      meta: { source: 'pointer', transactionKey: 'duplicate-drag-2' },
    });
    expect(second.editDrag).not.toBeNull();
    if (!second.editDrag) throw new Error('expected second duplicate edit drag');

    expect(second.history.undoStack).toHaveLength(3);
    const undo = undoUserDrawingCommand(second.state, second.history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'line-copy-1']);
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

  it('records style, visibility, lock, and z-order commands as undoable transactions', () => {
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
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorC },
      options: { createId: () => 'line-2', now: () => 43, style },
      meta: { source: 'pointer' },
    }));
    state = { ...state, selection: { drawingId: 'line-1' } };

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'updateStyle',
      style: { lineColor: '#00ff88' },
      options: { drawingId: 'line-1', now: () => 44 },
      meta: { source: 'toolbar' },
    }));
    expect(state.drawings[0]?.style.lineColor).toBe('#00ff88');
    let undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.style.lineColor).toBe('#fff');
    let redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.style.lineColor).toBe('#00ff88');
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setVisibility',
      visible: false,
      options: { drawingId: 'line-1', now: () => 45 },
      meta: { source: 'objectTree' },
    }));
    expect(state.drawings[0]?.visible).toBe(false);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.visible).toBe(true);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.visible).toBe(false);
    state = undo.state;
    history = undo.history;

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setLocked',
      locked: true,
      options: { drawingId: 'line-1', now: () => 46 },
      meta: { source: 'toolbar' },
    }));
    expect(state.drawings[0]?.locked).toBe(true);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.locked).toBe(false);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.locked).toBe(true);
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'reorder',
      action: 'sendToBack',
      options: { drawingId: 'line-2' },
      meta: { source: 'contextMenu' },
    }));
    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['line-2', 'line-1']);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line-1', 'line-2']);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings.map((drawing) => drawing.id)).toEqual(['line-2', 'line-1']);
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

  it('does not record temporary measure commands', () => {
    let state = createUserDrawingState();
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'setMeasureMode',
      measureMode: 'on',
      meta: { source: 'toolbar' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'beginMeasure',
      point: { paneId: 'main', anchor: anchorA },
      options: { now: () => 70, style },
      meta: { source: 'pointer', transactionKey: 'measure' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'updateMeasure',
      point: { paneId: 'main', anchor: anchorB },
      meta: { source: 'pointer', transactionKey: 'measure' },
    }));
    ({ state, history } = dispatchUserDrawingCommandWithHistory(state, history, {
      type: 'endMeasure',
      meta: { source: 'pointer', transactionKey: 'measure' },
    }));

    expect(state.measureMode).toBe('on');
    expect(state.measure).toBeNull();
    expect(state.drawings).toEqual([]);
    expect(history.undoStack).toHaveLength(0);
  });
});
