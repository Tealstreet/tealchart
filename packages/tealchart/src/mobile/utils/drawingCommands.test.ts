import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  commitMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHistoryCommand,
} from './drawingCommands';
import { clearChartStoreCache } from '../../state/chartState';
import {
  createUserDrawingCommandHistory,
  createUserDrawingState,
  handleUserDrawingInput,
  setUserDrawingTool,
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
    const commit = vi.fn();
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
});
