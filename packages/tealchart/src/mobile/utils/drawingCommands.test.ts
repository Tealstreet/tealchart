import { describe, expect, it, vi } from 'vitest';

import {
  commitMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHandleCommand,
} from './drawingCommands';
import {
  createUserDrawingState,
  handleUserDrawingInput,
  setUserDrawingTool,
} from '../../drawings';
import type { UserDrawingState } from '../../drawings';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };

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
});
