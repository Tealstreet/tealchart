import { describe, expect, it } from 'vitest';

import { dispatchUserDrawingCommand } from './commands';
import {
  beginUserDrawingTextEdit,
  commitUserDrawingTextEdit,
  createUserDrawingState,
  deleteUserDrawing,
  duplicateUserDrawing,
  handleUserDrawingInput,
  reorderUserDrawings,
  selectUserDrawingById,
  setUserDrawingLocked,
  setUserDrawingTool,
  updateUserDrawingStyle,
  updateUserDrawingTextEdit,
} from './input';
import type { UserDrawingState } from './types';

const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };

function createStateWithTrendLine(): UserDrawingState {
  const first = handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'trendLine'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'trend-line', now: () => 10, style },
  );
  return handleUserDrawingInput(
    first,
    { paneId: 'main', anchor: anchorB },
    { createId: () => 'trend-line', now: () => 10, style },
  );
}

function createStateWithTextLabel(): UserDrawingState {
  return handleUserDrawingInput(
    setUserDrawingTool(createUserDrawingState(), 'textLabel'),
    { paneId: 'main', anchor: anchorA },
    { createId: () => 'label', now: () => 20, style, text: 'Initial' },
  );
}

describe('user drawing command dispatch', () => {
  it('wraps active tool and drawing input reducers without changing behavior', () => {
    const initial = createUserDrawingState();
    const toolDirect = setUserDrawingTool(initial, 'rectangle');
    const toolCommand = dispatchUserDrawingCommand(initial, {
      type: 'setActiveTool',
      tool: 'rectangle',
      meta: { source: 'toolbar', timestamp: 1, transactionKey: 'tool' },
    });

    expect(toolCommand.state).toEqual(toolDirect);
    expect(toolCommand.changed).toBe(true);
    expect(toolCommand.meta).toEqual({ source: 'toolbar', timestamp: 1, transactionKey: 'tool' });

    const firstDirect = handleUserDrawingInput(toolDirect, { paneId: 'main', anchor: anchorA }, {
      createId: () => 'rect',
      now: () => 30,
      style,
    });
    const firstCommand = dispatchUserDrawingCommand(toolCommand.state, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'rect', now: () => 30, style },
      meta: { source: 'pointer', transactionKey: 'draw-1' },
    });

    expect(firstCommand.state).toEqual(firstDirect);
    expect(firstCommand.changed).toBe(true);

    const secondDirect = handleUserDrawingInput(firstDirect, { paneId: 'main', anchor: anchorB }, {
      createId: () => 'rect',
      now: () => 30,
      style,
    });
    const secondCommand = dispatchUserDrawingCommand(firstCommand.state, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'rect', now: () => 30, style },
      meta: { source: 'pointer', transactionKey: 'draw-1' },
    });

    expect(secondCommand.state).toEqual(secondDirect);
    expect(secondCommand.state.selection).toEqual({ drawingId: 'rect' });
  });

  it('wraps selection, duplicate, delete, style, lock, and z-order reducers', () => {
    const state = createStateWithTrendLine();

    expect(dispatchUserDrawingCommand(state, { type: 'select', drawingId: 'trend-line' }).state).toEqual(
      selectUserDrawingById(state, 'trend-line'),
    );

    const duplicateCommand = dispatchUserDrawingCommand(state, {
      type: 'duplicate',
      options: { createId: () => 'trend-line-copy', now: () => 40 },
      meta: { source: 'api', affectedIds: ['trend-line'] },
    });
    const duplicated = duplicateUserDrawing(state, { createId: () => 'trend-line-copy', now: () => 40 });
    expect(duplicateCommand.state).toEqual(duplicated);
    expect(duplicateCommand.meta?.affectedIds).toEqual(['trend-line']);

    expect(
      dispatchUserDrawingCommand(duplicated, {
        type: 'updateStyle',
        style: { lineColor: '#00ff88' },
        options: { now: () => 41 },
      }).state,
    ).toEqual(updateUserDrawingStyle(duplicated, { lineColor: '#00ff88' }, { now: () => 41 }));

    expect(dispatchUserDrawingCommand(duplicated, { type: 'setLocked', locked: true, options: { now: () => 42 } }).state).toEqual(
      setUserDrawingLocked(duplicated, true, { now: () => 42 }),
    );

    expect(dispatchUserDrawingCommand(duplicated, { type: 'reorder', action: 'sendToBack' }).state).toEqual(
      reorderUserDrawings(duplicated, 'sendToBack'),
    );

    expect(dispatchUserDrawingCommand(duplicated, { type: 'delete' }).state).toEqual(deleteUserDrawing(duplicated));
  });

  it('wraps text edit lifecycle reducers', () => {
    const state = createStateWithTextLabel();
    const editing = beginUserDrawingTextEdit(state, 'label', { now: () => 50 });
    const updated = updateUserDrawingTextEdit(editing, 'Changed');

    expect(
      dispatchUserDrawingCommand(state, {
        type: 'beginTextEdit',
        drawingId: 'label',
        options: { now: () => 50 },
        meta: { source: 'textEditor', transactionKey: 'text-label' },
      }).state,
    ).toEqual(editing);
    expect(dispatchUserDrawingCommand(editing, { type: 'updateTextEdit', value: 'Changed' }).state).toEqual(updated);
    expect(dispatchUserDrawingCommand(updated, { type: 'commitTextEdit', options: { now: () => 51 } }).state).toEqual(
      commitUserDrawingTextEdit(updated, { now: () => 51 }),
    );
  });

  it('reports unchanged commands as no-ops', () => {
    const state = createUserDrawingState();
    const result = dispatchUserDrawingCommand(state, { type: 'delete', meta: { source: 'keyboard' } });

    expect(result.state).toBe(state);
    expect(result.changed).toBe(false);
    expect(result.meta).toEqual({ source: 'keyboard' });
  });
});
