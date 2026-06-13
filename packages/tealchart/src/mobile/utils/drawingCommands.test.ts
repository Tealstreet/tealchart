import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  commitMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHandleCommand,
  dispatchMobileUserDrawingHistoryCommand,
  dispatchMobileUserDrawingHistoryCommandWithEvent,
  dispatchMobileUserDrawingKeyboardAction,
} from './drawingCommands';
import { clearChartStoreCache } from '../../state/chartState';
import {
  createUserDrawingCommandHistory,
  createUserDrawingCommandEvent,
  createUserDrawingState,
  duplicateUserDrawing,
  handleUserDrawingInput,
  resolveUserDrawingObjectTreeDispatchActionCommands,
  setUserDrawingTool,
  redoUserDrawingCommand,
  undoUserDrawingCommand,
} from '../../drawings';
import type { DrawingCoordinateSpace, UserDrawingState, UserDrawingTool } from '../../drawings';

const style = { lineColor: '#fff', lineWidth: 1, lineStyle: 'solid' as const };
const anchorA = { time: 1_000, price: 100 };
const anchorB = { time: 2_000, price: 110 };
const anchorC = { time: 3_000, price: 120 };
const expandedDragPlacementTools: UserDrawingTool[] = [
  'trendAngle',
  'priceRange',
  'dateRange',
  'datePriceRange',
  'forecast',
  'fixedRangeVolumeProfile',
  'callout',
  'priceNote',
  'image',
  'fibRetracement',
  'fibExtension',
  'fibFan',
  'fibSpeedResistanceFan',
  'fibArcs',
  'fibSpeedResistanceArcs',
  'fibCircles',
  'fibSpiral',
  'gannFan',
  'gannBox',
  'gannSquare',
  'gannSquareFixed',
  'fibTimeZone',
  'cyclicLines',
  'timeCycles',
  'sineLine',
];
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
    const namedResult = dispatchMobileUserDrawingHandleCommand(state, {
      type: 'setName',
      drawingId: 'table',
      name: 'Mobile metrics',
      options: { now: () => 30 },
      meta: { source: 'api' },
    });
    const styleResult = dispatchMobileUserDrawingHandleCommand(namedResult.state, {
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

    expect(namedResult.changed).toBe(true);
    expect(namedResult.state.drawings[0]).toMatchObject({ name: 'Mobile metrics' });
    expect(styleResult.changed).toBe(true);
    expect(tableResult.changed).toBe(true);
    expect(hiddenResult.changed).toBe(true);
    expect(hiddenResult.state.selection).toBeNull();
    expect(hiddenResult.state.drawings[0]).toMatchObject({
      name: 'Mobile metrics',
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

  it('records mobile tap-created drawings only after final placement input', () => {
    let state = setUserDrawingTool(createUserDrawingState(), 'trendLine');
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'line', now: () => 20, style },
      meta: { source: 'touch', transactionKey: 'tap-placement' },
    }));

    expect(state.draft).toMatchObject({ tool: 'trendLine', anchors: [anchorA] });
    expect(history.undoStack).toHaveLength(0);

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'line', now: () => 21, style },
      meta: { source: 'touch', transactionKey: 'tap-placement' },
    }));

    expect(state.draft).toBeNull();
    expect(state.selection).toEqual({ drawingId: 'line' });
    expect(state.drawings[0]).toMatchObject({
      id: 'line',
      kind: 'trendLine',
      points: [anchorA, anchorB],
    });
    expect(history.undoStack).toHaveLength(1);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state).toMatchObject({
      drawings: [],
      draft: null,
      selection: null,
    });

    const redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]).toMatchObject({
      id: 'line',
      kind: 'trendLine',
      points: [anchorA, anchorB],
    });
  });

  it('records mobile style, visibility, lock, and z-order commands through shared history', () => {
    let state = duplicateUserDrawing(createMobileStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 30,
    });
    state = { ...state, selection: { drawingId: 'line' } };
    let history = createUserDrawingCommandHistory();

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateStyle',
      style: { lineColor: '#00ff88' },
      options: { drawingId: 'line', now: () => 31 },
      meta: { source: 'toolbar' },
    }));
    expect(state.drawings[0]?.style.lineColor).toBe('#00ff88');
    let undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.style.lineColor).toBe('#fff');
    let redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.style.lineColor).toBe('#00ff88');
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'setVisibility',
      visible: false,
      options: { drawingId: 'line', now: () => 32 },
      meta: { source: 'objectTree' },
    }));
    expect(state.drawings[0]?.visible).toBe(false);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.visible).toBe(true);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.visible).toBe(false);
    state = undo.state;
    history = undo.history;

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'setLocked',
      locked: true,
      options: { drawingId: 'line', now: () => 33 },
      meta: { source: 'toolbar' },
    }));
    expect(state.drawings[0]?.locked).toBe(true);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings[0]?.locked).toBe(false);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings[0]?.locked).toBe(true);
    state = redo.state;
    history = redo.history;

    ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'reorder',
      action: 'sendToBack',
      options: { drawingId: 'copy' },
      meta: { source: 'contextMenu' },
    }));
    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['copy', 'line']);
    undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
    redo = redoUserDrawingCommand(undo.state, undo.history);
    expect(redo.state.drawings.map((drawing) => drawing.id)).toEqual(['copy', 'line']);
  });

  it('defines mobile command failure returns for stale IDs and locked drawings', () => {
    const state = {
      ...createMobileStateWithTrendLine(),
      selection: { drawingId: 'line' },
      drawings: createMobileStateWithTrendLine().drawings.map((drawing) => ({ ...drawing, locked: true })),
    };
    const history = createUserDrawingCommandHistory();

    expect(
      dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'delete',
        options: { drawingId: 'missing' },
        meta: { source: 'api' },
      }).changed,
    ).toBe(false);
    expect(
      dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'duplicate',
        options: { drawingId: 'missing', createId: () => 'copy' },
        meta: { source: 'api' },
      }).changed,
    ).toBe(false);
    expect(
      dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'updateStyle',
        style: { lineColor: '#ffffff' },
        options: { drawingId: 'line' },
        meta: { source: 'api' },
      }).changed,
    ).toBe(false);

    const forced = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'updateStyle',
      style: { lineColor: '#ffffff' },
      options: { drawingId: 'line', includeLocked: true },
      meta: { source: 'api' },
    });
    expect(forced.changed).toBe(true);
    expect(forced.state.drawings[0]?.style.lineColor).toBe('#ffffff');
  });

  it('emits mobile drawing command events for changed history commands', () => {
    const state = createMobileStateWithTrendLine();
    const onEvent = vi.fn();
    const result = dispatchMobileUserDrawingHistoryCommandWithEvent(
      state,
      createUserDrawingCommandHistory(),
      {
        type: 'duplicate',
        options: { createId: () => 'copy', now: () => 44 },
        meta: { source: 'api' },
      },
      onEvent,
    );

    expect(result.changed).toBe(true);
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]?.[0];
    expect(event).toMatchObject({
      command: { type: 'duplicate' },
      previousState: state,
      state: result.state,
      source: 'api',
    });
    expect(event?.affectedIds).toContain('copy');

    const unchanged = dispatchMobileUserDrawingHistoryCommandWithEvent(
      result.state,
      result.history,
      { type: 'delete', options: { drawingId: 'missing' }, meta: { source: 'api' } },
      onEvent,
    );

    expect(unchanged.changed).toBe(false);
    expect(onEvent).toHaveBeenCalledTimes(1);
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

  it('routes mobile duplicate keyboard action through shared drawing history', () => {
    const state = createMobileStateWithTrendLine();
    const result = dispatchMobileUserDrawingKeyboardAction(
      state,
      createUserDrawingCommandHistory(),
      { key: 'd', metaKey: true },
      { createId: () => 'copy' },
    );

    expect(result.action?.type).toBe('duplicateSelected');
    expect(result.command).toMatchObject({ type: 'duplicate', meta: { source: 'keyboard' } });
    expect(result.changed).toBe(true);
    expect(result.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'copy']);
    expect(result.state.selection).toEqual({ drawingId: 'copy' });
    expect(result.history.undoStack).toHaveLength(1);
    expect(result.command ? createUserDrawingCommandEvent(state, { ...result, command: result.command })?.source : null).toBe(
      'keyboard',
    );
  });

  it('routes mobile object-tree actions through shared history dispatch', () => {
    let state = duplicateUserDrawing(createMobileStateWithTrendLine(), {
      createId: () => 'copy',
      now: () => 43,
    });
    state = { ...state, selection: { drawingId: 'line', drawingIds: ['line', 'copy'] } };
    let history = createUserDrawingCommandHistory();

    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'hide', drawingIds: ['copy'] },
      { createId: () => 'unused', now: () => 44 },
    )) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.selection).toEqual({ drawingId: 'line' });
    expect(state.drawings.map((drawing) => [drawing.id, drawing.visible])).toEqual([
      ['line', true],
      ['copy', false],
    ]);
    expect(history.undoStack).toHaveLength(1);

    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'duplicate', drawingIds: ['line'] },
      { createId: () => 'object-tree-copy', now: () => 45 },
    )) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'object-tree-copy', 'copy']);
    expect(state.selection).toEqual({ drawingId: 'object-tree-copy' });
    expect(history.undoStack).toHaveLength(2);

    for (const command of resolveUserDrawingObjectTreeDispatchActionCommands(
      state,
      { type: 'sendToBack', drawingIds: ['object-tree-copy'] },
      { createId: () => 'unused', now: () => 46 },
    )) {
      ({ state, history } = dispatchMobileUserDrawingHistoryCommand(state, history, command));
    }

    expect(state.drawings.map((drawing) => drawing.id)).toEqual(['object-tree-copy', 'line', 'copy']);
    expect(state.selection).toEqual({ drawingId: 'object-tree-copy' });
    expect(history.undoStack).toHaveLength(3);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line', 'object-tree-copy', 'copy']);
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

  it('records consecutive mobile two-anchor placement drags as independent undo entries', () => {
    let state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    let history = createUserDrawingCommandHistory();
    const drag = (id: string, firstAnchor = anchorA, secondAnchor = anchorB) => {
      const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: firstAnchor },
        meta: { source: 'touch' },
      });

      expect(started.changed).toBe(true);
      expect(started.history.undoStack).toHaveLength(history.undoStack.length);
      expect(started.state.draft?.anchors).toEqual([firstAnchor]);

      const committed = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: secondAnchor },
        options: { createId: () => id, now: () => 42, style },
        meta: { source: 'touch' },
      });

      expect(committed.changed).toBe(true);

      state = committed.state;
      history = committed.history;
    };

    drag('rect-1');
    drag('rect-2', { time: 3_000, price: 120 }, { time: 4_000, price: 130 });

    expect(history.undoStack).toHaveLength(2);
    expect(state.drawings).toEqual([
      expect.objectContaining({
        id: 'rect-1',
        kind: 'rectangle',
        points: [anchorA, anchorB],
      }),
      expect.objectContaining({
        id: 'rect-2',
        kind: 'rectangle',
        points: [
          { time: 3_000, price: 120 },
          { time: 4_000, price: 130 },
        ],
      }),
    ]);

    const undo = undoUserDrawingCommand(state, history);
    expect(undo.changed).toBe(true);
    expect(undo.state.drawings).toEqual([expect.objectContaining({ id: 'rect-1' })]);
  });

  it('records expanded mobile two-anchor placement tools through the same drag lifecycle', () => {
    for (const tool of expandedDragPlacementTools) {
      const state = setUserDrawingTool(createUserDrawingState(), tool);
      const started = dispatchMobileUserDrawingHistoryCommand(state, createUserDrawingCommandHistory(), {
        type: 'beginPlacementDrag',
        point: { paneId: 'main', anchor: anchorA },
        meta: { source: 'touch', transactionKey: `${tool}-placement` },
      });
      const committed = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
        type: 'commitPlacementDrag',
        point: { paneId: 'main', anchor: anchorB },
        options: { createId: () => `${tool}-drawing`, now: () => 43, style },
        meta: { source: 'touch' },
      });

      expect(started.changed, tool).toBe(true);
      expect(committed.changed, tool).toBe(true);
      expect(committed.history.undoStack, tool).toHaveLength(1);
      expect(committed.state.drawings[0], tool).toMatchObject({
        id: `${tool}-drawing`,
        kind: tool,
        points: [anchorA, anchorB],
      });
    }
  });

  it('records mobile geometric drag-seeded placement after the final tap', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'triangle');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch' },
    });
    const seeded = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'main', anchor: anchorB },
      options: { createId: () => 'triangle', now: () => 43, style },
      meta: { source: 'touch' },
    });
    const committed = dispatchMobileUserDrawingHistoryCommand(seeded.state, seeded.history, {
      type: 'handleInput',
      point: { paneId: 'main', anchor: anchorC },
      options: { createId: () => 'triangle', now: () => 44, style },
      meta: { source: 'touch' },
    });

    expect(started.changed).toBe(true);
    expect(seeded.changed).toBe(true);
    expect(seeded.history.undoStack).toHaveLength(0);
    expect(seeded.state.drawings).toEqual([]);
    expect(seeded.state.draft).toMatchObject({
      tool: 'triangle',
      anchors: [anchorA, anchorB],
    });
    expect(committed.changed).toBe(true);
    expect(committed.history.undoStack).toHaveLength(1);
    expect(committed.state.draft).toBeNull();
    expect(committed.state.drawings[0]).toMatchObject({
      id: 'triangle',
      kind: 'triangle',
      points: [anchorA, anchorB, anchorC],
    });
  });

  it('records mobile path-family drags as one undoable drawing creation', () => {
    const pathFamilyTools: UserDrawingTool[] = ['brush', 'highlighter'];

    for (const tool of pathFamilyTools) {
      let state = setUserDrawingTool(createUserDrawingState(), tool);
      let history = createUserDrawingCommandHistory();
      const drag = (id: string, firstAnchor = anchorA, secondAnchor = anchorB) => {
        const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
          type: 'beginPathDrag',
          point: { paneId: 'main', anchor: firstAnchor },
          meta: { source: 'touch', transactionKey: `${tool}-path-drag` },
        });
        const moved = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
          type: 'appendPathDragPoint',
          point: { paneId: 'main', anchor: secondAnchor },
          meta: { source: 'touch', transactionKey: `${tool}-path-drag` },
        });
        const committed = dispatchMobileUserDrawingHistoryCommand(moved.state, moved.history, {
          type: 'commitPathDrag',
          options: { createId: () => id, now: () => 44, style },
          meta: { source: 'touch' },
        });

        expect(started.changed, tool).toBe(true);
        expect(started.history.undoStack, tool).toHaveLength(history.undoStack.length);
        expect(moved.changed, tool).toBe(true);
        expect(moved.history.undoStack, tool).toHaveLength(history.undoStack.length);
        expect(committed.changed, tool).toBe(true);

        state = committed.state;
        history = committed.history;
      };

      drag(`${tool}-drawing-1`);
      drag(`${tool}-drawing-2`, { time: 3_000, price: 120 }, { time: 4_000, price: 130 });

      expect(history.undoStack, tool).toHaveLength(2);
      expect(state.drawings, tool).toEqual([
        expect.objectContaining({ id: `${tool}-drawing-1`, kind: tool, points: [anchorA, anchorB] }),
        expect.objectContaining({
          id: `${tool}-drawing-2`,
          kind: tool,
          points: [
            { time: 3_000, price: 120 },
            { time: 4_000, price: 130 },
          ],
        }),
      ]);

      const undo = undoUserDrawingCommand(state, history);
      expect(undo.changed, tool).toBe(true);
      expect(undo.state.drawings, tool).toEqual([expect.objectContaining({ id: `${tool}-drawing-1` })]);
    }
  });

  it('does not record a mobile placement drag that ends at the start anchor', () => {
    const state = setUserDrawingTool(createUserDrawingState(), 'rectangle');
    const history = createUserDrawingCommandHistory();
    const started = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      meta: { source: 'touch' },
    });
    const cancelled = dispatchMobileUserDrawingHistoryCommand(started.state, started.history, {
      type: 'commitPlacementDrag',
      point: { paneId: 'main', anchor: anchorA },
      options: { createId: () => 'rect', now: () => 42, style },
      meta: { source: 'touch' },
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

  it('records mobile duplicate-drag start and moves as one coalesced undo entry', () => {
    const state = createMobileStateWithTrendLine();
    const history = createUserDrawingCommandHistory();
    const duplicateStart = dispatchMobileUserDrawingHistoryCommand(state, history, {
      type: 'beginDuplicateEditDragAtPoint',
      point: { x: 150, y: 150 },
      spacesByPaneId,
      options: { createId: () => 'copy', now: () => 45 },
      meta: { source: 'api', transactionKey: 'duplicate-drag' },
    });

    expect(duplicateStart.changed).toBe(true);
    expect(duplicateStart.history.undoStack).toHaveLength(1);
    expect(duplicateStart.editDrag?.startDrawing.id).toBe('copy');
    if (!duplicateStart.editDrag) throw new Error('expected duplicate edit drag');

    const moved = dispatchMobileUserDrawingHistoryCommand(duplicateStart.state, duplicateStart.history, {
      type: 'applyEditDrag',
      drag: duplicateStart.editDrag,
      point: { x: 170, y: 130 },
      meta: { source: 'touch', transactionKey: 'duplicate-drag' },
    });

    expect(moved.history.undoStack).toHaveLength(1);
    const undo = undoUserDrawingCommand(moved.state, moved.history);
    expect(undo.state.drawings.map((drawing) => drawing.id)).toEqual(['line']);
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
